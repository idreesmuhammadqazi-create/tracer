import { ASTNode, Program } from '../types/lowlogic-types';

export class CppGenerator {
  private indentLevel = 0;
  private outputLines: string[] = [];
  private includes: string[] = [];
  private usingDeclarations: string[] = [];

  generate(ast: Program): string {
    this.outputLines = [];
    this.indentLevel = 0;
    this.includes = [];
    this.usingDeclarations = [];

    // Add necessary includes
    this.addInclude('<iostream>');
    this.addInclude('<memory>');
    this.addInclude('<string>');

    // Add using declarations
    this.addUsing('namespace std');
    this.addUsing('string = std::string');

    // Generate includes
    for (const include of [...new Set(this.includes)]) {
      this.outputLines.push(`#include ${include}`);
    }

    this.outputLines.push('');

    // Generate using declarations
    for (const using of [...new Set(this.usingDeclarations)]) {
      this.outputLines.push(`using ${using};`);
    }

    this.outputLines.push('');

    // Generate all declarations
    for (const decl of ast.declarations) {
      this.generateDeclaration(decl);
    }

    // Generate main function if no main exists
    if (!this.hasMainFunction(ast.declarations)) {
      this.generateMainFunction(ast.declarations);
    }

    return this.outputLines.join('\n');
  }

  private addInclude(include: string): void {
    if (!this.includes.includes(include)) {
      this.includes.push(include);
    }
  }

  private addUsing(usingDecl: string): void {
    if (!this.usingDeclarations.includes(usingDecl)) {
      this.usingDeclarations.push(usingDecl);
    }
  }

  private generateDeclaration(decl: ASTNode): void {
    switch (decl.type) {
      case 'VariableDeclarationStatement':
        this.generateVariableDeclaration(decl);
        break;
      case 'ExpressionStatement':
        this.generateExpressionStatement(decl);
        break;
      case 'BlockStatement':
        this.generateBlockStatement(decl);
        break;
      case 'IfStatement':
        this.generateIfStatement(decl);
        break;
      case 'WhileStatement':
        this.generateWhileStatement(decl);
        break;
      case 'ForStatement':
        this.generateForStatement(decl);
        break;
      case 'ReturnStatement':
        this.generateReturnStatement(decl);
        break;
      default:
        // Handle other declaration types
        break;
    }
  }

  private generateVariableDeclaration(stmt: any): void {
    const typeStr = this.typeToCpp(stmt.varType);
    const line = `${typeStr} ${stmt.name}`;

    if (stmt.initializer) {
      const initStr = this.generateExpression(stmt.initializer);
      this.outputLines.push(`${line} = ${initStr};`);
    } else {
      this.outputLines.push(`${line};`);
    }
  }

  private generateExpressionStatement(stmt: any): void {
    const exprStr = this.generateExpression(stmt.expression);
    this.outputLines.push(`${exprStr};`);
  }

  private generateBlockStatement(stmt: any): void {
    this.outputLines.push('{');
    this.indentLevel++;

    for (const innerStmt of stmt.statements) {
      this.generateDeclaration(innerStmt);
    }

    this.indentLevel--;
    this.outputLines.push('}');
  }

  private generateIfStatement(stmt: any): void {
    const conditionStr = this.generateExpression(stmt.condition);
    this.outputLines.push(`if (${conditionStr}) {`);
    this.indentLevel++;
    this.generateDeclaration(stmt.thenBranch);
    this.indentLevel--;

    if (stmt.elseBranch) {
      this.outputLines.push('} else {');
      this.indentLevel++;
      this.generateDeclaration(stmt.elseBranch);
      this.indentLevel--;
    }

    this.outputLines.push('}');
  }

  private generateWhileStatement(stmt: any): void {
    const conditionStr = this.generateExpression(stmt.condition);
    this.outputLines.push(`while (${conditionStr}) {`);
    this.indentLevel++;
    this.generateDeclaration(stmt.body);
    this.indentLevel--;
    this.outputLines.push('}');
  }

  private generateForStatement(stmt: any): void {
    const parts: string[] = [];

    // Initializer
    if (stmt.initializer) {
      if (stmt.initializer.type === 'VariableDeclarationStatement') {
        parts.push(this.generateVariableDeclarationInline(stmt.initializer));
      } else {
        parts.push(this.generateExpression(stmt.initializer.expression));
      }
    } else {
      parts.push('');
    }

    // Condition
    if (stmt.condition) {
      parts.push(this.generateExpression(stmt.condition));
    } else {
      parts.push('true');
    }

    // Increment
    if (stmt.increment) {
      parts.push(this.generateExpression(stmt.increment));
    } else {
      parts.push('');
    }

    const forHeader = `for (${parts[0]}; ${parts[1]}; ${parts[2]})`;
    this.outputLines.push(`${forHeader} {`);
    this.indentLevel++;
    this.generateDeclaration(stmt.body);
    this.indentLevel--;
    this.outputLines.push('}');
  }

