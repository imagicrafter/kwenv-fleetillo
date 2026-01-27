
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv("gradient-agents/fleetillo-support-agent/.env")

url = "https://agents.do-ai.run/e7b58fd7-d32f-4d4c-bee0-adf3a7d0d8db/fleetillo-support/run"
token = os.environ.get("DIGITALOCEAN_API_TOKEN")

if not token:
    print("Error: DIGITALOCEAN_API_TOKEN not found")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

payload = {
    "input": {
        "messages": [
            {"role": "user", "content": "How many pending bookings are there?"}
        ]
    }
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, headers=headers, json=payload, stream=True)
    
    print("Response status:", response.status_code)
    print("Response content:")
    for line in response.iter_lines():
        if line:
            print(line.decode('utf-8'))
            
except Exception as e:
    print(f"Request failed: {e}")
