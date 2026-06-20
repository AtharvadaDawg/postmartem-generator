# Prompt Design — Infra Postmortem Generator

**Project:** Digitide Internship · Cloud Infra Management
**Last updated:** June 2026

---

## 1. Purpose

This document records the prompt engineering decisions made while building
the postmortem generation feature — what was tried, what failed, why it
failed, and what the current prompt looks like. This is intentionally written
as a decision log rather than just a final answer, since the iteration process
itself is part of the engineering work being evaluated.

---

## 2. Design goals for the prompt

The prompt needs to reliably produce two distinct outputs from one LLM call:

1. A **technical** postmortem — structured, complete, written for engineers
2. A **non-technical** postmortem — plain English, no jargon, written for
   stakeholders such as account managers or client contacts

Both must be extractable programmatically and reliably, even when running
against a small free-tier model rather than a flagship model like GPT-4 or
Claude Opus — since the project's LLM access (see `system-design.md`, Section
6.1) ended up being a free-tier model via OpenRouter rather than a paid
frontier model.

---

## 3. Iteration 1 — plain text with section markers

**Prompt approach:**

```
Write your response in this exact format:

TECHNICAL VERSION:
[postmortem content]

NON-TECHNICAL VERSION:
[summary content]
```

**Backend parsing:**

```python
parts = full_text.split("NON-TECHNICAL VERSION:")
technical = parts[0].replace("TECHNICAL VERSION:", "").strip()
non_technical = parts[1].strip() if len(parts) > 1 else ""
```

**Result:** Worked initially against larger models, but proved fragile. The
marker text itself was sometimes reworded slightly by the model (e.g.
"Technical Postmortem:" instead of "TECHNICAL VERSION:"), which silently broke
the split and left `non_technical` empty with no error raised.

**Verdict:** Abandoned — too fragile for a free-tier model with looser
instruction-following.

---

## 4. Iteration 2 — strict JSON output

**Prompt approach:**

```
Return ONLY valid JSON in exactly this format:

{
  "technical": "...",
  "non_technical": "..."
}

Do not include markdown.
Do not include code fences.
Return only JSON.
```

**Backend parsing:**

```python
result = json.loads(full_text)
technical = result.get("technical", "")
non_technical = result.get("non_technical", "")
```

**Result:** More reliable than plain-text markers, but introduced a new
failure mode — the model sometimes returned `technical` as a **nested JSON
object** (e.g. `{"Summary": "...", "Timeline": [...], "Root Cause": "..."}`)
instead of a single string, even though the prompt explicitly asked for a
string. This happened consistently with `meta-llama/llama-3.1-8b-instruct`,
likely because the model's training data contains many examples of postmortem
templates as structured objects, and it defaulted to that pattern.

**Verdict:** Kept the JSON structure, but added a backend-side normalisation
step (see Section 5) rather than fighting the model further with prompt
changes alone — see Section 6 for why.

---

## 5. Current solution — JSON output + backend normalisation

The final prompt still requests strict JSON, but the backend now defensively
handles both possible shapes for the `technical` field:

```python
if isinstance(technical_raw, dict):
    technical = ""
    for key, value in technical_raw.items():
        technical += f"## {key}\n"
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    technical += "- " + ", ".join(f"{k}: {v}" for k, v in item.items()) + "\n"
                else:
                    technical += f"- {item}\n"
        else:
            technical += f"{value}\n"
        technical += "\n"
else:
    technical = technical_raw
```

This converts a nested object into the same Markdown-style formatted text a
well-behaved string response would have produced, so the frontend rendering
logic in `OutputPage.jsx` never needs to know which shape the model actually
returned.

---

## 6. Why normalise on the backend instead of fixing it purely in the prompt

This was a deliberate engineering trade-off, not an oversight:

- Free-tier models are less reliable at strictly following format
  instructions than paid frontier models. Continuing to add more prompt
  constraints has diminishing returns and makes the prompt longer and more
  brittle for marginal reliability gains.
- A defensive parser on the backend is a one-time engineering cost that makes
  the system robust to *any* future model swap — including upgrading to a
  better model later without needing to re-tune the prompt.
- This mirrors a real production pattern: LLM output should always be treated
  as untrusted/unpredictable input and validated or normalised server-side,
  the same way you would validate any external API response.

---

## 7. Current full prompt template

```
You are a Site Reliability Engineer (SRE).

Analyze the incident timeline below and generate a JSON response.

TIMELINE:
{timeline_text}

Return ONLY valid JSON in exactly this format:

{
  "technical": "Detailed technical postmortem as a single string. Use \n\n between each section. Format each section as: ## SectionName\nContent here. Include sections: Summary, Timeline, Root Cause, Impact, Resolution, Action Items",
  "non_technical": "Plain-English summary for business stakeholders as a single string, with \n\n between paragraphs"
}

Do not include markdown code fences.
Both "technical" and "non_technical" must be plain strings, not nested objects.
Return only JSON.
```

The `{timeline_text}` placeholder is built by formatting each event as:

```
[LEVEL] ServiceName: message text
Note: any user-added annotation, if present
```

This keeps the timeline compact and token-efficient while preserving the
information the model needs — severity, source, and content — in the order
the incident actually happened.

---

## 8. Model in use

**Model:** `meta-llama/llama-3.1-8b-instruct` via OpenRouter
**Temperature:** `0.3` — chosen to favour consistent, structured output over
creative variation, since postmortems benefit from predictable formatting
more than stylistic diversity.
**Max tokens:** `1500` — sufficient for a full dual-audience postmortem
without truncation in testing so far; should be re-evaluated once tested
against the longer `db_pool_exhaustion` and `bad_deployment` scenarios.

---

## 9. Open questions for future iteration

- Should annotation notes be given more prominence in the prompt (e.g. a
  dedicated "Engineer Notes" section) rather than being interleaved inline
  with each event? Currently unclear whether the model is weighting them
  appropriately.
- Worth testing whether a slightly larger free-tier model (e.g.
  `mistralai/mistral-7b-instruct:free`) produces more consistently flat JSON
  without needing the Section 5 normalisation step at all — would simplify
  the backend if so.
- No evaluation has yet been done comparing generated postmortems against a
  human-written baseline for quality — this is planned for the Week 7
  evaluation report.
