"""
Static ingredient recommendations based on skin type, acne severity, and concerns.
Raw ingredients only — no brand names.
"""

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
    # (kojic_acid can irritate deeper tones at high concentration)
    if is_darker_tone and "kojic_acid" in base:
        base.remove("kojic_acid")
        if "alpha_arbutin" not in base:
            base.insert(0, "alpha_arbutin")

    results = []
    for key in base[:max_results]:
        info = INGREDIENT_INFO.get(key)
        if info:
            results.append({"key": key, "name": info[0], "benefit": info[1]})

    return results
