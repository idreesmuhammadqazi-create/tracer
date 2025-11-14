import { ASTNode, Program, VariableDeclarationStatement, ExpressionStatement, BlockStatement, IfStatement, WhileStatement, ForStatement, ReturnStatement, LiteralExpression, IdentifierExpression, BinaryOperationExpression, UnaryOperationExpression, AssignmentExpression, CallExpression, ArrayAccessExpression, MemberAccessExpression, ExecutionResult } from '../types/lowlogic-types';
import { MemoryManager } from './memory';

export class Interpreter {
  private ast: Program;
  private memory: MemoryManager;
  private currentStatementIndex = 0;
  private currentLine = 1;
  private outputBuffer: string[] = [];
  private executionFinished = false;
  private breakpoints: Set<number> = new Set();
  private scopes: Record<string, any>[] = [{}];

  constructor(ast: Program, memory: MemoryManager) {
    this.ast = ast;
    this.memory = memory;
  }

  reset(): void {
    this.currentStatementIndex = 0;
    this.currentLine = 1;
    this.outputBuffer = [];
    this.executionFinished = false;
    this.scopes = [{}];
    this.memory.reset();
  }

  setBreakpoints(lines: number[]): void {
    this.breakpoints = new Set(lines);
  }

  step(): ExecutionResult {
    if (this.executionFinished) {
      return {
        line: this.currentLine,
        finished: true,
        output: [...this.outputBuffer],
        memoryChanges: []
      };
    }

    try {
      const statements = this.flattenStatements(this.ast.declarations);
      if (this.currentStatementIndex >= statements.length) {
        this.executionFinished = true;
        return {
          line: this.currentLine,
          finished: true,
          output: [...this.outputBuffer],
          memoryChanges: []
        };
      }

      const statement = statements[this.currentStatementIndex];
      this.currentLine = this.getLineNumber(statement);

      // Check for breakpoint
      if (this.currentLine && this.breakpoints.has(this.currentLine)) {
        return {
          line: this.currentLine,
          finished: false,
          output: [...this.outputBuffer],
          memoryChanges: []
        };
      }

      // Execute statement
      this.executeStatement(statement);
      this.currentStatementIndex++;

      return {
        line: this.currentLine,
        finished: false,
        output: [...this.outputBuffer],
        memoryChanges: []
      };

    } catch (error: any) {
      return {
        line: this.currentLine,
        finished: true,
        output: [...this.outputBuffer],
        memoryChanges: [],
        error: error.message
      };
    }
  }

  continue(breakpoints?: number[]): ExecutionResult {
    if (breakpoints) {
      this.setBreakpoints(breakpoints);
    }

    while (true) {
      const result = this.step();

      if (result.finished || (result.line && this.breakpoints.has(result.line))) {
        return result;
      }
    }
  }

  private flattenStatements(declarations: ASTNode[]): ASTNode[] {
    const statements: ASTNode[] = [];
    for (const decl of declarations) {
      if (this.isStatement(decl)) {
        statements.push(decl);
      }
    }
    return statements;
  }

  private isStatement(node: ASTNode): boolean {
    return [
      'VariableDeclarationStatement',
      'ExpressionStatement',
      'BlockStatement',
      'IfStatement',
      'WhileStatement',
      'ForStatement',
      'ReturnStatement',
      'BreakStatement',
      'ContinueStatement'
    ].includes(node.type);
  }

  private getLineNumber(statement: ASTNode): number {
    // In a real implementation, this would come from token position info
    // For now, we'll use a simple line counter
    return this.currentLine;
  }

  private executeStatement(statement: ASTNode): void {
    switch (statement.type) {
      case 'VariableDeclarationStatement':
        this.executeVariableDeclaration(statement as VariableDeclarationStatement);
        break;
      case 'ExpressionStatement':
        this.executeExpressionStatement(statement as ExpressionStatement);
        break;
      case 'BlockStatement':
        this.executeBlockStatement(statement as BlockStatement);
        break;
      case 'IfStatement':
        this.executeIfStatement(statement as IfStatement);
        break;
      case 'WhileStatement':
        this.executeWhileStatement(statement as WhileStatement);
        break;
      case 'ForStatement':
        this.executeForStatement(statement as ForStatement);
        break;
      case 'ReturnStatement':
        this.executeReturnStatement(statement as ReturnStatement);
        break;
      case 'BreakStatement':
        throw new Error('Break statement not implemented yet');
      case 'ContinueStatement':
        throw new Error('Continue statement not implemented yet');
      default:
        throw new Error(`Unknown statement type: ${statement.type}`);
    }
  }

