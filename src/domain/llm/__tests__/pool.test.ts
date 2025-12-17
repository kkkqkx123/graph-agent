import { PollingPool } from '../entities/pool';
import { PoolInstance } from '../value-objects/pool-instance';
import { RotationStrategyVO } from '../value-objects/rotation-strategy';

describe('轮询池实体测试', () => {
  describe('PollingPool 构造函数', () => {
    test('应该成功创建轮询池', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      
      expect(pool.name).toBe('test_pool');
      expect(pool.displayName).toBe('测试轮询池');
      expect(pool.instances).toHaveLength(0);
      expect(pool.isActive).toBe(true);
    });

    test('应该设置轮询策略', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const strategy = RotationStrategyVO.create('round_robin');
      
      pool.setRotationStrategy(strategy);
      
      expect(pool.rotationStrategy).toBe(strategy);
    });

    test('应该添加实例', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      
      pool.addInstance(instance);
      
      expect(pool.instances).toHaveLength(1);
      expect(pool.instances[0]).toBe(instance);
    });

    test('应该移除实例', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      
      pool.addInstance(instance);
      expect(pool.instances).toHaveLength(1);
      
      pool.removeInstance('instance1');
      expect(pool.instances).toHaveLength(0);
    });

    test('应该激活和停用轮询池', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      
      expect(pool.isActive).toBe(true);
      
      pool.deactivate();
      expect(pool.isActive).toBe(false);
      
      pool.activate();
      expect(pool.isActive).toBe(true);
    });
  });

  describe('轮询策略测试', () => {
    test('轮询策略应该正确选择实例', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance1 = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      const instance2 = new PoolInstance('instance2', 'openai', 'gpt-4o-mini', 2);
      
      pool.addInstance(instance1);
      pool.addInstance(instance2);
      
      const strategy = RotationStrategyVO.create('round_robin');
      pool.setRotationStrategy(strategy);
      
      // 第一次选择
      const firstInstance = pool.selectInstance();
      expect(firstInstance).toBe(instance1);
      
      // 第二次选择
      const secondInstance = pool.selectInstance();
      expect(secondInstance).toBe(instance2);
      
      // 第三次选择（回到第一个）
      const thirdInstance = pool.selectInstance();
      expect(thirdInstance).toBe(instance1);
    });

    test('加权轮询策略应该按权重选择实例', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance1 = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      const instance2 = new PoolInstance('instance2', 'openai', 'gpt-4o-mini', 3);
      
      pool.addInstance(instance1);
      pool.addInstance(instance2);
      
      const strategy = RotationStrategyVO.create('weighted');
      pool.setRotationStrategy(strategy);
      
      // 统计选择次数
      const selections = { instance1: 0, instance2: 0 };
      
      for (let i = 0; i < 100; i++) {
        const instance = pool.selectInstance();
        if (instance.name === 'instance1') {
          selections.instance1++;
        } else {
          selections.instance2++;
        }
      }
      
      // instance2的权重是instance1的3倍，所以instance2应该被选择更多次
      expect(selections.instance2).toBeGreaterThan(selections.instance1);
    });
  });

  describe('健康检查测试', () => {
    test('应该标记实例为健康', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      
      pool.addInstance(instance);
      pool.markInstanceHealthy('instance1');
      
      expect(instance.isHealthy).toBe(true);
      expect(instance.lastHealthCheck).toBeDefined();
    });

    test('应该标记实例为不健康', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      
      pool.addInstance(instance);
      pool.markInstanceUnhealthy('instance1', '连接超时');
      
      expect(instance.isHealthy).toBe(false);
      expect(instance.lastFailureReason).toBe('连接超时');
    });

    test('应该获取健康实例', () => {
      const pool = new PollingPool('test_pool', '测试轮询池');
      const instance1 = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      const instance2 = new PoolInstance('instance2', 'openai', 'gpt-4o-mini', 1);
      
      pool.addInstance(instance1);
      pool.addInstance(instance2);
      
      pool.markInstanceHealthy('instance1');
      pool.markInstanceUnhealthy('instance2', '连接失败');
      
      const healthyInstances = pool.getHealthyInstances();
      expect(healthyInstances).toHaveLength(1);
      expect(healthyInstances[0].name).toBe('instance1');
    });
  });
});