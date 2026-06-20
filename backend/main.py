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


MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "mock-data")

SAMPLE_INCIDENTS = {
    "payment_outage": "incident_payment_outage.json",
    "db_pool_exhaustion": "incident_db_pool_exhaustion.json",
    "bad_deployment": "incident_bad_deployment.json",
}

def parse_cloudwatch_file(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    log_events = data.get("logEvents", [])
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
    return events

@app.get("/api/sample-incident")
def sample_incident(scenario: str = "payment_outage"):
    filename = SAMPLE_INCIDENTS.get(scenario)
    if not filename:
        return {"error": f"Unknown scenario: {scenario}"}
    filepath = os.path.join(MOCK_DATA_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": f"File not found: {filename}"}
    events = parse_cloudwatch_file(filepath)
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