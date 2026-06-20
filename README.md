# Postmortem Generator

Auto-generating incident narratives from raw cloud logs using LLM.

## Stack
- Frontend: React + Tailwind CSS
- Backend: FastAPI (Python)
- LLM: OpenAI GPT-4o / Google Gemini
- Cloud: AWS CloudWatch (boto3)

## Setup
1. Copy `.env.example` to `.env` and fill in your keys
2. `cd frontend && npm install && npm run dev`
3. `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`

## Project structure
See `docs/system-design.md` for architecture overview.