  private executeVariableDeclaration(stmt: VariableDeclarationStatement): void {
    const value = stmt.initializer ? this.evaluateExpression(stmt.initializer) : null;
    const convertedValue = this.convertValue(value, this.getExpressionType(stmt.initializer), stmt.varType.name);

    const location = this.memory.allocateStack(stmt.varType.size, stmt.varType.name, stmt.name);
    this.memory.writeMemory(location.address, convertedValue, stmt.varType.name);

    // Add to current scope
    this.scopes[this.scopes.length - 1][stmt.name] = location.address;
  }

  private executeExpressionStatement(stmt: ExpressionStatement): void {
    this.evaluateExpression(stmt.expression);
  }

  private executeBlockStatement(stmt: BlockStatement): void {
    // Create new scope
    this.scopes.push({});
    this.memory.pushStackFrame('block');

    try {
      for (const innerStmt of stmt.statements) {
        this.executeStatement(innerStmt);
      }
    } finally {
      // Cleanup scope
      this.memory.popStackFrame();
      this.scopes.pop();
    }
  }

  private executeIfStatement(stmt: IfStatement): void {
    const conditionValue = this.evaluateExpression(stmt.condition);

    if (this.isTruthy(conditionValue)) {
      this.executeStatement(stmt.thenBranch);
    } else if (stmt.elseBranch) {
      this.executeStatement(stmt.elseBranch);
    }
  }

  private executeWhileStatement(stmt: WhileStatement): void {
    while (true) {
      const conditionValue = this.evaluateExpression(stmt.condition);
      if (!this.isTruthy(conditionValue)) {
        break;
      }
      this.executeStatement(stmt.body);
    }
  }

  private executeForStatement(stmt: ForStatement): void {
    // Create new scope
    this.scopes.push({});

    try {
      // Initialize
      if (stmt.initializer) {
        this.executeStatement(stmt.initializer);
      }

      // Loop
      while (true) {
        // Check condition
        if (stmt.condition) {
          const conditionValue = this.evaluateExpression(stmt.condition);
          if (!this.isTruthy(conditionValue)) {
            break;
          }
        }

        // Execute body
        this.executeStatement(stmt.body);

        // Increment
        if (stmt.increment) {
          this.evaluateExpression(stmt.increment);
        }
      }
    } finally {
      this.scopes.pop();
    }
  }

  private executeReturnStatement(stmt: ReturnStatement): void {
    if (stmt.value) {
      const value = this.evaluateExpression(stmt.value);
      throw new Error(`Return: ${value}`);
    } else {
      throw new Error('Return');
    }
  }

  private evaluateExpression(expr: ASTNode): any {
    switch (expr.type) {
      case 'LiteralExpression':
        return this.evaluateLiteral(expr as LiteralExpression);
      case 'IdentifierExpression':
        return this.evaluateIdentifier(expr as IdentifierExpression);
      case 'BinaryOperationExpression':
        return this.evaluateBinaryOperation(expr as BinaryOperationExpression);
      case 'UnaryOperationExpression':
        return this.evaluateUnaryOperation(expr as UnaryOperationExpression);
      case 'AssignmentExpression':
        return this.evaluateAssignment(expr as AssignmentExpression);
      case 'CallExpression':
        return this.evaluateCall(expr as CallExpression);
      case 'ArrayAccessExpression':
        return this.evaluateArrayAccess(expr as ArrayAccessExpression);
      case 'MemberAccessExpression':
        return this.evaluateMemberAccess(expr as MemberAccessExpression);
      default:
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }

  private evaluateLiteral(expr: LiteralExpression): any {
    return expr.value;
  }

  private evaluateIdentifier(expr: IdentifierExpression): any {
    // Look up variable in scopes
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (expr.name in this.scopes[i]) {
        const address = this.scopes[i][expr.name];
        return this.memory.readMemory(address);
      }
    }

    throw new Error(`Undefined variable: ${expr.name}`);
  }

