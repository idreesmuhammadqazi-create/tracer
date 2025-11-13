"""
Simple lexer for LowLogic language - avoids regex group conflicts
"""

import re
from enum import Enum
from typing import List, NamedTuple, Optional
from dataclasses import dataclass


class TokenType(Enum):
    # Literals
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    CHAR = "CHAR"
    STRING = "STRING"
    BOOLEAN = "BOOLEAN"
    IDENTIFIER = "IDENTIFIER"

    # Keywords
    INT = "INT"
    FLOAT_KW = "FLOAT"
    CHAR_KW = "CHAR"
    BOOL = "BOOL"
    PTR = "PTR"
    STRING_KW = "STRING"
    STRUCT = "STRUCT"
    CLASS = "CLASS"
    TEMPLATE = "TEMPLATE"
    TYPENAME = "TYPENAME"
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    IF = "IF"
    ELSE = "ELSE"
    WHILE = "WHILE"
    FOR = "FOR"
    BREAK = "BREAK"
    CONTINUE = "CONTINUE"
    RETURN = "RETURN"
    NEW = "NEW"
    DELETE = "DELETE"
    NULL = "NULL"
    TRUE = "TRUE"
    FALSE = "FALSE"

    # Operators
    ASSIGN = "="
    PLUS = "+"
    MINUS = "-"
    MULTIPLY = "*"
    DIVIDE = "/"
    MODULO = "%"

    # Comparison operators
    EQUAL = "=="
    NOT_EQUAL = "!="
    LESS_THAN = "<"
    GREATER_THAN = ">"
    LESS_EQUAL = "<="
    GREATER_EQUAL = ">="

    # Logical operators
    AND = "&&"
    OR = "||"
    NOT = "!"

    # Pointer operators
    ADDRESS_OF = "&"
    DEREFERENCE = "*"
    ARROW = "->"
    DOT = "."

    # Other operators
    PLUS_PLUS = "++"
    MINUS_MINUS = "--"
    PLUS_ASSIGN = "+="
    MINUS_ASSIGN = "-="
    MULTIPLY_ASSIGN = "*="
    DIVIDE_ASSIGN = "/="

    # Delimiters
    LPAREN = "("
    RPAREN = ")"
    LBRACE = "{"
    RBRACE = "}"
    LBRACKET = "["
    RBRACKET = "]"
    SEMICOLON = ";"
    COMMA = ","
    COLON = ":"
    QUESTION = "?"

    # Special
    NEWLINE = "NEWLINE"
    EOF = "EOF"
    WHITESPACE = "WHITESPACE"
    COMMENT = "COMMENT"


@dataclass
class Token:
    type: TokenType
    value: str
    line: int
    column: int

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "value": self.value,
            "line": self.line,
            "column": self.column
        }

    def __repr__(self):
        return f"Token({self.type.value}, '{self.value}', {self.line}:{self.column})"


class LexerError(Exception):
    def __init__(self, message: str, line: int, column: int):
        super().__init__(message)
        self.line = line
        self.column = column


