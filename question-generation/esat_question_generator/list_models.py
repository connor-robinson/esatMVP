import os
from google import genai

api_key = os.environ.get("GEMINI_API_KEY", "").strip()
if not api_key:
    raise SystemExit("Set GEMINI_API_KEY in the environment (e.g. .env.local).")

client = genai.Client(api_key=api_key)

for m in client.models.list():
    print(m.name, m.display_name)
