# TriageIQ — AI-Powered Customer Support Inbox Assistant

AI Capstone Project. TriageIQ automatically classifies incoming customer support
messages by **intent** and **urgency**, and drafts an **AI-suggested reply** for each
one, so support agents work a prioritized queue instead of a raw, unsorted inbox.

See [PROPOSAL.md](./PROPOSAL.md) for the full problem statement, solution design, and
AI approach, and [REPORT.md](./REPORT.md) for the final write-up (design decisions,
evaluation results, and conclusions).

## Project Structure

```
AI_Capstone_Project/
├── PROPOSAL.md         Problem statement, solution, AI approach, tech stack
├── REPORT.md           Final report: design decisions, results, conclusions
├── render.yaml          Render Blueprint (backend web service + Postgres)
├── backend/            FastAPI app + AI/ML code
│   ├── app/             API (routes, models, schemas, AI inference)
│   ├── ml/               Dataset generation + classifier training
│   └── tests/
├── frontend/            React (Vite) + Tailwind dashboard
│   └── vercel.json       SPA rewrite rules
└── docs/screenshots/     Screenshots referenced from this README
```

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy — SQLite locally, Postgres in production
  (Render free Postgres; the same code runs on both, only `DATABASE_URL` changes)
- **AI/ML**: scikit-learn (intent + urgency classifier), Groq API — Llama 3.3 70B (reply
  suggestion generation, free tier)
- **Frontend**: React (Vite), Tailwind CSS
- **Deployment**: Render (backend), Vercel (frontend)

## AI Model Summary

| Task | Approach | Notes |
|---|---|---|
| Intent classification (Sales / Support / Complaint / Spam) | TF-IDF + Logistic Regression (scikit-learn) | Trained on a synthetic labeled dataset; evaluated with accuracy/precision/recall/F1 on a held-out split — see `backend/ml/metrics.json` after training and REPORT.md for full results. |
| Urgency scoring (Low / Medium / High) | Same classifier pipeline, second label | Same dataset/evaluation as above. |
| Reply suggestion | Groq API, Llama 3.3 70B (prompted with message + detected intent + FAQ context) | Generative — evaluated qualitatively, not accuracy-scored. |

## Setup & Run Instructions

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY (free — console.groq.com/keys)
python ml/generate_dataset.py    # generates backend/ml/data/messages.csv
python ml/train_classifier.py    # trains + evaluates, writes model.joblib + metrics.json
uvicorn app.main:app --reload    # http://localhost:8000  (docs at /docs)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if backend isn't on localhost:8000
npm run dev             # http://localhost:5180
```

## Deployment

The backend deploys via the `render.yaml` Blueprint (web service + free Postgres,
auto-wired). The frontend deploys as a static Vite build on Vercel. Order matters
because each side needs the other's URL:

1. **Push to GitHub** (this repo already syncs there — see the repo's remote).
2. **Backend on Render**: [dashboard.render.com](https://dashboard.render.com) → New →
   Blueprint → select this repo → Render reads `render.yaml` and provisions the web
   service + database automatically. Before the first deploy finishes, set the two
   `sync: false` env vars on the `triageiq-backend` service:
   - `GROQ_API_KEY` — your key from [console.groq.com/keys](https://console.groq.com/keys)
   - `ALLOWED_ORIGINS` — leave as `http://localhost:5180` for now, update after step 3
   Note the deployed backend URL (`https://triageiq-backend-xxxx.onrender.com`).
3. **Frontend on Vercel**: [vercel.com/new](https://vercel.com/new) → import this repo →
   set **Root Directory** to `frontend` → add env var `VITE_API_URL` = the Render URL
   from step 2 → Deploy. Note the deployed frontend URL.
4. **Close the loop**: back in Render, update `ALLOWED_ORIGINS` to the Vercel URL from
   step 3 (comma-separate if you keep localhost too) and let it redeploy.

- Frontend: _TBD — add the Vercel URL here after deploying_
- Backend API: _TBD — add the Render URL here after deploying (Swagger docs at `/docs`)_

## Screenshots

_Added in `docs/screenshots/` once the dashboard is built — see REPORT.md for the full
walkthrough._
