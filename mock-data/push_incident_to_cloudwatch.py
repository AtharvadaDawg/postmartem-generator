import boto3
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

client = boto3.client(
    'logs',
    region_name=os.getenv('AWS_REGION', 'ap-south-1')
)

LOG_GROUP  = '/digitide/postmortem-demo'
LOG_STREAM = 'payment-service/prod'

def push_incident(json_filename):
    filepath = os.path.join(os.path.dirname(__file__), json_filename)
    with open(filepath, "r") as f:
        data = json.load(f)

    raw_events = data.get("logEvents", [])

    # Shift timestamps to "now minus 10 minutes" so they appear recent
    base_time = datetime.utcnow() - timedelta(minutes=10)
    earliest = min(e["timestamp"] for e in raw_events)

    log_events = []
    for e in raw_events:
        offset_ms = e["timestamp"] - earliest
        new_ts = int(base_time.timestamp() * 1000) + offset_ms
        log_events.append({
            "timestamp": new_ts,
            "message": e["message"]
        })

    log_events.sort(key=lambda x: x["timestamp"])

    kwargs = {
        "logGroupName": LOG_GROUP,
        "logStreamName": LOG_STREAM,
        "logEvents": log_events
    }

    # Get sequence token if the stream already has events
    try:
        streams = client.describe_log_streams(
            logGroupName=LOG_GROUP,
            logStreamNamePrefix=LOG_STREAM
        )
        token = streams['logStreams'][0].get('uploadSequenceToken')
        if token:
            kwargs['sequenceToken'] = token
    except Exception:
        pass

    client.put_log_events(**kwargs)
    print(f"Pushed {len(log_events)} events to {LOG_GROUP}/{LOG_STREAM}")

if __name__ == "__main__":
    push_incident("incident_payment_outage.json")