  private evaluateBinaryOperation(expr: BinaryOperationExpression): any {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    // Perform operation
    switch (expr.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right !== 0 ? left / right : (left > 0 ? Infinity : -Infinity);
      case '%': return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '&&': return this.isTruthy(left) && this.isTruthy(right);
      case '||': return this.isTruthy(left) || this.isTruthy(right);
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateUnaryOperation(expr: UnaryOperationExpression): any {
    const operand = this.evaluateExpression(expr.operand);

    switch (expr.operator) {
      case '-': return -operand;
      case '!': return !this.isTruthy(operand);
      case '++':
      case '--':
        if (expr.operand.type === 'IdentifierExpression') {
          const name = (expr.operand as IdentifierExpression).name;
          const address = this.getVariableAddress(name);
          const newValue = expr.operator === '++' ? operand + 1 : operand - 1;
          this.memory.writeMemory(address, newValue, this.getVariableType(name));
          return newValue;
        }
        return operand;
      case '&':
        if (expr.operand.type === 'IdentifierExpression') {
          const name = (expr.operand as IdentifierExpression).name;
          return this.getVariableAddress(name);
        }
        return operand;
      case '*':
        if (typeof operand === 'number') {
          return this.memory.readMemory(operand);
        }
        return operand;
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  private evaluateAssignment(expr: AssignmentExpression): any {
    const value = this.evaluateExpression(expr.value);
    const valueType = this.getExpressionType(expr.value);

    if (expr.target.type === 'IdentifierExpression') {
      // Variable assignment
      const name = (expr.target as IdentifierExpression).name;
      const address = this.getVariableAddress(name);
      const targetType = this.getVariableType(name);
      const convertedValue = this.convertValue(value, valueType, targetType);
      this.memory.writeMemory(address, convertedValue, targetType);
      return convertedValue;
    }

    throw new Error('Invalid assignment target');
  }

  private evaluateCall(expr: CallExpression): any {
    if (expr.callee.type === 'IdentifierExpression') {
      const functionName = (expr.callee as IdentifierExpression).name;

      if (functionName === 'print') {
        // Built-in print function
        if (expr.arguments.length !== 1) {
          throw new Error('print() takes exactly one argument');
        }
        const argValue = this.evaluateExpression(expr.arguments[0]);
        const outputStr = this.formatValueForOutput(argValue);
        this.outputBuffer.push(outputStr);
        return undefined;
      } else if (functionName === 'sizeof') {
        // Built-in sizeof function
        if (expr.arguments.length !== 1) {
          throw new Error('sizeof() takes exactly one argument');
        }
        if (expr.arguments[0].type === 'IdentifierExpression') {
          const name = (expr.arguments[0] as IdentifierExpression).name;
          return this.getTypeSize(this.getVariableType(name));
        }
        return 4; // Default size
      }
    }

    throw new Error(`Unknown function: ${expr.callee.type}`);
  }

  private evaluateArrayAccess(arrayExpr: ArrayAccessExpression): any {
    throw new Error('Array access not implemented yet');
  }

  private evaluateMemberAccess(memberExpr: MemberAccessExpression): any {
    throw new Error('Member access not implemented yet');
  }

  private getExpressionType(expr: ASTNode | undefined): string {
    if (!expr) return 'unknown';
    switch (expr.type) {
      case 'LiteralExpression':
        return (expr as LiteralExpression).literalType;
      case 'IdentifierExpression':
        return this.getVariableType((expr as IdentifierExpression).name);
      case 'BinaryOperationExpression':
        const binExpr = expr as BinaryOperationExpression;
        const leftType = this.getExpressionType(binExpr.left);
        const rightType = this.getExpressionType(binExpr.right);
        // Return float if either operand is float
        return leftType === 'float' || rightType === 'float' ? 'float' : leftType;
      case 'UnaryOperationExpression':
        if ((expr as UnaryOperationExpression).operator === '!') {
          return 'bool';
        }
        return this.getExpressionType((expr as UnaryOperationExpression).operand);
      default:
        return 'unknown';
    }
  }

  private getVariableAddress(name: string): number {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (name in this.scopes[i]) {
        return this.scopes[i][name];
      }
    }
    throw new Error(`Undefined variable: ${name}`);
  }

  private getVariableType(name: string): string {
    const address = this.getVariableAddress(name);
    const location = this.memory.getMemoryLocation(address);
    return location ? location.type : 'unknown';
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }

  private formatValueForOutput(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return String(value);
  }

  private convertValue(value: any, fromType: string, toType: string): any {
    if (fromType === toType) return value;

    // Numeric conversions
    if (fromType === 'int' && toType === 'float') return parseFloat(value);
    if (fromType === 'float' && toType === 'int') return Math.floor(value);
    if (fromType === 'bool' && toType === 'int') return value ? 1 : 0;
    if (fromType === 'int' && toType === 'bool') return value !== 0;

    return value;
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