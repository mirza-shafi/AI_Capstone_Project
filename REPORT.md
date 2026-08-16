# Final Report: TriageIQ — AI-Powered Customer Support Inbox Assistant

## 1. Introduction

TriageIQ addresses a problem common to any small business running customer support over
Facebook Messenger or WhatsApp: incoming messages arrive as a single undifferentiated
stream — sales questions, complaints, support requests, and spam all mixed together, in
arrival order rather than priority order. The full problem statement and proposed
solution are in [PROPOSAL.md](./PROPOSAL.md); this report covers what was actually
built, the AI methodology and its measured results, the design decisions made along the
way, and what was learned.

The system automatically classifies every incoming message by **intent** (Sales
Inquiry, Support-Technical, Complaint, Spam-Irrelevant) and **urgency** (Low, Medium,
High), sorts a support agent's queue accordingly, and drafts an editable AI reply
suggestion grounded in a short business-policy context. An analytics view summarizes
inbox composition by intent and urgency.

## 2. System Architecture

```
┌─────────────┐     REST/JSON      ┌──────────────┐
│   React     │◄──────────────────►│   FastAPI     │
│  (Vite,     │                    │   backend     │
│  Tailwind)  │                    │              │
└─────────────┘                    └──────┬───────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                   ┌──────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐
                   │ SQLAlchemy │   │  scikit-learn│  │  Groq API   │
                   │  + SQLite/ │   │  classifier  │  │ (Llama 3.3  │
                   │  Postgres  │   │  (intent +   │  │ 70B) — reply│
                   │            │   │   urgency)   │  │  generation │
                   └────────────┘   └─────────────┘  └─────────────┘
```

Backend and AI/ML code deliberately live in one Python process (no separate model-
serving service). At this scale — a synchronous scikit-learn `predict()` call and one
LLM API call per message — a microservice split would add operational complexity
(deployment, networking, latency) without a corresponding benefit; the classifier alone
in-process is what let message creation run through classification synchronously
without any queueing infrastructure.

**Data model** is intentionally a single `Message` table (plus `Customer`), not a full
conversation-thread model. A "sent reply" is just a `sent_reply` text field, `status`
flag, and `replied_at` timestamp on the same row, rather than a `Reply` table connected
via foreign keys. Modeling full multi-message conversation threads (like a real
Messenger/WhatsApp CRM would) was deliberately out of scope: the graded surface here is
the *triage and drafting workflow*, and a thread model would have added schema and UI
complexity without changing what's actually being evaluated.

## 3. AI Methodology

### 3.1 Why two AI techniques instead of one

Two different techniques were used, each for the sub-problem it's actually suited to:

- **Classification** (intent + urgency): a supervised, *trained and evaluated* model —
  not an LLM prompt — so accuracy is a real, measured number rather than a claim. It's
  also fast and cheap enough to run synchronously on every single incoming message.
- **Generation** (reply drafting): a large language model, because the output space
  (fluent, context-appropriate free text) isn't something a classifier can produce.

### 3.2 Dataset construction

`backend/ml/generate_dataset.py` builds a synthetic labeled dataset via **templates
with slot substitution**: each of the 12 (intent, urgency) combinations has 4–12
sentence templates with placeholders (product, color, size, location, time reference,
order ID, bulk quantity), filled with randomly sampled values. This produces **480
messages**, perfectly balanced — 40 per (intent, urgency) combination — with
deterministic labels (no manual labeling, no label noise from human annotation error).

This approach was chosen over manually writing hundreds of individual examples because
it's reproducible (fixed random seed), infinitely extensible (add a template, regenerate),
and label-accurate by construction. Its main weakness — discussed in §4 — is that
templated text is *lexically cleaner* than what a classifier will see in production.

### 3.3 Classifier

Two independent scikit-learn pipelines (`TfidfVectorizer(ngram_range=(1,2))` +
`LogisticRegression`) — one for intent, one for urgency — trained on an 80/20 stratified
split (stratified on the combined intent+urgency label, so both dimensions stay
balanced across train and test). Independent pipelines rather than one multi-output
model, because intent and urgency are different label sets over the same text, and
keeping them separate is simpler to reason about, train, and evaluate than a joint
multi-output setup.

### 3.4 Reply generation

`backend/app/ai/reply_gen.py` calls the Groq API (Llama 3.3 70B) with a system prompt
containing a short hardcoded FAQ/policy snippet (delivery times, return policy, payment
methods, bulk discount) plus the customer's message and the classifier's detected
intent. This is deliberately lightweight retrieval — a fixed context block, not a vector
database — proportionate to a business with a handful of policies rather than a large
knowledge base. The prompt explicitly instructs the model not to invent order-specific
details it doesn't have (e.g., exact order status), and to acknowledge and defer instead
— this was verified in testing (see §4.3).

Groq was used instead of a paid frontier-model API specifically so the project runs
free end-to-end, on both the developer's machine and whoever else runs it (a real
constraint for course-graded, publicly-repo'd software, not just a cost optimization).

## 4. Results

### 4.1 Held-out split: 100% — and why that number alone is misleading

On the 96-example held-out test split (drawn from the same templates as training), both
the intent and urgency classifiers score **100% accuracy**, with a perfect diagonal
confusion matrix on both. Taken alone, this number is not very informative: it mostly
demonstrates that the *templates* are lexically distinctive (a "CONGRATULATIONS!! You
won a free X, click here to claim!!!" spam template shares almost no vocabulary with a
"My order #12345 was supposed to arrive 3 days ago" support-technical template), not
that the model generalizes to real, messy customer text. A perfect score on a test set
drawn from the same generative process as training is expected, not impressive.

