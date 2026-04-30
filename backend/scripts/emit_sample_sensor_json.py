import json
from datetime import UTC, datetime


def main() -> None:
    now = datetime.now(UTC).isoformat()
    payload = [
        {
            "timestamp": now,
            "sensor_type": "temperature",
            "sensor_id": "sample-command-temp-01",
            "location": "growth-chamber-a",
            "value": 23.4,
            "unit": "C",
            "source": "sample-command",
            "note": "Example command output",
        },
        {
            "timestamp": now,
            "sensor_type": "humidity",
            "sensor_id": "sample-command-humid-01",
            "location": "growth-chamber-a",
            "value": 57.8,
            "unit": "%",
            "source": "sample-command",
            "note": "Example command output",
        },
    ]
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
