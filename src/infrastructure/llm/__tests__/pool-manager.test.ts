import { PollingPoolManager } from '../managers/pool-manager';
import { PoolConfigLoader } from '../config/pool-config-loader';
import { PollingPool } from '../../../domain/llm/entities/pool';
import { PoolInstance } from '../../../domain/llm/value-objects/pool-instance';

describe('轮询池管理器测试', () => {
  let poolManager: PollingPoolManager;
  let mockConfigLoader: jest.Mocked<PoolConfigLoader>;

  beforeEach(() => {
    mockConfigLoader = {
      loadPoolConfig: jest.fn(),
      loadAllPoolConfigs: jest.fn(),
      getPoolConfigStatus: jest.fn(),
      validateConfigSyntax: jest.fn(),
      reloadConfig: jest.fn(),
      getConfigChangeHistory: jest.fn()
    } as any;

    poolManager = new PollingPoolManager(mockConfigLoader);
  });

  describe('getPool 方法', () => {
    test('应该获取存在的轮询池', () => {
      const mockPool = new PollingPool('fast_pool', '快速轮询池');
      (poolManager as any).pools.set('fast_pool', mockPool);

      const pool = poolManager.getPool('fast_pool');

      expect(pool).toBe(mockPool);
    });

    test('应该返回null当轮询池不存在', () => {
      const pool = poolManager.getPool('nonexistent_pool');

      expect(pool).toBeNull();
    });
  });

  describe('createPool 方法', () => {
    test('应该从配置创建轮询池', async () => {
      const config = {
        name: 'test_pool',
        taskGroups: ['fast_group'],
        rotation: { strategy: 'round_robin' },
        instances: [
          { name: 'instance1', provider: 'openai', model: 'gpt-4o', weight: 1 }
        ]
      };

      mockConfigLoader.loadPoolConfig.mockResolvedValue(config);

      await poolManager.createPool('test_pool');

      expect(mockConfigLoader.loadPoolConfig).toHaveBeenCalledWith('test_pool');
      expect(poolManager.getPool('test_pool')).toBeDefined();
    });

    test('应该处理配置加载失败', async () => {
      mockConfigLoader.loadPoolConfig.mockRejectedValue(new Error('配置不存在'));

      await expect(poolManager.createPool('nonexistent_pool'))
        .rejects.toThrow('配置不存在');
    });

    test('应该处理重复创建', async () => {
      const config = {
        name: 'test_pool',
        taskGroups: ['fast_group'],
        instances: []
      };

      mockConfigLoader.loadPoolConfig.mockResolvedValue(config);

      // 第一次创建
      await poolManager.createPool('test_pool');

      // 第二次创建应该抛出错误
      await expect(poolManager.createPool('test_pool'))
        .rejects.toThrow('轮询池已存在: test_pool');
    });
  });

  describe('removePool 方法', () => {
    test('应该移除存在的轮询池', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      (poolManager as any).pools.set('test_pool', mockPool);

      poolManager.removePool('test_pool');

      expect(poolManager.getPool('test_pool')).toBeNull();
    });

    test('应该处理移除不存在的轮询池', () => {
      expect(() => poolManager.removePool('nonexistent_pool'))
        .toThrow('轮询池不存在: nonexistent_pool');
    });
  });

  describe('selectInstance 方法', () => {
    test('应该从轮询池中选择实例', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      const mockInstance = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      mockPool.addInstance(mockInstance);

      jest.spyOn(mockPool, 'selectInstance').mockReturnValue(mockInstance);

      (poolManager as any).pools.set('test_pool', mockPool);

      const instance = poolManager.selectInstance('test_pool');

      expect(instance).toBe(mockInstance);
      expect(mockPool.selectInstance).toHaveBeenCalled();
    });

    test('应该处理轮询池不存在的情况', () => {
      expect(() => poolManager.selectInstance('nonexistent_pool'))
        .toThrow('轮询池不存在: nonexistent_pool');
    });

    test('应该处理没有健康实例的情况', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      jest.spyOn(mockPool, 'selectInstance').mockReturnValue(null);

      (poolManager as any).pools.set('test_pool', mockPool);

      const instance = poolManager.selectInstance('test_pool');

      expect(instance).toBeNull();
    });
  });

  describe('markInstanceHealthy 方法', () => {
    test('应该标记实例为健康', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      jest.spyOn(mockPool, 'markInstanceHealthy');

      (poolManager as any).pools.set('test_pool', mockPool);

      poolManager.markInstanceHealthy('test_pool', 'instance1');

      expect(mockPool.markInstanceHealthy).toHaveBeenCalledWith('instance1');
    });

    test('应该处理轮询池不存在的情况', () => {
      expect(() => poolManager.markInstanceHealthy('nonexistent_pool', 'instance1'))
        .toThrow('轮询池不存在: nonexistent_pool');
    });
  });

  describe('markInstanceUnhealthy 方法', () => {
    test('应该标记实例为不健康', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      jest.spyOn(mockPool, 'markInstanceUnhealthy');

      (poolManager as any).pools.set('test_pool', mockPool);

      poolManager.markInstanceUnhealthy('test_pool', 'instance1', '连接超时');

      expect(mockPool.markInstanceUnhealthy).toHaveBeenCalledWith('instance1', '连接超时');
    });

    test('应该处理轮询池不存在的情况', () => {
      expect(() => poolManager.markInstanceUnhealthy('nonexistent_pool', 'instance1', '错误'))
        .toThrow('轮询池不存在: nonexistent_pool');
    });
  });

  describe('getPoolStatus 方法', () => {
    test('应该获取轮询池状态', () => {
      const mockPool = new PollingPool('test_pool', '测试轮询池');
      const mockInstance1 = new PoolInstance('instance1', 'openai', 'gpt-4o', 1);
      const mockInstance2 = new PoolInstance('instance2', 'openai', 'gpt-4o-mini', 2);
      
      mockPool.addInstance(mockInstance1);
      mockPool.addInstance(mockInstance2);
      mockPool.markInstanceHealthy('instance1');
      mockPool.markInstanceUnhealthy('instance2', '连接失败');

      (poolManager as any).pools.set('test_pool', mockPool);

      const status = poolManager.getPoolStatus('test_pool');

      expect(status.name).toBe('test_pool');
      expect(status.displayName).toBe('测试轮询池');
      expect(status.totalInstances).toBe(2);
      expect(status.healthyInstances).toBe(1);
      expect(status.unhealthyInstances).toBe(1);
      expect(status.isActive).toBe(true);
    });

    test('应该处理轮询池不存在的情况', () => {
      const status = poolManager.getPoolStatus('nonexistent_pool');

      expect(status).toBeNull();
    });
  });

  describe('getAllPools 方法', () => {
    test('应该获取所有轮询池', () => {
      const mockPool1 = new PollingPool('pool1', '轮询池1');
      const mockPool2 = new PollingPool('pool2', '轮询池2');

      (poolManager as any).pools.set('pool1', mockPool1);
      (poolManager as any).pools.set('pool2', mockPool2);

      const pools = poolManager.getAllPools();

      expect(pools).toHaveLength(2);
      expect(pools[0].name).toBe('pool1');
      expect(pools[1].name).toBe('pool2');
    });

    test('应该处理没有轮询池的情况', () => {
      const pools = poolManager.getAllPools();

      expect(pools).toHaveLength(0);
    });
  });

  describe('initializeFromConfig 方法', () => {
    test('应该从配置初始化所有轮询池', async () => {
      const configs = {
        fast_pool: {
          name: 'fast_pool',
          taskGroups: ['fast_group'],
          instances: []
        },
        economy_pool: {
          name: 'economy_pool',
          taskGroups: ['economy_group'],
          instances: []
        }
      };

      mockConfigLoader.loadAllPoolConfigs.mockResolvedValue(configs);

      await poolManager.initializeFromConfig();

      expect(mockConfigLoader.loadAllPoolConfigs).toHaveBeenCalled();
      expect(poolManager.getAllPools()).toHaveLength(2);
    });

    test('应该处理配置加载失败', async () => {
      mockConfigLoader.loadAllPoolConfigs.mockRejectedValue(new Error('配置加载失败'));

      await expect(poolManager.initializeFromConfig())
        .rejects.toThrow('配置加载失败');
    });
  });
});