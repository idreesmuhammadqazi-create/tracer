"""
Abstract Syntax Tree (AST) nodes for LowLogic language
"""

from abc import ABC, abstractmethod
from typing import Any, List, Optional, Dict, Union
from dataclasses import dataclass


class ASTNode(ABC):
    """Base class for all AST nodes"""

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary for JSON serialization"""
        pass


class Expression(ASTNode):
    """Base class for expressions"""
    pass


class Statement(ASTNode):
    """Base class for statements"""
    pass


class TypeNode(ASTNode):
    """Base class for type nodes"""
    pass


# Expression Nodes


class LiteralExpression(Expression):
    def __init__(self, value: str, literal_type: str):
        self.value = value
        self.literal_type = literal_type  # 'int', 'float', 'char', 'string', 'bool'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "LiteralExpression",
            "value": self.value,
            "literal_type": self.literal_type
        }


class IdentifierExpression(Expression):
    def __init__(self, name: str):
        self.name = name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "IdentifierExpression",
            "name": self.name
        }


class BinaryOperationExpression(Expression):
    def __init__(self, left: Expression, operator: str, right: Expression):
        self.left = left
        self.operator = operator
        self.right = right

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "BinaryOperationExpression",
            "left": self.left.to_dict(),
            "operator": self.operator,
            "right": self.right.to_dict()
        }


class UnaryOperationExpression(Expression):
    def __init__(self, operator: str, operand: Expression):
        self.operator = operator
        self.operand = operand

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "UnaryOperationExpression",
            "operator": self.operator,
            "operand": self.operand.to_dict()
        }


class AssignmentExpression(Expression):
    def __init__(self, target: Expression, value: Expression):
        self.target = target
        self.value = value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "AssignmentExpression",
            "target": self.target.to_dict(),
            "value": self.value.to_dict()
        }


class CallExpression(Expression):
    def __init__(self, callee: Expression, arguments: List[Expression]):
        self.callee = callee
        self.arguments = arguments

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "CallExpression",
            "callee": self.callee.to_dict(),
            "arguments": [arg.to_dict() for arg in self.arguments]
        }


class ArrayAccessExpression(Expression):
    def __init__(self, array: Expression, index: Expression):
        self.array = array
        self.index = index

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ArrayAccessExpression",
            "array": self.array.to_dict(),
            "index": self.index.to_dict()
        }


class MemberAccessExpression(Expression):
    def __init__(self, object: Expression, member: str, is_arrow: bool = False):
        self.object = object
        self.member = member
        self.is_arrow = is_arrow  # True for ->, False for .

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "MemberAccessExpression",
            "object": self.object.to_dict(),
            "member": self.member,
            "is_arrow": self.is_arrow
        }


# Type Nodes


class PrimitiveType(TypeNode):
    def __init__(self, name: str):
        self.name = name  # 'int', 'float', 'char', 'bool', 'string'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "PrimitiveType",
            "name": self.name
        }


class PointerType(TypeNode):
    def __init__(self, base_type: TypeNode):
        self.base_type = base_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "PointerType",
            "base_type": self.base_type.to_dict()
        }


class ArrayType(TypeNode):
    def __init__(self, element_type: TypeNode, size: Optional[Expression] = None):
        self.element_type = element_type
        self.size = size  # None for dynamic arrays

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ArrayType",
            "element_type": self.element_type.to_dict(),
            "size": self.size.to_dict() if self.size else None
        }


# Statement Nodes


class ExpressionStatement(Statement):
    def __init__(self, expression: Expression):
        self.expression = expression

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ExpressionStatement",
            "expression": self.expression.to_dict()
        }


class VariableDeclarationStatement(Statement):
    def __init__(self, var_type: TypeNode, name: str, initializer: Optional[Expression] = None):
        self.var_type = var_type
        self.name = name
        self.initializer = initializer

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "VariableDeclarationStatement",
            "var_type": self.var_type.to_dict(),
            "name": self.name,
            "initializer": self.initializer.to_dict() if self.initializer else None
        }


class BlockStatement(Statement):
    def __init__(self, statements: List[Statement]):
        self.statements = statements

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "BlockStatement",
            "statements": [stmt.to_dict() for stmt in self.statements]
        }


class IfStatement(Statement):
    def __init__(self, condition: Expression, then_branch: Statement, else_branch: Optional[Statement] = None):
        self.condition = condition
        self.then_branch = then_branch
        self.else_branch = else_branch

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "IfStatement",
            "condition": self.condition.to_dict(),
            "then_branch": self.then_branch.to_dict(),
            "else_branch": self.else_branch.to_dict() if self.else_branch else None
        }


class WhileStatement(Statement):
    def __init__(self, condition: Expression, body: Statement):
        self.condition = condition
        self.body = body

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "WhileStatement",
            "condition": self.condition.to_dict(),
            "body": self.body.to_dict()
        }


class ForStatement(Statement):
    def __init__(self,
                 initializer: Optional[Statement],
                 condition: Optional[Expression],
                 increment: Optional[Expression],
                 body: Statement):
        self.initializer = initializer
        self.condition = condition
        self.increment = increment
        self.body = body

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ForStatement",
            "initializer": self.initializer.to_dict() if self.initializer else None,
            "condition": self.condition.to_dict() if self.condition else None,
            "increment": self.increment.to_dict() if self.increment else None,
            "body": self.body.to_dict()
        }


class ReturnStatement(Statement):
    def __init__(self, value: Optional[Expression] = None):
        self.value = value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ReturnStatement",
            "value": self.value.to_dict() if self.value else None
        }


class BreakStatement(Statement):
    def to_dict(self) -> Dict[str, Any]:
        return {"type": "BreakStatement"}


class ContinueStatement(Statement):
    def to_dict(self) -> Dict[str, Any]:
        return {"type": "ContinueStatement"}


# Top-level Nodes


class FunctionDeclaration(ASTNode):
    def __init__(self,
                 return_type: TypeNode,
                 name: str,
                 parameters: List[tuple],
                 body: BlockStatement):
        self.return_type = return_type
        self.name = name
        self.parameters = parameters  # List of (TypeNode, name) tuples
        self.body = body

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "FunctionDeclaration",
            "return_type": self.return_type.to_dict(),
            "name": self.name,
            "parameters": [{"type": param_type.to_dict(), "name": name} for param_type, name in self.parameters],
            "body": self.body.to_dict()
        }


class StructDeclaration(ASTNode):
    def __init__(self, name: str, members: List[tuple]):
        self.name = name
        self.members = members  # List of (TypeNode, name) tuples

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "StructDeclaration",
            "name": self.name,
            "members": [{"type": member_type.to_dict(), "name": name} for member_type, name in self.members]
        }


class ClassDeclaration(ASTNode):
    def __init__(self, name: str, members: List[tuple], methods: List[FunctionDeclaration]):
        self.name = name
        self.members = members  # List of (TypeNode, name, access) tuples
        self.methods = methods

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "ClassDeclaration",
            "name": self.name,
            "members": [{"type": member_type.to_dict(), "name": name, "access": access}
                       for member_type, name, access in self.members],
            "methods": [method.to_dict() for method in self.methods]
        }


class Program(ASTNode):
    def __init__(self, declarations: List[ASTNode]):
        self.declarations = declarations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Program",
            "declarations": [decl.to_dict() for decl in self.declarations]
        }