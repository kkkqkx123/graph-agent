import { ExpressionEvaluator } from '../expression-evaluator';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  afterEach(() => {
    evaluator.clearCache();
  });

  describe('evaluate', () => {
    it('应该正确评估简单的算术表达式', async () => {
      const result = await evaluator.evaluate('2 + 3 * 4', {});
      expect(result.success).toBe(true);
      expect(result.value).toBe(14);
    });

    it('应该正确评估带上下文的表达式', async () => {
      const context = {
        user: { name: 'John', age: 30 },
        orders: [
          { id: 1, total: 150, status: 'completed' },
          { id: 2, total: 89.99, status: 'pending' }
        ]
      };

      const result = await evaluator.evaluate('user.name', context);
      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
    });

    it('应该正确评估数组过滤表达式', async () => {
      const context = {
        orders: [
          { id: 1, total: 150, status: 'completed' },
          { id: 2, total: 89.99, status: 'pending' },
          { id: 3, total: 234.5, status: 'completed' }
        ]
      };

      const result = await evaluator.evaluate('orders[.status == "completed"]', context);
      expect(result.success).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].id).toBe(1);
      expect(result.value[1].id).toBe(3);
    });

    it('应该正确评估复杂条件表达式', async () => {
      const context = {
        errors: [{ message: 'error1' }, { message: 'error2' }],
        retryCount: 2
      };

      const result = await evaluator.evaluate('errors.length > 0 && retryCount < 3', context);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('应该正确评估三元表达式', async () => {
      const context = { age: 25 };

      const result = await evaluator.evaluate('age > 62 ? "retired" : "working"', context);
      expect(result.success).toBe(true);
      expect(result.value).toBe('working');
    });

    it('应该正确使用内置转换器', async () => {
      const context = { name: 'john doe' };

      const result = await evaluator.evaluate('name|upper', context);
      expect(result.success).toBe(true);
      expect(result.value).toBe('JOHN DOE');
    });

    it('应该正确使用内置函数', async () => {
      const context = { a: 10, b: 20 };

      const result = await evaluator.evaluate('Math.max(a, b)', context);
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });

    it('应该处理语法错误', async () => {
      const result = await evaluator.evaluate('user.name +', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该缓存评估结果', async () => {
      const context = { value: 42 };

      const result1 = await evaluator.evaluate('value * 2', context);
      const result2 = await evaluator.evaluate('value * 2', context);

      expect(result1.value).toBe(84);
      expect(result2.value).toBe(84);
      expect(evaluator.getCacheSize()).toBe(1);
    });
  });

  describe('validate', () => {
    it('应该验证有效的表达式', () => {
      const result = evaluator.validate('user.name + " " + user.last');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测语法错误', () => {
      const result = evaluator.validate('user.name +');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该修剪表达式', () => {
      const result = evaluator.validate('   user.name   ');
      expect(result.trimmedExpression).toBe('user.name');
    });

    it('应该验证带上下文的表达式', () => {
      const context = { user: { name: 'John' } };

      const result = evaluator.validate('user.name', context);
      expect(result.isValid).toBe(true);
    });

    it('应该检测上下文中不存在的属性', () => {
      const context = { user: { name: 'John' } };

      const result = evaluator.validate('user.email', context);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('addTransform', () => {
    it('应该添加自定义转换器', async () => {
      evaluator.addTransform('double', (val: number) => val * 2);

      const result = await evaluator.evaluate('value|double', { value: 5 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
    });
  });

  describe('addFunction', () => {
    it('应该添加自定义函数', async () => {
      evaluator.addFunction('square', (val: number) => val * val);

      const result = await evaluator.evaluate('square(value)', { value: 5 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(25);
    });
  });

  describe('clearCache', () => {
    it('应该清除缓存', async () => {
      await evaluator.evaluate('value * 2', { value: 42 });
      expect(evaluator.getCacheSize()).toBe(1);

      evaluator.clearCache();
      expect(evaluator.getCacheSize()).toBe(0);
    });
  });

  describe('getCacheSize', () => {
    it('应该返回缓存大小', async () => {
      expect(evaluator.getCacheSize()).toBe(0);

      await evaluator.evaluate('value * 2', { value: 1 });
      expect(evaluator.getCacheSize()).toBe(1);

      await evaluator.evaluate('value * 3', { value: 1 });
      expect(evaluator.getCacheSize()).toBe(2);
    });
  });
});