#!/usr/bin/env python3
"""Test script to verify the backend can start."""

import sys
import os

# Add the project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")

# Test config
from src.config import config
print(f"Config loaded: mock_llm={config.llm.mock}")

# Test models
from src.models.page import BackendPageConfig, create_default_page_config
print("Page models OK")

from src.models.profile import UserProfile
print("Profile models OK")

# Test memory
from src.memory.session import SessionMemory
print("Memory OK")

# Test tools
from src.tools.base import get_tool_registry
print("Tools OK")

# Test LLM client
from src.llm.client import create_llm_client
llm = create_llm_client(config)
print(f"LLM client created: provider={llm.primary.provider}")

# Test main app
from src.main import app
print("FastAPI app created successfully!")

print("\n=== All imports successful ===")
print("\nTo start the server, run:")
print("  cd backend-python")
print("  uvicorn src.main:app --reload --port 8000")