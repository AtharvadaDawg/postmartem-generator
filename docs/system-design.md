# System Design — Infra Postmortem Generator

**Project:** Digitide Internship · Cloud Infra Management
**Author:** Intern · Cloud Infra Management
**Last updated:** June 2026
**Status:** Skeleton functional — Screens 1–3 working end to end

---

## 1. Overview

The Infra Postmortem Generator is a three-screen web application that takes raw
incident log data, builds a reviewable timeline, and uses an LLM to generate a
dual-audience postmortem (technical and non-technical versions).

The system is split into a React frontend and a FastAPI backend, communicating
over a local REST API. The LLM call happens entirely on the backend so API keys
are never exposed to the browser.

---

## 2. High-level architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   React Frontend     │  HTTP   │   FastAPI Backend     │  HTTPS  │   LLM Provider    │
│   localhost:5173      │ ──────▶ │   localhost:8000       │ ──────▶ │  (OpenRouter /     │
│                      │ ◀────── │                        │ ◀────── │   Anthropic)        │
└─────────────────────┘         └──────────────────────┘         └─────────────────┘
        │                                  │
        │                                  │
        ▼                                  ▼
  3-screen UI flow                 Log parsing, prompt
  (Upload → Timeline →             building, LLM call,
   Output)                         export generation
```

Vite's dev server proxies any request to `/api/*` straight to the FastAPI
backend on port 8000, so the frontend never needs to know the backend's full
URL — this also avoids CORS issues during local development.

---

## 3. The three-screen flow

### Screen 1 — Upload (`UploadPage.jsx`)

The entry point. Three input methods, each calling the same backend endpoint:

- **Paste JSON** — user pastes raw CloudWatch-style log JSON into a textarea
- **Upload File** — user selects a `.json`/`.log`/`.txt` file from disk
- **Load Sample** — loads a pre-built mock incident for demo purposes

All three methods route to `POST /api/parse-logs`, which returns a structured
list of events. The "Load Sample" path instead calls `GET /api/sample-incident`,
which returns a hardcoded 12-event payment outage scenario directly from the
backend — useful for fast demos without needing log data on hand.

### Screen 2 — Timeline (`TimelinePage.jsx`)

Displays every parsed event as a colour-coded card (INFO/WARN/ERROR/FATAL) on
a vertical timeline. The user can:

- **Annotate** any event with a free-text note (stored in local component state)
- **Remove** noisy or irrelevant events before generating the postmortem

A stats bar at the top summarises event count, error count, warning count, and
the list of affected services — giving the user a quick read on incident
severity before they commit to generating a report.

Clicking **Generate Postmortem** passes the (possibly edited) event list to
Screen 3.

### Screen 3 — Output (`OutputPage.jsx`)

On mount, this screen calls `POST /api/generate-postmortem` with the final
event list. While waiting (~5–10 seconds), a loading state is shown. Once the
response returns, the user can toggle between:

- **Technical** — full postmortem with Summary, Timeline, Root Cause, Impact,
  Resolution, and Action Items
- **Non-Technical** — plain-English summary for non-engineering stakeholders

An **Export .md** button downloads whichever version is currently active as a
Markdown file.

---

## 4. Backend design

All backend logic lives in `backend/main.py` for the skeleton phase. As the
project matures past Week 4, this should be split into the dedicated modules
already scaffolded in the repo (`log_parser.py`, `prompt_builder.py`,
`llm_client.py`, `export_service.py`) to keep `main.py` focused purely on
routing.

### Endpoints

| Method | Path                       | Purpose                                              |
|--------|----------------------------|-------------------------------------------------------|
| GET    | `/api/health`              | Confirms the backend is running                      |
| POST   | `/api/parse-logs`          | Parses raw log JSON/text into structured events       |
| GET    | `/api/sample-incident`     | Returns a hardcoded demo incident (12 events)         |
| POST   | `/api/generate-postmortem` | Sends the timeline to the LLM, returns dual-audience postmortem |

### Why FastAPI

FastAPI was chosen over a Node/Express backend because Python has stronger
libraries for the eventual log-parsing and PDF export work (`weasyprint`), and
because most LLM SDKs (OpenAI-compatible, Anthropic) have first-class Python
support. FastAPI's automatic interactive docs at `/docs` also proved valuable
during development — every endpoint was manually tested there before being
wired into the frontend, which caught several issues early (see Section 6).

---

## 5. LLM integration

The LLM call is routed through an OpenAI-compatible client pointed at
**OpenRouter**, which provides access to multiple free-tier models behind a
single API. This was a deliberate fallback decision — see Section 6 for the
reasoning.

The model currently in use is `meta-llama/llama-3.1-8b-instruct`. The prompt
asks the model to return strict JSON with two string fields (`technical` and
`non_technical`), which the backend parses and returns directly to the
frontend. Full prompt structure and design rationale are documented separately
in `docs/prompt-design.md`.

---

## 6. Key design decisions & trade-offs

### 6.1 LLM provider — three iterations

The project went through three LLM provider choices before settling on a
working configuration:

1. **OpenAI** — not used; no API key was available for this internship.
2. **Google Gemini** — initially selected for its free tier, but the free
   quota returned `limit: 0` for the account region, making it unusable
   without enabling billing.
3. **Anthropic Claude** — worked correctly but required paid credits with no
   free tier available at signup.
4. **OpenRouter (final choice)** — provides free-tier access to several open
   models (Llama, Mistral, etc.) through an OpenAI-compatible API, requiring
   no billing setup. This unblocked development without cost.

This is documented here specifically because it is a real example of an
engineering trade-off made under a budget constraint — relevant for the
project's evaluation report and retrospective.

### 6.2 JSON output vs. plain-text markers

Early prompt versions asked the LLM to separate technical and non-technical
content using plain-text markers (`TECHNICAL VERSION:` / `NON-TECHNICAL
VERSION:`) split on the backend with Python string operations. This worked
inconsistently — smaller free-tier models sometimes nested the technical
content as a JSON object instead of a string, breaking the split logic.

The current approach explicitly prompts for strict JSON with two string
fields, and the backend includes a fallback handler that flattens nested
objects into formatted text if the model still returns a non-flat structure.
This makes the system resilient to small variations in model output without
requiring a larger (and more expensive) model.

### 6.3 Annotation state kept client-side only

Event annotations made on the Timeline screen are stored in React state and
are not persisted to a backend or database. This was an intentional scope
decision for the 2-month internship timeline — persistence would require
session handling or a database layer, which is explicitly out of scope (see
`problem-statement.docx`, Section 6).

---

## 7. Planned extensions (not yet built)

- **CloudWatch integration** — `CloudWatchPicker.jsx` and
  `cloudwatch_client.py` are scaffolded but not yet wired in. The design
  intent is for the backend to expose a `fetch_logs()` interface with two
  implementations (mock and real AWS via `boto3`), switched by an
  `AWS_MOCK` environment variable — meaning the frontend and `log_parser.py`
  require zero changes once live AWS access is enabled.
- **PDF export** — currently only Markdown export is implemented via direct
  blob download. PDF export via WeasyPrint is planned for Week 6.
- **Module split** — `main.py` should be decomposed into the scaffolded
  `log_parser.py`, `prompt_builder.py`, `llm_client.py`, and
  `export_service.py` files before the Week 4 milestone review.

---

## 8. Local development

Two processes must run concurrently:

```bash
# Terminal 1 — backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://127.0.0.1:8000`
Backend interactive docs: `http://127.0.0.1:8000/docs`

Environment variables required in `backend/.env` (never committed):

```
LLM_API_KEY=your_openrouter_key_here
```
