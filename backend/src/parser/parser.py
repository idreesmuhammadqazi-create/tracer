"""
Parser for LowLogic language
Converts tokens into Abstract Syntax Tree (AST)
"""

from typing import List, Optional, Union
from .lexer import Token, TokenType, LexerError
from .ast_nodes import *


class ParserError(Exception):
    def __init__(self, message: str, token: Token):
        super().__init__(message)
        self.token = token
        self.line = token.line
        self.column = token.column


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.current = 0

    def parse(self) -> Program:
        """Parse the token list into an AST"""
        declarations = []

        while not self.is_at_end():
            if self.match(TokenType.STRUCT):
                declarations.append(self.parse_struct_declaration())
            elif self.match(TokenType.CLASS):
                declarations.append(self.parse_class_declaration())
            elif self.match(TokenType.TEMPLATE):
                declarations.append(self.parse_template_declaration())
            else:
                # Parse as statement for global scope
                declarations.append(self.parse_statement())

        return Program(declarations)

    def is_at_end(self) -> bool:
        """Check if we've reached the end of tokens"""
        return self.peek().type == TokenType.EOF

    def peek(self) -> Token:
        """Look at current token without consuming it"""
        return self.tokens[self.current]

    def previous(self) -> Token:
       Get the previous token"""
        return self.tokens[self.current - 1]

    def advance(self) -> Token:
        """Consume and return current token"""
        if not self.is_at_end():
            self.current += 1
        return self.previous()

    def match(self, *types: TokenType) -> bool:
        """Check if current token matches any of the given types"""
        for token_type in types:
            if self.check(token_type):
                self.advance()
                return True
        return False

    def check(self, token_type: TokenType) -> bool:
        """Check if current token is of given type"""
        if self.is_at_end():
            return False
        return self.peek().type == token_type

    def consume(self, token_type: TokenType, message: str) -> Token:
        """Consume token of expected type or throw error"""
        if self.check(token_type):
            return self.advance()
        raise ParserError(message, self.peek())

    def synchronize(self):
        """Synchronize parser after error"""
        self.advance()

        while not self.is_at_end():
            if self.previous().type == TokenType.SEMICOLON:
                return

            if self.peek().type in [TokenType.CLASS, TokenType.STRUCT, TokenType.FUN,
                                   TokenType.VAR, TokenType.FOR, TokenType.IF,
                                   TokenType.WHILE, TokenType.RETURN]:
                return

            self.advance()

    # Parsing methods

    def parse_statement(self) -> Statement:
        """Parse a statement"""
        if self.match(TokenType.IF):
            return self.parse_if_statement()
        elif self.match(TokenType.WHILE):
            return self.parse_while_statement()
        elif self.match(TokenType.FOR):
            return self.parse_for_statement()
        elif self.match(TokenType.RETURN):
            return self.parse_return_statement()
        elif self.match(TokenType.BREAK):
            return self.parse_break_statement()
        elif self.match(TokenType.CONTINUE):
            return self.parse_continue_statement()
        elif self.match(TokenType.LBRACE):
            return self.parse_block_statement()
        else:
            return self.parse_expression_statement()

    def parse_block_statement(self) -> BlockStatement:
        """Parse a block statement { ... }"""
        statements = []

        while not self.check(TokenType.RBRACE) and not self.is_at_end():
            statements.append(self.parse_statement())

        self.consume(TokenType.RBRACE, "Expected '}' after block")
        return BlockStatement(statements)

    def parse_expression_statement(self) -> ExpressionStatement:
        """Parse an expression statement"""
        expr = self.parse_expression()
        self.consume(TokenType.SEMICOLON, "Expected ';' after expression")
        return ExpressionStatement(expr)

    def parse_if_statement(self) -> IfStatement:
        """Parse if statement"""
        self.consume(TokenType.LPAREN, "Expected '(' after 'if'")
        condition = self.parse_expression()
        self.consume(TokenType.RPAREN, "Expected ')' after condition")

        then_branch = self.parse_statement()
        else_branch = None

        if self.match(TokenType.ELSE):
            else_branch = self.parse_statement()

        return IfStatement(condition, then_branch, else_branch)

    def parse_while_statement(self) -> WhileStatement:
        """Parse while statement"""
        self.consume(TokenType.LPAREN, "Expected '(' after 'while'")
        condition = self.parse_expression()
        self.consume(TokenType.RPAREN, "Expected ')' after condition")

        body = self.parse_statement()
        return WhileStatement(condition, body)

    def parse_for_statement(self) -> ForStatement:
        """Parse for statement"""
        self.consume(TokenType.LPAREN, "Expected '(' after 'for'")

        initializer = None
        if self.match(TokenType.SEMICOLON):
            initializer = None
        elif self.match(TokenType.INT, TokenType.FLOAT_KW, TokenType.CHAR_KW,
                       TokenType.BOOL, TokenType.STRING_KW, TokenType.PTR):
            initializer = self.parse_variable_declaration_statement()
        else:
            initializer = self.parse_expression_statement()

        condition = None
        if not self.check(TokenType.SEMICOLON):
            condition = self.parse_expression()
        self.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition")

        increment = None
        if not self.check(TokenType.RPAREN):
            increment = self.parse_expression()
        self.consume(TokenType.RPAREN, "Expected ')' after for clauses")

        body = self.parse_statement()
        return ForStatement(initializer, condition, increment, body)

    def parse_return_statement(self) -> ReturnStatement:
        """Parse return statement"""
        value = None
        if not self.check(TokenType.SEMICOLON):
            value = self.parse_expression()

        self.consume(TokenType.SEMICOLON, "Expected ';' after return value")
        return ReturnStatement(value)

    def parse_break_statement(self) -> BreakStatement:
        """Parse break statement"""
        self.consume(TokenType.SEMICOLON, "Expected ';' after 'break'")
        return BreakStatement()

    def parse_continue_statement(self) -> ContinueStatement:
        """Parse continue statement"""
        self.consume(TokenType.SEMICOLON, "Expected ';' after 'continue'")
        return ContinueStatement()

    def parse_variable_declaration_statement(self) -> VariableDeclarationStatement:
        """Parse variable declaration"""
        var_type = self.parse_type()
        name = self.consume(TokenType.IDENTIFIER, "Expected variable name").value

        initializer = None
        if self.match(TokenType.ASSIGN):
            initializer = self.parse_expression()

        self.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration")
        return VariableDeclarationStatement(var_type, name, initializer)

    def parse_expression(self) -> Expression:
        """Parse an expression"""
        return self.parse_assignment()

    def parse_assignment(self) -> Expression:
        """Parse assignment expression"""
        expr = self.parse_logical_or()

        if self.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
                      TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN):
            operator = self.previous().value
            value = self.parse_assignment()

            if isinstance(expr, (IdentifierExpression, ArrayAccessExpression,
                               MemberAccessExpression)):
                return AssignmentExpression(expr, value)

            raise ParserError("Invalid assignment target", self.previous())

        return expr

    def parse_logical_or(self) -> Expression:
        """Parse logical OR expression"""
        expr = self.parse_logical_and()

        while self.match(TokenType.OR):
            operator = self.previous().value
            right = self.parse_logical_and()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_logical_and(self) -> Expression:
        """Parse logical AND expression"""
        expr = self.parse_equality()

        while self.match(TokenType.AND):
            operator = self.previous().value
            right = self.parse_equality()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_equality(self) -> Expression:
        """Parse equality expression"""
        expr = self.parse_comparison()

        while self.match(TokenType.EQUAL, TokenType.NOT_EQUAL):
            operator = self.previous().value
            right = self.parse_comparison()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_comparison(self) -> Expression:
        """Parse comparison expression"""
        expr = self.parse_term()

        while self.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL,
                        TokenType.LESS_THAN, TokenType.LESS_EQUAL):
            operator = self.previous().value
            right = self.parse_term()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_term(self) -> Expression:
        """Parse term expression (addition/subtraction)"""
        expr = self.parse_factor()

        while self.match(TokenType.PLUS, TokenType.MINUS):
            operator = self.previous().value
            right = self.parse_factor()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_factor(self) -> Expression:
        """Parse factor expression (multiplication/division)"""
        expr = self.parse_unary()

        while self.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO):
            operator = self.previous().value
            right = self.parse_unary()
            expr = BinaryOperationExpression(expr, operator, right)

        return expr

    def parse_unary(self) -> Expression:
        """Parse unary expression"""
        if self.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS_PLUS,
                      TokenType.MINUS_MINUS, TokenType.DEREFERENCE, TokenType.ADDRESS_OF):
            operator = self.previous().value
            right = self.parse_unary()
            return UnaryOperationExpression(operator, right)

        return self.parse_postfix()

    def parse_postfix(self) -> Expression:
        """Parse postfix expressions"""
        expr = self.parse_primary()

        while True:
            if self.match(TokenType.LBRACKET):
                index = self.parse_expression()
                self.consume(TokenType.RBRACKET, "Expected ']' after index")
                expr = ArrayAccessExpression(expr, index)
            elif self.match(TokenType.LPAREN):
                arguments = []
                if not self.check(TokenType.RPAREN):
                    arguments.append(self.parse_expression())
                    while self.match(TokenType.COMMA):
                        arguments.append(self.parse_expression())
                self.consume(TokenType.RPAREN, "Expected ')' after arguments")
                expr = CallExpression(expr, arguments)
            elif self.match(TokenType.DOT, TokenType.ARROW):
                is_arrow = self.previous().type == TokenType.ARROW
                member = self.consume(TokenType.IDENTIFIER, "Expected property name").value
                expr = MemberAccessExpression(expr, member, is_arrow)
            elif self.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS):
                operator = self.previous().value
                expr = UnaryOperationExpression(operator, expr, is_postfix=True)
            else:
                break

        return expr

    def parse_primary(self) -> Expression:
        """Parse primary expressions"""
        if self.match(TokenType.TRUE):
            return LiteralExpression("true", "bool")
        elif self.match(TokenType.FALSE):
            return LiteralExpression("false", "bool")
        elif self.match(TokenType.NULL):
            return LiteralExpression("null", "null")
        elif self.match(TokenType.INTEGER):
            return LiteralExpression(self.previous().value, "int")
        elif self.match(TokenType.FLOAT):
            return LiteralExpression(self.previous().value, "float")
        elif self.match(TokenType.CHAR):
            return LiteralExpression(self.previous().value, "char")
        elif self.match(TokenType.STRING):
            return LiteralExpression(self.previous().value, "string")
        elif self.match(TokenType.IDENTIFIER):
            return IdentifierExpression(self.previous().value)
        elif self.match(TokenType.LPAREN):
            expr = self.parse_expression()
            self.consume(TokenType.RPAREN, "Expected ')' after expression")
            return expr
        elif self.match(TokenType.NEW):
            return self.parse_new_expression()
        else:
            raise ParserError(f"Unexpected token '{self.peek().value}'", self.peek())

    def parse_new_expression(self) -> Expression:
        """Parse new expression for memory allocation"""
        if self.match(TokenType.INT, TokenType.FLOAT_KW, TokenType.CHAR_KW,
                      TokenType.BOOL, TokenType.STRING_KW):
            base_type = PrimitiveType(self.previous().value)
            return CallExpression(
                IdentifierExpression("new"),
                [LiteralExpression(base_type.to_dict(), "type")]
            )
        else:
            raise ParserError("Expected type after 'new'", self.peek())

    def parse_type(self) -> TypeNode:
        """Parse a type"""
        if self.match(TokenType.INT, TokenType.FLOAT_KW, TokenType.CHAR_KW,
                      TokenType.BOOL, TokenType.STRING_KW):
            base_type = PrimitiveType(self.previous().value)

            # Handle pointers
            if self.match(TokenType.PTR):
                if self.match(TokenType.LT):
                    inner_type = self.parse_type()
                    self.consume(TokenType.GT, "Expected '>' after pointer type")
                    return PointerType(inner_type)
                else:
                    return PointerType(base_type)

            # Handle arrays
            if self.match(TokenType.LBRACKET):
                size = None
                if not self.check(TokenType.RBRACKET):
                    size = self.parse_expression()
                self.consume(TokenType.RBRACKET, "Expected ']' after array type")
                return ArrayType(base_type, size)

            return base_type
        else:
            raise ParserError("Expected type", self.peek())

    def parse_struct_declaration(self) -> StructDeclaration:
        """Parse struct declaration"""
        name = self.consume(TokenType.IDENTIFIER, "Expected struct name").value
        self.consume(TokenType.LBRACE, "Expected '{' after struct name")

        members = []
        while not self.check(TokenType.RBRACE) and not self.is_at_end():
            member_type = self.parse_type()
            member_name = self.consume(TokenType.IDENTIFIER, "Expected member name").value
            self.consume(TokenType.SEMICOLON, "Expected ';' after member declaration")
            members.append((member_type, member_name))

        self.consume(TokenType.RBRACE, "Expected '}' after struct members")
        self.consume(TokenType.SEMICOLON, "Expected ';' after struct declaration")

        return StructDeclaration(name, members)

    def parse_class_declaration(self) -> ClassDeclaration:
        """Parse class declaration"""
        name = self.consume(TokenType.IDENTIFIER, "Expected class name").value
        self.consume(TokenType.LBRACE, "Expected '{' after class name")

        members = []
        methods = []

        while not self.check(TokenType.RBRACE) and not self.is_at_end():
            # Parse access specifier
            access = "private"
            if self.match(TokenType.PUBLIC, TokenType.PRIVATE):
                access = self.previous().value

            # Parse member or method
            if self.match(TokenType.FUN):
                # Method
                methods.append(self.parse_function_declaration())
            else:
                # Member variable
                member_type = self.parse_type()
                member_name = self.consume(TokenType.IDENTIFIER, "Expected member name").value
                self.consume(TokenType.SEMICOLON, "Expected ';' after member declaration")
                members.append((member_type, member_name, access))

        self.consume(TokenType.RBRACE, "Expected '}' after class members")
        self.consume(TokenType.SEMICOLON, "Expected ';' after class declaration")

        return ClassDeclaration(name, members, methods)

    def parse_template_declaration(self) -> ASTNode:
        """Parse template declaration"""
        self.consume(TokenType.LT, "Expected '<' after 'template'")
        self.consume(TokenType.TYPENAME, "Expected 'typename' in template parameter")
        param_name = self.consume(TokenType.IDENTIFIER, "Expected template parameter name").value
        self.consume(TokenType.GT, "Expected '>' after template parameter")

        # Parse what comes after template (class or struct)
        if self.match(TokenType.CLASS):
            return self.parse_class_declaration()
        elif self.match(TokenType.STRUCT):
            return self.parse_struct_declaration()
        else:
            raise ParserError("Expected class or struct after template declaration", self.peek())

    def parse_function_declaration(self) -> FunctionDeclaration:
        """Parse function declaration"""
        return_type = self.parse_type()
        name = self.consume(TokenType.IDENTIFIER, "Expected function name").value

        self.consume(TokenType.LPAREN, "Expected '(' after function name")
        parameters = []

        if not self.check(TokenType.RPAREN):
            parameters.append(self.parse_parameter())
            while self.match(TokenType.COMMA):
                parameters.append(self.parse_parameter())

        self.consume(TokenType.RPAREN, "Expected ')' after parameters")
        body = self.parse_block_statement()

        return FunctionDeclaration(return_type, name, parameters, body)

    def parse_parameter(self) -> tuple:
        """Parse function parameter"""
        param_type = self.parse_type()
        name = self.consume(TokenType.IDENTIFIER, "Expected parameter name").value
        return (param_type, name)