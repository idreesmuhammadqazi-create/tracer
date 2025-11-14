// LowLogic TypeScript type definitions for frontend-only implementation

export enum TokenType {
  // Literals
  INTEGER = "INTEGER",
  FLOAT = "FLOAT",
  CHAR = "CHAR",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  IDENTIFIER = "IDENTIFIER",

  // Keywords
  INT = "INT",
  FLOAT_KW = "FLOAT",
  CHAR_KW = "CHAR",
  BOOL = "BOOL",
  PTR = "PTR",
  STRING_KW = "STRING",
  STRUCT = "STRUCT",
  CLASS = "CLASS",
  TEMPLATE = "TEMPLATE",
  TYPENAME = "TYPENAME",
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",
  FOR = "FOR",
  BREAK = "BREAK",
  CONTINUE = "CONTINUE",
  RETURN = "RETURN",
  NEW = "NEW",
  DELETE = "DELETE",
  NULL = "NULL",
  TRUE = "TRUE",
  FALSE = "FALSE",

  // Operators
  ASSIGN = "=",
  PLUS = "+",
  MINUS = "-",
  MULTIPLY = "*",
  DIVIDE = "/",
  MODULO = "%",

  // Comparison operators
  EQUAL = "==",
  NOT_EQUAL = "!=",
  LESS_THAN = "<",
  GREATER_THAN = ">",
  LESS_EQUAL = "<=",
  GREATER_EQUAL = ">=",

  // Logical operators
  AND = "&&",
  OR = "||",
  NOT = "!",

  // Pointer operators
  ADDRESS_OF = "&",
  DEREFERENCE = "*",
  ARROW = "->",
  DOT = ".",

  // Other operators
  PLUS_PLUS = "++",
  MINUS_MINUS = "--",
  PLUS_ASSIGN = "+=",
  MINUS_ASSIGN = "-=",
  MULTIPLY_ASSIGN = "*=",
  DIVIDE_ASSIGN = "/=",

  // Delimiters
  LPAREN = "(",
  RPAREN = ")",
  LBRACE = "{",
  RBRACE = "}",
  LBRACKET = "[",
  RBRACKET = "]",
  SEMICOLON = ";",
  COMMA = ",",
  COLON = ":",
  QUESTION = "?",

  // Special
  NEWLINE = "NEWLINE",
  EOF = "EOF",
  WHITESPACE = "WHITESPACE",
  COMMENT = "COMMENT"
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface ASTNode {
  type: string;
  [key: string]: any;
}

// Expression nodes
export interface LiteralExpression extends ASTNode {
  type: "LiteralExpression";
  value: any;
  literalType: string;
}

export interface IdentifierExpression extends ASTNode {
  type: "IdentifierExpression";
  name: string;
}

export interface BinaryOperationExpression extends ASTNode {
  type: "BinaryOperationExpression";
  left: ASTNode;
  operator: string;
  right: ASTNode;
}

export interface UnaryOperationExpression extends ASTNode {
  type: "UnaryOperationExpression";
  operator: string;
  operand: ASTNode;
}

export interface AssignmentExpression extends ASTNode {
  type: "AssignmentExpression";
  target: ASTNode;
  value: ASTNode;
}

export interface CallExpression extends ASTNode {
  type: "CallExpression";
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface ArrayAccessExpression extends ASTNode {
  type: "ArrayAccessExpression";
  array: ASTNode;
  index: ASTNode;
}

export interface MemberAccessExpression extends ASTNode {
  type: "MemberAccessExpression";
  object: ASTNode;
  member: string;
  isArrow: boolean;
}

// Statement nodes
export interface VariableDeclarationStatement extends ASTNode {
  type: "VariableDeclarationStatement";
  varType: TypeNode;
  name: string;
  initializer?: ASTNode;
}

export interface ExpressionStatement extends ASTNode {
  type: "ExpressionStatement";
  expression: ASTNode;
}

export interface BlockStatement extends ASTNode {
  type: "BlockStatement";
  statements: ASTNode[];
}

export interface IfStatement extends ASTNode {
  type: "IfStatement";
  condition: ASTNode;
  thenBranch: ASTNode;
  elseBranch?: ASTNode;
}

export interface WhileStatement extends ASTNode {
  type: "WhileStatement";
  condition: ASTNode;
  body: ASTNode;
}

export interface ForStatement extends ASTNode {
  type: "ForStatement";
  initializer?: ASTNode;
  condition?: ASTNode;
  increment?: ASTNode;
  body: ASTNode;
}

export interface ReturnStatement extends ASTNode {
  type: "ReturnStatement";
  value?: ASTNode;
}

export interface BreakStatement extends ASTNode {
  type: "BreakStatement";
}

export interface ContinueStatement extends ASTNode {
  type: "ContinueStatement";
}

// Type nodes
export interface TypeNode {
  type: string;
  name: string;
  size: number;
  isPointer?: boolean;
  elementType?: TypeNode;
  isArray?: boolean;
  arraySize?: number;
}

// Program node
export interface Program extends ASTNode {
  type: "Program";
  declarations: ASTNode[];
}

// Memory and execution state
export interface MemoryLocation {
  address: number;
  size: number;
  value: any;
  type: string;
  region: 'stack' | 'heap' | 'static';
  name?: string;
  isPointer: boolean;
  pointerTarget?: number;
  allocationId?: string;
}

export interface StackFrame {
  functionName: string;
  returnAddress: number;
  basePointer: number;
  localVariables: Record<string, MemoryLocation>;
  parameters: Record<string, MemoryLocation>;
}

export interface MemoryState {
  variables: Record<string, MemoryLocation>;
  callStack: StackFrame[];
  heapAllocations: HeapAllocation[];
  pointerGraph: Record<string, string[]>;
  stackPointer: number;
  heapPointer: number;
  staticPointer: number;
}

export interface HeapAllocation {
  allocationId: string;
  address: number;
  size: number;
  data: number[];
  isFreed: boolean;
  refCount: number;
}

export interface ExecutionResult {
  line?: number;
  finished: boolean;
  output: string[];
  memoryChanges: any[];
  error?: string;
  returnAddress?: string;
  returnPath?: string[];
}