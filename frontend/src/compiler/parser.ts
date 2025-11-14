import { Token, TokenType, ASTNode, Program, VariableDeclarationStatement, ExpressionStatement, BlockStatement, IfStatement, WhileStatement, ForStatement, ReturnStatement, BreakStatement, ContinueStatement, LiteralExpression, IdentifierExpression, BinaryOperationExpression, UnaryOperationExpression, AssignmentExpression, CallExpression, ArrayAccessExpression, MemberAccessExpression, TypeNode } from '../types/lowlogic-types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const declarations: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const decl = this.declaration();
      if (decl) {
        declarations.push(decl);
      }
    }

    return {
      type: 'Program',
      declarations
    };
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private check(tokenType: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === tokenType;
  }

  private match(...tokenTypes: TokenType[]): boolean {
    for (const tokenType of tokenTypes) {
      if (this.check(tokenType)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(tokenType: TokenType, message: string): Token {
    if (this.check(tokenType)) return this.advance();
    throw new Error(`${message}. Found ${this.peek().type.value} at line ${this.peek().line}`);
  }

  private declaration(): ASTNode | null {
    if (this.match(TokenType.STRUCT)) {
      return this.structDeclaration();
    }
    if (this.match(TokenType.CLASS)) {
      return this.classDeclaration();
    }
    return this.statement();
  }

  private statement(): ASTNode {
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.BREAK)) return this.breakStatement();
    if (this.match(TokenType.CONTINUE)) return this.continueStatement();
    if (this.match(TokenType.LBRACE)) return this.blockStatement();

    if (this.check(TokenType.INT) || this.check(TokenType.FLOAT_KW) ||
        this.check(TokenType.CHAR_KW) || this.check(TokenType.BOOL) ||
        this.check(TokenType.STRING_KW) || this.check(TokenType.PTR)) {
      return this.variableDeclaration();
    }

    return this.expressionStatement();
  }

  private blockStatement(): BlockStatement {
    const statements: ASTNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) statements.push(stmt);
    }

    this.consume(TokenType.RBRACE, "Expected '}' after block");
    return {
      type: 'BlockStatement',
      statements
    };
  }

  private variableDeclaration(): VariableDeclarationStatement {
    const varType = this.type();
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;

    let initializer: ASTNode | undefined;
    if (this.match(TokenType.ASSIGN)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    return {
      type: 'VariableDeclarationStatement',
      varType,
      name,
      initializer
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");
    return {
      type: 'ExpressionStatement',
      expression: expr
    };
  }

  private ifStatement(): IfStatement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expected ')' after condition");

    const thenBranch = this.statement();
    let elseBranch: ASTNode | undefined;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch
    };
  }

  private whileStatement(): WhileStatement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'while'");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expected ')' after condition");

    const body = this.statement();

    return {
      type: 'WhileStatement',
      condition,
      body
    };
  }

  private forStatement(): ForStatement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'for'");

    let initializer: ASTNode | undefined;
    if (!this.match(TokenType.SEMICOLON)) {
      if (this.check(TokenType.INT) || this.check(TokenType.FLOAT_KW) ||
          this.check(TokenType.CHAR_KW) || this.check(TokenType.BOOL) ||
          this.check(TokenType.STRING_KW) || this.check(TokenType.PTR)) {
        initializer = this.variableDeclaration();
      } else {
        initializer = this.expressionStatement();
      }
    }

    let condition: ASTNode | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let increment: ASTNode | undefined;
    if (!this.check(TokenType.RPAREN)) {
      increment = this.expression();
    }

    this.consume(TokenType.RPAREN, "Expected ')' after for clauses");
    const body = this.statement();

    return {
      type: 'ForStatement',
      initializer,
      condition,
      increment,
      body
    };
  }

  private returnStatement(): ReturnStatement {
    let value: ASTNode | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after return value");
    return {
      type: 'ReturnStatement',
      value
    };
  }

  private breakStatement(): BreakStatement {
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'break'");
    return { type: 'BreakStatement' };
  }

  private continueStatement(): ContinueStatement {
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'continue'");
    return { type: 'ContinueStatement' };
  }

  private structDeclaration(): ASTNode {
    const name = this.consume(TokenType.IDENTIFIER, "Expected struct name").value;
    this.consume(TokenType.LBRACE, "Expected '{' after struct name");

    // For now, skip struct body implementation
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.advance(); // Skip until closing brace
    }

    this.consume(TokenType.RBRACE, "Expected '}' after struct members");
    this.consume(TokenType.SEMICOLON, "Expected ';' after struct declaration");

    return { type: 'StructDeclaration', name };
  }

  private classDeclaration(): ASTNode {
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name").value;
    this.consume(TokenType.LBRACE, "Expected '{' after class name");

    // For now, skip class body implementation
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.advance(); // Skip until closing brace
    }

    this.consume(TokenType.RBRACE, "Expected '}' after class members");
    this.consume(TokenType.SEMICOLON, "Expected ';' after class declaration");

    return { type: 'ClassDeclaration', name };
  }

  private expression(): ASTNode {
    return this.assignment();
  }

  private assignment(): ASTNode {
    const expr = this.logicalOr();

    if (this.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
                   TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN)) {
      const operator = this.previous().value;
      const value = this.assignment();

      return {
        type: 'AssignmentExpression',
        target: expr,
        value,
        operator
      };
    }

    return expr;
  }

  private logicalOr(): ASTNode {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.logicalAnd();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private logicalAnd(): ASTNode {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.equality();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private equality(): ASTNode {
    let expr = this.comparison();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private comparison(): ASTNode {
    let expr = this.term();

    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL,
                     TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private term(): ASTNode {
    let expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private factor(): ASTNode {
    let expr = this.unary();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: 'BinaryOperationExpression',
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS_PLUS,
                   TokenType.MINUS_MINUS, TokenType.DEREFERENCE, TokenType.ADDRESS_OF)) {
      const operator = this.previous().value;
      const right = this.unary();
      return {
        type: 'UnaryOperationExpression',
        operator,
        operand: right
      };
    }

    return this.postfix();
  }

  private postfix(): ASTNode {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.consume(TokenType.RBRACKET, "Expected ']' after index");
        expr = {
          type: 'ArrayAccessExpression',
          array: expr,
          index
        };
      } else if (this.match(TokenType.LPAREN)) {
        const arguments_: ASTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          arguments_.push(this.expression());
          while (this.match(TokenType.COMMA)) {
            arguments_.push(this.expression());
          }
        }
        this.consume(TokenType.RPAREN, "Expected ')' after arguments");
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: arguments_
        };
      } else if (this.match(TokenType.DOT, TokenType.ARROW)) {
        const isArrow = this.previous().type === TokenType.ARROW;
        const member = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
        expr = {
          type: 'MemberAccessExpression',
          object: expr,
          member,
          isArrow
        };
      } else if (this.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
        const operator = this.previous().value;
        expr = {
          type: 'UnaryOperationExpression',
          operator,
          operand: expr
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): ASTNode {
    if (this.match(TokenType.TRUE)) {
      return { type: 'LiteralExpression', value: true, literalType: 'bool' };
    }
    if (this.match(TokenType.FALSE)) {
      return { type: 'LiteralExpression', value: false, literalType: 'bool' };
    }
    if (this.match(TokenType.NULL)) {
      return { type: 'LiteralExpression', value: null, literalType: 'null' };
    }
    if (this.match(TokenType.INTEGER)) {
      return { type: 'LiteralExpression', value: parseInt(this.previous().value), literalType: 'int' };
    }
    if (this.match(TokenType.FLOAT)) {
      return { type: 'LiteralExpression', value: parseFloat(this.previous().value), literalType: 'float' };
    }
    if (this.match(TokenType.CHAR)) {
      return { type: 'LiteralExpression', value: this.previous().value[1], literalType: 'char' };
    }
    if (this.match(TokenType.STRING)) {
      return { type: 'LiteralExpression', value: this.previous().value.slice(1, -1), literalType: 'string' };
    }
    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'IdentifierExpression', name: this.previous().value };
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }
    if (this.match(TokenType.NEW)) {
      return this.newExpression();
    }

    throw new Error(`Unexpected token '${this.peek().value}' at line ${this.peek().line}`);
  }

  private newExpression(): ASTNode {
    // Simplified new expression for basic types
    const type_ = this.type();
    return {
      type: 'NewExpression',
      varType: type_
    };
  }

  private type(): TypeNode {
    let name: string;
    let isPointer = false;

    if (this.match(TokenType.INT)) {
      name = 'int';
    } else if (this.match(TokenType.FLOAT_KW)) {
      name = 'float';
    } else if (this.match(TokenType.CHAR_KW)) {
      name = 'char';
    } else if (this.match(TokenType.BOOL)) {
      name = 'bool';
    } else if (this.match(TokenType.STRING_KW)) {
      name = 'string';
    } else if (this.match(TokenType.PTR)) {
      name = 'ptr';
      isPointer = true;
    } else {
      throw new Error(`Expected type at line ${this.peek().line}`);
    }

    const size = this.getTypeSize(name);
    return {
      type: 'TypeNode',
      name,
      size,
      isPointer
    };
  }

  private getTypeSize(typeName: string): number {
    const sizes: Record<string, number> = {
      'int': 4,
      'float': 4,
      'char': 1,
      'bool': 1,
      'string': 8,
      'ptr': 8
    };
    return sizes[typeName] || 4;
  }
}