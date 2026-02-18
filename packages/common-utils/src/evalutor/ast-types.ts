/**
 * AST 类型定义
 * 定义表达式抽象语法树的所有节点类型
 */

/**
 * AST 节点基类型
 */
export type ASTNode = 
  | BooleanLiteralNode
  | NumberLiteralNode
  | StringLiteralNode
  | NullLiteralNode
  | ComparisonNode
  | LogicalNode
  | NotNode
  | ArithmeticNode
  | StringMethodNode
  | TernaryNode;

/**
 * 布尔字面量节点
 */
export interface BooleanLiteralNode {
  type: 'boolean';
  value: boolean;
}

/**
 * 数字字面量节点
 */
export interface NumberLiteralNode {
  type: 'number';
  value: number;
}

/**
 * 字符串字面量节点
 */
export interface StringLiteralNode {
  type: 'string';
  value: string;
}

/**
 * null 字面量节点
 */
export interface NullLiteralNode {
  type: 'null';
  value: null;
}

/**
 * 比较操作节点
 */
export interface ComparisonNode {
  type: 'comparison';
  variablePath: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';
  value: any;
}

/**
 * 逻辑操作节点
 */
export interface LogicalNode {
  type: 'logical';
  operator: '&&' | '||';
  left: ASTNode;
  right: ASTNode;
}

/**
 * NOT 操作节点
 */
export interface NotNode {
  type: 'not';
  operand: ASTNode;
}

/**
 * 算术运算节点
 */
export interface ArithmeticNode {
  type: 'arithmetic';
  operator: '+' | '-' | '*' | '/' | '%';
  left: ASTNode;
  right: ASTNode;
}

/**
 * 字符串方法节点
 */
export interface StringMethodNode {
  type: 'stringMethod';
  method: 'startsWith' | 'endsWith' | 'length' | 'toLowerCase' | 'toUpperCase' | 'trim';
  variablePath: string;
  argument?: any;
}

/**
 * 三元运算符节点
 */
export interface TernaryNode {
  type: 'ternary';
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}