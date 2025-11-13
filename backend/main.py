"""
Main entry point for LowLogic backend server
"""

import asyncio
import sys
import os

# Add src to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.insert(0, src_path)

print(f"Python path: {sys.path}")
print(f"Current directory: {current_dir}")
print(f"SRC path: {src_path}")

from server.app import main

if __name__ == "__main__":
    asyncio.run(main())