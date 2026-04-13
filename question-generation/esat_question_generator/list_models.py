import os
from google import genai

project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "").strip()
if not project or not location:
    raise SystemExit("Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in the environment.")

client = genai.Client(vertexai=True, project=project, location=location)

for m in client.models.list():
    print(m.name, m.display_name)
