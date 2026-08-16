# Project Proposal: TriageIQ — AI-Powered Customer Support Inbox Assistant

## 1. Problem Statement

Small and medium businesses increasingly run customer support over social channels —
Facebook Messenger, WhatsApp, Instagram DMs — instead of email or phone. In practice
this produces a single, undifferentiated inbox where **sales inquiries, technical
support requests, complaints, and spam all arrive mixed together, in the order they
happened to be sent rather than the order they matter.**

This creates two concrete failures that are easy to observe in any small support team:

1. **Urgent or angry customers get buried.** A frustrated customer's message sits behind
   ten routine "what's the price?" questions simply because it arrived later.
2. **Every message costs the same amount of human attention**, even though most incoming
   messages are repetitive and could be handled with a fast, templated response — while
   a minority genuinely need a human's full attention and judgment.

The result is slower response times, inconsistent reply quality, and support staff
spending their time re-reading and re-typing similar answers instead of handling the
messages that actually need a person.

This problem is not hypothetical — it mirrors real patterns observed while building a
production multi-tenant Facebook/WhatsApp CRM, where message volume and mixed intent
(sales vs. support vs. spam) is a constant operational challenge for the businesses using
it. This project addresses the same problem class using only synthetic data, as a
self-contained, independently deployable system.

## 2. Proposed Solution

**TriageIQ** is a support-agent dashboard that automatically triages every incoming
customer message so agents work a prioritized queue instead of a raw, unsorted stream:

- Every message is automatically tagged with an **intent** (Sales Inquiry,
  Support/Technical, Complaint, Spam/Irrelevant) and an **urgency level**
  (Low / Medium / High).
- The queue view is sortable and filterable by urgency and intent, so high-urgency
  complaints surface immediately regardless of arrival order.
- Opening a message shows an **AI-drafted reply suggestion** that the agent can edit
  before sending — cutting typing time on repetitive questions while keeping a human in
  the loop for every send.
- An analytics view summarizes message volume by intent and urgency, giving a manager a
  quick read on what the inbox actually contains.

## 3. AI Approach

Two complementary AI techniques are used, each doing the part it is best suited for:

1. **Classification (scikit-learn, TF-IDF + Logistic Regression).** A supervised model
   trained on a labeled dataset of customer messages predicts intent and urgency. This is
   deliberately a *trained and evaluated* model, not just an LLM prompt — it is fast,
   cheap to run on every incoming message, and its accuracy can be measured directly
   (accuracy, per-class precision/recall/F1, confusion matrix) against a held-out test
   set, giving a concrete, reportable measure of effectiveness.
2. **Generation (LLM — Groq API, Llama 3.3 70B).** For reply drafting, a large language
   model is better suited than a classifier: it needs to produce fluent,
   context-appropriate free text. The prompt combines the customer's message, the
   classifier's detected intent, and a short hardcoded FAQ/policy snippet (lightweight
   retrieval) so drafts stay grounded rather than generic. Groq was chosen over a paid
   frontier-model API specifically so the project stays reproducible on a free tier — the
   generation quality/latency tradeoff is discussed in the Final Report.

Using both together means the system is graded on a real, measurable classifier
(quantitative evaluation) *and* a visibly useful generative feature (qualitative,
product-facing value) — rather than relying on a single technique to carry both jobs.

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Python, FastAPI, SQLAlchemy, SQLite | Keeps API and ML/AI code in one process (no cross-service calls for inference); SQLite needs no separate DB server for a project this size and deploys free. |
| AI/ML | scikit-learn, `joblib`, Groq API | scikit-learn gives a fast, explainable, evaluable baseline classifier; Groq (free tier, Llama 3.3 70B) handles the generative reply-drafting task. |
| Frontend | React (Vite), Tailwind CSS | Fast dev loop, component-based UI suited to a queue/detail/analytics dashboard. |
| Deployment | Render (backend + frontend + Postgres) | One platform for all three pieces via a single `render.yaml` Blueprint — free tier, native support for Python/FastAPI and static Vite builds. |
| Version control | Git + GitHub | Incremental commits per milestone (scaffold → backend → classifier → reply generation → frontend → deployment → docs). |

## 5. Scope Boundaries

- All data is synthetically generated for this project — no real customer data from any
  production system is used, stored, or exposed.
- "Sending" a reply in the dashboard is simulated (persisted to the database and marked
  sent); this project does not integrate with the real Meta Messenger/WhatsApp Business
  APIs, which would require app review and business verification outside this project's
  scope.
- Authentication is intentionally minimal (single support-agent view) to keep scope
  focused on the AI triage/reply workflow, which is the core of this project.
