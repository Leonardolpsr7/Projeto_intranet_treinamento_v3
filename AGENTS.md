# Base44 Dev Environment

This is a Flask-based corporate intranet (knowledge base + training + suggestions). The app was imported as a source zip; the repo previously held only a README.

## Run it

```
docker compose -f docker-compose.base44.yml up -d
```

- Web entry is on **host port 3000** (mapped to the Flask dev server on container port 5000).
- `python:3.11-slim` base image; the repo is bind-mounted at `/app`. Dependencies install from `requirements.txt` on container startup, then `python src/main.py` runs the app with Flask's debug reloader (live reload).
- Frontend is served by the same Flask app (single origin) from `src/static/index.html`.

## App specifics (non-obvious)

- Entry point: `src/main.py`. It inserts the repo root on `sys.path`, so modules are imported as `src.models...` / `src.routes...`. Always run from the repo root: `python src/main.py`.
- DB: SQLite at `src/database/app.db`. Tables are auto-created on boot (`db.create_all()`), and a default **admin / admin123** user is created if no `admin` exists. The `.db` file is git-ignored; the app recreates it on a fresh checkout.
- Knowledge base: `dados.xlsx` at the **repo root** (read with pandas/openpyxl). Admins can rewrite it via the knowledge-base API (writes a `.bak` then a `.temp.xlsx` then moves into place). It must stay writable.
- Auth: session cookies (`SESSION_COOKIE_HTTPONLY=True`, `SameSite=Lax`, `Secure=False` in dev). Login via `/api/login`. Route guards are local `login_required` / `admin_required` / `master_required` decorators, not Flask-Login.
- Uploads go to `uploads/training/` (git-ignored). `dados.xlsx` and `uploads/` must be writable in the sandbox (bind mount is).

## Secrets

- `SECRET_KEY` (Flask session signing). A development placeholder is generated automatically; the app also falls back to a built-in dev key if unset. Replace with a strong value for production via the Secrets dashboard.

## Verify

- `curl -I http://localhost:3000/` should return 200 and serve the SPA index.
- Default login: `admin` / `admin123`.
