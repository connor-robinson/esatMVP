import os
from google import genai

client = genai.Client(api_key="AIzaSyCNhRb0Aj3yVcqglvc9i_OrlBbpmXDl2pU")

for m in client.models.list():
    print(m.name, m.display_name)
