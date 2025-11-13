"""
Lexer for LowLogic language
Tokenizes source code into tokens for parsing
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

        # Define token patterns
        self.token_specs = [
            # Whitespace and comments
            (TokenType.WHITESPACE, r'[ \t]+', None),
            (TokenType.NEWLINE, r'\n', self._handle_newline),
            ('LINE_COMMENT', r'//.*', None),
            ('BLOCK_COMMENT', r'/\*[\s\S]*?\*/', self._handle_multiline_comment),

            # Literals
            (TokenType.INTEGER, r'\d+', None),
            (TokenType.FLOAT, r'\d+\.\d+', None),
            (TokenType.CHAR, r"'.'", None),
            (TokenType.STRING, r'"[^"]*"', None),
            (TokenType.BOOLEAN, r'true|false', None),

            # Keywords and identifiers
            ('KW_INT', r'\bint\b', None),
            ('KW_FLOAT', r'\bfloat\b', None),
            ('KW_CHAR', r'\bchar\b', None),
            ('KW_BOOL', r'\bbool\b', None),
            ('KW_PTR', r'\bptr\b', None),
            ('KW_STRING', r'\bstring\b', None),
            (TokenType.STRUCT, r'\bstruct\b', None),
            (TokenType.CLASS, r'\bclass\b', None),
            (TokenType.TEMPLATE, r'\btemplate\b', None),
            (TokenType.TYPENAME, r'\btypename\b', None),
            (TokenType.PUBLIC, r'\bpublic\b', None),
            (TokenType.PRIVATE, r'\bprivate\b', None),
            (TokenType.IF, r'\bif\b', None),
            (TokenType.ELSE, r'\belse\b', None),
            (TokenType.WHILE, r'\bwhile\b', None),
            (TokenType.FOR, r'\bfor\b', None),
            (TokenType.BREAK, r'\bbreak\b', None),
            (TokenType.CONTINUE, r'\bcontinue\b', None),
            (TokenType.RETURN, r'\breturn\b', None),
            (TokenType.NEW, r'\bnew\b', None),
            (TokenType.DELETE, r'\bdelete\b', None),
            (TokenType.NULL, r'\bnull\b', None),
            (TokenType.TRUE, r'\btrue\b', None),
            (TokenType.FALSE, r'\bfalse\b', None),
            (TokenType.IDENTIFIER, r'[a-zA-Z_][a-zA-Z0-9_]*', None),

            # Multi-character operators
            (TokenType.EQUAL, r'==', None),
            (TokenType.NOT_EQUAL, r'!=', None),
            (TokenType.LESS_EQUAL, r'<=', None),
            (TokenType.GREATER_EQUAL, r'>=', None),
            (TokenType.AND, r'&&', None),
            (TokenType.OR, r'\|\|', None),
            (TokenType.ARROW, r'->', None),
            (TokenType.PLUS_PLUS, r'\+\+', None),
            (TokenType.MINUS_MINUS, r'--', None),
            (TokenType.PLUS_ASSIGN, r'\+=', None),
            (TokenType.MINUS_ASSIGN, r'-=', None),
            (TokenType.MULTIPLY_ASSIGN, r'\*=', None),
            (TokenType.DIVIDE_ASSIGN, r'/=', None),

            # Single-character tokens
            (TokenType.ASSIGN, r'=', None),
            (TokenType.PLUS, r'\+', None),
            (TokenType.MINUS, r'-', None),
            (TokenType.MULTIPLY, r'\*', None),
            (TokenType.DIVIDE, r'/', None),
            (TokenType.MODULO, r'%', None),
            (TokenType.LESS_THAN, r'<', None),
            (TokenType.GREATER_THAN, r'>', None),
            (TokenType.NOT, r'!', None),
            (TokenType.ADDRESS_OF, r'&', None),
            (TokenType.DEREFERENCE, r'\*', None),
            (TokenType.DOT, r'\.', None),
            (TokenType.LPAREN, r'\(', None),
            (TokenType.RPAREN, r'\)', None),
            (TokenType.LBRACE, r'\{', None),
            (TokenType.RBRACE, r'\}', None),
            (TokenType.LBRACKET, r'\[', None),
            (TokenType.RBRACKET, r'\]', None),
            (TokenType.SEMICOLON, r';', None),
            (TokenType.COMMA, r',', None),
            (TokenType.COLON, r':', None),
            (TokenType.QUESTION, r'\?', None),
        ]

        # Combine all patterns into a single regex
        regex_parts = []
        for tok_type, pattern, _ in self.token_specs:
            if isinstance(tok_type, str):
                regex_parts.append(f'(?P<{tok_type}>{pattern})')
            else:
                regex_parts.append(f'(?P<{tok_type.name}>{pattern})')
        self.token_regex = '|'.join(regex_parts)
        self.re_token = re.compile(self.token_regex)

    def _handle_newline(self, match):
        """Handle newline tokens"""
        self.line += 1
        self.column = 1

    def _handle_multiline_comment(self, match):
        """Handle multiline comments and update line counters"""
        comment_text = match.group()
        newlines = comment_text.count('\n')
        if newlines > 0:
            self.line += newlines
            # Find the position after the last newline
            last_newline_pos = comment_text.rfind('\n')
            self.column = len(comment_text) - last_newline_pos
        else:
            self.column += len(match.group())

    def tokenize(self) -> List[Token]:
        """Tokenize the source code"""
        self.tokens = []
        self.position = 0
        self.line = 1
        self.column = 1

        for match in self.re_token.finditer(self.source_code):
            token_type = None
            token_value = None

            # Find which token type matched
            for name, value in match.groupdict().items():
                if value is not None:
                    if name in ['LINE_COMMENT', 'BLOCK_COMMENT']:
                        token_type = TokenType.COMMENT
                    else:
                        token_type = TokenType[name]
                    token_value = value
                    break

            if token_type is None:
                # No match found - this is an error
                continue

            # Skip whitespace tokens but track position
            if token_type == TokenType.WHITESPACE:
                self.column += len(token_value)
                continue

            # Create token
            token = Token(
                type=token_type,
                value=token_value,
                line=self.line,
                column=self.column
            )

            # Update position
            if token_type == TokenType.NEWLINE:
                # Already handled by _handle_newline
                pass
            elif token_type == TokenType.COMMENT and '/*' in token_value:
                # Already handled by _handle_multiline_comment
                pass
            else:
                self.column += len(token_value)

            # Add token to list (skip whitespace)
            if token_type not in [TokenType.WHITESPACE, TokenType.NEWLINE]:
                self.tokens.append(token)

        # Add EOF token
        self.tokens.append(Token(TokenType.EOF, "", self.line, self.column))

        return self.tokens

    def get_tokens_debug(self) -> str:
        """Get a debug string representation of all tokens"""
        return '\n'.join(str(token) for token in self.tokens)