### 4.2 Hard-eval set: 70% intent / 56.7% urgency — the more honest number

To get a realistic effectiveness measure, a second, separate 30-example set was
hand-written (not templated) with intentionally harder, more realistic phrasing:
informal English ("kinda disappointed ngl"), romanized Bangla/English code-switching
("bhaia XL size ache?", "amar order ta cancel korte chai"), very short/ambiguous
messages ("hey", "..."), and sarcasm. This set was never seen during training.

| | Accuracy | Macro F1 |
|---|---|---|
| Intent (hard-eval) | 70.0% | 0.696 |
| Urgency (hard-eval) | 56.7% | 0.486 |

**Intent held up better than urgency, and there's a concrete reason why.** Intent
categories have strong, distinctive lexical anchors even in informal text — "price",
"available", "size" signal Sales Inquiry; "refund", "broken", "disappointed" signal
Complaint — so even code-switched or slangy phrasing around those anchor words often
still classifies correctly. Urgency has no equivalent anchor vocabulary: it's carried by
*tone and emphasis* (repetition, informal intensifiers like "ngl", "tbh", "rn",
Banglish emphasis patterns) rather than distinctive words, and a TF-IDF vectorizer
fit on the templated training set has literally never seen most of these tokens — they
contribute nothing to the model's decision, effectively discarding the exact signal
urgency depends on most.

The per-class breakdown supports this: **Spam-Irrelevant hit 100% recall but only 60%
precision** on the hard set — the model correctly catches all real spam, but also
misclassifies some genuinely short/ambiguous customer messages ("hey") as spam, because
short-and-generic is itself a pattern the spam class (which includes templates like
"Hello", ".") over-represents. **High urgency similarly shows high recall (60%) but very
low precision (27%)** — it over-fires on messages that aren't actually urgent, again
because it's pattern-matching on the *wrong* signal (surface length/structure) rather
than tone, which it was never given adequate vocabulary to detect.

**Practical takeaway**: for a real deployment in this market, the single highest-value
next step for the classifier isn't more templated data — it's a training set that
includes genuine Banglish and informal English from the start, or a multilingual
sentence-embedding model in place of TF-IDF, so tone-carrying tokens that fall outside a
narrow English training vocabulary aren't silently dropped.

### 4.3 Reply generation: qualitative check

Reply generation isn't accuracy-scored (there's no single correct reply), so it was
checked qualitatively against the golden path and an edge case:

- *Sales Inquiry* ("Do you have the black hoodie in size L? How much does it cost and
  how long is delivery to Chittagong?") → the model correctly used the FAQ context for
  delivery time (5-7 business days outside Dhaka) and **did not invent a price**,
  explicitly saying it would follow up on pricing/availability — exactly the
  "acknowledge, don't fabricate" behavior the prompt asks for.
- *Complaint, High urgency* ("The product I received is broken and doesn't turn on at
  all. Very disappointed.") → the model produced an apologetic, appropriately serious
  reply that offered to look into a return/exchange without promising a specific
  outcome it can't guarantee.

Both suggestions were coherent, on-tone, and safe to send after a quick human edit —
the intended usage pattern.

## 5. Frontend & UX Design Decisions

- **Master-detail inbox layout**, not a flat table: this is the standard pattern for
  message-triage tools (email clients, support desks) because it lets an agent scan a
  sorted queue and act on one item without losing their place in the list.
- **Urgency owns color** (red/amber/green pill), **intent stays neutral** (icon +
  gray chip): putting both intent and urgency in saturated, different colors would
  compete for attention on the same card. Urgency is the dimension that most needs a
  fast, at-a-glance read (it drives sort order), so it gets the color; intent is
  identified by icon + label instead.
- **"Simulate message"** lets a reviewer exercise the full classify → triage → draft →
  send pipeline live, without needing database access or a seed script — useful both
  for demoing the AI integration and as an ad hoc test tool during development.

## 6. Deployment

Backend deploys to Render via `render.yaml` (a Blueprint provisioning the web service
and a free Postgres database together — Render's free web services have an *ephemeral*
filesystem, so SQLite alone would lose all data on every redeploy or restart in
production; the same SQLAlchemy code runs against SQLite locally and Postgres in
production, selected purely by the `DATABASE_URL` environment variable). Frontend
deploys to Vercel as a static Vite build, with a `vercel.json` rewrite rule so
client-side routes (`/analytics`) resolve correctly on direct load/refresh.

<!-- Live URLs added here once deployed. -->

## 7. Limitations & Future Work

- **Urgency detection is the weakest link** (§4.2) — the clearest, most concrete next
  step identified by this project's own evaluation, not a generic caveat.
- **No real Messenger/WhatsApp integration.** "Sending" a reply is simulated
  (persisted, marked sent) rather than calling Meta's Graph API, which would require
  business verification and app review outside this project's scope.
- **Single-agent, no authentication.** Scope was kept on the AI triage/reply workflow
  rather than multi-user access control.
- **No conversation threading** — each message is triaged independently; a real
  deployment would want to consider prior messages from the same customer when scoring
  urgency (a customer's *third* message about the same issue is more urgent than their
  first, which the current per-message classifier has no way to know).

## 8. Conclusion

TriageIQ demonstrates a complete, working pipeline from raw customer message to a
triaged, prioritized queue with an AI-drafted response — combining a trained/evaluated
classifier with an LLM generation step, each doing the part it's suited for. The most
useful outcome of the evaluation wasn't the 100% number on the easy split, but the
70%/56.7% hard-eval numbers and the specific, actionable reason urgency underperforms
intent: a concrete, data-backed direction for improving the system further, rather than
a vague "more data would help."