  private generateReturnStatement(stmt: any): void {
    if (stmt.value) {
      const valueStr = this.generateExpression(stmt.value);
      this.outputLines.push(`return ${valueStr};`);
    } else {
      this.outputLines.push('return;');
    }
  }

  private generateExpression(expr: ASTNode): string {
    switch (expr.type) {
      case 'LiteralExpression':
        return this.generateLiteral(expr);
      case 'IdentifierExpression':
        return (expr as any).name;
      case 'BinaryOperationExpression':
        return this.generateBinaryOperation(expr);
      case 'UnaryOperationExpression':
        return this.generateUnaryOperation(expr);
      case 'AssignmentExpression':
        return this.generateAssignment(expr);
      case 'CallExpression':
        return this.generateCall(expr);
      case 'ArrayAccessExpression':
        return this.generateArrayAccess(expr);
      case 'MemberAccessExpression':
        return this.generateMemberAccess(expr);
      default:
        return '/* unknown expression */';
    }
  }

  private generateLiteral(expr: any): string {
    if (expr.literalType === 'string') {
      return `"${expr.value}"`;
    }
    if (expr.literalType === 'char') {
      return expr.value;
    }
    if (expr.literalType === 'null') {
      return 'nullptr';
    }
    return String(expr.value);
  }

  private generateBinaryOperation(expr: any): string {
    const leftStr = this.generateExpression(expr.left);
    const rightStr = this.generateExpression(expr.right);
    return `(${leftStr} ${expr.operator} ${rightStr})`;
  }

  private generateUnaryOperation(expr: any): string {
    const operandStr = this.generateExpression(expr.operand);
    return `${expr.operator}${operandStr}`;
  }

  private generateAssignment(expr: any): string {
    const targetStr = this.generateExpression(expr.target);
    const valueStr = this.generateExpression(expr.value);
    return `(${targetStr} = ${valueStr})`;
  }

  private generateCall(expr: any): string {
    if (expr.callee.type === 'IdentifierExpression') {
      const functionName = (expr.callee as any).name;

      if (functionName === 'print') {
        // Convert print to cout
        if (expr.arguments.length >= 1) {
          const argStr = this.generateExpression(expr.arguments[0]);
          return `(cout << ${argStr})`;
        }
      } else if (functionName === 'sizeof') {
        // Use C++ sizeof
        if (expr.arguments.length >= 1) {
          if (expr.arguments[0].type === 'IdentifierExpression') {
            return `sizeof(${(expr.arguments[0] as any).name})`;
          }
        }
      }
    }

    const calleeStr = this.generateExpression(expr.callee);
    const argsStr = expr.arguments.map((arg: ASTNode) => this.generateExpression(arg)).join(', ');
    return `${calleeStr}(${argsStr})`;
  }

  private generateArrayAccess(expr: any): string {
    const arrayStr = this.generateExpression(expr.array);
    const indexStr = this.generateExpression(expr.index);
    return `(${arrayStr}[${indexStr}])`;
  }

  private generateMemberAccess(expr: any): string {
    const objectStr = this.generateExpression(expr.object);
    const operator = expr.isArrow ? '->' : '.';
    return `(${objectStr}${operator}${expr.member})`;
  }

  private generateVariableDeclarationInline(stmt: any): string {
    const typeStr = this.typeToCpp(stmt.varType);
    const line = `${typeStr} ${stmt.name}`;

    if (stmt.initializer) {
      return `${line} = ${this.generateExpression(stmt.initializer)}`;
    }

    return line;
  }

  private typeToCpp(typeNode: any): string {
    if (typeNode.type === 'TypeNode') {
      if (typeNode.name === 'string') return 'string';
      return typeNode.name;
    }
    return 'unknown';
  }

  private hasMainFunction(declarations: ASTNode[]): boolean {
    return declarations.some(decl => decl.type === 'FunctionDeclaration' && (decl as any).name === 'main');
  }

  private generateMainFunction(declarations: ASTNode[]): void {
    this.outputLines.push('int main() {');
    this.indentLevel++;

    // Generate all global statements
    for (const decl of declarations) {
      if (decl.type !== 'FunctionDeclaration') {
        this.generateDeclaration(decl);
      }
    }

    this.outputLines.push('return 0;');
    this.indentLevel--;
    this.outputLines.push('}');
  }

  private getIndent(): string {
    return '    '.repeat(this.indentLevel);
  }
}