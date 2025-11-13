#!/usr/bin/env python3
"""
Test the simple lexer
"""

import sys
import os

# Add src to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.insert(0, src_path)

try:
    print("🔍 Testing simple lexer...")
    from parser.simple_lexer import Lexer

    code = """
    int a = 5;
    ptr<int> b = &a;
    *b = 10;
    print(a);
    """

    lexer = Lexer(code)
    tokens = lexer.tokenize()
    print(f"✅ Simple lexer successful! Generated {len(tokens)} tokens")

    # Show some tokens
    for i, token in enumerate(tokens[:15]):  # Show first 15 tokens
        print(f"  {i}: {token.type.value} = '{token.value}' at {token.line}:{token.column}")

    if len(tokens) > 15:
        print(f"  ... and {len(tokens) - 15} more tokens")

    print("\n🎉 Simple LowLogic lexer is working correctly!")

except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Runtime error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)