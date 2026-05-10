# SkinDetectorApp

AI-powered skin analysis web app. Capture or upload a face photo to get your skin type, acne severity, Fitzpatrick tone, recommended skincare ingredients, ingredient conflict warnings, and personalized AI recommendations — all in real time via the Groq API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite, Alembic migrations, JWT auth |
| AI | Groq API — Llama 4 Scout (vision + text) for analysis and recommendations |
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Auth | JWT (HS256), bcrypt passwords, rate limiting via SlowAPI |

---

## Prerequisites

Before you start, make sure you have:

- **Python 3.12** — `python --version` (`.python-version` file included for pyenv users)
- **Node.js 18+** — `node --version` (`.nvmrc` file included for nvm users — `nvm use` auto-selects Node 20)
- **npm 9+** — `npm --version`
- **A free Groq API key** — sign up at [console.groq.com](https://console.groq.com), no credit card required

> **Version management shortcuts:**
> - pyenv users: `pyenv install 3.12 && pyenv local 3.12`
> - nvm users: `nvm install && nvm use` (reads `.nvmrc` automatically)

---

## Quick Setup

### 1. Clone the repository

```bash
git clone https://github.com/Kamaljangra106/SkinDetectorApp.git
cd SkinDetectorApp
```

### 2. Backend setup

```bash
# Create and activate a virtual environment
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Install all Python dependencies (exact versions pinned)
pip install -r backend/requirements.txt
```

### 3. Configure environment variables

```bash
# Copy the example file
cp .env.example backend/.env
```

Open `backend/.env` in any text editor and fill in the required values:

```env
# REQUIRED — your Groq API key from console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# REQUIRED for production — generate a secure random secret:
#   python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-64-char-hex-secret-here

# Optional — SQLite is fine for local dev
DATABASE_URL=sqlite:///./skindetector.db

# Optional — add your Vercel/Render/etc. URL if deploying
ALLOWED_ORIGINS=http://localhost:5173
```

> **Security note:** Never commit the real `.env` file. It is listed in `.gitignore` and will never be tracked by git.

### 4. Run database migrations

```bash
cd backend
alembic upgrade head
cd ..
```

This creates `backend/skindetector.db` with all required tables (users, analyses, conflict_pairs, contact_queries).

### 5. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API is now running at `http://localhost:8000`. Check `http://localhost:8000/api/health` to verify.

### 6. Frontend setup (in a new terminal)

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

The app opens at `http://localhost:5173`.

> **WSL2 note:** If you're on Windows Subsystem for Linux, run both `npm install` and `npm run dev` from inside WSL — not from Windows Explorer or a Windows terminal. Installing node_modules on Windows and running them on Linux causes native binding errors.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | **Yes** | — | Groq API key from console.groq.com |
| `SECRET_KEY` | **Yes** | insecure default | JWT signing secret. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | No | `sqlite:///./skindetector.db` | SQLAlchemy database URL. Use `postgresql://...` for production |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS origins, e.g. `https://myapp.vercel.app` |

---

## Project Structure

```
SkinDetectorApp/
├── backend/
│   ├── main.py              # FastAPI app, all API endpoints
│   ├── models.py            # SQLAlchemy ORM models (User, Analysis, ConflictPair, ContactQuery)
│   ├── auth.py              # JWT create/verify, bcrypt hashing
│   ├── config.py            # Env var loading (SECRET_KEY, GROQ_API_KEY, etc.)
│   ├── db.py                # SQLAlchemy engine + session factory
│   ├── requirements.txt     # Python dependencies (exact versions pinned)
│   ├── migrations/          # Alembic migration scripts
│   │   └── versions/        # Individual migration files
│   ├── ml/
│   │   ├── analyzer.py      # Groq vision call → SkinAnalysis dataclass
│   │   └── recommendations.py  # Ingredient recommendations + conflict detection + AI recs
│   └── tests/
│       └── test_api.py      # Integration tests (pytest + in-memory SQLite)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component, screen-based routing
│   │   ├── api.js           # fetch wrappers, JWT helpers, expiry check
│   │   ├── index.css        # Tailwind v4 imports + CSS custom properties
│   │   └── components/
│   │       ├── LandingPage.jsx  # Public homepage (Hero, How It Works, Features, About, Contact)
│   │       ├── AuthForm.jsx     # Login / Register form
│   │       ├── NavBar.jsx       # Animated top navigation (collapses when logged out)
│   │       ├── Camera.jsx       # Webcam capture + file upload + analysis trigger
│   │       ├── ResultCard.jsx   # Analysis results display
│   │       ├── History.jsx      # Accordion list of past analyses
│   │       └── Admin.jsx        # Admin dashboard (stats, users, contact queries)
│   ├── index.html
│   ├── vite.config.js       # Vite config + `/api` proxy to backend:8000
│   └── package.json
├── .python-version          # Python 3.12 (read by pyenv)
├── .nvmrc                   # Node 20 LTS (read by nvm)
├── .env.example             # Template for environment variables (safe to commit)
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Liveness + readiness check |
| POST | `/api/auth/register` | — | Create account `{email, password}` |
| POST | `/api/auth/login` | — | Get JWT `{email, password}` → `{access_token}` |
| POST | `/api/analyze` | JWT | Analyze face image (multipart/form-data `file`) |
| GET | `/api/history` | JWT | Paginated past analyses `?limit=20&offset=0` |
| POST | `/api/contact` | — | Submit a contact query `{name, email, subject, message}` |
| GET | `/api/admin/stats` | JWT (admin) | Aggregate stats |
| GET | `/api/admin/users` | JWT (admin) | All registered users |
| GET | `/api/admin/contact` | JWT (admin) | All submitted contact queries |

Rate limits: login `5/minute`, analyze `10/minute` per IP.

---

## Making Yourself an Admin

By default all registered users are regular users. To grant admin access:

```bash
cd backend
python -c "
from db import SessionLocal
from models import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'your@email.com').first()
user.is_admin = True
db.commit()
print('Done')
db.close()
"
```

Then log out and log back in — the JWT will now include `is_admin: true` and the Admin link will appear in the nav.

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests use an in-memory SQLite database and mock all Groq API calls — no network access needed.

---

## Production Build

### Frontend

```bash
cd frontend
npm run build
# Output is in frontend/dist/
```

Serve `dist/` from any static host (Vercel, Netlify, Cloudflare Pages). Set the environment variable `VITE_API_URL` if your backend is on a different domain, and update `vite.config.js` proxy accordingly.

### Backend

For production, use a proper WSGI/ASGI host:

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Switch `DATABASE_URL` to PostgreSQL and set a strong `SECRET_KEY`.

---

## Troubleshooting

**`ModuleNotFoundError` on backend start**
Make sure your virtual environment is activated (`source .venv/bin/activate`) and you ran `pip install -r backend/requirements.txt`.

**`bcrypt` or `cryptography` fails to install**
These packages require build tools. First upgrade pip: `pip install --upgrade pip setuptools wheel`. If it still fails, install Rust (required by `cryptography`):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**`GROQ_API_KEY not set` / 401 errors from Groq**
Check that `backend/.env` contains your key and that it starts with `gsk_`. The `.env` file must be inside the `backend/` directory (same folder as `main.py`).

**Alembic `Target database is not up to date`**
Run `alembic upgrade head` from the `backend/` directory.

**`sqlite3.OperationalError: no such column` or `no such table`**
A new migration was added since you last ran. Run `alembic upgrade head` from `backend/`.

**Frontend shows blank / Tailwind not working**
If you installed `node_modules` on Windows and run on WSL2, delete `node_modules/` and run `npm install` again inside WSL.

**Node version error during `npm install`**
Vite 8 requires Node 18+. Run `node --version` to check. Use nvm to switch: `nvm install 20 && nvm use 20`.

**Camera not working**
Browsers require HTTPS or `localhost` for webcam access. The Vite dev server on `localhost:5173` works fine. For remote devices on your network, you may need a self-signed cert or `ngrok`.

**Logged in but getting 401 on analyze**
Your JWT has expired (tokens last 24 hours). Log out and log back in. The app will now detect expired tokens automatically on the client side and redirect to the login page.
