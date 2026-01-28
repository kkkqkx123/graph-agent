import { ExpressionEvaluator, parseExpression, parseValue, parseCompoundExpression } from '../expression-parser';
import type { EvaluationContext } from '../../../types/condition';

describe('ExpressionParser', () => {
  describe('parse', () => {
    test('should parse equality expressions', () => {
      const result = parseExpression('name == "John"');
      expect(result).toEqual({
        variablePath: 'name',
        operator: '==',
        value: 'John'
      });
    });

    test('should parse comparison expressions', () => {
      expect(parseExpression('age > 18')).toEqual({
        variablePath: 'age',
        operator: '>',
        value: 18
      });

      expect(parseExpression('score >= 60')).toEqual({
        variablePath: 'score',
        operator: '>=',
        value: 60
      });

      expect(parseExpression('count < 100')).toEqual({
        variablePath: 'count',
        operator: '<',
        value: 100
      });

      expect(parseExpression('limit <= 50')).toEqual({
        variablePath: 'limit',
        operator: '<=',
        value: 50
      });
    });

    test('should parse contains expressions', () => {
      const result = parseExpression('text contains "hello"');
      expect(result).toEqual({
        variablePath: 'text',
        operator: 'contains',
        value: 'hello'
      });
    });

    test('should parse in expressions', () => {
      const result = parseExpression('status in ["active", "pending"]');
      expect(result).toEqual({
        variablePath: 'status',
        operator: 'in',
        value: ['active', 'pending']
      });
    });

    test('should parse nested paths', () => {
      const result = parseExpression('user.profile.age > 18');
      expect(result).toEqual({
        variablePath: 'user.profile.age',
        operator: '>',
        value: 18
      });
    });

    test('should parse array access paths', () => {
      const result = parseExpression('items[0].name == "test"');
      expect(result).toEqual({
        variablePath: 'items[0].name',
        operator: '==',
        value: 'test'
      });
    });

    test('should throw ValidationError for invalid expressions', () => {
      expect(() => parseExpression('')).toThrow();
      expect(() => parseExpression('invalid expression')).not.toThrow(); // 不会抛错，但返回 null
      expect(parseExpression('invalid expression')).toBeNull();
    });
  });

  describe('parseValue', () => {
    test('should parse strings', () => {
      expect(parseValue("'hello'")).toBe('hello');
      expect(parseValue('"world"')).toBe('world');
    });

    test('should parse numbers', () => {
      expect(parseValue('123')).toBe(123);
      expect(parseValue('3.14')).toBe(3.14);
      expect(parseValue('-42')).toBe(-42);
    });

    test('should parse booleans', () => {
      expect(parseValue('true')).toBe(true);
      expect(parseValue('false')).toBe(false);
    });

    test('should parse null', () => {
      expect(parseValue('null')).toBeNull();
    });

    test('should parse arrays', () => {
      expect(parseValue('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(parseValue('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
      expect(parseValue('[]')).toEqual([]);
    });
  });

  describe('parseCompoundExpression', () => {
    test('should parse AND expressions', () => {
      const result = parseCompoundExpression('age >= 18 && age <= 65');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ expression: 'age >= 18', operator: '&&' });
      expect(result[1]).toEqual({ expression: 'age <= 65', operator: '&&' });
    });

    test('should parse OR expressions', () => {
      const result = parseCompoundExpression('status == "active" || status == "pending"');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ expression: 'status == "active"', operator: '&&' });
      expect(result[1]).toEqual({ expression: 'status == "pending"', operator: '||' });
    });

    test('should parse mixed AND/OR expressions', () => {
      const result = parseCompoundExpression('a > 0 && b > 0 || c > 0');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ expression: 'a > 0', operator: '&&' });
      expect(result[1]).toEqual({ expression: 'b > 0', operator: '&&' });
      expect(result[2]).toEqual({ expression: 'c > 0', operator: '||' });
    });

    test('should handle parentheses', () => {
      const result = parseCompoundExpression('(a > 0) && (b > 0)');
      expect(result).toHaveLength(2);
      expect(result[0]?.expression).toBe('(a > 0)');
      expect(result[1]?.expression).toBe('(b > 0)');
    });
  });
});

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('evaluate', () => {
    test('should evaluate equality expressions', () => {
      const context: EvaluationContext = {
        variables: { name: 'John', age: 25 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('name == "John"', context)).toBe(true);
      expect(evaluator.evaluate('name != "Jane"', context)).toBe(true);
      expect(evaluator.evaluate('age == 25', context)).toBe(true);
      expect(evaluator.evaluate('age != 30', context)).toBe(true);
    });

    test('should evaluate comparison expressions', () => {
      const context: EvaluationContext = {
        variables: { score: 85, minScore: 80, maxScore: 100 },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('score > minScore', context)).toBe(true);
      expect(evaluator.evaluate('score < maxScore', context)).toBe(true);
      expect(evaluator.evaluate('score >= 85', context)).toBe(true);
      expect(evaluator.evaluate('score <= 90', context)).toBe(true);
    });

    test('should evaluate logical operators', () => {
      const context: EvaluationContext = {
        variables: { isAdult: true, hasLicense: true, isStudent: false },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('isAdult == true && hasLicense == true', context)).toBe(true);
      expect(evaluator.evaluate('isAdult == true || isStudent == true', context)).toBe(true);
      expect(evaluator.evaluate('isStudent == true || hasLicense == true', context)).toBe(true);
      expect(evaluator.evaluate('isStudent == true && hasLicense == true', context)).toBe(false);
    });

    test('should evaluate contains operator', () => {
      const context: EvaluationContext = {
        variables: { text: 'Hello world', tags: ['javascript', 'typescript', 'testing'] },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('text contains "world"', context)).toBe(true);
      expect(evaluator.evaluate('text contains "universe"', context)).toBe(false);
      expect(evaluator.evaluate('tags contains "typescript"', context)).toBe(true);
      expect(evaluator.evaluate('tags contains "python"', context)).toBe(false);
    });

    test('should evaluate in operator', () => {
      const context: EvaluationContext = {
        variables: { status: 'active', validStatuses: ['active', 'pending', 'draft'] },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('status in validStatuses', context)).toBe(true);
      expect(evaluator.evaluate('status in ["active", "inactive"]', context)).toBe(true);
      expect(evaluator.evaluate('status in ["pending", "draft"]', context)).toBe(false);
    });

    test('should evaluate nested path expressions', () => {
      const context: EvaluationContext = {
        variables: { user: { profile: { name: 'Alice', age: 30 } } },
        input: { data: { settings: { theme: 'dark' } } },
        output: { result: { success: true } }
      };

      expect(evaluator.evaluate('user.profile.name == "Alice"', context)).toBe(true);
      expect(evaluator.evaluate('user.profile.age == 30', context)).toBe(true);
      expect(evaluator.evaluate('input.data.settings.theme == "dark"', context)).toBe(true);
      expect(evaluator.evaluate('output.result.success == true', context)).toBe(true);
    });

    test('should evaluate array access expressions', () => {
      const context: EvaluationContext = {
        variables: {
          users: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
          numbers: [1, 2, 3, 4, 5]
        },
        input: {},
        output: {}
      };

      expect(evaluator.evaluate('users[0].name == "Alice"', context)).toBe(true);
      expect(evaluator.evaluate('users[1].age == 25', context)).toBe(true);
      expect(evaluator.evaluate('numbers[0] == 1', context)).toBe(true);
      expect(evaluator.evaluate('numbers[4] == 5', context)).toBe(true);
    });

    test('should handle mixed context variables, input, and output', () => {
      const context: EvaluationContext = {
        variables: { varValue: 'fromVariables' },
        input: { inputValue: 'fromInput' },
        output: { outputValue: 'fromOutput' }
      };

      // 简单变量名：仅从 variables 获取
      expect(evaluator.evaluate('varValue == "fromVariables"', context)).toBe(true);

      // 显式前缀：从指定数据源获取
      expect(evaluator.evaluate('input.inputValue == "fromInput"', context)).toBe(true);
      expect(evaluator.evaluate('output.outputValue == "fromOutput"', context)).toBe(true);
    });

    test('should handle null and undefined values', () => {
      const context: EvaluationContext = {
        variables: { nullVar: null, definedVar: 'defined' },
        input: { inputNull: null },
        output: {}
      };

      expect(evaluator.evaluate('nullVar == null', context)).toBe(true);
      expect(evaluator.evaluate('input.inputNull == null', context)).toBe(true);
      expect(evaluator.evaluate('nonExistentVar == null', context)).toBe(false); // undefined !== null
    });

    test('should return false when encountering errors', () => {
      const context: EvaluationContext = {
        variables: {},
        input: {},
        output: {}
      };

      // Invalid expression should return false
      expect(evaluator.evaluate('invalid == expression ==', context)).toBe(false);
    });

    test('should use explicit prefixes to avoid data source conflicts', () => {
      const context: EvaluationContext = {
        variables: { status: 'fromVariables', user: { name: 'varUser' } },
        input: { status: 'fromInput', user: { name: 'inputUser' } },
        output: { status: 'fromOutput', user: { name: 'outputUser' } }
      };

      // 简单变量名：仅从 variables 获取
      expect(evaluator.evaluate('status == "fromVariables"', context)).toBe(true);
      expect(evaluator.evaluate('user.name == "varUser"', context)).toBe(true);

      // 显式前缀：从指定数据源获取
      expect(evaluator.evaluate('variables.status == "fromVariables"', context)).toBe(true);
      expect(evaluator.evaluate('variables.user.name == "varUser"', context)).toBe(true);

      expect(evaluator.evaluate('input.status == "fromInput"', context)).toBe(true);
      expect(evaluator.evaluate('input.user.name == "inputUser"', context)).toBe(true);

      expect(evaluator.evaluate('output.status == "fromOutput"', context)).toBe(true);
      expect(evaluator.evaluate('output.user.name == "outputUser"', context)).toBe(true);
    });

    test('should not find variables in input/output without explicit prefix', () => {
      const context: EvaluationContext = {
        variables: {},
        input: { onlyInInput: 'value' },
        output: { onlyInOutput: 'value' }
      };

      // 简单变量名：仅从 variables 获取，input/output 中的变量不会被找到
      expect(evaluator.evaluate('onlyInInput == "value"', context)).toBe(false);
      expect(evaluator.evaluate('onlyInOutput == "value"', context)).toBe(false);

      // 显式前缀：可以找到
      expect(evaluator.evaluate('input.onlyInInput == "value"', context)).toBe(true);
      expect(evaluator.evaluate('output.onlyInOutput == "value"', context)).toBe(true);
    });
  });
});