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
├── backend/            FastAPI app + AI/ML code
│   ├── app/             API (routes, models, schemas, AI inference)
│   ├── ml/               Dataset generation + classifier training
│   └── tests/
├── frontend/            React (Vite) + Tailwind dashboard
└── docs/screenshots/     Screenshots referenced from this README
```

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **AI/ML**: scikit-learn (intent + urgency classifier), Anthropic Claude API (reply
  suggestion generation)
- **Frontend**: React (Vite), Tailwind CSS
- **Deployment**: Render (backend), Vercel (frontend)

## AI Model Summary

| Task | Approach | Notes |
|---|---|---|
| Intent classification (Sales / Support / Complaint / Spam) | TF-IDF + Logistic Regression (scikit-learn) | Trained on a synthetic labeled dataset; evaluated with accuracy/precision/recall/F1 on a held-out split — see `backend/ml/metrics.json` after training and REPORT.md for full results. |
| Urgency scoring (Low / Medium / High) | Same classifier pipeline, second label | Same dataset/evaluation as above. |
| Reply suggestion | Claude API (prompted with message + detected intent + FAQ context) | Generative — evaluated qualitatively, not accuracy-scored. |

## Setup & Run Instructions

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
python ml/generate_dataset.py    # generates backend/ml/data/messages.csv
python ml/train_classifier.py    # trains + evaluates, writes model.joblib + metrics.json
uvicorn app.main:app --reload    # http://localhost:8000  (docs at /docs)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if backend isn't on localhost:8000
npm run dev             # http://localhost:5173
```

## Live Deployment

- Frontend: _TBD — added after deployment (Vercel)_
- Backend API: _TBD — added after deployment (Render)_

## Screenshots

_Added in `docs/screenshots/` once the dashboard is built — see REPORT.md for the full
walkthrough._
