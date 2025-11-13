# LowLogic - Traceable Low-Level Mode

A lightweight sandbox environment for algorithm researchers to test logic at a low level without full C++ syntax. LowLogic simulates C++-like behavior with real-time tracing of variable states, pointer references, and memory operations.

## Features

- **C++-like Syntax**: `int a = 5; ptr<int> b = &a; print(*b);` works without boilerplate
- **Real-time Memory Visualization**: See stack, heap, and pointer relationships
- **Step-by-step Execution**: Debug your code line by line
- **Memory Inspection**: View memory addresses, pointer graphs, and array layouts
- **C++ Export**: Convert your LowLogic code to valid C++
- **Type System**: Full C++ type system including templates, structs, and classes

## Quick Start

```bash
# Start backend server
cd backend
python main.py

# Start frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Language Example

```lowlogic
int a = 5;
ptr<int> b = &a;
*b = 10;
print(a);  // Output: 10

int arr[5] = {1, 2, 3, 4, 5};
ptr<int> ptr_to_arr = arr;
*(ptr_to_arr + 2) = 42;
print(arr[2]);  // Output: 42
```

## Architecture

- **Frontend**: TypeScript/React with Monaco Editor and memory visualizations
- **Backend**: Python with custom language interpreter and C++ code generator
- **Communication**: WebSocket for real-time debugging updates