"""
C++ code generator for LowLogic
Converts LowLogic AST to equivalent C++ code
"""

from typing import List, Dict, Any, Optional
from ..parser.ast_nodes import *


class CppGenerator:
    """Generates C++ code from LowLogic AST"""

    def __init__(self):
        self.indent_level = 0
        self.output_lines: List[str] = []
        self.includes: List[str] = []
        self.using_declarations: List[str] = []

    def generate(self, ast: Program) -> str:
        """Generate C++ code from AST"""
        self.output_lines.clear()
        self.indent_level = 0
        self.includes.clear()
        self.using_declarations.clear()

        # Add necessary includes
        self._add_include("<iostream>")
        self._add_include("<memory>")
        self._add_include("<string>")
        self._add_include("<vector>")

        # Add using declarations
        self._add_using("namespace std")
        self._add_using("string = std::string")

        # Generate includes
        for include in sorted(set(self.includes)):
            self.output_lines.append(f"#include {include}")

        self.output_lines.append("")

        # Generate using declarations
        for using in sorted(set(self.using_declarations)):
            self.output_lines.append(f"using {using};")

        self.output_lines.append("")

        # Generate function declarations first (for forward references)
        self._generate_function_declarations(ast.declarations)

        # Generate all declarations
        for decl in ast.declarations:
            self._generate_declaration(decl)

        # Generate main function if no main exists
        if not self._has_main_function(ast.declarations):
            self._generate_main_function(ast.declarations)

        return "\n".join(self.output_lines)

    def _add_include(self, include: str):
        """Add include directive"""
        if include not in self.includes:
            self.includes.append(include)

    def _add_using(self, using_decl: str):
        """Add using declaration"""
        if using_decl not in self.using_declarations:
            self.using_declarations.append(using_decl)

    def _generate_declaration(self, decl: ASTNode):
        """Generate code for a declaration"""
        if isinstance(decl, FunctionDeclaration):
            self._generate_function_declaration(decl)
        elif isinstance(decl, StructDeclaration):
            self._generate_struct_declaration(decl)
        elif isinstance(decl, ClassDeclaration):
            self._generate_class_declaration(decl)
        elif isinstance(decl, Statement):
            self._generate_statement(decl)
        elif isinstance(decl, VariableDeclarationStatement):
            self._generate_variable_declaration(decl)
        else:
            # Unknown declaration type, skip
            pass

    def _generate_function_declarations(self, declarations: List[ASTNode]):
        """Generate forward declarations for functions"""
        for decl in declarations:
            if isinstance(decl, FunctionDeclaration):
                self.output_lines.append(f"{self._type_to_cpp(decl.return_type)} {decl.name}({self._generate_parameters_list(decl.parameters)});")

        if any(isinstance(decl, FunctionDeclaration) for decl in declarations):
            self.output_lines.append("")

    def _generate_function_declaration(self, func: FunctionDeclaration):
        """Generate function declaration"""
        # Function signature
        params_str = self._generate_parameters_list(func.parameters)
        signature = f"{self._type_to_cpp(func.return_type)} {func.name}({params_str})"

        self.output_lines.append(signature + " {")
        self.indent_level += 1

        # Function body
        self._generate_statement(func.body)

        self.indent_level -= 1
        self.output_lines.append("}")
        self.output_lines.append("")

    def _generate_struct_declaration(self, struct: StructDeclaration):
        """Generate struct declaration"""
        self.output_lines.append(f"struct {struct.name} {{")
        self.indent_level += 1

        for member_type, member_name in struct.members:
            cpp_type = self._type_to_cpp(member_type)
            self.output_lines.append(f"{cpp_type} {member_name};")

        self.indent_level -= 1
        self.output_lines.append("};")
        self.output_lines.append("")

    def _generate_class_declaration(self, cls: ClassDeclaration):
        """Generate class declaration"""
        self.output_lines.append(f"class {cls.name} {{")
        self.indent_level += 1

        # Group members by access level
        public_members = []
        private_members = []

        for member_type, member_name, access in cls.members:
            cpp_type = self._type_to_cpp(member_type)
            if access == "public":
                public_members.append(f"{cpp_type} {member_name};")
            else:
                private_members.append(f"{cpp_type} {member_name};")

        # Private members (default)
        if private_members:
            self.output_lines.append("private:")
            self.indent_level += 1
            for member in private_members:
                self.output_lines.append(member)
            self.indent_level -= 1
            self.output_lines.append("")

        # Public members
        if public_members:
            self.output_lines.append("public:")
            self.indent_level += 1
            for member in public_members:
                self.output_lines.append(member)
            self.indent_level -= 1
            self.output_lines.append("")

        # Methods
        for method in cls.methods:
            self._generate_method_declaration(method)

        self.indent_level -= 1
        self.output_lines.append("};")
        self.output_lines.append("")

    def _generate_method_declaration(self, method: FunctionDeclaration):
        """Generate class method declaration"""
        params_str = self._generate_parameters_list(method.parameters)
        signature = f"{self._type_to_cpp(method.return_type)} {method.name}({params_str})"

        self.output_lines.append(signature + " {")
        self.indent_level += 1

        self._generate_statement(method.body)

        self.indent_level -= 1
        self.output_lines.append("}")
        self.output_lines.append("")

    def _generate_main_function(self, declarations: List[ASTNode]):
        """Generate main function from global statements"""
        self.output_lines.append("int main() {")
        self.indent_level += 1

        # Generate all global statements
        for decl in declarations:
            if isinstance(decl, Statement) and not isinstance(decl, FunctionDeclaration):
                self._generate_statement(decl)

        self.output_lines.append("return 0;")
        self.indent_level -= 1
        self.output_lines.append("}")

    def _generate_statement(self, stmt: Statement):
        """Generate code for a statement"""
        if isinstance(stmt, BlockStatement):
            self._generate_block_statement(stmt)
        elif isinstance(stmt, VariableDeclarationStatement):
            self._generate_variable_declaration(stmt)
        elif isinstance(stmt, ExpressionStatement):
            self._generate_expression_statement(stmt)
        elif isinstance(stmt, IfStatement):
            self._generate_if_statement(stmt)
        elif isinstance(stmt, WhileStatement):
            self._generate_while_statement(stmt)
        elif isinstance(stmt, ForStatement):
            self._generate_for_statement(stmt)
        elif isinstance(stmt, ReturnStatement):
            self._generate_return_statement(stmt)
        elif isinstance(stmt, BreakStatement):
            self._generate_break_statement(stmt)
        elif isinstance(stmt, ContinueStatement):
            self._generate_continue_statement(stmt)
        else:
            self._add_comment(f"// Unknown statement type: {type(stmt)}")

    def _generate_block_statement(self, stmt: BlockStatement):
        """Generate block statement"""
        self.output_lines.append("{")
        self.indent_level += 1

        for inner_stmt in stmt.statements:
            self._generate_statement(inner_stmt)

        self.indent_level -= 1
        self.output_lines.append("}")

    def _generate_variable_declaration(self, stmt: VariableDeclarationStatement):
        """Generate variable declaration"""
        type_str = self._type_to_cpp(stmt.var_type)
        line = f"{type_str} {stmt.name}"

        if stmt.initializer:
            line += f" = {self._generate_expression(stmt.initializer)}"

        line += ";"
        self.output_lines.append(line)

    def _generate_expression_statement(self, stmt: ExpressionStatement):
        """Generate expression statement"""
        expr_str = self._generate_expression(stmt.expression)
        self.output_lines.append(f"{expr_str};")

    def _generate_if_statement(self, stmt: IfStatement):
        """Generate if statement"""
        condition_str = self._generate_expression(stmt.condition)
        self.output_lines.append(f"if ({condition_str}) {{")
        self.indent_level += 1

        self._generate_statement(stmt.then_branch)

        self.indent_level -= 1

        if stmt.else_branch:
            self.output_lines.append("} else {")
            self.indent_level += 1
            self._generate_statement(stmt.else_branch)
            self.indent_level -= 1
            self.output_lines.append("}")
        else:
            self.output_lines.append("}")

    def _generate_while_statement(self, stmt: WhileStatement):
        """Generate while statement"""
        condition_str = self._generate_expression(stmt.condition)
        self.output_lines.append(f"while ({condition_str}) {{")
        self.indent_level += 1

        self._generate_statement(stmt.body)

        self.indent_level -= 1
        self.output_lines.append("}")

    def _generate_for_statement(self, stmt: ForStatement):
        """Generate for statement"""
        parts = []

        # Initializer
        if stmt.initializer:
            if isinstance(stmt.initializer, VariableDeclarationStatement):
                parts.append(self._generate_variable_declaration_inline(stmt.initializer))
            else:
                parts.append(self._generate_expression(stmt.initializer.expression))
        else:
            parts.append("")

        # Condition
        if stmt.condition:
            parts.append(self._generate_expression(stmt.condition))
        else:
            parts.append("true")

        # Increment
        if stmt.increment:
            parts.append(self._generate_expression(stmt.increment))
        else:
            parts.append("")

        for_header = f"for ({parts[0]}; {parts[1]}; {parts[2]})"
        self.output_lines.append(for_header + " {")
        self.indent_level += 1

        self._generate_statement(stmt.body)

        self.indent_level -= 1
        self.output_lines.append("}")

    def _generate_variable_declaration_inline(self, stmt: VariableDeclarationStatement) -> str:
        """Generate variable declaration inline (without semicolon)"""
        type_str = self._type_to_cpp(stmt.var_type)
        line = f"{type_str} {stmt.name}"

        if stmt.initializer:
            line += f" = {self._generate_expression(stmt.initializer)}"

        return line

    def _generate_return_statement(self, stmt: ReturnStatement):
        """Generate return statement"""
        if stmt.value:
            value_str = self._generate_expression(stmt.value)
            self.output_lines.append(f"return {value_str};")
        else:
            self.output_lines.append("return;")

    def _generate_break_statement(self, stmt: BreakStatement):
        """Generate break statement"""
        self.output_lines.append("break;")

    def _generate_continue_statement(self, stmt: ContinueStatement):
        """Generate continue statement"""
        self.output_lines.append("continue;")

    def _generate_expression(self, expr: Expression) -> str:
        """Generate code for an expression"""
        if isinstance(expr, LiteralExpression):
            return self._generate_literal(expr)
        elif isinstance(expr, IdentifierExpression):
            return expr.name
        elif isinstance(expr, BinaryOperationExpression):
            return self._generate_binary_operation(expr)
        elif isinstance(expr, UnaryOperationExpression):
            return self._generate_unary_operation(expr)
        elif isinstance(expr, AssignmentExpression):
            return self._generate_assignment(expr)
        elif isinstance(expr, CallExpression):
            return self._generate_call(expr)
        elif isinstance(expr, ArrayAccessExpression):
            return self._generate_array_access(expr)
        elif isinstance(expr, MemberAccessExpression):
            return self._generate_member_access(expr)
        else:
            return "/* unknown expression */"

    def _generate_literal(self, expr: LiteralExpression) -> str:
        """Generate literal"""
        if expr.literal_type == "string":
            return f'"{expr.value}"'
        elif expr.literal_type == "char":
            return expr.value
        elif expr.literal_type == "null":
            return "nullptr"
        else:
            return expr.value

    def _generate_binary_operation(self, expr: BinaryOperationExpression) -> str:
        """Generate binary operation"""
        left_str = self._generate_expression(expr.left)
        right_str = self._generate_expression(expr.right)
        return f"({left_str} {expr.operator} {right_str})"

    def _generate_unary_operation(self, expr: UnaryOperationExpression) -> str:
        """Generate unary operation"""
        operand_str = self._generate_expression(expr.operand)
        return f"{expr.operator}{operand_str}"

    def _generate_assignment(self, expr: AssignmentExpression) -> str:
        """Generate assignment"""
        target_str = self._generate_expression(expr.target)
        value_str = self._generate_expression(expr.value)
        return f"({target_str} = {value_str})"

    def _generate_call(self, expr: CallExpression) -> str:
        """Generate function call"""
        if isinstance(expr.callee, IdentifierExpression):
            if expr.callee.name == "print":
                # Convert print to cout
                if len(expr.arguments) >= 1:
                    arg_str = self._generate_expression(expr.arguments[0])
                    return f"(cout << {arg_str})"
            elif expr.callee.name == "sizeof":
                # Use C++ sizeof
                if len(expr.arguments) >= 1:
                    if isinstance(expr.arguments[0], IdentifierExpression):
                        return f"sizeof({expr.arguments[0].name})"
                    else:
                        # Handle type sizeof
                        type_node = expr.arguments[0]
                        type_str = self._type_to_cpp(type_node)
                        return f"sizeof({type_str})"

        callee_str = self._generate_expression(expr.callee)
        args_str = ", ".join(self._generate_expression(arg) for arg in expr.arguments)
        return f"{callee_str}({args_str})"

    def _generate_array_access(self, expr: ArrayAccessExpression) -> str:
        """Generate array access"""
        array_str = self._generate_expression(expr.array)
        index_str = self._generate_expression(expr.index)
        return f"({array_str}[{index_str}])"

    def _generate_member_access(self, expr: MemberAccessExpression) -> str:
        """Generate member access"""
        object_str = self._generate_expression(expr.object)
        operator = "->" if expr.is_arrow else "."
        return f"({object_str}{operator}{expr.member})"

    def _generate_parameters_list(self, parameters: List[tuple]) -> str:
        """Generate parameters list"""
        params = []
        for param_type, param_name in parameters:
            type_str = self._type_to_cpp(param_type)
            params.append(f"{type_str} {param_name}")
        return ", ".join(params)

    def _type_to_cpp(self, type_node) -> str:
        """Convert LowLogic type to C++ type"""
        if isinstance(type_node, PrimitiveType):
            if type_node.name == "string":
                return "string"
            return type_node.name
        elif isinstance(type_node, PointerType):
            base_type = self._type_to_cpp(type_node.base_type)
            return f"{base_type}*"
        elif isinstance(type_node, ArrayType):
            element_type = self._type_to_cpp(type_node.element_type)
            if type_node.size:
                size = self._generate_expression(type_node.size)
                return f"{element_type}[{size}]"
            else:
                return f"vector<{element_type}>"
        else:
            return "unknown"

    def _has_main_function(self, declarations: List[ASTNode]) -> bool:
        """Check if main function exists"""
        for decl in declarations:
            if isinstance(decl, FunctionDeclaration) and decl.name == "main":
                return True
        return False

    def _add_comment(self, comment: str):
        """Add comment line"""
        indent = "    " * self.indent_level
        self.output_lines.append(f"{indent}{comment}")