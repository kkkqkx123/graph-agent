import { ConditionEvaluator, conditionEvaluator } from '../condition-evaluator';
import type { Condition, EvaluationContext } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
  });

  describe('constructor', () => {
    test('should create a new instance with ExpressionEvaluator', () => {
      expect(evaluator).toBeDefined();
      expect(evaluator).toBeInstanceOf(ConditionEvaluator);
    });
  });

  describe('evaluate', () => {
    test('should return true when condition is satisfied', () => {
      const condition: Condition = {
        expression: 'age == 25'
      };
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(true);
    });

    test('should return false when condition is not satisfied', () => {
      const condition: Condition = {
        expression: 'age == 25'
      };
      const context: EvaluationContext = {
        variables: { age: 30 },
        input: {},
        output: {}
      };

      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    test('should evaluate comparison expressions', () => {
      const context: EvaluationContext = {
        variables: { score: 85 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'score > 80' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'score >= 85' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'score < 90' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'score <= 85' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'score != 90' }, context)).toBe(true);
    });

    test('should evaluate string expressions', () => {
      const context: EvaluationContext = {
        variables: { status: 'active' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'status == "active"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'status != "inactive"' }, context)).toBe(true);
    });

    test('should evaluate contains operator', () => {
      const context: EvaluationContext = {
        variables: { text: 'Hello world' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'text contains "world"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'text contains "universe"' }, context)).toBe(false);
    });

    test('should evaluate in operator with array literal', () => {
      const context: EvaluationContext = {
        variables: { role: 'admin' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'role in ["admin", "user"]' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'role in ["guest", "user"]' }, context)).toBe(false);
    });

    test('should evaluate in operator with variable array', () => {
      const context: EvaluationContext = {
        variables: { role: 'admin', allowedRoles: ['admin', 'user', 'guest'] },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'role in allowedRoles' }, context)).toBe(true);
    });

    test('should evaluate logical AND expressions', () => {
      const context: EvaluationContext = {
        variables: { age: 25, isStudent: true },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'age >= 18 && isStudent == true' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'age >= 18 && isStudent == false' }, context)).toBe(false);
    });

    test('should evaluate logical OR expressions', () => {
      const context: EvaluationContext = {
        variables: { role: 'admin', isManager: false },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'role == "admin" || isManager == true' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'role == "user" || isManager == true' }, context)).toBe(false);
    });

    test('should evaluate mixed AND/OR expressions', () => {
      const context: EvaluationContext = {
        variables: { age: 25, isStudent: true, role: 'user' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate(
        { expression: 'age >= 18 && isStudent == true || role == "admin"' },
        context
      )).toBe(true);

      expect(evaluator.evaluate(
        { expression: 'age < 18 && isStudent == true || role == "admin"' },
        context
      )).toBe(false);
    });

    test('should evaluate nested path expressions', () => {
      const context: EvaluationContext = {
        variables: {
          user: {
            profile: {
              name: 'Alice',
              age: 30
            }
          }
        },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'user.profile.name == "Alice"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'user.profile.age > 25' }, context)).toBe(true);
    });

    test('should evaluate array access expressions', () => {
      const context: EvaluationContext = {
        variables: {
          users: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 }
          ]
        },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'users[0].name == "Alice"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'users[1].age == 25' }, context)).toBe(true);
    });

    test('should evaluate input data expressions', () => {
      const context: EvaluationContext = {
        variables: {},
        input: { status: 'success', data: { id: 123 } },
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'input.status == "success"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'input.data.id == 123' }, context)).toBe(true);
    });

    test('should evaluate output data expressions', () => {
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: { result: 'completed', value: 42 }
      };

      expect(evaluator.evaluate({ expression: 'output.result == "completed"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'output.value >= 40' }, context)).toBe(true);
    });

    test('should evaluate mixed variables, input and output expressions', () => {
      const context: EvaluationContext = {
        variables: { varValue: 'test' },
        input: { inputValue: 'input' },
        output: { outputValue: 'output' }
      };

      expect(evaluator.evaluate({ expression: 'varValue == "test"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'input.inputValue == "input"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'output.outputValue == "output"' }, context)).toBe(true);
    });

    test('should handle boolean values correctly', () => {
      const context: EvaluationContext = {
        variables: { isActive: true, isDeleted: false },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'isActive == true' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'isDeleted == false' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'isActive != false' }, context)).toBe(true);
    });

    test('should handle null values correctly', () => {
      const context: EvaluationContext = {
        variables: { nullValue: null, definedValue: 'defined' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'nullValue == null' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'definedValue != null' }, context)).toBe(true);
    });

    test('should handle undefined variables correctly', () => {
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'undefinedVar == null' }, context)).toBe(false);
      expect(evaluator.evaluate({ expression: 'undefinedVar != null' }, context)).toBe(true);
    });

    test('should throw RuntimeValidationError when expression field is missing', () => {
      const condition: Condition = {
        expression: ''
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      expect(() => evaluator.evaluate(condition, context)).toThrow(RuntimeValidationError);
    });

    test('should throw RuntimeValidationError when expression is empty string', () => {
      const condition: Condition = {
        expression: ''
      };
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      expect(() => evaluator.evaluate(condition, context)).toThrow(RuntimeValidationError);
    });

    test('should throw RuntimeValidationError when expression cannot be parsed', () => {
      const condition: Condition = {
        expression: 'invalid expression without operator'
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      expect(() => evaluator.evaluate(condition, context)).toThrow(RuntimeValidationError);
    });

    test('should handle expressions with metadata', () => {
      const condition: Condition = {
        expression: 'age > 18',
        metadata: {
          description: 'Check if age is greater than 18',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    test('should return false when variable does not exist', () => {
      const condition: Condition = {
        expression: 'nonExistentVariable > 100'
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      // Should return false and log warning
      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    test('should evaluate complex expressions with multiple conditions', () => {
      const context: EvaluationContext = {
        variables: {
          age: 30,
          status: 'active',
          roles: ['admin', 'user'],
          hasPermission: true
        },
        input: {},
        output: {}
      };

      // Complex condition: age >= 18 AND status == 'active' AND hasPermission == true
      const condition: Condition = {
        expression: 'age >= 18 && status == "active" && hasPermission == true'
      };

      expect(evaluator.evaluate(condition, context)).toBe(true);
    });

    test('should evaluate numeric comparison with different types correctly', () => {
      const context: EvaluationContext = {
        variables: { count: 5, minCount: 3, maxCount: 10 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'count > minCount' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'count < maxCount' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'count >= minCount' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'count <= maxCount' }, context)).toBe(true);
    });

    test('should not find variables in input/output without explicit prefix', () => {
      const context: EvaluationContext = {
        variables: {},
        input: { onlyInInput: 'value' },
        output: { onlyInOutput: 'value' }
      };

      // Simple variable names only look in variables, not input/output
      expect(evaluator.evaluate({ expression: 'onlyInInput == "value"' }, context)).toBe(false);
      expect(evaluator.evaluate({ expression: 'onlyInOutput == "value"' }, context)).toBe(false);

      // With explicit prefix, they should be found
      expect(evaluator.evaluate({ expression: 'input.onlyInInput == "value"' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'output.onlyInOutput == "value"' }, context)).toBe(true);
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(conditionEvaluator).toBeDefined();
      expect(conditionEvaluator).toBeInstanceOf(ConditionEvaluator);
    });

    test('singleton instance should evaluate conditions correctly', () => {
      const condition: Condition = {
        expression: 'age == 25'
      };
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      expect(conditionEvaluator.evaluate(condition, context)).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should throw RuntimeValidationError for invalid expressions', () => {
      const condition: Condition = {
        expression: 'this is not a valid expression'
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      expect(() => evaluator.evaluate(condition, context)).toThrow(RuntimeValidationError);
    });

    test('should return false when variable does not exist', () => {
      const condition: Condition = {
        expression: 'nonExistentVariable > 100'
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    test('should throw RuntimeValidationError for malformed comparison expressions', () => {
      const condition: Condition = {
        expression: 'age >'  // Missing right operand
      };
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      expect(() => evaluator.evaluate(condition, context)).toThrow(RuntimeValidationError);
    });

    test('should return false when type mismatch in comparison', () => {
      const condition: Condition = {
        expression: 'stringValue > 100'
      };
      const context: EvaluationContext = {
        variables: { stringValue: 'hello' },
        input: {},
        output: {}
      };

      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty context variables', () => {
      const condition: Condition = {
        expression: 'age > 18'
      };
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      const result = evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    test('should handle special characters in string values', () => {
      const context: EvaluationContext = {
        variables: { message: 'Hello "world" with \'quotes\'' },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'message contains "world"' }, context)).toBe(true);
    });

    test('should handle very long expressions', () => {
      const conditions = [];
      for (let i = 0; i < 10; i++) {
        conditions.push(`var${i} == ${i}`);
      }
      const expression = conditions.join(' && ');

      const variables: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        variables[`var${i}`] = i;
      }

      const context: EvaluationContext = {
        variables,
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression }, context)).toBe(true);
    });

    test('should handle expressions with extra whitespace', () => {
      const context: EvaluationContext = {
        variables: { age: 25 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: '  age   ==   25  ' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'age>=18  &&  age<=65' }, context)).toBe(true);
    });

    test('should handle numeric edge cases', () => {
      const context: EvaluationContext = {
        variables: { zero: 0, negative: -42, decimal: 3.14 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate({ expression: 'zero == 0' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'negative < 0' }, context)).toBe(true);
      expect(evaluator.evaluate({ expression: 'decimal > 3' }, context)).toBe(true);
    });
  });
});
