"""
Static ingredient recommendations based on skin type, acne severity, and concerns.
Raw ingredients only — no brand names.

Also provides AI-personalised recommendations via a second Groq text call,
and conflict detection against a static conflict table.
"""

import json
import logging

from groq import Groq

from config import GROQ_API_KEY

logger = logging.getLogger(__name__)

# Module-level singleton — reused across all requests (avoids per-request fd leak)
_groq_client = Groq(api_key=GROQ_API_KEY)

_AI_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

_FITZ_LABEL = {
    "I": "very fair",
    "II": "fair",
    "III": "medium",
    "IV": "olive / light brown",
    "V": "brown",
    "VI": "dark brown / black",
}

_AI_PROMPT = """\
You are a dermatology ingredient expert. Based on this person's skin analysis, \
recommend exactly 3 skincare ingredients that are most relevant for THEIR specific combination.

Skin type: {skin_type}
Acne severity: {acne_severity}
Fitzpatrick skin tone: Type {fitzpatrick} ({fitz_label})
Primary concerns: {concerns}

Rules:
- Explain WHY each ingredient suits THIS person — reference their skin type, tone, or concerns.
- Never recommend kojic acid if Fitzpatrick is IV, V, or VI (use alpha arbutin instead).
- Stick to evidence-backed, widely available raw ingredients (no brand names).
- Each benefit must be 1-2 sentences, specific to this analysis.

Respond ONLY with a valid JSON array — no markdown fences, no extra text:
[
  {{"name": "Ingredient Name", "benefit": "Personalised reason for this person."}},
  {{"name": "...", "benefit": "..."}},
  {{"name": "...", "benefit": "..."}}
]"""

# ingredient: (display_name, what_it_does)
INGREDIENT_INFO = {
    "niacinamide":          ("Niacinamide", "Reduces pores, controls oil, brightens"),
    "salicylic_acid":       ("Salicylic Acid (BHA)", "Unclogs pores, fights acne, exfoliates"),
    "hyaluronic_acid":      ("Hyaluronic Acid", "Deep hydration, plumps skin"),
    "ceramides":            ("Ceramides", "Repairs skin barrier, locks in moisture"),
    "glycerin":             ("Glycerin", "Humectant, attracts and retains moisture"),
    "benzoyl_peroxide":     ("Benzoyl Peroxide", "Kills acne-causing bacteria"),
    "tea_tree_oil":         ("Tea Tree Oil", "Natural antibacterial, calms inflammation"),
    "azelaic_acid":         ("Azelaic Acid", "Reduces redness, treats acne and hyperpigmentation"),
    "vitamin_c":            ("Vitamin C (L-Ascorbic Acid)", "Brightens, fades dark spots, antioxidant"),
    "retinol":              ("Retinol (Vitamin A)", "Speeds cell turnover, reduces acne scars"),
    "alpha_arbutin":        ("Alpha Arbutin", "Fades hyperpigmentation, safe for darker tones"),
    "green_tea_extract":    ("Green Tea Extract", "Antioxidant, reduces sebum production"),
    "centella_asiatica":    ("Centella Asiatica (Cica)", "Soothes irritation, repairs barrier"),
    "lactic_acid":          ("Lactic Acid (AHA)", "Gentle exfoliation, hydrating, brightening"),
    "zinc_oxide":           ("Zinc Oxide", "Sun protection, soothes acne-prone skin"),
    "squalane":             ("Squalane", "Lightweight oil, non-comedogenic moisturiser"),
    "kojic_acid":           ("Kojic Acid", "Reduces melanin, treats dark spots"),
}

