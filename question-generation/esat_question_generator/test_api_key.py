#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Vertex AI local auth.

Simple script to test whether local ADC + Vertex env works.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
from project import safe_load_dotenv

# Load .env.local from project root
env_path = project_root / ".env.local"
if env_path.exists():
    safe_load_dotenv(str(env_path))
else:
    print(f"Warning: .env.local not found at {env_path}")

# Get Vertex config
cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()

if not cloud_project or not cloud_location:
    print("ERROR: GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION not found in environment variables")
    print(f"Checked .env.local at: {env_path}")
    sys.exit(1)

print(f"Found Vertex config: project={cloud_project}, location={cloud_location}")
print("Testing Vertex auth...")

try:
    from project import LLMClient
    
    # Create client
    client = LLMClient(api_key="")
    
    # Make a simple test call
    print("Making test API call...")
    test_response = client.client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say 'test' if you can read this.",
        config={"temperature": 0.1}
    )
    
    # Check response
    if test_response and hasattr(test_response, 'text'):
        response_text = test_response.text
        print("✓ Vertex auth is VALID!")
        print(f"Response: {response_text[:100]}")
        sys.exit(0)
    else:
        print("✗ Vertex auth test failed - no response text")
        sys.exit(1)
        
except Exception as e:
    error_str = str(e)
    print("✗ Vertex auth test FAILED")
    print(f"Error: {error_str}")
    
    if "403" in error_str or "PERMISSION_DENIED" in error_str:
        print("\nThis usually means:")
        print("  - ADC identity lacks Vertex IAM permissions")
        print("  - Wrong project/location or Vertex API disabled")
    elif "401" in error_str or "UNAUTHENTICATED" in error_str:
        print("\nThis usually means:")
        print("  - ADC credential missing; run: gcloud auth application-default login")
    else:
        print("\nUnknown error - check the error message above")
    
    sys.exit(1)
