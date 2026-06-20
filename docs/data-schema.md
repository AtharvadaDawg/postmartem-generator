# Data Schema — Infra Postmortem Generator

**Project:** Digitide Internship · Cloud Infra Management
**Last updated:** June 2026

---

## 1. Purpose

This document defines every data shape that moves through the system: the raw
log input format, the structured event format used internally, and the API
request/response shapes for each endpoint. Keeping this format aligned with
real AWS CloudWatch Logs output is a deliberate design choice — see Section 2.

---

## 2. Why the schema mirrors AWS CloudWatch Logs

All mock data in this project is structured to exactly match the JSON shape
AWS CloudWatch Logs returns from a `FilterLogEvents` API call. This means that
when live AWS access is enabled (see `cloudwatch-setup.md`), the existing
`log_parser.py` requires zero changes — only the data source changes, from a
mock JSON file to a live `boto3` call.

---

## 3. Raw input format (CloudWatch-style)

This is the format expected by `POST /api/parse-logs` and the format used in
all files under `mock-data/`.

```json
{
  "logEvents": [
    {
      "timestamp": 1700000060000,
      "message": "{\"level\": \"ERROR\", \"service\": \"PaymentService\", \"message\": \"Gateway timeout after 3000ms — retrying\"}"
    }
  ]
}
```

### Field reference

| Field             | Type   | Description                                                        |
|--------------------|--------|----------------------------------------------------------------------|
| `timestamp`        | int    | Unix epoch time in **milliseconds** (CloudWatch convention)         |
| `message`          | string | A JSON-encoded string (note: it is a string, not a nested object — this matches real CloudWatch output) |

The `message` field, once parsed, contains:

| Field      | Type   | Description                                  |
|------------|--------|------------------------------------------------|
| `level`    | string | One of `INFO`, `WARN`, `ERROR`, `FATAL`         |
| `service`  | string | The service name that emitted the log line     |
| `message`  | string | The human-readable log message                 |

### Why `message` is a nested JSON string, not a flat object

Real CloudWatch log events always store `message` as a plain string — even if
the application logs structured JSON, CloudWatch does not parse it for you.
Mirroring this exactly (rather than flattening it for convenience) means the
parsing logic in `log_parser.py` is identical whether the source is a mock
file or a live AWS log group.

---

## 4. Internal event format (post-parsing)

This is the format produced by `POST /api/parse-logs` and consumed by every
downstream screen and endpoint.

```json
{
  "events": [
    {
      "timestamp": 1700000060000,
      "level": "ERROR",
      "service": "PaymentService",
      "message": "Gateway timeout after 3000ms — retrying",
      "note": ""
    }
  ]
}
```

### Field reference

| Field       | Type   | Required | Description                                                        |
|-------------|--------|----------|------------------------------------------------------------------------|
| `timestamp` | int    | yes      | Unix epoch time in milliseconds, used for chronological sort and display |
| `level`     | string | yes      | Severity level — drives the colour coding on the Timeline screen        |
| `service`   | string | yes      | Service name — used in the Timeline stats bar and grouped in the prompt  |
| `message`   | string | yes      | The log line text shown on the Timeline screen                         |
| `note`      | string | no       | User-added annotation from the Timeline screen; absent until annotated  |

### Severity levels and their colour mapping (frontend)

| Level   | Background | Border    | Text      |
|---------|------------|-----------|-----------|
| `INFO`  | `#EFF6FF`  | `#BFDBFE` | `#1D4ED8` |
| `WARN`  | `#FFFBEB`  | `#FDE68A` | `#B45309` |
| `ERROR` | `#FEF2F2`  | `#FECACA` | `#DC2626` |
| `FATAL` | `#FDF2F8`  | `#FBCFE8` | `#9D174D` |

---

## 5. API request/response schemas

### `POST /api/parse-logs`

**Request**
```json
{ "raw_logs": "<stringified JSON matching Section 3 format>" }
```

**Response**
```json
{ "events": [ /* array matching Section 4 format */ ] }
```

If parsing fails for any reason, the endpoint currently returns an empty
`events` array rather than raising an error — this is a known gap, see
Section 7.

---

### `GET /api/sample-incident`

No request body. Returns a hardcoded 12-event payment outage scenario in the
Section 4 format, used by the "Load Sample" option on the Upload screen for
fast demos.

---

### `POST /api/generate-postmortem`

**Request**
```json
{ "events": [ /* array matching Section 4 format, including any notes */ ] }
```

**Response (success)**
```json
{
  "technical": "## Summary\n...\n\n## Timeline\n...",
  "non_technical": "## What Happened\n...\n\n## Impact on Users\n..."
}
```

**Response (failure)**
```json
{ "error": "<exception message from the LLM call>" }
```

---

## 6. Mock incident datasets

Three incident scenarios exist under `mock-data/`, each following the Section
3 format:

| File                                   | Scenario                                  | Event count |
|------------------------------------------|---------------------------------------------|-------------|
| `incident_payment_outage.json`            | Gateway timeout cascading to a payment outage | 12          |
| `incident_db_pool_exhaustion.json`         | Database connection pool exhaustion           | TBD         |
| `incident_bad_deployment.json`             | Config change breaking authentication          | TBD         |

> The `payment_outage` scenario is currently the only one wired into
> `GET /api/sample-incident`. The other two exist as files but are not yet
> loaded by an endpoint — planned for Week 3 alongside the file upload path
> being tested against all three datasets.

---

## 7. Known gaps to address before Week 4 milestone

- `parse-logs` silently returns an empty array on malformed input instead of
  returning a 4xx error with a clear message — should be fixed so the
  frontend can show a meaningful error to the user.
- The `note` field is not currently included in the JSON sent to
  `generate-postmortem` in a clearly labelled way within the prompt — verify
  annotations are actually influencing LLM output, not just being silently
  dropped.
- No validation that `level` is one of the four expected values — a typo or
  unexpected value would currently fall back to default styling rather than
  being caught explicitly.