class Lexer:
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.position = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []

        # Define token patterns in order of precedence
        self.patterns = [
            # Multi-character operators (must come before single chars)
            (TokenType.EQUAL, r'=='),
            (TokenType.NOT_EQUAL, r'!='),
            (TokenType.LESS_EQUAL, r'<='),
            (TokenType.GREATER_EQUAL, r'>='),
            (TokenType.AND, r'&&'),
            (TokenType.OR, r'\|\|'),
            (TokenType.ARROW, r'->'),
            (TokenType.PLUS_PLUS, r'\+\+'),
            (TokenType.MINUS_MINUS, r'--'),
            (TokenType.PLUS_ASSIGN, r'\+='),
            (TokenType.MINUS_ASSIGN, r'-='),
            (TokenType.MULTIPLY_ASSIGN, r'\*='),
            (TokenType.DIVIDE_ASSIGN, r'/='),

            # Comments
            (TokenType.COMMENT, r'//.*'),
            (TokenType.COMMENT, r'/\*[\s\S]*?\*/'),

            # Literals
            (TokenType.STRING, r'"[^"]*"'),
            (TokenType.CHAR, r"'.'"),
            (TokenType.FLOAT, r'\d+\.\d+'),
            (TokenType.INTEGER, r'\d+'),
            (TokenType.BOOLEAN, r'true|false'),

            # Keywords
            (TokenType.INT, r'\bint\b'),
            (TokenType.FLOAT_KW, r'\bfloat\b'),
            (TokenType.CHAR_KW, r'\bchar\b'),
            (TokenType.BOOL, r'\bbool\b'),
            (TokenType.PTR, r'\bptr\b'),
            (TokenType.STRING_KW, r'\bstring\b'),
            (TokenType.STRUCT, r'\bstruct\b'),
            (TokenType.CLASS, r'\bclass\b'),
            (TokenType.TEMPLATE, r'\btemplate\b'),
            (TokenType.TYPENAME, r'\btypename\b'),
            (TokenType.PUBLIC, r'\bpublic\b'),
            (TokenType.PRIVATE, r'\bprivate\b'),
            (TokenType.IF, r'\bif\b'),
            (TokenType.ELSE, r'\belse\b'),
            (TokenType.WHILE, r'\bwhile\b'),
            (TokenType.FOR, r'\bfor\b'),
            (TokenType.BREAK, r'\bbreak\b'),
            (TokenType.CONTINUE, r'\bcontinue\b'),
            (TokenType.RETURN, r'\breturn\b'),
            (TokenType.NEW, r'\bnew\b'),
            (TokenType.DELETE, r'\bdelete\b'),
            (TokenType.NULL, r'\bnull\b'),

            # Identifiers
            (TokenType.IDENTIFIER, r'[a-zA-Z_][a-zA-Z0-9_]*'),

            # Single-character tokens
            (TokenType.ASSIGN, r'='),
            (TokenType.PLUS, r'\+'),
            (TokenType.MINUS, r'-'),
            (TokenType.MULTIPLY, r'\*'),
            (TokenType.DIVIDE, r'/'),
            (TokenType.MODULO, r'%'),
            (TokenType.LESS_THAN, r'<'),
            (TokenType.GREATER_THAN, r'>'),
            (TokenType.NOT, r'!'),
            (TokenType.ADDRESS_OF, r'&'),
            (TokenType.DOT, r'\.'),
            (TokenType.LPAREN, r'\('),
            (TokenType.RPAREN, r'\)'),
            (TokenType.LBRACE, r'\{'),
            (TokenType.RBRACE, r'\}'),
            (TokenType.LBRACKET, r'\['),
            (TokenType.RBRACKET, r'\]'),
            (TokenType.SEMICOLON, r';'),
            (TokenType.COMMA, r','),
            (TokenType.COLON, r':'),
            (TokenType.QUESTION, r'\?'),

            # Whitespace and newlines
            (TokenType.WHITESPACE, r'[ \t]+'),
            (TokenType.NEWLINE, r'\n'),
        ]

        # Compile all patterns
        self.compiled_patterns = [(token_type, re.compile(pattern)) for token_type, pattern in self.patterns]

    def tokenize(self) -> List[Token]:
        """Tokenize the source code"""
        self.tokens = []
        self.position = 0
        self.line = 1
        self.column = 1

        while self.position < len(self.source_code):
            matched = False

            # Try each pattern
            for token_type, pattern in self.compiled_patterns:
                match = pattern.match(self.source_code, self.position)
                if match:
                    value = match.group()

                    # Handle newlines
                    if token_type == TokenType.NEWLINE:
                        self.line += 1
                        self.column = 1
                    elif token_type == TokenType.WHITESPACE:
                        self.column += len(value)
                    else:
                        # Create token for non-whitespace
                        if token_type not in [TokenType.WHITESPACE, TokenType.NEWLINE]:
                            token = Token(
                                type=token_type,
                                value=value,
                                line=self.line,
                                column=self.column
                            )
                            self.tokens.append(token)

                        self.column += len(value)

                    self.position += len(value)
                    matched = True
                    break

            if not matched:
                # Invalid character
                char = self.source_code[self.position]
                raise LexerError(f"Invalid character: '{char}'", self.line, self.column)

        # Add EOF token
        self.tokens.append(Token(TokenType.EOF, "", self.line, self.column))
        return self.tokens

    def get_tokens_debug(self) -> str:
        """Get a debug string representation of all tokens"""
        return '\n'.join(str(token) for token in self.tokens)