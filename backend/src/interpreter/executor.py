"""
Interpreter/Executor for LowLogic language
Executes AST nodes with memory tracking and debugging
"""

from typing import Dict, List, Any, Optional, Union, Set
from ..parser.ast_nodes import *
from ..parser.lexer import ParserError
from .memory import MemoryManager
from .type_system import TypeSystem


class ExecutionError(Exception):
    def __init__(self, message: str, line: Optional[int] = None):
        super().__init__(message)
        self.line = line


class ReturnValue(Exception):
    """Exception used for return statements"""
    def __init__(self, value: Any):
        self.value = value


class Executor:
    """Executes LowLogic programs with step-by-step debugging"""

    def __init__(self, ast: Program, memory_manager: MemoryManager):
        self.ast = ast
        self.memory = memory_manager
        self.type_system = TypeSystem()

        # Execution state
        self.current_statement_index = 0
        self.current_line = 1
        self.output_buffer: List[str] = []
        self.execution_finished = False
        self.breakpoints: Set[int] = set()

        # Variable scope tracking
        self.scopes: List[Dict[str, Any]] = [{}]  # Global scope
        self.functions: Dict[str, FunctionDeclaration] = {}

        # Pre-register functions from AST
        self._register_functions()

    def _register_functions(self):
        """Register function declarations from AST"""
        for decl in self.ast.declarations:
            if isinstance(decl, FunctionDeclaration):
                self.functions[decl.name] = decl

    def reset(self):
        """Reset execution state"""
        self.current_statement_index = 0
        self.current_line = 1
        self.output_buffer.clear()
        self.execution_finished = False
        self.scopes = [{}]
        self.memory.reset()

    def step(self) -> Dict[str, Any]:
        """Execute one step and return result"""
        if self.execution_finished:
            return {
                "line": self.current_line,
                "finished": True,
                "output": self.output_buffer.copy(),
                "memory_changes": []
            }

        try:
            # Get current statement to execute
            statements = self._flatten_statements(self.ast.declarations)
            if self.current_statement_index >= len(statements):
                self.execution_finished = True
                return {
                    "line": self.current_line,
                    "finished": True,
                    "output": self.output_buffer.copy(),
                    "memory_changes": []
                }

            statement = statements[self.current_statement_index]
            self.current_line = self._get_line_number(statement)

            # Check for breakpoint
            if self.current_line in self.breakpoints:
                return {
                    "line": self.current_line,
                    "finished": False,
                    "output": self.output_buffer.copy(),
                    "memory_changes": [],
                    "reason": "breakpoint"
                }

            # Execute statement
            self._execute_statement(statement)
            self.current_statement_index += 1

            return {
                "line": self.current_line,
                "finished": False,
                "output": self.output_buffer.copy(),
                "memory_changes": self.memory.memory_changes[-1:] if self.memory.memory_changes else []
            }

        except ReturnValue as ret:
            # Handle return statement
            self.current_statement_index += 1
            return {
                "line": self.current_line,
                "finished": False,
                "output": self.output_buffer.copy(),
                "memory_changes": self.memory.memory_changes[-1:] if self.memory.memory_changes else [],
                "return_value": ret.value
            }

        except ExecutionError as e:
            return {
                "line": e.line or self.current_line,
                "finished": True,
                "output": self.output_buffer.copy(),
                "memory_changes": [],
                "error": str(e)
            }

        except Exception as e:
            return {
                "line": self.current_line,
                "finished": True,
                "output": self.output_buffer.copy(),
                "memory_changes": [],
                "error": f"Runtime error: {str(e)}"
            }

    def set_breakpoints(self, lines: List[int]):
        """Set breakpoints"""
        self.breakpoints = set(lines)

    def _flatten_statements(self, declarations: List[ASTNode]) -> List[Statement]:
        """Flatten AST declarations into a linear list of statements"""
        statements = []
        for decl in declarations:
            if isinstance(decl, Statement):
                statements.append(decl)
            elif isinstance(decl, VariableDeclarationStatement):
                statements.append(decl)
            # Add other top-level declarations as needed
        return statements

    def _get_line_number(self, node: ASTNode) -> int:
        """Get line number for a node (placeholder - would need token info)"""
        # This would ideally come from the AST nodes with position info
        return self.current_line

    def _execute_statement(self, statement: Statement):
        """Execute a single statement"""
        if isinstance(statement, VariableDeclarationStatement):
            self._execute_variable_declaration(statement)
        elif isinstance(statement, ExpressionStatement):
            self._execute_expression_statement(statement)
        elif isinstance(statement, BlockStatement):
            self._execute_block_statement(statement)
        elif isinstance(statement, IfStatement):
            self._execute_if_statement(statement)
        elif isinstance(statement, WhileStatement):
            self._execute_while_statement(statement)
        elif isinstance(statement, ForStatement):
            self._execute_for_statement(statement)
        elif isinstance(statement, ReturnStatement):
            self._execute_return_statement(statement)
        elif isinstance(statement, BreakStatement):
            raise ExecutionError("Break statement not implemented yet")
        elif isinstance(statement, ContinueStatement):
            raise ExecutionError("Continue statement not implemented yet")
        else:
            raise ExecutionError(f"Unknown statement type: {type(statement)}")

    def _execute_variable_declaration(self, stmt: VariableDeclarationStatement):
        """Execute variable declaration"""
        var_type = self._get_type_name(stmt.var_type)
        name = stmt.name

        # Allocate memory for variable
        type_info = self.type_system.get_type(var_type)
        if not type_info:
            raise ExecutionError(f"Unknown type: {var_type}")

        location = self.memory.allocate_stack(type_info.size, var_type, name)

        # Initialize if value provided
        if stmt.initializer:
            value = self._evaluate_expression(stmt.initializer)
            converted_value = self.type_system.convert_value(
                value, self._get_expression_type(stmt.initializer), var_type
            )
            self.memory.write_memory(location.address, converted_value, var_type)

        # Add to current scope
        self.scopes[-1][name] = location.address

    def _execute_expression_statement(self, stmt: ExpressionStatement):
        """Execute expression statement"""
        self._evaluate_expression(stmt.expression)

    def _execute_block_statement(self, stmt: BlockStatement):
        """Execute block statement"""
        # Create new scope
        self.scopes.append({})
        self.memory.push_stack_frame("block")

        try:
            for inner_stmt in stmt.statements:
                self._execute_statement(inner_stmt)
        finally:
            # Cleanup scope
            self.memory.pop_stack_frame()
            self.scopes.pop()

    def _execute_if_statement(self, stmt: IfStatement):
        """Execute if statement"""
        condition_value = self._evaluate_expression(stmt.condition)

        if self._is_truthy(condition_value):
            self._execute_statement(stmt.then_branch)
        elif stmt.else_branch:
            self._execute_statement(stmt.else_branch)

    def _execute_while_statement(self, stmt: WhileStatement):
        """Execute while statement"""
        while True:
            condition_value = self._evaluate_expression(stmt.condition)
            if not self._is_truthy(condition_value):
                break
            self._execute_statement(stmt.body)

    def _execute_for_statement(self, stmt: ForStatement):
        """Execute for statement"""
        # Create new scope
        self.scopes.append({})

        try:
            # Initialize
            if stmt.initializer:
                self._execute_statement(stmt.initializer)

            # Loop
            while True:
                # Check condition
                if stmt.condition:
                    condition_value = self._evaluate_expression(stmt.condition)
                    if not self._is_truthy(condition_value):
                        break

                # Execute body
                self._execute_statement(stmt.body)

                # Increment
                if stmt.increment:
                    self._evaluate_expression(stmt.increment)

        finally:
            self.scopes.pop()

    def _execute_return_statement(self, stmt: ReturnStatement):
        """Execute return statement"""
        value = None
        if stmt.value:
            value = self._evaluate_expression(stmt.value)
        raise ReturnValue(value)

    def _evaluate_expression(self, expr: Expression) -> Any:
        """Evaluate an expression and return its value"""
        if isinstance(expr, LiteralExpression):
            return self._evaluate_literal(expr)
        elif isinstance(expr, IdentifierExpression):
            return self._evaluate_identifier(expr)
        elif isinstance(expr, BinaryOperationExpression):
            return self._evaluate_binary_operation(expr)
        elif isinstance(expr, UnaryOperationExpression):
            return self._evaluate_unary_operation(expr)
        elif isinstance(expr, AssignmentExpression):
            return self._evaluate_assignment(expr)
        elif isinstance(expr, CallExpression):
            return self._evaluate_call(expr)
        elif isinstance(expr, ArrayAccessExpression):
            return self._evaluate_array_access(expr)
        elif isinstance(expr, MemberAccessExpression):
            return self._evaluate_member_access(expr)
        else:
            raise ExecutionError(f"Unknown expression type: {type(expr)}")

    def _evaluate_literal(self, expr: LiteralExpression) -> Any:
        """Evaluate literal expression"""
        if expr.literal_type == "int":
            return int(expr.value)
        elif expr.literal_type == "float":
            return float(expr.value)
        elif expr.literal_type == "char":
            return expr.value[1] if len(expr.value) > 2 else '\0'  # Remove quotes
        elif expr.literal_type == "string":
            return expr.value[1:-1]  # Remove quotes
        elif expr.literal_type == "bool":
            return expr.value == "true"
        elif expr.literal_type == "null":
            return None
        else:
            return expr.value

    def _evaluate_identifier(self, expr: IdentifierExpression) -> Any:
        """Evaluate identifier expression"""
        # Look up variable in scopes
        for scope in reversed(self.scopes):
            if expr.name in scope:
                address = scope[expr.name]
                return self.memory.read_memory(address)

        raise ExecutionError(f"Undefined variable: {expr.name}")

    def _evaluate_binary_operation(self, expr: BinaryOperationExpression) -> Any:
        """Evaluate binary operation"""
        left = self._evaluate_expression(expr.left)
        right = self._evaluate_expression(expr.right)
        left_type = self._get_expression_type(expr.left)
        right_type = self._get_expression_type(expr.right)

        # Convert types if needed
        if not self.type_system.is_compatible(left_type, right_type):
            # Try to convert to compatible type
            result_type = self.type_system.validate_operation(expr.operator, left_type, right_type)
            if result_type:
                left = self.type_system.convert_value(left, left_type, result_type)
                right = self.type_system.convert_value(right, right_type, result_type)
            else:
                raise ExecutionError(f"Type mismatch: {left_type} {expr.operator} {right_type}")

        # Perform operation
        if expr.operator == "+":
            return left + right
        elif expr.operator == "-":
            return left - right
        elif expr.operator == "*":
            return left * right
        elif expr.operator == "/":
            if right == 0:
                raise ExecutionError("Division by zero")
            return left / right
        elif expr.operator == "%":
            return left % right
        elif expr.operator == "==":
            return left == right
        elif expr.operator == "!=":
            return left != right
        elif expr.operator == "<":
            return left < right
        elif expr.operator == "<=":
            return left <= right
        elif expr.operator == ">":
            return left > right
        elif expr.operator == ">=":
            return left >= right
        elif expr.operator == "&&":
            return self._is_truthy(left) and self._is_truthy(right)
        elif expr.operator == "||":
            return self._is_truthy(left) or self._is_truthy(right)
        else:
            raise ExecutionError(f"Unknown operator: {expr.operator}")

    def _evaluate_unary_operation(self, expr: UnaryOperationExpression) -> Any:
        """Evaluate unary operation"""
        operand = self._evaluate_expression(expr.operand)
        operand_type = self._get_expression_type(expr.operand)

        if expr.operator == "-":
            return -operand
        elif expr.operator == "!":
            return not self._is_truthy(operand)
        elif expr.operator == "++":
            # Increment (prefix)
            if isinstance(expr.operand, IdentifierExpression):
                address = self._get_variable_address(expr.operand.name)
                new_value = operand + 1
                self.memory.write_memory(address, new_value, operand_type)
                return new_value
        elif expr.operator == "--":
            # Decrement (prefix)
            if isinstance(expr.operand, IdentifierExpression):
                address = self._get_variable_address(expr.operand.name)
                new_value = operand - 1
                self.memory.write_memory(address, new_value, operand_type)
                return new_value
        elif expr.operator == "&":
            # Address of
            if isinstance(expr.operand, IdentifierExpression):
                address = self._get_variable_address(expr.operand.name)
                return address
        elif expr.operator == "*":
            # Dereference
            if isinstance(operand, int):  # Address
                return self.memory.read_memory(operand)
        else:
            raise ExecutionError(f"Unknown unary operator: {expr.operator}")

        return operand

    def _evaluate_assignment(self, expr: AssignmentExpression) -> Any:
        """Evaluate assignment expression"""
        value = self._evaluate_expression(expr.value)
        value_type = self._get_expression_type(expr.value)

        if isinstance(expr.target, IdentifierExpression):
            # Variable assignment
            address = self._get_variable_address(expr.target.name)
            target_type = self._get_variable_type(expr.target.name)

            # Convert value to target type
            converted_value = self.type_system.convert_value(value, value_type, target_type)
            self.memory.write_memory(address, converted_value, target_type)
            return converted_value

        elif isinstance(expr.target, ArrayAccessExpression):
            # Array element assignment
            array_address = self._evaluate_expression(expr.target.array)
            index = self._evaluate_expression(expr.target.index)
            # Implementation depends on array layout
            pass

        elif isinstance(expr.target, UnaryOperationExpression) and expr.target.operator == "*":
            # Pointer dereference assignment
            pointer_address = self._evaluate_expression(expr.target.operand)
            if isinstance(pointer_address, int):
                target_type = self._get_pointer_target_type(expr.target.operand)
                converted_value = self.type_system.convert_value(value, value_type, target_type)
                self.memory.write_memory(pointer_address, converted_value, target_type)
                return converted_value

        raise ExecutionError("Invalid assignment target")

    def _evaluate_call(self, expr: CallExpression) -> Any:
        """Evaluate function call"""
        if isinstance(expr.callee, IdentifierExpression):
            function_name = expr.callee.name

            if function_name == "print":
                # Built-in print function
                if len(expr.arguments) != 1:
                    raise ExecutionError("print() takes exactly one argument")

                arg_value = self._evaluate_expression(expr.arguments[0])
                output_str = self._format_value_for_output(arg_value)
                self.output_buffer.append(output_str)
                return None

            elif function_name == "sizeof":
                # Built-in sizeof function
                if len(expr.arguments) != 1:
                    raise ExecutionError("sizeof() takes exactly one argument")

                if isinstance(expr.arguments[0], IdentifierExpression):
                    type_name = self._get_variable_type(expr.arguments[0].name)
                else:
                    type_name = self._get_expression_type(expr.arguments[0])

                type_info = self.type_system.get_type(type_name)
                return type_info.size if type_info else 0

            # User-defined function
            if function_name in self.functions:
                return self._call_user_function(self.functions[function_name], expr.arguments)

        raise ExecutionError(f"Unknown function: {function_name}")

    def _call_user_function(self, func: FunctionDeclaration, arguments: List[Expression]) -> Any:
        """Call a user-defined function"""
        # Check argument count
        if len(arguments) != len(func.parameters):
            raise ExecutionError(f"Function {func.name} expects {len(func.parameters)} arguments")

        # Create new scope
        self.scopes.append({})
        self.memory.push_stack_frame(func.name)

        try:
            # Evaluate and assign parameters
            for i, (param_type, param_name) in enumerate(func.parameters):
                arg_value = self._evaluate_expression(arguments[i])
                arg_type = self._get_expression_type(arguments[i])
                param_type_name = self._get_type_name(param_type)

                # Convert argument to parameter type
                converted_value = self.type_system.convert_value(arg_value, arg_type, param_type_name)

                # Allocate parameter
                type_info = self.type_system.get_type(param_type_name)
                location = self.memory.allocate_stack(type_info.size, param_type_name, param_name)
                self.memory.write_memory(location.address, converted_value, param_type_name)
                self.scopes[-1][param_name] = location.address

            # Execute function body
            self._execute_statement(func.body)

        except ReturnValue as ret:
            # Return value
            return ret.value
        finally:
            # Cleanup
            self.memory.pop_stack_frame()
            self.scopes.pop()

        return None

    def _evaluate_array_access(self, expr: ArrayAccessExpression) -> Any:
        """Evaluate array access"""
        raise ExecutionError("Array access not implemented yet")

    def _evaluate_member_access(self, expr: MemberAccessExpression) -> Any:
        """Evaluate member access"""
        raise ExecutionError("Member access not implemented yet")

    def _get_type_name(self, type_node) -> str:
        """Get type name from type node"""
        if isinstance(type_node, PrimitiveType):
            return type_node.name
        elif isinstance(type_node, PointerType):
            base_name = self._get_type_name(type_node.base_type)
            return f"ptr<{base_name}>"
        elif isinstance(type_node, ArrayType):
            element_name = self._get_type_name(type_node.element_type)
            if type_node.size:
                size = self._evaluate_expression(type_node.size)
                return f"{element_name}[{size}]"
            else:
                return f"{element_name}[]"
        else:
            return "unknown"

    def _get_expression_type(self, expr: Expression) -> str:
        """Get type of an expression"""
        if isinstance(expr, LiteralExpression):
            return expr.literal_type
        elif isinstance(expr, IdentifierExpression):
            return self._get_variable_type(expr.name)
        elif isinstance(expr, BinaryOperationExpression):
            left_type = self._get_expression_type(expr.left)
            right_type = self._get_expression_type(expr.right)
            result_type = self.type_system.validate_operation(expr.operator, left_type, right_type)
            return result_type or left_type
        elif isinstance(expr, UnaryOperationExpression):
            if expr.operator == "!":
                return "bool"
            elif expr.operator == "&":
                operand_type = self._get_expression_type(expr.operand)
                return f"ptr<{operand_type}>"
            else:
                return self._get_expression_type(expr.operand)
        else:
            return "unknown"

    def _get_variable_address(self, name: str) -> int:
        """Get memory address of a variable"""
        for scope in reversed(self.scopes):
            if name in scope:
                return scope[name]
        raise ExecutionError(f"Undefined variable: {name}")

    def _get_variable_type(self, name: str) -> str:
        """Get type of a variable"""
        address = self._get_variable_address(name)
        location = self.memory.get_memory_location(address)
        return location.type_name if location else "unknown"

    def _get_pointer_target_type(self, expr: Expression) -> str:
        """Get type that a pointer points to"""
        expr_type = self._get_expression_type(expr)
        if expr_type.startswith("ptr<") and expr_type.endswith(">"):
            return expr_type[4:-1]
        return "unknown"

    def _is_truthy(self, value: Any) -> bool:
        """Check if a value is truthy"""
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            return len(value) > 0
        return True

    def _format_value_for_output(self, value: Any) -> str:
        """Format a value for console output"""
        if value is None:
            return "null"
        elif isinstance(value, bool):
            return "true" if value else "false"
        elif isinstance(value, str):
            return value
        elif isinstance(value, (int, float)):
            return str(value)
        else:
            return str(value)