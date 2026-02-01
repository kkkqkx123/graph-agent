/**
 * 熔断器单元测试
 */

import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  describe('构造函数', () => {
    it('应该使用默认配置创建熔断器', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('应该使用自定义配置创建熔断器', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 30000,
      });
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('execute', () => {
    it('应该成功执行函数', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('应该记录失败并保持CLOSED状态', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('应该在达到失败阈值后打开熔断器', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      // 第一次失败
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('CLOSED');
      
      // 第二次失败，应该打开熔断器
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
    });

    it('应该在熔断器打开时拒绝执行', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      // 触发熔断器打开
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
      
      // 熔断器打开时应该拒绝执行
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该在HALF_OPEN状态下成功后恢复到CLOSED', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeout: 100,
      });
      
      const failFn = jest.fn().mockRejectedValue(new Error('error'));
      const successFn = jest.fn().mockResolvedValue('success');
      
      // 触发熔断器打开
      await expect(breaker.execute(failFn)).rejects.toThrow('error');
      await expect(breaker.execute(failFn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
      
      // 等待重置超时
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 第一次成功，应该进入HALF_OPEN
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      // 第二次成功，应该恢复到CLOSED
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('应该在HALF_OPEN状态下失败后重新打开', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeout: 100,
      });
      
      const failFn = jest.fn().mockRejectedValue(new Error('error'));
      const successFn = jest.fn().mockResolvedValue('success');
      
      // 触发熔断器打开
      await expect(breaker.execute(failFn)).rejects.toThrow('error');
      await expect(breaker.execute(failFn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
      
      // 等待重置超时
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 第一次成功，进入HALF_OPEN
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      // 失败，应该重新打开
      await expect(breaker.execute(failFn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('isOpen', () => {
    it('应该在CLOSED状态下返回false', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      expect(breaker.isOpen()).toBe(false);
    });

    it('应该在OPEN状态下返回true', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      
      expect(breaker.isOpen()).toBe(true);
    });

    it('应该在重置超时后返回false', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 100,
      });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      
      expect(breaker.isOpen()).toBe(true);
      
      // 等待重置超时
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('getState', () => {
    it('应该返回当前状态', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('reset', () => {
    it('应该重置熔断器到CLOSED状态', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      await expect(breaker.execute(fn)).rejects.toThrow('error');
      expect(breaker.getState()).toBe('OPEN');
      
      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isOpen()).toBe(false);
    });
  });
});