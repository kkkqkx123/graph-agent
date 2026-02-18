/**
 * ConditionEvaluator 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionEvaluator, conditionEvaluator } from '../condition-evaluator.js';
import { RuntimeValidationError } from '@modular-agent/types';
import type { Condition, EvaluationContext } from '@modular-agent/types';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;
  let context: EvaluationContext;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
    context = {
      input: {
        status: 'active',
        score: 85,
        tags: ['admin', 'user']
      },
      output: {
        result: {
          success: true,
          message: 'OK'
        }
      },
      variables: {
        user: {
          age: 25,
          name: 'John',
          role: 'admin'
        },
        maxAge: 65,
        minAge: 18
      }
    };
  });

  describe('evaluate - 基本功能', () => {
    it('应该评估简单的等于条件', () => {
      const condition: Condition = {
        expression: "user.age == 25"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估简单的不等于条件', () => {
      const condition: Condition = {
        expression: "user.age != 30"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估大于条件', () => {
      const condition: Condition = {
        expression: "user.age > 20"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估小于条件', () => {
      const condition: Condition = {
        expression: "user.age < 30"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估大于等于条件', () => {
      const condition: Condition = {
        expression: "user.age >= 25"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估小于等于条件', () => {
      const condition: Condition = {
        expression: "user.age <= 25"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估包含条件', () => {
      const condition: Condition = {
        expression: "user.name contains 'oh'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估在数组中条件', () => {
      const condition: Condition = {
        expression: "user.role in ['admin', 'user']"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluate - 复合条件', () => {
    it('应该评估 AND 条件', () => {
      const condition: Condition = {
        expression: "user.age >= 18 && user.age <= 65"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估 OR 条件', () => {
      const condition: Condition = {
        expression: "user.age < 18 || user.role == 'admin'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估混合逻辑条件', () => {
      const condition: Condition = {
        expression: "user.age >= 18 && user.role == 'admin'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估带括号的条件', () => {
      const condition: Condition = {
        expression: "(user.age >= 18 && user.age <= 65) || user.role == 'admin'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluate - 数据源访问', () => {
    it('应该从 input 数据源评估条件', () => {
      const condition: Condition = {
        expression: "input.status == 'active'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该从 output 数据源评估条件', () => {
      const condition: Condition = {
        expression: "output.result.success == true"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该从 variables 数据源评估条件（显式前缀）', () => {
      const condition: Condition = {
        expression: "variables.user.age == 25"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该从 variables 数据源评估条件（简单变量名）', () => {
      const condition: Condition = {
        expression: "maxAge == 65"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluate - 错误处理', () => {
    it('应该抛出缺少 expression 字段的错误', () => {
      const condition: Condition = {
        expression: ''
      };
      expect(() => {
        evaluator.evaluate(condition, context);
      }).toThrow(RuntimeValidationError);
    });

    it('应该抛出无效表达式的错误', () => {
      const condition: Condition = {
        expression: "invalid expression"
      };
      expect(() => {
        evaluator.evaluate(condition, context);
      }).toThrow(RuntimeValidationError);
    });

    it('应该抛出未知运算符的错误', () => {
      const condition: Condition = {
        expression: "user.age unknown 25"
      };
      expect(() => {
        evaluator.evaluate(condition, context);
      }).toThrow(RuntimeValidationError);
    });

    it('应该处理运行时评估失败', () => {
      const condition: Condition = {
        expression: "nonexistent.value == 123"
      };
      // 不存在的变量应该返回 false，而不是抛出错误
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });
  });

  describe('evaluate - 边界情况', () => {
    it('应该评估布尔值 true', () => {
      const condition: Condition = {
        expression: "true"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估布尔值 false', () => {
      const condition: Condition = {
        expression: "false"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });

    it('应该评估 null 值', () => {
      const condition: Condition = {
        expression: "user.age == null"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });

    it('应该处理空字符串', () => {
      const condition: Condition = {
        expression: "user.name == ''"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });

    it('应该处理零值', () => {
      const condition: Condition = {
        expression: "user.age == 0"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });

    it('应该处理负数比较', () => {
      const condition: Condition = {
        expression: "user.age > -100"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该处理浮点数比较', () => {
      const condition: Condition = {
        expression: "user.age > 24.5"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluate - 复杂场景', () => {
    it('应该评估多个嵌套条件', () => {
      const condition: Condition = {
        expression: "user.age >= 18 && user.age <= 65 && user.role == 'admin'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估带数组索引的条件', () => {
      const condition: Condition = {
        expression: "input.tags[0] == 'admin'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估带嵌套对象的条件', () => {
      const condition: Condition = {
        expression: "output.result.message == 'OK'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    it('应该评估变量引用条件', () => {
      const condition: Condition = {
        expression: "user.age == maxAge"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });
  });

  describe('evaluate - 类型安全', () => {
    it('应该处理类型不匹配的比较', () => {
      const condition: Condition = {
        expression: "user.name > 100"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });

    it('应该处理 in 运算符的非数组值', () => {
      const condition: Condition = {
        expression: "user.age in 'not an array'"
      };
      expect(evaluator.evaluate(condition, context)).toBe(false);
    });
  });
});

describe('conditionEvaluator 单例', () => {
  it('应该导出单例实例', () => {
    expect(conditionEvaluator).toBeInstanceOf(ConditionEvaluator);
  });

  it('单例应该正常工作', () => {
    const context: EvaluationContext = {
      input: {},
      output: {},
      variables: { age: 25 }
    };
    const condition: Condition = {
      expression: "age == 25"
    };
    expect(conditionEvaluator.evaluate(condition, context)).toBe(true);
  });

  it('单例应该处理错误情况', () => {
    const context: EvaluationContext = {
      input: {},
      output: {},
      variables: { age: 25 }
    };
    const condition: Condition = {
      expression: ""
    };
    expect(() => {
      conditionEvaluator.evaluate(condition, context);
    }).toThrow(RuntimeValidationError);
  });
});