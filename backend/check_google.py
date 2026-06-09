import urllib.request
import json

requirements = [
    "langchain-google-genai",
    "google-generativeai",
    "google-genai"
]

for req in requirements:
    try:
        url = f"https://pypi.org/pypi/{req}/json"
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            latest_version = data["info"]["version"]
            print(f"{req} latest version: {latest_version}")
    except Exception as e:
        print(f"Error checking {req}: {e}")
