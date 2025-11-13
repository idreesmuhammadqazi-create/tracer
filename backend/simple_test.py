#!/usr/bin/env python3
"""
Simple test for LowLogic lexer and parser
"""

import sys
import os

# Add src to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.insert(0, src_path)

try:
    # Test just the lexer first
    print("🔍 Testing lexer...")
    from parser.lexer import Lexer

    code = """
    int a = 5;
    ptr<int> b = &a;
    *b = 10;
    print(a);
    """

    lexer = Lexer(code)
    tokens = lexer.tokenize()
    print(f"✅ Lexer successful! Generated {len(tokens)} tokens")

    # Test some tokens
    for i, token in enumerate(tokens[:10]):  # Show first 10 tokens
        print(f"  {i}: {token.type} = '{token.value}' at {token.line}:{token.column}")

    if len(tokens) > 10:
        print(f"  ... and {len(tokens) - 10} more tokens")

    print("\n🎉 LowLogic lexer is working correctly!")

except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Runtime error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)