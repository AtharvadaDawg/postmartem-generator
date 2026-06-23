import boto3
import json
import os
from datetime import datetime, timedelta

client = boto3.client('logs', region_name=os.getenv('AWS_REGION', 'ap-south-1'))

def fetch_cloudwatch_logs(
    log_group_name,
    log_stream_name=None,
    hours_back=1
):
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours_back)

    kwargs = {
        "logGroupName": log_group_name,
        "startTime": int(start_time.timestamp() * 1000),
        "endTime": int(end_time.timestamp() * 1000),
        "limit": 1000
    }

    if log_stream_name:
        kwargs["logStreamNames"] = [log_stream_name]

    response = client.filter_log_events(**kwargs)

    events = []

    for e in response.get("events", []):
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

    return sorted(events, key=lambda x: x["timestamp"])