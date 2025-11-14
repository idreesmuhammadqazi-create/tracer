import { Token, TokenType } from '../types/lowlogic-types';

export class Lexer {
  private sourceCode: string;
  private position: number;
  private line: number;
  private column: number;
  private tokens: Token[] = [];

  private patterns: Array<[TokenType | string, RegExp]> = [
    // Multi-character operators (must come first)
    [TokenType.EQUAL, /==/],
    [TokenType.NOT_EQUAL, /!=/],
    [TokenType.LESS_EQUAL, /<=/],
    [TokenType.GREATER_EQUAL, />=/],
    [TokenType.AND, /&&/],
    [TokenType.OR, /\|\|/],
    [TokenType.ARROW, /->/],
    [TokenType.PLUS_PLUS, /\+\+/],
    [TokenType.MINUS_MINUS, /--/],
    [TokenType.PLUS_ASSIGN, /\+=/],
    [TokenType.MINUS_ASSIGN, /-=/],
    [TokenType.MULTIPLY_ASSIGN, /\*=/],
    [TokenType.DIVIDE_ASSIGN, /\/=/],

    // Comments
    ['LINE_COMMENT', /\/\/.*$/m],
    ['BLOCK_COMMENT', /\/\*[\s\S]*?\*\//],

    // Literals
    [TokenType.STRING, /"[^"]*"/],
    [TokenType.CHAR, /'.'/],
    [TokenType.FLOAT, /\d+\.\d+/],
    [TokenType.INTEGER, /\d+/],
    [TokenType.BOOLEAN, /true|false/],

    // Keywords
    ['KW_INT', /\bint\b/],
    ['KW_FLOAT', /\bfloat\b/],
    ['KW_CHAR', /\bchar\b/],
    ['KW_BOOL', /\bbool\b/],
    ['KW_PTR', /\bptr\b/],
    ['KW_STRING', /\bstring\b/],
    [TokenType.STRUCT, /\bstruct\b/],
    [TokenType.CLASS, /\bclass\b/],
    [TokenType.TEMPLATE, /\btemplate\b/],
    [TokenType.TYPENAME, /\btypename\b/],
    [TokenType.PUBLIC, /\bpublic\b/],
    [TokenType.PRIVATE, /\bprivate\b/],
    [TokenType.IF, /\bif\b/],
    [TokenType.ELSE, /\belse\b/],
    [TokenType.WHILE, /\bwhile\b/],
    [TokenType.FOR, /\bfor\b/],
    [TokenType.BREAK, /\bbreak\b/],
    [TokenType.CONTINUE, /\bcontinue\b/],
    [TokenType.RETURN, /\breturn\b/],
    [TokenType.NEW, /\bnew\b/],
    [TokenType.DELETE, /\bdelete\b/],
    [TokenType.NULL, /\bnull\b/],

    // Identifiers
    [TokenType.IDENTIFIER, /[a-zA-Z_][a-zA-Z0-9_]*/],

    // Single-character tokens
    [TokenType.ASSIGN, /=/],
    [TokenType.PLUS, /\+/],
    [TokenType.MINUS, /-/],
    [TokenType.MULTIPLY, /\*/],
    [TokenType.DIVIDE, /\//],
    [TokenType.MODULO, /%/],
    [TokenType.LESS_THAN, /</],
    [TokenType.GREATER_THAN, />/],
    [TokenType.NOT, /!/],
    [TokenType.ADDRESS_OF, /&/],
    [TokenType.DOT, /\./],
    [TokenType.LPAREN, /\(/],
    [TokenType.RPAREN, /\)/],
    [TokenType.LBRACE, /\{/],
    [TokenType.RBRACE, /\}/],
    [TokenType.LBRACKET, /\[/],
    [TokenType.RBRACKET, /\]/],
    [TokenType.SEMICOLON, /;/],
    [TokenType.COMMA, /,/],
    [TokenType.COLON, /:/],
    [TokenType.QUESTION, /\?/],

    // Whitespace and newlines
    [TokenType.WHITESPACE, /[ \t]+/],
    [TokenType.NEWLINE, /\n/],
  ];

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.sourceCode.length) {
      let matched = false;

      for (const [tokenType, pattern] of this.patterns) {
        const regex = new RegExp('^' + pattern.source);
        const match = this.sourceCode.substring(this.position).match(regex);

        if (match) {
          const value = match[0];

          // Handle newlines
          if (tokenType === TokenType.NEWLINE) {
            this.line++;
            this.column = 1;
          } else if (tokenType === TokenType.WHITESPACE) {
            this.column += value.length;
          } else {
            // Create token for non-whitespace
            if (tokenType !== TokenType.WHITESPACE && tokenType !== TokenType.NEWLINE) {
              const actualTokenType = this.getTokenType(tokenType, value);
              const token: Token = {
                type: actualTokenType,
                value: value,
                line: this.line,
                column: this.column
              };
              this.tokens.push(token);
            }

            this.column += value.length;
          }

          this.position += value.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Invalid character
        const char = this.sourceCode[this.position];
        throw new Error(`Invalid character: '${char}' at line ${this.line}, column ${this.column}`);
      }
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });

    return this.tokens;
  }

  private getTokenType(tokenType: TokenType | string, value: string): TokenType {
    // Handle renamed tokens
    const tokenMap: Record<string, TokenType> = {
      'LINE_COMMENT': TokenType.COMMENT,
      'BLOCK_COMMENT': TokenType.COMMENT,
      'KW_INT': TokenType.INT,
      'KW_FLOAT': TokenType.FLOAT_KW,
      'KW_CHAR': TokenType.CHAR_KW,
      'KW_BOOL': TokenType.BOOL,
      'KW_PTR': TokenType.PTR,
      'KW_STRING': TokenType.STRING_KW,
    };

    if (typeof tokenType === 'string' && tokenMap[tokenType]) {
      return tokenMap[tokenType];
    }

    return tokenType as TokenType;
  }

  getTokensDebug(): string {
    return this.tokens.map(token =>
      `Token(${token.type.value}, '${token.value}', ${token.line}:${token.column})`
    ).join('\n');
  }
}