# (skin_type, acne_severity) → list of ingredient keys, in priority order
RECOMMENDATIONS: dict[tuple[str, str], list[str]] = {
    # Oily
    ("oily", "none"):     ["niacinamide", "green_tea_extract", "salicylic_acid", "hyaluronic_acid", "zinc_oxide"],
    ("oily", "mild"):     ["salicylic_acid", "niacinamide", "tea_tree_oil", "hyaluronic_acid", "zinc_oxide"],
    ("oily", "moderate"): ["salicylic_acid", "benzoyl_peroxide", "niacinamide", "azelaic_acid", "zinc_oxide"],
    ("oily", "severe"):   ["benzoyl_peroxide", "salicylic_acid", "azelaic_acid", "niacinamide", "retinol"],

    # Dry
    ("dry", "none"):      ["hyaluronic_acid", "ceramides", "glycerin", "squalane", "lactic_acid"],
    ("dry", "mild"):      ["hyaluronic_acid", "ceramides", "azelaic_acid", "lactic_acid", "centella_asiatica"],
    ("dry", "moderate"):  ["ceramides", "hyaluronic_acid", "azelaic_acid", "centella_asiatica", "niacinamide"],
    ("dry", "severe"):    ["ceramides", "hyaluronic_acid", "azelaic_acid", "retinol", "centella_asiatica"],

    # Normal
    ("normal", "none"):   ["vitamin_c", "hyaluronic_acid", "niacinamide", "zinc_oxide", "lactic_acid"],
    ("normal", "mild"):   ["niacinamide", "salicylic_acid", "hyaluronic_acid", "vitamin_c", "zinc_oxide"],
    ("normal", "moderate"):["salicylic_acid", "niacinamide", "azelaic_acid", "hyaluronic_acid", "zinc_oxide"],
    ("normal", "severe"): ["benzoyl_peroxide", "salicylic_acid", "azelaic_acid", "niacinamide", "retinol"],

    # Combination
    ("combination", "none"):    ["niacinamide", "hyaluronic_acid", "lactic_acid", "green_tea_extract", "zinc_oxide"],
    ("combination", "mild"):    ["salicylic_acid", "niacinamide", "hyaluronic_acid", "tea_tree_oil", "zinc_oxide"],
    ("combination", "moderate"):["salicylic_acid", "niacinamide", "azelaic_acid", "hyaluronic_acid", "zinc_oxide"],
    ("combination", "severe"):  ["benzoyl_peroxide", "salicylic_acid", "azelaic_acid", "niacinamide", "retinol"],
}

# Extra ingredients added when hyperpigmentation or scarring is a concern
CONCERN_EXTRAS: dict[str, list[str]] = {
    "hyperpigmentation": ["alpha_arbutin", "vitamin_c", "kojic_acid"],
    "scarring":          ["retinol", "azelaic_acid", "vitamin_c"],
    "post-inflammatory hyperpigmentation": ["alpha_arbutin", "azelaic_acid", "vitamin_c"],
    "redness":           ["centella_asiatica", "azelaic_acid", "green_tea_extract"],
    "pores":             ["niacinamide", "salicylic_acid"],
    "blackheads":        ["salicylic_acid", "lactic_acid"],
}

# Static conflict table — (ingredient_a, ingredient_b, reason, timing_advice)
# Both ingredients must be in the recommended list to trigger a conflict warning.
_STATIC_CONFLICTS = [
    ("retinol",        "lactic_acid",     "pH incompatible; lactic acid degrades retinol efficacy",                         "Use retinol PM, lactic acid AM"),
    ("retinol",        "salicylic_acid",  "Both exfoliate; combined use risks irritation and barrier damage",                "Alternate nights, or use retinol PM only"),
    ("retinol",        "vitamin_c",       "pH incompatible; vitamin C oxidises in alkaline retinol environment",             "Vitamin C AM, retinol PM"),
    ("retinol",        "benzoyl_peroxide","Benzoyl peroxide oxidises and deactivates retinol",                               "Use on alternating nights"),
    ("retinol",        "azelaic_acid",    "Stacking two actives increases irritation risk on sensitive skin",                "Use on alternating nights"),
    ("retinol",        "tea_tree_oil",    "Both dry and irritate; combined use risks over-stripping the barrier",            "Use on alternating nights"),
    ("salicylic_acid", "vitamin_c",       "Low pH of BHA can destabilise vitamin C formulations",                           "Space apart by 30 minutes, or use AM/PM"),
    ("lactic_acid",    "salicylic_acid",  "Stacking two exfoliating acids increases irritation risk",                       "Use one per routine; alternate AM/PM"),
    ("lactic_acid",    "vitamin_c",       "Competing pH levels reduce efficacy of both",                                    "Vitamin C AM, lactic acid PM"),
    ("benzoyl_peroxide","vitamin_c",      "Benzoyl peroxide oxidises ascorbic acid, reducing efficacy",                     "Vitamin C AM, benzoyl peroxide PM"),
    ("kojic_acid",     "vitamin_c",       "Unstable together; both oxidise rapidly when combined",                          "Use on alternating days"),
    ("niacinamide",    "vitamin_c",       "Can form niacin (causes flushing) at high concentrations; low risk at typical levels", "Fine to layer if concentrations are below 10%"),
    ("alpha_arbutin",  "kojic_acid",      "Redundant mechanism; no benefit to using both simultaneously",                   "Choose one; alpha arbutin preferred for Fitzpatrick IV-VI"),
]


