#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test GEMINI_API_KEY

Simple script to test if the API key is valid.
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

# Get API key
api_key = os.environ.get("GEMINI_API_KEY", "").strip()

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in environment variables")
    print(f"Checked .env.local at: {env_path}")
    sys.exit(1)

print(f"Found API key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '***'}")
print("Testing API key...")

try:
    from project import LLMClient
    
    # Create client
    client = LLMClient(api_key=api_key)
    
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
        print(f"✓ API key is VALID!")
        print(f"Response: {response_text[:100]}")
        sys.exit(0)
    else:
        print("✗ API key test failed - no response text")
        sys.exit(1)
        
except Exception as e:
    error_str = str(e)
    print(f"✗ API key test FAILED")
    print(f"Error: {error_str}")
    
    if "403" in error_str or "PERMISSION_DENIED" in error_str:
        print("\nThis usually means:")
        print("  - API key is invalid or revoked")
        print("  - API key doesn't have permission for Gemini API")
    elif "401" in error_str or "UNAUTHENTICATED" in error_str:
        print("\nThis usually means:")
        print("  - API key is missing or malformed")
    elif "leaked" in error_str.lower():
        print("\nThis usually means:")
        print("  - API key has been leaked and revoked")
    else:
        print("\nUnknown error - check the error message above")
    
    sys.exit(1)
