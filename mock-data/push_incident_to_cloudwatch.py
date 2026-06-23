import boto3
import json
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

client = boto3.client(
    "logs",
    region_name=os.getenv("AWS_REGION", "ap-south-1")
)

LOG_GROUP = "/digitide/postmortem-demo"


def push_incident(json_filename, log_stream):
    filepath = os.path.join(os.path.dirname(__file__), json_filename)

    with open(filepath, "r") as f:
        data = json.load(f)

    raw_events = data.get("logEvents", [])

    if not raw_events:
        print("No log events found in file.")
        return

    # Shift timestamps so events appear recent
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

    # Create stream if it doesn't exist
    try:
        client.create_log_stream(
            logGroupName=LOG_GROUP,
            logStreamName=log_stream
        )
        print(f"Created log stream: {log_stream}")
    except client.exceptions.ResourceAlreadyExistsException:
        pass

    kwargs = {
        "logGroupName": LOG_GROUP,
        "logStreamName": log_stream,
        "logEvents": log_events
    }

    # Get sequence token if required
    try:
        streams = client.describe_log_streams(
            logGroupName=LOG_GROUP,
            logStreamNamePrefix=log_stream
        )

        if streams["logStreams"]:
            token = streams["logStreams"][0].get("uploadSequenceToken")

            if token:
                kwargs["sequenceToken"] = token

    except Exception:
        pass

    client.put_log_events(**kwargs)

    print(
        f"Pushed {len(log_events)} events to "
        f"{LOG_GROUP}/{log_stream}"
    )


if __name__ == "__main__":

    if len(sys.argv) < 3:
        print(
            "Usage:\n"
            "python push_incident_to_cloudwatch.py "
            "<incident_file.json> <log_stream>"
        )
        sys.exit(1)

    incident_file = sys.argv[1]
    log_stream = sys.argv[2]

    push_incident(incident_file, log_stream)