def get_recommendations(
    skin_type: str,
    acne_severity: str,
    primary_concerns: list[str],
    is_darker_tone: bool,
    max_results: int = 5,
) -> list[dict]:
    """
    Return a prioritized list of ingredient recommendations.

    Returns list of dicts: {key, name, benefit}
    """
    key = (skin_type.lower(), acne_severity.lower())
    base = list(RECOMMENDATIONS.get(key, RECOMMENDATIONS.get(("normal", "none"), [])))

    # Add concern-specific extras (avoid duplicates)
    for concern in primary_concerns:
        concern_lower = concern.lower()
        for concern_key, extras in CONCERN_EXTRAS.items():
            if concern_key in concern_lower:
                for ingredient in extras:
                    if ingredient not in base:
                        base.append(ingredient)

    # For darker skin tones, prioritise alpha_arbutin + azelaic_acid over kojic_acid
    if is_darker_tone and "kojic_acid" in base:
        base.remove("kojic_acid")
        if "alpha_arbutin" not in base:
            base.insert(0, "alpha_arbutin")

    results = []
    for ing_key in base[:max_results]:
        info = INGREDIENT_INFO.get(ing_key)
        if info:
            results.append({"key": ing_key, "name": info[0], "benefit": info[1]})

    return results


def get_conflicts(ingredient_keys: list[str]) -> list[dict]:
    """
    Detect conflicts between a list of recommended ingredient keys.

    Checks the static conflict table — no DB call, runs in microseconds.
    Returns list of dicts: {ingredient_a, ingredient_b, reason, timing_advice}
    """
    key_set = set(ingredient_keys)
    conflicts = []
    for a, b, reason, timing in _STATIC_CONFLICTS:
        if a in key_set and b in key_set:
            conflicts.append({
                "ingredient_a": a,
                "ingredient_b": b,
                "reason": reason,
                "timing_advice": timing,
            })
    return conflicts


def get_ai_recommendations(
    skin_type: str,
    acne_severity: str,
    fitzpatrick_estimate: str,
    primary_concerns: list[str],
    is_darker_tone: bool,
) -> list[dict]:
    """
    Return 3 AI-personalised ingredient recommendations via Groq (text-only call).
    Returns empty list on any failure so the caller never crashes.
    """
    if not GROQ_API_KEY:
        return []

    concerns_str = ", ".join(primary_concerns) if primary_concerns else "none detected"
    fitz_label = _FITZ_LABEL.get(fitzpatrick_estimate, fitzpatrick_estimate)

    prompt = _AI_PROMPT.format(
        skin_type=skin_type,
        acne_severity=acne_severity,
        fitzpatrick=fitzpatrick_estimate,
        fitz_label=fitz_label,
        concerns=concerns_str,
    )

    try:
        response = _groq_client.chat.completions.create(
            model=_AI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.4,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        data = json.loads(raw)
        return [
            {"name": str(item["name"]), "benefit": str(item["benefit"])}
            for item in data
            if isinstance(item, dict) and "name" in item and "benefit" in item
        ][:4]
    except Exception as e:
        logger.warning("ai_recs_failed", extra={"error": str(e)})
        return []
