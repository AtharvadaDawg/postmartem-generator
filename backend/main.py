from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client_ai = OpenAI(
    api_key=os.getenv("LLM_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

class LogInput(BaseModel):
    raw_logs: str

class GenerateInput(BaseModel):
    events: list

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "Backend is running"
    }

@app.post("/api/parse-logs")
def parse_logs(input: LogInput):
    try:
        data = json.loads(input.raw_logs)
        log_events = data.get(
            "logEvents",
            data if isinstance(data, list) else []
        )
    except Exception:
        log_events = []

    events = []

    for e in log_events:
        try:
            msg = json.loads(e.get("message", "{}"))
        except Exception:
            msg = {"message": e.get("message", "")}

        events.append({
            "timestamp": e.get("timestamp", 0),
            "level": msg.get("level", "INFO"),
            "service": msg.get("service", "unknown"),
            "message": msg.get("message", str(msg))
        })

    return {"events": events}


@app.get("/api/sample-incident")
def sample_incident():
    events = [
        {
            "timestamp": 1700000000000,
            "level": "INFO",
            "service": "PaymentService",
            "message": "Request received: POST /api/v1/payments"
        },
        {
            "timestamp": 1700000012000,
            "level": "INFO",
            "service": "PaymentService",
            "message": "Connecting to payment gateway..."
        },
        {
            "timestamp": 1700000045000,
            "level": "WARN",
            "service": "PaymentService",
            "message": "Gateway response slow: 2400ms"
        },
        {
            "timestamp": 1700000060000,
            "level": "ERROR",
            "service": "PaymentService",
            "message": "Gateway timeout after 3000ms — retrying"
        },
        {
            "timestamp": 1700000075000,
            "level": "ERROR",
            "service": "PaymentService",
            "message": "Retry 1 failed: connection refused"
        },
        {
            "timestamp": 1700000090000,
            "level": "ERROR",
            "service": "PaymentService",
            "message": "Retry 2 failed: connection refused"
        },
        {
            "timestamp": 1700000095000,
            "level": "ERROR",
            "service": "DatabaseService",
            "message": "Connection pool exhausted: 100/100 connections active"
        },
        {
            "timestamp": 1700000100000,
            "level": "ERROR",
            "service": "PaymentService",
            "message": "Circuit breaker OPEN — rejecting all payment requests"
        },
        {
            "timestamp": 1700000110000,
            "level": "FATAL",
            "service": "PaymentService",
            "message": "Service health check FAILED"
        },
        {
            "timestamp": 1700000240000,
            "level": "INFO",
            "service": "PaymentService",
            "message": "Gateway connection restored"
        },
        {
            "timestamp": 1700000255000,
            "level": "INFO",
            "service": "PaymentService",
            "message": "Circuit breaker CLOSED — resuming requests"
        },
        {
            "timestamp": 1700000270000,
            "level": "INFO",
            "service": "PaymentService",
            "message": "Health check PASSED — service recovered"
        }
    ]

    return {"events": events}


@app.post("/api/generate-postmortem")
def generate_postmortem(input: GenerateInput):
    timeline_text = ""
    for e in input.events:
        timeline_text += f"[{e['level']}] {e['service']}: {e['message']}\n"
        if e.get("note"):
            timeline_text += f"Note: {e['note']}\n"

    prompt = f"""You are a Site Reliability Engineer (SRE).

Analyze the incident timeline below and generate a JSON response.

TIMELINE:
{timeline_text}

Return ONLY valid JSON in exactly this format:

{{
  "technical": "Detailed technical postmortem as a single string. Use \\n\\n between each section. Format each section as: ## SectionName\\nContent here. Include sections: Summary, Timeline, Root Cause, Impact, Resolution, Action Items",
  "non_technical": "Plain-English summary for business stakeholders as a single string, with \\n\\n between paragraphs"
}}

Do not include markdown code fences.
Both "technical" and "non_technical" must be plain strings, not nested objects.
Return only JSON.
"""

    try:
        response = client_ai.chat.completions.create(
            model="meta-llama/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.3
        )

        full_text = response.choices[0].message.content.strip()

        if full_text.startswith("```"):
            full_text = full_text.split("```")[1]
            if full_text.startswith("json"):
                full_text = full_text[4:]
            full_text = full_text.strip()

        try:
            result = json.loads(full_text)
            technical_raw = result.get("technical", "")
            non_technical = result.get("non_technical", "")

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

            return {"technical": technical.strip(), "non_technical": non_technical}

        except json.JSONDecodeError:
            return {"technical": full_text, "non_technical": "", "warning": "Non-JSON output"}

    except Exception as e:
        return {"error": str(e)}