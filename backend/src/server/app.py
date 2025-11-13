"""
WebSocket server for LowLogic language interpreter
Handles real-time communication with frontend for code execution and debugging
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from websockets.server import WebSocketServerProtocol
from websockets import serve

from parser.lexer import Lexer
from parser.parser import Parser
from interpreter.executor import Executor
from interpreter.memory import MemoryManager
from codegen.cpp_generator import CppGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LowLogicServer:
    def __init__(self):
        self.executor: Optional[Executor] = None
        self.memory_manager = MemoryManager()
        self.clients: Dict[str, WebSocketServerProtocol] = {}

    async def register_client(self, websocket: WebSocketServerProtocol, client_id: str):
        """Register a new client connection"""
        self.clients[client_id] = websocket
        logger.info(f"Client {client_id} connected")

        await self.send_message(websocket, {
            "type": "connection_established",
            "client_id": client_id
        })

    async def unregister_client(self, client_id: str):
        """Unregister a client connection"""
        if client_id in self.clients:
            del self.clients[client_id]
            logger.info(f"Client {client_id} disconnected")

    async def send_message(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Send a message to a specific client"""
        try:
            await websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def handle_message(self, websocket: WebSocketServerProtocol, message: str, client_id: str):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            message_type = data.get("type")

            if message_type == "parse_request":
                await self.handle_parse_request(websocket, data)
            elif message_type == "execution_start":
                await self.handle_execution_start(websocket, data)
            elif message_type == "execution_step":
                await self.handle_execution_step(websocket, data)
            elif message_type == "execution_continue":
                await self.handle_execution_continue(websocket, data)
            elif message_type == "execution_reset":
                await self.handle_execution_reset(websocket, data)
            elif message_type == "memory_request":
                await self.handle_memory_request(websocket, data)
            elif message_type == "cpp_export":
                await self.handle_cpp_export(websocket, data)
            else:
                await self.send_error(websocket, f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            await self.send_error(websocket, "Invalid JSON message")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_error(websocket, f"Server error: {str(e)}")

    async def handle_parse_request(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle code parsing request"""
        try:
            code = data.get("code", "")

            # Parse the code
            lexer = Lexer(code)
            tokens = lexer.tokenize()

            parser = Parser(tokens)
            ast = parser.parse()

            await self.send_message(websocket, {
                "type": "parse_response",
                "success": True,
                "ast": ast.to_dict() if ast else None,
                "tokens": [token.to_dict() for token in tokens]
            })

        except Exception as e:
            await self.send_message(websocket, {
                "type": "parse_response",
                "success": False,
                "error": str(e),
                "line": getattr(e, 'line', None),
                "column": getattr(e, 'column', None)
            })

    async def handle_execution_start(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle execution start request"""
        try:
            code = data.get("code", "")

            # Parse and prepare for execution
            lexer = Lexer(code)
            tokens = lexer.tokenize()

            parser = Parser(tokens)
            ast = parser.parse()

            # Initialize executor
            self.executor = Executor(ast, self.memory_manager)

            # Send initial state
            await self.send_execution_state(websocket, "execution_ready", {
                "breakpoints": data.get("breakpoints", [])
            })

        except Exception as e:
            await self.send_error(websocket, f"Execution setup error: {str(e)}")

    async def handle_execution_step(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle step execution request"""
        if not self.executor:
            await self.send_error(websocket, "No active execution")
            return

        try:
            result = self.executor.step()

            await self.send_execution_state(websocket, "execution_step", {
                "line": result.get("line"),
                "finished": result.get("finished", False),
                "output": result.get("output", []),
                "memory_changes": result.get("memory_changes", [])
            })

        except Exception as e:
            await self.send_error(websocket, f"Execution step error: {str(e)}")

    async def handle_execution_continue(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle continue execution request"""
        if not self.executor:
            await self.send_error(websocket, "No active execution")
            return

        try:
            # Execute until breakpoint or end
            while True:
                result = self.executor.step()

                # Check if we hit a breakpoint
                current_line = result.get("line")
                if current_line in data.get("breakpoints", []):
                    break

                # Check if execution finished
                if result.get("finished", False):
                    break

            await self.send_execution_state(websocket, "execution_paused", {
                "line": result.get("line"),
                "finished": result.get("finished", False),
                "output": result.get("output", []),
                "memory_changes": result.get("memory_changes", []),
                "reason": "breakpoint" if current_line in data.get("breakpoints", []) else "finished"
            })

        except Exception as e:
            await self.send_error(websocket, f"Execution continue error: {str(e)}")

    async def handle_execution_reset(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle execution reset request"""
        self.executor = None
        self.memory_manager.reset()

        await self.send_message(websocket, {
            "type": "execution_reset",
            "success": True
        })

    async def handle_memory_request(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle memory state request"""
        memory_state = self.memory_manager.get_state()

        await self.send_message(websocket, {
            "type": "memory_response",
            "state": memory_state
        })

    async def handle_cpp_export(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]):
        """Handle C++ export request"""
        try:
            code = data.get("code", "")

            # Parse the code
            lexer = Lexer(code)
            tokens = lexer.tokenize()

            parser = Parser(tokens)
            ast = parser.parse()

            # Generate C++ code
            generator = CppGenerator()
            cpp_code = generator.generate(ast)

            await self.send_message(websocket, {
                "type": "cpp_export_response",
                "success": True,
                "cpp_code": cpp_code
            })

        except Exception as e:
            await self.send_message(websocket, {
                "type": "cpp_export_response",
                "success": False,
                "error": str(e),
                "line": getattr(e, 'line', None),
                "column": getattr(e, 'column', None)
            })

    async def send_execution_state(self, websocket: WebSocketServerProtocol, state_type: str, data: Dict[str, Any]):
        """Send execution state update"""
        memory_state = self.memory_manager.get_state()

        await self.send_message(websocket, {
            "type": state_type,
            **data,
            "memory_state": memory_state,
            "variables": self.memory_manager.get_variables(),
            "call_stack": self.memory_manager.get_call_stack()
        })

    async def send_error(self, websocket: WebSocketServerProtocol, error_message: str):
        """Send error message to client"""
        await self.send_message(websocket, {
            "type": "error",
            "error": error_message
        })


# Global server instance
server = LowLogicServer()


async def handle_client(websocket: WebSocketServerProtocol, path: str):
    """Handle individual client connection"""
    client_id = f"client_{id(websocket)}"

    await server.register_client(websocket, client_id)

    try:
        async for message in websocket:
            await server.handle_message(websocket, message, client_id)
    except Exception as e:
        logger.error(f"Client {client_id} error: {e}")
    finally:
        await server.unregister_client(client_id)


async def main():
    """Start the WebSocket server"""
    host = "localhost"
    port = 8765

    logger.info(f"Starting LowLogic server on {host}:{port}")

    async with serve(handle_client, host, port):
        logger.info("LowLogic server running")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())