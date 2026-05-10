# SkinDetectorApp — Project Report

**Project Title:** AI-Powered Skin Analysis and Personalized Skincare Recommendation System
**Branch:** backend
**Stack:** FastAPI · React · Groq AI (Llama 4 Scout) · SQLite · JWT Auth

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Proposed Solution](#2-proposed-solution)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack — What, Why, and How](#4-tech-stack)
5. [Database Design](#5-database-design)
6. [Features — Complete List](#6-features)
7. [How Each Page Works (Frontend → Backend Flow)](#7-page-flows)
8. [API Reference](#8-api-reference)
9. [Security Design](#9-security-design)
10. [AI Pipeline — How the Models Work](#10-ai-pipeline)
11. [Things You Might Be Asked About](#11-likely-questions)

---

## 1. Problem Statement

Skin conditions such as oily skin, acne, dryness, and hyperpigmentation affect hundreds of millions of people. Most individuals have no reliable way to understand their own skin type or know which skincare ingredients will actually help their specific condition.

**The existing alternatives all have serious limitations:**

| Option | Problem |
|---|---|
| Visit a dermatologist | Expensive, long wait times, not accessible in smaller cities |
| Buy a "skin quiz" product from a brand | Biased — the quiz is designed to sell you their product |
| Search online | Overwhelming, contradictory advice, no personalisation |
| Generic skin type guides | Too broad — "you have oily skin, use salicylic acid" ignores your other concerns |

Additionally, most skincare recommendation tools completely ignore **ingredient conflicts** — certain skincare actives chemically react badly with each other and should not be used at the same time. No consumer product explains this clearly.

There is also a medical fairness problem: computer vision models trained primarily on lighter skin tones detect redness and erythema (skin inflammation) less accurately on darker Fitzpatrick skin tones (IV–VI). A responsible system should warn the user when this limitation applies.

---

## 2. Proposed Solution

SkinDetectorApp is a full-stack web application that:

1. **Captures a face photo** via webcam or file upload
2. **Analyzes the image** using a multimodal AI model (Llama 4 Scout) to identify skin type, acne severity, Fitzpatrick skin tone, and visible skin concerns
3. **Recommends specific skincare ingredients** tailored to the analysis (not brand products)
4. **Warns about ingredient conflicts** — cases where two recommended ingredients react badly together
5. **Generates personalized AI explanations** for why each ingredient suits this specific person's skin
6. **Flags an accuracy disclaimer** when the model may be less reliable (darker skin tones + redness detection)
7. **Stores analysis history** so users can track their skin health over time
8. **Provides an admin dashboard** for monitoring usage

The system is **privacy-first**: images are analyzed and immediately discarded. No photos are ever stored.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                        │
│                                                              │
│  React 19 + Vite + Tailwind CSS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │AuthForm  │  │  Camera  │  │ResultCard│  │ History  │    │
│  │(Login /  │  │(Webcam / │  │(Results  │  │(Past     │    │
│  │Register) │  │ Upload)  │  │ Display) │  │ Analyses)│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                        ▲           │                         │
│            JWT Token   │           │ POST /api/analyze       │
│            in header   │           │ (multipart image)       │
└───────────────────────────────────┼─────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI BACKEND (Python)                   │
│                                                              │
│  main.py ──► JWT verification ──► Rate limiter               │
│      │                                                       │
│      ├──► ml/analyzer.py                                     │
│      │        └──► Groq API (Llama 4 Scout vision)           │
│      │                 └──► JSON: skin_type, acne,           │
│      │                       fitzpatrick, confidence         │
│      │                                                       │
│      ├──► ml/recommendations.py                              │
│      │        ├──► Static lookup table → ingredient list     │
│      │        ├──► Conflict detection (in-memory table)      │
│      │        └──► Groq API (Llama 4 Scout text)             │
│      │                 └──► AI personalised explanations      │
│      │                                                       │
│      └──► SQLite database (via SQLAlchemy ORM)               │
│               └──► Store results (no images stored)          │
└─────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────┐
│                  SQLite Database (skindetector.db)            │
│                                                              │
│   users            analyses            conflict_pairs         │
│   ────────         ────────────────    ─────────────────      │
│   id               id                  id                     │
│   email            user_id (FK)        ingredient_a           │
│   hashed_password  skin_type           ingredient_b           │
│   is_admin         acne_severity       reason                 │
│   created_at       fitzpatrick         timing_advice          │
│                    recommendations                            │
│                    ai_recommendations                         │
│                    conflicts                                  │
│                    confidence                                 │
│                    elapsed_ms                                 │
│                    created_at                                 │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow (simplified)

```
Browser → sends JPEG image → FastAPI validates token + file size
       → Groq Vision API analyzes image → returns skin JSON
       → Static lookup selects ingredients for that skin type
       → Conflict table checked against selected ingredients
       → Groq Text API generates personalized explanations (5s timeout)
       → Results saved to SQLite (no image stored)
       → JSON response sent back to browser
       → React renders ResultCard
```

---

## 4. Tech Stack

### 4.1 Backend

---

#### Python
**What it is:** The programming language the backend is written in.
**Why chosen:** Python is the de-facto language for AI/ML projects. It has first-class libraries for every component we need (web framework, database, AI APIs). The Groq SDK, SQLAlchemy, and FastAPI all have excellent Python support.

---

#### FastAPI
**What it is:** A Python web framework for building APIs (Application Programming Interfaces). An API is a set of URL endpoints that the frontend calls to send/receive data.
**Why chosen over alternatives (Flask, Django):**
- FastAPI is significantly faster than Flask (2–5× on benchmarks) because it's built on async Python (can handle many requests simultaneously without waiting)
- Automatically generates documentation at `/docs` — you can open it in a browser and test every endpoint
- Uses Python type hints to validate incoming data automatically — if you send a malformed request, FastAPI rejects it before your code even runs
- FastAPI is increasingly used in production AI systems (NVIDIA, Netflix internal tools)

**Key concept used:** `@app.post("/api/analyze")` is a *route decorator* — it tells FastAPI "when someone sends a POST request to this URL, run this function."

---

#### SQLAlchemy
**What it is:** An ORM — Object Relational Mapper. It lets you work with the database using Python classes instead of writing raw SQL queries.
**Why this matters:** Instead of writing `SELECT * FROM users WHERE email = ?`, you write `db.query(User).filter(User.email == email).first()`. This is safer (prevents SQL injection attacks), more readable, and works with any database (SQLite in dev, PostgreSQL in production) without changing code.

**Example from this project:**
```python
# SQLAlchemy — no SQL needed
user = db.query(User).filter(User.email == body.email).first()

# What it does behind the scenes:
# SELECT * FROM users WHERE email = 'user@example.com' LIMIT 1
```

---

#### Alembic
**What it is:** A database migration tool that works with SQLAlchemy. Think of it like Git but for your database structure.
**The problem it solves:** When you add a new column to a database table (like when we added `ai_recommendations` to the `analyses` table), you can't just change the Python model class and expect the existing database to update itself. Alembic tracks every change to the database schema and applies them in order with `alembic upgrade head`.

**Migration chain in this project:**
```
(empty db)
  ↓  f59954b17299  — create users table
  ↓  38196179b381  — create analyses table
  ↓  a1b2c3d4e5f6  — add ai_recommendations column
  ↓  40bd0da568a0  — add conflict_pairs table + conflicts column
```

Each file in `backend/migrations/versions/` is a migration. They are ordered by the `Revises:` field at the top — each migration declares which one came before it, creating a chain.

---

#### python-jose + bcrypt
**What they are:**
- `python-jose`: library for creating and verifying JWT tokens (the authentication system)
- `bcrypt`: library for hashing passwords

**How passwords are stored:** When a user registers, their password is never stored in plain text. It's run through bcrypt, which:
1. Adds a random "salt" (extra characters) to prevent lookup attacks
2. Hashes it many thousands of times so brute-force attacks take years
3. Stores only the hash — even the database admin can't read real passwords

**JWT (JSON Web Token):** When you log in, the server gives you a "token" — a small encoded string that proves who you are. Every subsequent request includes this token in the header. The server verifies it without needing to look up the database every time. A JWT looks like: `eyJhbG...` (three base64 segments joined by dots: header.payload.signature).

---

#### SlowAPI
**What it is:** A rate limiting library — it restricts how many times a user can call an endpoint per minute.
**Why needed:** Without it, a user or bot could send thousands of requests per minute, running up your Groq API bill or crashing the server. This project sets:
- Login: 5 requests/minute (prevents password brute-force)
- Analyze: 10 requests/minute (prevents API cost abuse)

---

#### Groq API
**What it is:** A cloud API that runs large AI models at very high speed. Groq has custom hardware (LPU chips) that can run inference faster than GPU clouds.
**Why chosen:** The main alternatives for vision AI are OpenAI (GPT-4V) and Google Gemini. Groq was chosen because:
- It has a **free tier** (14,400 image requests/day — enough for development and demo)
- Response time is fast (~1-2 seconds vs 3-5 on OpenAI free tier)
- Works from India without payment card issues

**Models used:**
- `meta-llama/llama-4-scout-17b-16e-instruct` — multimodal (can see images). Used for both skin analysis and AI recommendations.

---

#### Pydantic
**What it is:** A data validation library that FastAPI uses. You describe what shape your data should be in using a Python class, and Pydantic automatically checks every incoming request against that shape.

```python
class RegisterRequest(BaseModel):
    email: EmailStr   # must be valid email format
    password: str     # must be a string

# If someone sends {"email": "notanemail"}, FastAPI automatically
# returns a 422 error before your code runs.
```

---

### 4.2 Frontend

---

#### React 19
**What it is:** A JavaScript library for building user interfaces. Instead of writing HTML that you manually update, you write components — functions that describe what the UI should look like, and React automatically re-renders just the changed parts.

**Why chosen:** React is the most widely used frontend library in the world. It's the industry standard for single-page applications (SPAs) — apps that never reload the full page, just swap content.

**Key concept used:** `useState` — a React hook that lets components "remember" things:
```javascript
const [screen, setScreen] = useState('camera')
// screen is 'camera'. When user clicks Analyze:
setScreen('result')  // React re-renders and shows ResultCard instead
```

---

#### Vite
**What it is:** A build tool for JavaScript projects. It has two jobs:
1. **Development mode:** runs a local web server with hot-reload (changes appear instantly without refreshing)
2. **Production build:** bundles and minifies all your JavaScript files into a small, optimised `dist/` folder

**Why Vite over Create React App (CRA):** Vite is 10–100× faster to start and rebuild. CRA is considered legacy.

**Proxy configuration:** In `vite.config.js`, the line `proxy: { '/api': 'http://localhost:8000' }` means any request to `/api/...` from the frontend is automatically forwarded to the backend at port 8000. This avoids CORS issues in development.

---

#### Tailwind CSS v4
**What it is:** A utility-first CSS framework. Instead of writing custom CSS classes, you write small utility classes directly in your HTML/JSX:

```jsx
// Traditional CSS approach (two files):
// <div class="card">  and  .card { background: white; padding: 24px; }

// Tailwind approach (one place, no context switching):
<div className="bg-white p-6 rounded-2xl shadow-lg">
```

**Why v4:** Tailwind v4 uses a new import system (`@import "tailwindcss"` in CSS) instead of a config file, and CSS custom properties (variables) for theming. This project uses `@theme inline` to map CSS variables to Tailwind color utilities.

---

### 4.3 Infrastructure

---

#### SQLite
**What it is:** A file-based database. The entire database is a single file (`skindetector.db`). No separate database server needed.
**Why for this project:** Perfect for development and college demos. Zero setup, runs everywhere. For production at scale, you'd switch to PostgreSQL by just changing `DATABASE_URL`.

---

## 5. Database Design

### Table: `users`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-incrementing unique ID |
| `email` | VARCHAR(255) | Unique email, indexed for fast lookups |
| `hashed_password` | VARCHAR(255) | bcrypt hash — never plain text |
| `is_admin` | BOOLEAN | Whether this user can see the admin dashboard |
| `created_at` | DATETIME | Account creation timestamp (UTC) |

### Table: `analyses`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-incrementing unique ID |
| `user_id` | INTEGER (FK) | Links to `users.id` |
| `skin_type` | VARCHAR(50) | "oily" / "dry" / "normal" / "combination" |
| `acne_severity` | VARCHAR(50) | "none" / "mild" / "moderate" / "severe" |
| `fitzpatrick_estimate` | VARCHAR(10) | "I" through "VI" (Fitzpatrick scale) |
| `primary_concerns` | TEXT | JSON array: `["hyperpigmentation", "pores"]` |
| `recommendations` | TEXT | JSON array of `{key, name, benefit}` objects |
| `ai_recommendations` | TEXT | JSON array of `{name, benefit}` objects |
| `conflicts` | TEXT | JSON array of `{ingredient_a, ingredient_b, reason, timing_advice}` |
| `confidence` | FLOAT | 0.0–1.0, model's confidence in the analysis |
| `accuracy_disclaimer` | INTEGER | 1 = show disclaimer (darker tone + redness concern) |
| `elapsed_ms` | INTEGER | How long the analysis took in milliseconds |
| `created_at` | DATETIME | When the analysis was run (UTC) |

### Table: `conflict_pairs`

Stores the known ingredient conflicts. Currently populated from a static Python table (not from DB at runtime), but the table exists for future admin management via a UI.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | |
| `ingredient_a` | VARCHAR(100) | First ingredient key |
| `ingredient_b` | VARCHAR(100) | Second ingredient key |
| `reason` | TEXT | Why they conflict |
| `timing_advice` | TEXT | How to use both safely (e.g., "AM / PM") |

### Why JSON is stored in TEXT columns

The `primary_concerns`, `recommendations`, `ai_recommendations`, and `conflicts` fields are arrays with variable length. SQLite doesn't have a native array type, so they're serialized to JSON strings when saved and deserialized when read:
```python
# Saving
record.primary_concerns = json.dumps(["hyperpigmentation", "pores"])

# Reading
concerns = json.loads(record.primary_concerns)
```

---

## 6. Features

### Feature 1: User Registration and Login

Users create accounts with email and password. Passwords are hashed with bcrypt before storage. On login, the server issues a JWT token valid for 24 hours. The token is stored in `localStorage` in the browser and sent with every API request.

### Feature 2: Webcam Skin Analysis

The primary feature. User clicks "Capture" to take a snapshot from their webcam. The image is converted to a JPEG blob and sent to `/api/analyze`. The camera feed is horizontally mirrored (like a mirror), but the captured image is unmirrored before sending.

### Feature 3: File Upload Analysis

Alternative to webcam — user can upload an existing photo (JPEG, PNG, WebP). The same analysis pipeline runs.

### Feature 4: Skin Type Detection

The AI model (Llama 4 Scout) classifies skin type into one of four categories:
- **Oily** — excess sebum, shiny appearance, enlarged pores
- **Dry** — flaking, tightness, dull appearance
- **Normal** — balanced, minimal issues
- **Combination** — oily T-zone (forehead, nose, chin), dry or normal cheeks

### Feature 5: Acne Severity Detection

The model classifies acne into:
- **None** — clear skin
- **Mild** — a few whiteheads or blackheads
- **Moderate** — more papules/pustules, some redness
- **Severe** — widespread, deep, cystic acne

### Feature 6: Fitzpatrick Scale Classification

The Fitzpatrick scale is a dermatological classification of skin tone:

| Type | Description |
|---|---|
| I | Very fair — always burns, never tans |
| II | Fair — usually burns, sometimes tans |
| III | Medium — sometimes burns, always tans |
| IV | Olive / light brown — rarely burns, always tans |
| V | Brown — very rarely burns |
| VI | Dark brown / black — never burns |

This is used to: (a) display to the user, and (b) determine whether to swap kojic acid for alpha arbutin (safer for darker tones), and whether to show an accuracy disclaimer.

### Feature 7: Primary Concerns Detection

The model also identifies visible concerns such as: `hyperpigmentation`, `scarring`, `redness`, `enlarged pores`, `blackheads`, `post-inflammatory hyperpigmentation`, `dryness`, `uneven skin tone`. These are used to add extra relevant ingredients to the recommendation list.

### Feature 8: Ingredient Recommendations

Based on the combination of skin type, acne severity, and detected concerns, the system selects up to 5 ingredients from a curated lookup table. The table has 16 entries per combination (4 skin types × 4 acne severities) plus concern-based extras.

Example: For `oily + moderate` acne, the base recommendations are:
`salicylic acid → benzoyl peroxide → niacinamide → azelaic acid → zinc oxide`

If the analysis also detected `hyperpigmentation`, `alpha arbutin`, `vitamin C`, and `kojic acid` are added (and kojic acid is swapped for alpha arbutin if the Fitzpatrick type is IV–VI).

### Feature 9: Ingredient Conflict Detection

After the ingredient list is built, it's checked against a static conflict table of 13 known dangerous combinations. For each pair of recommended ingredients that appear in the conflict table, a warning is generated with:
- Which two ingredients conflict
- Why they conflict (chemical/pH incompatibility)
- How to still use both safely (morning/evening split, alternating nights, etc.)

Example conflict:
> **Retinol + Vitamin C** — pH incompatible; vitamin C oxidises in alkaline retinol environment
> Timing advice: "Vitamin C AM, retinol PM"

### Feature 10: AI Personalized Recommendations

A second call to Groq (text-only, no image) generates 3 recommendations that explain WHY each ingredient suits this specific person, referencing their skin type, Fitzpatrick tone, and concerns. This is different from the static table — it produces natural language explanations.

The AI also follows a rule: never recommend kojic acid to Fitzpatrick IV–VI users (it can cause irritation on darker tones); alpha arbutin is recommended instead.

This call has a 5-second timeout and degrades gracefully to an empty list — the user still gets a full result even if the AI text call fails.

### Feature 11: Accuracy Disclaimer

A disclaimer is shown when **both** conditions are true:
1. Fitzpatrick type is IV, V, or VI (darker skin tones)
2. "redness" or "erythema" appears in the detected concerns

This is because computer vision models trained on predominantly lighter skin datasets have documented lower accuracy for detecting erythema (redness/inflammation) on darker tones. The app warns the user that this specific concern detection may be less reliable.

### Feature 12: Analysis History

All analysis results are stored to the database (the photo is not stored, only the JSON results). Users can view a paginated history of all their past analyses, with expand/collapse detail for each entry including all recommendations, conflicts, and AI explanations.

### Feature 13: Admin Dashboard

Users with `is_admin = true` in the database get an Admin link in the nav. The dashboard shows:
- Total registered users
- Total analyses run
- Average confidence score across all analyses
- Most common skin type
- Skin type breakdown as a visual progress bar chart
- Table of all users with join date and analysis count

### Feature 14: Image Privacy

No images are ever written to disk or database. The image bytes are read into memory, sent to the Groq API as a base64 string, and then Python's garbage collector reclaims the memory. The database only stores JSON analysis results.

---

## 7. Page Flows

### 7.1 Login / Register Flow

```
User types email + password → clicks Register
   │
   ▼
AuthForm.jsx
   │ POST /api/auth/register
   │ { "email": "user@example.com", "password": "securepass" }
   ▼
backend/main.py → register()
   │ Check: does email already exist in DB? → 409 if yes
   │ Check: password at least 8 chars? → 422 if no
   │ hash_password(password) — bcrypt with random salt
   │ INSERT INTO users (email, hashed_password) VALUES (...)
   ▼
Response: { "message": "Account created.", "user_id": 5 }
   │
   ▼
AuthForm.jsx — sees success → calls POST /api/auth/login automatically
   │
   ▼
backend/main.py → login()
   │ Query user by email
   │ verify_password(plain, hashed) — bcrypt check
   │ create_access_token(user_id=5, email=..., is_admin=False)
   │   → JWT payload: { sub: "5", email: "...", is_admin: false, exp: ... }
   │   → Signed with SECRET_KEY using HS256
   ▼
Response: { "access_token": "eyJhbG...", "token_type": "bearer" }
   │
   ▼
api.js → stores token in localStorage
App.jsx → setAuthed(true) → renders Camera screen
```

---

### 7.2 Skin Analysis Flow (the core feature)

```
User clicks "Capture" on webcam
   │
   ▼
Camera.jsx
   │ canvas.toBlob() — captures current webcam frame as JPEG
   │ Creates FormData with the JPEG file
   │
   │ POST /api/analyze
   │ Header: Authorization: Bearer eyJhbG...
   │ Body: multipart/form-data with JPEG file
   ▼
backend/main.py → analyze_skin()
   │
   ├─ 1. AUTHENTICATION
   │    │ get_current_user_id() dependency runs first
   │    │ Extracts Bearer token from Authorization header
   │    │ decode_token(token) — verifies JWT signature + expiry
   │    │ Returns user_id = 5
   │
   ├─ 2. VALIDATION
   │    │ content_type in {"image/jpeg", "image/png", "image/webp"}? → 415 if not
   │    │ len(image_bytes) > 10 MB? → 413 if yes
   │    │ len(image_bytes) < 1 KB? → 422 if yes (empty/corrupt)
   │
   ├─ 3. VISION ANALYSIS (Groq API call #1)
   │    │ image → base64 encoded
   │    │ Sent to Groq: llama-4-scout-17b model with image + text prompt
   │    │ Prompt asks for JSON: skin_type, acne_severity, fitzpatrick_estimate,
   │    │   primary_concerns, confidence
   │    │ Temperature: 0.1 (very deterministic — consistent results)
   │    │ 15-second timeout (→ 504 if exceeded)
   │    │ Response parsed from JSON → SkinAnalysis dataclass
   │    │ Values coerced: if model returns "Oily" → "oily" (lowercase)
   │    │                if model returns "VII" (invalid) → "III" (safe default)
   │
   ├─ 4. INGREDIENT RECOMMENDATIONS
   │    │ get_recommendations(skin_type, acne_severity, concerns, is_darker_tone)
   │    │ Looks up (skin_type, acne_severity) in RECOMMENDATIONS dict → base list
   │    │ Loops through concerns, adds extras from CONCERN_EXTRAS dict
   │    │ If is_darker_tone (Fitz IV-VI): removes kojic_acid, adds alpha_arbutin
   │    │ Returns up to 5 ingredients as [{key, name, benefit}]
   │
   ├─ 5. CONFLICT DETECTION
   │    │ get_conflicts([list of ingredient keys])
   │    │ Builds a set of all recommended ingredient keys
   │    │ Loops through 13 static conflict pairs
   │    │ If BOTH ingredients in the pair are in the recommendation set → conflict!
   │    │ Returns list of [{ingredient_a, ingredient_b, reason, timing_advice}]
   │    │ O(1) lookup per pair — runs in microseconds, no DB call needed
   │
   ├─ 6. AI PERSONALIZED RECOMMENDATIONS (Groq API call #2)
   │    │ Runs in parallel after vision call completes
   │    │ Text-only call with skin type, Fitzpatrick, concerns as context
   │    │ 5-second timeout (degrades to [] if slow — doesn't block main result)
   │    │ Temperature: 0.4 (slightly creative, varied wording each time)
   │    │ Returns 3 [{name, benefit}] with personalised explanations
   │
   ├─ 7. ACCURACY DISCLAIMER
   │    │ True only if: Fitzpatrick IV/V/VI AND "redness"/"erythema" in concerns
   │
   ├─ 8. DATABASE WRITE
   │    │ INSERT INTO analyses (...) VALUES (...)
   │    │ JSON.dumps() used for array fields
   │    │ Image bytes are NOT saved — only the JSON results
   │
   └─ 9. RESPONSE
        │
        ▼
        {
          "id": 42,
          "skin_type": "oily",
          "acne_severity": "mild",
          "fitzpatrick_estimate": "III",
          "primary_concerns": ["enlarged pores", "blackheads"],
          "confidence": 0.87,
          "accuracy_disclaimer": false,
          "recommendations": [
            {"key": "salicylic_acid", "name": "Salicylic Acid (BHA)",
             "benefit": "Unclogs pores, fights acne, exfoliates"}
          ],
          "ai_recommendations": [
            {"name": "Salicylic Acid",
             "benefit": "For your oily, mild-acne skin with enlarged pores,
              salicylic acid penetrates the pore lining to dissolve the
              sebum and dead skin cells causing blackheads."}
          ],
          "conflicts": [],
          "elapsed_ms": 1847,
          "created_at": "2026-04-29T10:30:00"
        }
   │
   ▼
Camera.jsx receives response
   │ normalizeAnalysis(data) — maps backend field names to frontend names:
   │   fitzpatrick_estimate → fitzpatrick_type
   │   primary_concerns → concerns
   │   recommendations → ingredients
   │   elapsed_ms → analysis_time_ms
   │   conflicts[].ingredient_a/b → conflicts[].pair[0]/[1]
   │
   ▼
App.jsx → setAnalysisResult(result) → setScreen('result')
   │
   ▼
ResultCard.jsx renders the full analysis
```

---

### 7.3 History Flow

```
User clicks "History" in NavBar
   │
   ▼
App.jsx → setScreen('history') → renders <History />
   │
   ▼
History.jsx → useEffect fires on mount
   │ GET /api/history
   │ Header: Authorization: Bearer eyJhbG...
   │ (optional) ?limit=20
   ▼
backend/main.py → get_history()
   │ get_current_user_id() — verifies JWT → user_id = 5
   │ SELECT * FROM analyses WHERE user_id = 5
   │   ORDER BY created_at DESC LIMIT 20
   │ JSON.loads() all the array fields from TEXT columns
   │ Returns list of HistoryItem objects
   ▼
Response: [ { id, skin_type, acne_severity, ... }, ... ]
   │
   ▼
History.jsx
   │ data.map(normalizeAnalysis) — same field name normalization
   │ Renders accordion list
   │ Click on an item → setExpandedId(item.id) → shows detail panel
   │   Detail panel shows: concerns, ingredients, AI recs, conflicts
```

---

### 7.4 Admin Dashboard Flow

```
Admin logs in → JWT contains is_admin: true
   │
   ▼
api.js → isAdmin()
   │ localStorage.getItem('token')
   │ token.split('.')[1] → base64 decode → JSON parse
   │ payload.is_admin === true?
   ▼
true → App.jsx shows Admin link in NavBar
   │
   ▼
User clicks Admin → setScreen('admin') → renders <Admin />
   │
   ▼
Admin.jsx → useEffect fires
   │ GET /api/admin/stats
   │ GET /api/admin/users
   │ Both in parallel via Promise.all()
   ▼
backend/main.py → admin_stats() and admin_list_users()
   │ BOTH call get_admin_user_id() first:
   │   - Verifies JWT signature (can't be faked)
   │   - Checks payload.is_admin === true → 403 if false
   │   (Note: frontend check is just for showing/hiding UI.
   │    Backend re-checks the token independently every time.)
   │
   │ admin_stats():
   │   SELECT COUNT(*) FROM users
   │   SELECT COUNT(*) FROM analyses
   │   SELECT AVG(confidence) FROM analyses
   │   SELECT skin_type, COUNT(*) FROM analyses GROUP BY skin_type
   │
   │ admin_list_users():
   │   SELECT users.*, COUNT(analyses.id) as analysis_count
   │   FROM users LEFT JOIN analyses ON analyses.user_id = users.id
   │   GROUP BY users.id ORDER BY created_at DESC
   ▼
Admin.jsx renders:
   - 4 stat cards (users, analyses, avg confidence, top skin type)
   - Skin type breakdown: progress bars sized proportionally
   - Users table with email, join date, analysis count, admin badge
```

---

## 8. API Reference

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/health` | None | None | Returns `{status: "ok", model_ready: true, groq_key_configured: true}` |
| POST | `/api/auth/register` | None | None | Register. Body: `{email, password}`. Returns `{message, user_id}` |
| POST | `/api/auth/login` | None | 5/min | Login. Body: `{email, password}`. Returns `{access_token, token_type}` |
| POST | `/api/analyze` | JWT | 10/min | Analyze skin. Body: `multipart/form-data file=<image>`. Returns full AnalysisResponse |
| GET | `/api/history` | JWT | None | Get past analyses. Query: `?limit=20&offset=0`. Returns list |
| GET | `/api/admin/users` | JWT (admin) | None | All users with analysis counts |
| GET | `/api/admin/stats` | JWT (admin) | None | Aggregate statistics |

**Error codes used:**
- `400` Bad Request (generic invalid input)
- `401` Unauthorized (missing/invalid/expired JWT)
- `403` Forbidden (valid JWT but not admin)
- `404` Not Found
- `409` Conflict (email already registered)
- `413` Request Too Large (image > 10 MB)
- `415` Unsupported Media Type (not JPEG/PNG/WebP)
- `422` Unprocessable Entity (validation failure)
- `429` Too Many Requests (rate limit exceeded)
- `502` Bad Gateway (model returned unparseable output)
- `503` Service Unavailable (Groq API down or DB write failed)
- `504` Gateway Timeout (Groq API took > 15 seconds)

---

## 9. Security Design

### Password Security
- Passwords hashed with bcrypt, cost factor 12 (each attempt takes ~0.25s — makes brute force impractical)
- Passwords are never logged, stored in plain text, or returned in any API response

### JWT Authentication
- Algorithm: HS256 (HMAC-SHA256) — fast, widely supported
- Token expiry: 24 hours
- Payload contains: `sub` (user ID), `email`, `is_admin`, `exp` (expiry)
- Frontend decodes the payload for UI decisions (show/hide Admin link)
- Backend re-verifies the full signature on EVERY protected request — frontend decoding is only for display, the backend never trusts it

### Admin Authorization: Double-Check Pattern
The `is_admin` claim in the JWT could theoretically be manipulated if someone had the `SECRET_KEY`. The backend re-verifies both the signature (proving it was issued by this server) and the `is_admin` field on every admin request. The frontend check is purely cosmetic (hiding the link from non-admins).

### Image Privacy
Images are never written to disk or the database. They travel through memory as bytes → base64 string → Groq API → discarded. Users cannot retrieve their photos, because they were never stored.

### Input Validation Layers
1. **Pydantic schemas** — validate JSON request bodies (correct types, email format, etc.)
2. **File type check** — `content_type` must be in `{image/jpeg, image/png, image/webp}`
3. **File size check** — between 1 KB and 10 MB
4. **Enum coercion** — model output is normalized to valid enum values even if the model hallucinates
5. **CORS** — only allowed origins can call the API (configured via `ALLOWED_ORIGINS` env var)

### Rate Limiting
SlowAPI tracks requests by IP address. Limits prevent:
- Password brute force via `/api/auth/login` (5/minute)
- API cost abuse via `/api/analyze` (10/minute)

---

## 10. AI Pipeline

### How the Vision Analysis Works

The Llama 4 Scout model is a *multimodal* language model — it can understand both text and images. The image is base64-encoded and sent alongside a structured text prompt:

```
Analyze this face photo for skin conditions. Respond with ONLY valid JSON.

{
  "skin_type": "oily" | "dry" | "normal" | "combination",
  "acne_severity": "none" | "mild" | "moderate" | "severe",
  "fitzpatrick_estimate": "I" through "VI",
  "primary_concerns": ["list of concerns"],
  "confidence": 0.0 to 1.0
}
```

**Temperature = 0.1:** In AI models, "temperature" controls randomness. 0.0 = completely deterministic (same image always gives same result). 0.1 = almost deterministic with very minor variation. High temperature (1.0+) = creative, varied, unpredictable. For medical-adjacent analysis, low temperature is essential.

**JSON-only response:** The model is instructed to return only JSON. But models sometimes wrap their output in markdown code fences (` ```json `). The code strips these if they appear:
```python
if raw.startswith("```"):
    raw = raw.split("```")[1]
    if raw.startswith("json"):
        raw = raw[4:]
```

**Enum coercion:** Models sometimes return "Oily" instead of "oily", or "Type IV" instead of "IV". The `_coerce()` function normalizes these. If the model returns something completely unrecognized, a safe default is used ("normal", "none", "III").

### How the AI Recommendation Text Works

The second call uses the same model but with a detailed text prompt that includes the analysis results as context. The model writes 3 personalized ingredient explanations. Temperature = 0.4 allows slightly more natural, varied language while still being mostly consistent.

The prompt explicitly instructs the model:
> "Never recommend kojic acid if Fitzpatrick is IV, V, or VI"

This is a hard dermatological rule encoded into the prompt — kojic acid can cause irritation and post-inflammatory hyperpigmentation on darker skin tones.

### Graceful Degradation

| Failure | Result |
|---|---|
| Vision API times out (>15s) | 504 error returned to user |
| Vision API returns bad JSON | 502 error returned to user |
| AI recs API times out (>5s) | `ai_recommendations: []` — main result still returned |
| AI recs API throws any exception | `ai_recommendations: []` — main result still returned |
| Database write fails | 503 error returned to user |

---

## 11. Things You Might Be Asked About

**"Why not use a local model instead of Groq API?"**
Local vision models (like LLaVA) require a GPU. A system with enough VRAM to run a 17B vision model costs ₹1,00,000+. Groq's free tier allows 14,400 image requests per day — sufficient for a demo. The tradeoff is that the system requires internet access.

**"How accurate is the skin type detection?"**
The model returns a confidence score (0.0–1.0). The system does not claim clinical accuracy — it's a demonstration of AI capability. The accuracy disclaimer feature explicitly communicates known limitations (darker skin tone + redness detection).

**"Could someone fake an admin JWT?"**
Only if they know the `SECRET_KEY`. JWT tokens are signed — you can read the payload but can't change it without invalidating the signature. The backend verifies the signature on every request. If `SECRET_KEY` is set to a random 256-bit value (as instructed), brute-forcing it would take longer than the age of the universe.

**"Why store recommendations as JSON text in the database instead of a proper relational table?"**
The recommendations are a snapshot — they reflect what the system suggested at the time of analysis. If the recommendation algorithm changes in the future, old analyses should still show the original recommendations. Storing them as JSON strings preserves the snapshot semantics simply. A relational approach would require a `recommendations` junction table with FK constraints, adding complexity for no additional query benefit (we always fetch all recommendations for an analysis together).

**"What happens if a user submits a photo of something that's not a face?"**
The model will analyze whatever is in the image and return values. The confidence score will typically be very low (0.1–0.2) for non-face images. The system does not have a face-detection pre-filter — this would be a good future improvement.

**"What does Alembic actually do at `alembic upgrade head`?"**
It reads the `alembic_version` table in the database, finds the current migration ID, and applies all subsequent migrations in the chain until `head` (the latest). If you add a new column in a migration, it runs `ALTER TABLE analyses ADD COLUMN ...`. It's like running `git pull` for your database schema.

**"Why is the camera video mirrored but the captured image isn't?"**
The video is mirrored so it feels like looking in a mirror — this is the natural expectation (when you tilt your head right, the video should tilt right too). But the actual photo sent for analysis is unmirrored, because the AI model is trained on normal (non-mirrored) face photos. Mirroring the image before analysis would produce incorrect left/right facial assessments.

**"What is the Fitzpatrick scale and why does it matter medically?"**
The Fitzpatrick scale (published by dermatologist Thomas Fitzpatrick in 1975) classifies human skin color based on response to UV radiation. It's widely used in dermatology. In the context of AI skin analysis, it matters because AI vision models trained primarily on lighter-skinned datasets (Types I–III) have documented lower performance on tasks like redness detection for Types IV–VI. Building in this awareness and communicating it to users is an ethical design decision.
