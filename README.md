# SkinDetectorApp

AI-powered skin analysis web app. Upload or capture a face photo to get your skin type, acne severity, Fitzpatrick tone, recommended skincare ingredients, ingredient conflict warnings, and personalized AI recommendations — all in real time via the Groq API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite, Alembic migrations, JWT auth |
| AI | Groq API — Llama 4 Scout (vision) for analysis, Llama 3 for recommendations |
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Auth | JWT (HS256), bcrypt passwords, rate limiting via SlowAPI |

---

## Prerequisites

Before you start, make sure you have:

- **Python 3.11+** — `python --version`
- **Node.js 18+** — `node --version`
- **npm 9+** — `npm --version`
- **A free Groq API key** — sign up at [console.groq.com](https://console.groq.com), no credit card required

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

# Install all Python dependencies
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

This creates `backend/skindetector.db` with all required tables (users, analyses, conflict_pairs).

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

> **WSL2 note:** If you're on Windows Subsystem for Linux, run `npm install` from inside WSL — not from Windows Explorer or a Windows terminal. Installing node_modules on Windows and running them on Linux causes native binding errors.

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
│   ├── models.py            # SQLAlchemy ORM models (User, Analysis, ConflictPair)
│   ├── auth.py              # JWT create/verify, bcrypt hashing
│   ├── config.py            # Env var loading (SECRET_KEY, GROQ_API_KEY, etc.)
│   ├── db.py                # SQLAlchemy engine + session factory
│   ├── requirements.txt     # Python dependencies
│   ├── migrations/          # Alembic migration scripts
│   │   └── versions/        # Individual migration files
│   ├── ml/
│   │   ├── analyzer.py      # Groq vision call → SkinAnalysis dataclass
│   │   └── recommendations.py  # Ingredient recommendations + conflict detection + AI recs
│   └── tests/
│       └── test_api.py      # 18 integration tests (pytest + in-memory SQLite)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component, screen-based routing
│   │   ├── api.js           # fetch wrappers, JWT helpers, isAdmin()
│   │   ├── index.css        # Tailwind v4 imports + CSS custom properties
│   │   └── components/
│   │       ├── AuthForm.jsx # Login / Register form
│   │       ├── NavBar.jsx   # Top navigation
│   │       ├── Camera.jsx   # Webcam capture + file upload + analysis trigger
│   │       ├── ResultCard.jsx  # Analysis results display
│   │       ├── History.jsx  # Accordion list of past analyses
│   │       └── Admin.jsx    # Admin dashboard (stats + user table)
│   ├── index.html
│   ├── vite.config.js       # Vite config + `/api` proxy to backend:8000
│   └── package.json
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
| GET | `/api/admin/stats` | JWT (admin) | Aggregate stats |
| GET | `/api/admin/users` | JWT (admin) | All registered users |

Rate limits: login `5/minute`, analyze `10/minute` per IP.

---

## Making Yourself an Admin

By default all registered users are regular users. To grant admin access, open the SQLite database:

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
# Example with gunicorn + uvicorn workers
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Switch `DATABASE_URL` to PostgreSQL and set a strong `SECRET_KEY`.

---

## Troubleshooting

**`ModuleNotFoundError` on backend start**
Make sure your virtual environment is activated (`source .venv/bin/activate`) and you ran `pip install -r backend/requirements.txt`.

**`GROQ_API_KEY not set` / 401 errors from Groq**
Check that `backend/.env` contains your key and that it starts with `gsk_`. The `.env` file must be inside the `backend/` directory (same folder as `main.py`).

**Alembic `Target database is not up to date`**
Run `alembic upgrade head` from the `backend/` directory.

**Frontend shows blank / Tailwind not working**
If you installed `node_modules` on Windows and run on WSL2, delete `node_modules/` and run `npm install` again inside WSL.

**Camera not working**
Browsers require HTTPS or `localhost` for webcam access. The Vite dev server on `localhost:5173` works fine. For remote devices on your network, you may need to add a self-signed cert or use `ngrok`.

**`sqlite3.OperationalError: no such column`**
A new migration was added since you last ran. Run `alembic upgrade head` from `backend/`.
