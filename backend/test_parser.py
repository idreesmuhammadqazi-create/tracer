#!/usr/bin/env python3
"""
Test script for the LowLogic parser without websockets
"""

import sys
import os

# Add src to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.insert(0, src_path)

try:
    from parser.lexer import Lexer
    from parser.parser import Parser, ParserError
    from interpreter.executor import Executor
    from interpreter.memory import MemoryManager
    from codegen.cpp_generator import CppGenerator

    print("✅ All imports successful!")

    # Test basic parsing
    code = """
    int a = 5;
    ptr<int> b = &a;
    *b = 10;
    print(a);
    """

    print("\n🔍 Testing lexer...")
    lexer = Lexer(code)
    tokens = lexer.tokenize()
    print(f"Generated {len(tokens)} tokens")

    print("\n🌳 Testing parser...")
    parser = Parser(tokens)
    ast = parser.parse()
    print("✅ Parsing successful!")

    print("\n🔧 Testing C++ generation...")
    generator = CppGenerator()
    cpp_code = generator.generate(ast)
    print("✅ C++ generation successful!")
    print("\n--- Generated C++ Code ---")
    print(cpp_code)

    print("\n🎉 All tests passed! LowLogic backend is working correctly.")

except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Runtime error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)