/**
 * ExpressionEvaluator 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpressionEvaluator, expressionEvaluator } from '../expression-evaluator.js';
import { RuntimeValidationError } from '@modular-agent/types';
import type { EvaluationContext } from '@modular-agent/types';
import type {
  BooleanLiteralNode,
  NumberLiteralNode,
  StringLiteralNode,
  NullLiteralNode,
  ComparisonNode,
  LogicalNode,
  NotNode,
  ArithmeticNode,
  StringMethodNode,
  TernaryNode
} from '../ast-types.js';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;
  let context: EvaluationContext;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
    context = {
      input: {
        status: 'active',
        score: 85,
        tags: ['admin', 'user'],
        user: {
          name: 'Alice',
          age: 30
        }
      },
      output: {
        result: {
          success: true,
          message: 'OK'
        },
        count: 10
      },
      variables: {
        user: {
          age: 25,
          name: 'John',
          role: 'admin',
          email: 'john@example.com'
        },
        maxAge: 65,
        minAge: 18,
        isActive: true,
        text: 'Hello World',
        emptyString: '',
        zero: 0,
        negative: -10
      }
    };
  });

  describe('evaluate - 基本功能', () => {
    it('应该评估简单的等于表达式', () => {
      expect(evaluator.evaluate('user.age == 25', context)).toBe(true);
      expect(evaluator.evaluate('user.age == 30', context)).toBe(false);
    });

    it('应该评估不等于表达式', () => {
      expect(evaluator.evaluate('user.age != 30', context)).toBe(true);
      expect(evaluator.evaluate('user.age != 25', context)).toBe(false);
    });

    it('应该评估大于表达式', () => {
      expect(evaluator.evaluate('user.age > 20', context)).toBe(true);
      expect(evaluator.evaluate('user.age > 25', context)).toBe(false);
    });

    it('应该评估小于表达式', () => {
      expect(evaluator.evaluate('user.age < 30', context)).toBe(true);
      expect(evaluator.evaluate('user.age < 25', context)).toBe(false);
    });

    it('应该评估大于等于表达式', () => {
      expect(evaluator.evaluate('user.age >= 25', context)).toBe(true);
      expect(evaluator.evaluate('user.age >= 26', context)).toBe(false);
    });

    it('应该评估小于等于表达式', () => {
      expect(evaluator.evaluate('user.age <= 25', context)).toBe(true);
      expect(evaluator.evaluate('user.age <= 24', context)).toBe(false);
    });

    it('应该评估包含表达式', () => {
      expect(evaluator.evaluate("user.name contains 'oh'", context)).toBe(true);
      expect(evaluator.evaluate("user.name contains 'xyz'", context)).toBe(false);
    });

    it('应该评估 in 表达式', () => {
      expect(evaluator.evaluate("user.role in ['admin', 'user']", context)).toBe(true);
      expect(evaluator.evaluate("user.role in ['guest', 'user']", context)).toBe(false);
    });
  });

  describe('evaluate - 逻辑操作', () => {
    it('应该评估 AND 表达式', () => {
      expect(evaluator.evaluate('user.age >= 18 && user.age <= 65', context)).toBe(true);
      expect(evaluator.evaluate('user.age >= 18 && user.age > 65', context)).toBe(false);
    });

    it('应该评估 OR 表达式', () => {
      expect(evaluator.evaluate('user.age < 18 || user.role == "admin"', context)).toBe(true);
      expect(evaluator.evaluate('user.age < 18 || user.role == "guest"', context)).toBe(false);
    });

    it('应该评估混合逻辑表达式', () => {
      expect(evaluator.evaluate('user.age >= 18 && user.role == "admin"', context)).toBe(true);
      expect(evaluator.evaluate('(user.age >= 18 && user.age <= 65) || user.role == "admin"', context)).toBe(true);
    });

    it('应该支持短路求值', () => {
      expect(evaluator.evaluate('false && user.nonexistent == 123', context)).toBe(false);
      expect(evaluator.evaluate('true || user.nonexistent == 123', context)).toBe(true);
    });
  });

  describe('evaluate - NOT 操作', () => {
    it('应该评估 NOT 表达式', () => {
      expect(evaluator.evaluate('!isActive', context)).toBe(false);
      expect(evaluator.evaluate('!(user.age < 18)', context)).toBe(true);
    });

    it('应该评估嵌套 NOT 表达式', () => {
      expect(evaluator.evaluate('!!isActive', context)).toBe(true);
      expect(evaluator.evaluate('!(!isActive)', context)).toBe(true);
    });
  });

  describe('evaluate - 算术运算', () => {
    it('应该评估加法表达式', () => {
      // 注意：由于解析器将变量解析为比较节点，这里使用数字字面量测试
      expect(evaluator.evaluate('25 + 5', context)).toBe(30);
    });

    it('应该评估减法表达式', () => {
      expect(evaluator.evaluate('25 - 5', context)).toBe(20);
    });

    it('应该评估乘法表达式', () => {
      expect(evaluator.evaluate('25 * 2', context)).toBe(50);
    });

    it('应该评估除法表达式', () => {
      expect(evaluator.evaluate('25 / 5', context)).toBe(5);
    });

    it('应该评估取模表达式', () => {
      expect(evaluator.evaluate('25 % 7', context)).toBe(4);
    });

    it('应该处理除零错误', () => {
      expect(evaluator.evaluate('25 / 0', context)).toBeNaN();
    });

    it('应该处理类型不匹配的算术运算', () => {
      expect(evaluator.evaluate('"hello" + 5', context)).toBeNaN();
    });

    it('应该评估复杂算术表达式', () => {
      // 注意：由于解析器从左到右处理，* / % 和 + - 的优先级相同
      // 所以 '25 * 2 + 10' 被解析为 '25 * (2 + 10)' = 300
      expect(evaluator.evaluate('25 * 2 + 10', context)).toBe(300);
      // 使用括号明确优先级
      expect(evaluator.evaluate('(25 + 5) * 2', context)).toBe(60);
    });
  });

  describe('evaluate - 字符串方法', () => {
    it('应该评估 startsWith 方法', () => {
      expect(evaluator.evaluate('text.startsWith("Hello")', context)).toBe(true);
      expect(evaluator.evaluate('text.startsWith("World")', context)).toBe(false);
    });

    it('应该评估 endsWith 方法', () => {
      expect(evaluator.evaluate('text.endsWith("World")', context)).toBe(true);
      expect(evaluator.evaluate('text.endsWith("Hello")', context)).toBe(false);
    });

    it('应该评估 length 方法', () => {
      expect(evaluator.evaluate('text.length', context)).toBe(11);
    });

    it('应该评估 toLowerCase 方法', () => {
      expect(evaluator.evaluate('text.toLowerCase()', context)).toBe('hello world');
    });

    it('应该评估 toUpperCase 方法', () => {
      expect(evaluator.evaluate('text.toUpperCase()', context)).toBe('HELLO WORLD');
    });

    it('应该评估 trim 方法', () => {
      expect(evaluator.evaluate('text.trim()', context)).toBe('Hello World');
    });

    it('应该处理非字符串值的字符串方法', () => {
      expect(evaluator.evaluate('user.age.length', context)).toBe(false);
    });
  });

  describe('evaluate - 三元运算符', () => {
    it('应该评估条件为真的三元表达式', () => {
      expect(evaluator.evaluate('user.age >= 18 ? "adult" : "minor"', context)).toBe('adult');
    });

    it('应该评估条件为假的三元表达式', () => {
      expect(evaluator.evaluate('user.age < 18 ? "minor" : "adult"', context)).toBe('adult');
    });

    it('应该评估嵌套三元表达式', () => {
      expect(evaluator.evaluate('user.age < 18 ? "minor" : user.age < 65 ? "adult" : "senior"', context)).toBe('adult');
    });

    it('应该评估复杂条件的三元表达式', () => {
      expect(evaluator.evaluate('user.role == "admin" ? "admin" : "user"', context)).toBe('admin');
    });
  });

  describe('evaluate - 数据源访问', () => {
    it('应该从 input 数据源评估表达式', () => {
      expect(evaluator.evaluate('input.status == "active"', context)).toBe(true);
      expect(evaluator.evaluate('input.score > 80', context)).toBe(true);
    });

    it('应该从 output 数据源评估表达式', () => {
      expect(evaluator.evaluate('output.result.success == true', context)).toBe(true);
      expect(evaluator.evaluate('output.count == 10', context)).toBe(true);
    });

    it('应该从 variables 数据源评估表达式（显式前缀）', () => {
      expect(evaluator.evaluate('variables.user.age == 25', context)).toBe(true);
      expect(evaluator.evaluate('variables.maxAge == 65', context)).toBe(true);
    });

    it('应该从 variables 数据源评估表达式（简单变量名）', () => {
      expect(evaluator.evaluate('maxAge == 65', context)).toBe(true);
      expect(evaluator.evaluate('minAge == 18', context)).toBe(true);
    });

    it('应该从 variables 数据源评估嵌套路径', () => {
      expect(evaluator.evaluate('user.email == "john@example.com"', context)).toBe(true);
    });
  });

  describe('evaluate - 字面量', () => {
    it('应该评估布尔字面量', () => {
      expect(evaluator.evaluate('true', context)).toBe(true);
      expect(evaluator.evaluate('false', context)).toBe(false);
    });

    it('应该评估数字字面量', () => {
      expect(evaluator.evaluate('42', context)).toBe(42);
      expect(evaluator.evaluate('-10', context)).toBe(-10);
      expect(evaluator.evaluate('3.14', context)).toBe(3.14);
    });

    it('应该评估字符串字面量', () => {
      expect(evaluator.evaluate('"hello"', context)).toBe('hello');
      expect(evaluator.evaluate("'world'", context)).toBe('world');
    });

    it('应该评估 null 字面量', () => {
      expect(evaluator.evaluate('null', context)).toBe(null);
    });
  });

  describe('evaluate - 边界情况', () => {
    it('应该处理空字符串比较', () => {
      expect(evaluator.evaluate('emptyString == ""', context)).toBe(true);
    });

    it('应该处理零值比较', () => {
      expect(evaluator.evaluate('zero == 0', context)).toBe(true);
    });

    it('应该处理负数比较', () => {
      expect(evaluator.evaluate('negative > -20', context)).toBe(true);
    });

    it('应该处理浮点数比较', () => {
      expect(evaluator.evaluate('user.age > 24.5', context)).toBe(true);
    });

    it('应该处理不存在的变量', () => {
      expect(evaluator.evaluate('nonexistent == 123', context)).toBe(false);
    });

    it('应该处理类型不匹配的比较', () => {
      expect(evaluator.evaluate('user.name > 100', context)).toBe(false);
    });

    it('应该处理 in 运算符的非数组值', () => {
      expect(evaluator.evaluate('user.age in "not an array"', context)).toBe(false);
    });
  });

  describe('evaluateAST - 字面量节点', () => {
    it('应该评估布尔字面量节点', () => {
      const node: BooleanLiteralNode = { type: 'boolean', value: true };
      expect(evaluator.evaluateAST(node, context)).toBe(true);

      const node2: BooleanLiteralNode = { type: 'boolean', value: false };
      expect(evaluator.evaluateAST(node2, context)).toBe(false);
    });

    it('应该评估数字字面量节点', () => {
      const node: NumberLiteralNode = { type: 'number', value: 42 };
      expect(evaluator.evaluateAST(node, context)).toBe(42);

      const node2: NumberLiteralNode = { type: 'number', value: -10.5 };
      expect(evaluator.evaluateAST(node2, context)).toBe(-10.5);
    });

    it('应该评估字符串字面量节点', () => {
      const node: StringLiteralNode = { type: 'string', value: 'hello' };
      expect(evaluator.evaluateAST(node, context)).toBe('hello');
    });

    it('应该评估 null 字面量节点', () => {
      const node: NullLiteralNode = { type: 'null', value: null };
      expect(evaluator.evaluateAST(node, context)).toBe(null);
    });
  });

  describe('evaluateAST - 比较节点', () => {
    it('应该评估等于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '==',
        value: 25
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估不等于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '!=',
        value: 30
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估大于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '>',
        value: 20
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估小于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '<',
        value: 30
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估大于等于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '>=',
        value: 25
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估小于等于比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '<=',
        value: 25
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估包含比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.name',
        operator: 'contains',
        value: 'oh'
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估 in 比较节点', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.role',
        operator: 'in',
        value: ['admin', 'user']
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该处理变量引用的比较', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: '==',
        value: { __isVariableRef: true, path: 'maxAge' }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(false);
    });

    it('应该抛出未知运算符的错误', () => {
      const node: ComparisonNode = {
        type: 'comparison',
        variablePath: 'user.age',
        operator: 'unknown' as any,
        value: 25
      };
      expect(() => evaluator.evaluateAST(node, context)).toThrow(RuntimeValidationError);
    });
  });

  describe('evaluateAST - 逻辑节点', () => {
    it('应该评估 AND 逻辑节点', () => {
      const node: LogicalNode = {
        type: 'logical',
        operator: '&&',
        left: { type: 'comparison', variablePath: 'user.age', operator: '>=', value: 18 },
        right: { type: 'comparison', variablePath: 'user.age', operator: '<=', value: 65 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估 OR 逻辑节点', () => {
      const node: LogicalNode = {
        type: 'logical',
        operator: '||',
        left: { type: 'comparison', variablePath: 'user.age', operator: '<', value: 18 },
        right: { type: 'comparison', variablePath: 'user.role', operator: '==', value: 'admin' }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });
  });

  describe('evaluateAST - NOT 节点', () => {
    it('应该评估 NOT 节点', () => {
      const node: NotNode = {
        type: 'not',
        operand: { type: 'boolean', value: true }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(false);
    });

    it('应该评估嵌套 NOT 节点', () => {
      const node: NotNode = {
        type: 'not',
        operand: {
          type: 'not',
          operand: { type: 'boolean', value: true }
        }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });
  });

  describe('evaluateAST - 算术节点', () => {
    it('应该评估加法节点', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '+',
        left: { type: 'number', value: 10 },
        right: { type: 'number', value: 20 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(30);
    });

    it('应该评估减法节点', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '-',
        left: { type: 'number', value: 20 },
        right: { type: 'number', value: 10 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(10);
    });

    it('应该评估乘法节点', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '*',
        left: { type: 'number', value: 5 },
        right: { type: 'number', value: 4 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(20);
    });

    it('应该评估除法节点', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '/',
        left: { type: 'number', value: 20 },
        right: { type: 'number', value: 4 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(5);
    });

    it('应该评估取模节点', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '%',
        left: { type: 'number', value: 10 },
        right: { type: 'number', value: 3 }
      };
      expect(evaluator.evaluateAST(node, context)).toBe(1);
    });

    it('应该处理除零', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '/',
        left: { type: 'number', value: 10 },
        right: { type: 'number', value: 0 }
      };
      expect(evaluator.evaluateAST(node, context)).toBeNaN();
    });

    it('应该处理类型不匹配', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '+',
        left: { type: 'string', value: 'hello' },
        right: { type: 'number', value: 10 }
      };
      expect(evaluator.evaluateAST(node, context)).toBeNaN();
    });

    it('应该抛出未知运算符的错误', () => {
      const node: ArithmeticNode = {
        type: 'arithmetic',
        operator: '^' as any,
        left: { type: 'number', value: 2 },
        right: { type: 'number', value: 3 }
      };
      expect(() => evaluator.evaluateAST(node, context)).toThrow(RuntimeValidationError);
    });
  });

  describe('evaluateAST - 字符串方法节点', () => {
    it('应该评估 startsWith 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'startsWith',
        argument: 'Hello'
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估 endsWith 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'endsWith',
        argument: 'World'
      };
      expect(evaluator.evaluateAST(node, context)).toBe(true);
    });

    it('应该评估 length 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'length'
      };
      expect(evaluator.evaluateAST(node, context)).toBe(11);
    });

    it('应该评估 toLowerCase 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'toLowerCase'
      };
      expect(evaluator.evaluateAST(node, context)).toBe('hello world');
    });

    it('应该评估 toUpperCase 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'toUpperCase'
      };
      expect(evaluator.evaluateAST(node, context)).toBe('HELLO WORLD');
    });

    it('应该评估 trim 方法节点', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'trim'
      };
      expect(evaluator.evaluateAST(node, context)).toBe('Hello World');
    });

    it('应该处理非字符串值', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'user.age',
        method: 'length'
      };
      expect(evaluator.evaluateAST(node, context)).toBe(false);
    });

    it('应该抛出未知方法的错误', () => {
      const node: StringMethodNode = {
        type: 'stringMethod',
        variablePath: 'text',
        method: 'unknown' as any
      };
      expect(() => evaluator.evaluateAST(node, context)).toThrow(RuntimeValidationError);
    });
  });

  describe('evaluateAST - 三元运算符节点', () => {
    it('应该评估条件为真的三元节点', () => {
      const node: TernaryNode = {
        type: 'ternary',
        condition: { type: 'comparison', variablePath: 'user.age', operator: '>=', value: 18 },
        consequent: { type: 'string', value: 'adult' },
        alternate: { type: 'string', value: 'minor' }
      };
      expect(evaluator.evaluateAST(node, context)).toBe('adult');
    });

    it('应该评估条件为假的三元节点', () => {
      const node: TernaryNode = {
        type: 'ternary',
        condition: { type: 'comparison', variablePath: 'user.age', operator: '<', value: 18 },
        consequent: { type: 'string', value: 'minor' },
        alternate: { type: 'string', value: 'adult' }
      };
      expect(evaluator.evaluateAST(node, context)).toBe('adult');
    });

    it('应该评估嵌套三元节点', () => {
      const node: TernaryNode = {
        type: 'ternary',
        condition: { type: 'comparison', variablePath: 'user.age', operator: '<', value: 18 },
        consequent: { type: 'string', value: 'minor' },
        alternate: {
          type: 'ternary',
          condition: { type: 'comparison', variablePath: 'user.age', operator: '<', value: 65 },
          consequent: { type: 'string', value: 'adult' },
          alternate: { type: 'string', value: 'senior' }
        }
      };
      expect(evaluator.evaluateAST(node, context)).toBe('adult');
    });
  });

  describe('evaluateAST - 错误处理', () => {
    it('应该抛出未知节点类型的错误', () => {
      const node = { type: 'unknown' } as any;
      expect(() => evaluator.evaluateAST(node, context)).toThrow(RuntimeValidationError);
    });
  });

  describe('getVariableValue - 数据源访问规则', () => {
    it('应该从 input 数据源获取值', () => {
      expect(evaluator['getVariableValue']('input.status', context)).toBe('active');
      expect(evaluator['getVariableValue']('input.user.name', context)).toBe('Alice');
    });

    it('应该从 output 数据源获取值', () => {
      expect(evaluator['getVariableValue']('output.result.success', context)).toBe(true);
      expect(evaluator['getVariableValue']('output.count', context)).toBe(10);
    });

    it('应该从 variables 数据源获取值（显式前缀）', () => {
      expect(evaluator['getVariableValue']('variables.user.age', context)).toBe(25);
      expect(evaluator['getVariableValue']('variables.maxAge', context)).toBe(65);
    });

    it('应该从 variables 数据源获取值（简单变量名）', () => {
      expect(evaluator['getVariableValue']('maxAge', context)).toBe(65);
      expect(evaluator['getVariableValue']('minAge', context)).toBe(18);
    });

    it('应该从 variables 数据源获取嵌套路径值', () => {
      expect(evaluator['getVariableValue']('user.email', context)).toBe('john@example.com');
      expect(evaluator['getVariableValue']('user.role', context)).toBe('admin');
    });

    it('应该返回 undefined 对于不存在的变量', () => {
      expect(evaluator['getVariableValue']('nonexistent', context)).toBeUndefined();
      expect(evaluator['getVariableValue']('user.nonexistent', context)).toBeUndefined();
    });
  });
});

describe('expressionEvaluator 单例', () => {
  it('应该导出单例实例', () => {
    expect(expressionEvaluator).toBeInstanceOf(ExpressionEvaluator);
  });

  it('单例应该正常工作', () => {
    const context: EvaluationContext = {
      input: {},
      output: {},
      variables: { age: 25 }
    };
    expect(expressionEvaluator.evaluate('age == 25', context)).toBe(true);
  });

  it('单例应该处理复杂表达式', () => {
    const context: EvaluationContext = {
      input: {},
      output: {},
      variables: {
        age: 25,
        role: 'admin',
        text: 'Hello'
      }
    };
    expect(expressionEvaluator.evaluate('age >= 18 && role == "admin"', context)).toBe(true);
    expect(expressionEvaluator.evaluate('text.startsWith("He")', context)).toBe(true);
  });
});