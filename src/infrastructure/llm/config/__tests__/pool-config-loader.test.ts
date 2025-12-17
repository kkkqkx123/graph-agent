import { PoolConfigLoader } from '../pool-config-loader';
import { ConfigManager } from '../../../../common/config/config-manager.interface';

describe('轮询池配置加载器测试', () => {
  let poolConfigLoader: PoolConfigLoader;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    mockConfigManager = {
      get: jest.fn(),
      getNested: jest.fn(),
      getModelConfig: jest.fn(),
      set: jest.fn(),
      setNested: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      reload: jest.fn(),
      keys: jest.fn(),
      snapshot: jest.fn(),
      watch: jest.fn(),
      validate: jest.fn(),
      getConfigStructure: jest.fn()
    } as any;

    poolConfigLoader = new PoolConfigLoader(mockConfigManager);
  });

  describe('loadPoolConfig 方法', () => {
    test('应该成功加载轮询池配置', async () => {
      const mockConfig = {
        pools: {
          fast_pool: {
            name: 'fast_pool',
            taskGroups: ['fast_group'],
            rotation: { strategy: 'round_robin' },
            healthCheck: { interval: 30, failureThreshold: 3 }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await poolConfigLoader.loadPoolConfig('fast_pool');

      expect(config.name).toBe('fast_pool');
      expect(config.taskGroups).toEqual(['fast_group']);
      expect(config.rotation.strategy).toBe('round_robin');
      expect(config.healthCheck.interval).toBe(30);
    });

    test('应该处理轮询池配置不存在的情况', async () => {
      const mockConfig = {
        pools: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(poolConfigLoader.loadPoolConfig('nonexistent_pool'))
        .rejects.toThrow('轮询池配置不存在: nonexistent_pool');
    });

    test('应该验证配置必需字段', async () => {
      const mockConfig = {
        pools: {
          invalid_pool: {
            // 缺少name字段
            taskGroups: []
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(poolConfigLoader.loadPoolConfig('invalid_pool'))
        .rejects.toThrow('轮询池配置缺少必需字段: name');
    });

    test('应该验证任务组配置', async () => {
      const mockConfig = {
        pools: {
          invalid_pool: {
            name: 'invalid_pool',
            taskGroups: [] // 空任务组数组
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(poolConfigLoader.loadPoolConfig('invalid_pool'))
        .rejects.toThrow('轮询池 invalid_pool 必须配置至少一个任务组');
    });

    test('应该验证轮询策略', async () => {
      const mockConfig = {
        pools: {
          invalid_pool: {
            name: 'invalid_pool',
            taskGroups: ['fast_group'],
            rotation: { strategy: 'invalid_strategy' } // 不支持的策略
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(poolConfigLoader.loadPoolConfig('invalid_pool'))
        .rejects.toThrow('不支持的轮询策略: invalid_strategy');
    });

    test('应该合并默认配置', async () => {
      const mockConfig = {
        pools: {
          fast_pool: {
            name: 'fast_pool',
            taskGroups: ['fast_group']
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await poolConfigLoader.loadPoolConfig('fast_pool');

      // 应该包含默认配置
      expect(config.rotation.strategy).toBe('round_robin');
      expect(config.healthCheck.enabled).toBe(true);
      expect(config.healthCheck.interval).toBe(30);
      expect(config.healthCheck.failureThreshold).toBe(3);
    });
  });

  describe('loadAllPoolConfigs 方法', () => {
    test('应该加载所有轮询池配置', async () => {
      const mockConfig = {
        pools: {
          fast_pool: {
            name: 'fast_pool',
            taskGroups: ['fast_group']
          },
          economy_pool: {
            name: 'economy_pool',
            taskGroups: ['economy_group']
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await poolConfigLoader.loadAllPoolConfigs();

      expect(Object.keys(configs)).toHaveLength(2);
      expect(configs.fast_pool.name).toBe('fast_pool');
      expect(configs.economy_pool.name).toBe('economy_pool');
    });

    test('应该跳过无效配置', async () => {
      const mockConfig = {
        pools: {
          valid_pool: {
            name: 'valid_pool',
            taskGroups: ['fast_group']
          },
          invalid_pool: {
            // 缺少必需字段
            taskGroups: []
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await poolConfigLoader.loadAllPoolConfigs();

      // 应该只包含有效配置
      expect(Object.keys(configs)).toHaveLength(1);
      expect(configs.valid_pool.name).toBe('valid_pool');
    });

    test('应该处理没有轮询池配置的情况', async () => {
      const mockConfig = {
        pools: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await poolConfigLoader.loadAllPoolConfigs();

      expect(Object.keys(configs)).toHaveLength(0);
    });
  });

  describe('getPoolConfigStatus 方法', () => {
    test('应该获取轮询池配置状态', async () => {
      const mockConfig = {
        pools: {
          fast_pool: {
            name: 'fast_pool',
            taskGroups: ['fast_group'],
            rotation: { strategy: 'round_robin' },
            healthCheck: { interval: 30 }
          },
          invalid_pool: {
            // 无效配置
            taskGroups: []
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const status = await poolConfigLoader.getPoolConfigStatus();

      expect(status.totalPools).toBe(2);
      expect(status.validPools).toBe(1);
      expect(status.invalidPools).toBe(1);
      expect(status.pools.fast_pool.valid).toBe(true);
      expect(status.pools.invalid_pool.valid).toBe(false);
    });

    test('应该处理没有轮询池配置的情况', async () => {
      const mockConfig = {
        pools: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const status = await poolConfigLoader.getPoolConfigStatus();

      expect(status.totalPools).toBe(0);
      expect(status.validPools).toBe(0);
      expect(status.invalidPools).toBe(0);
    });
  });

  describe('validateConfigSyntax 方法', () => {
    test('应该验证配置语法', async () => {
      const config = {
        pools: {
          fast_pool: {
            name: 'fast_pool',
            taskGroups: ['fast_group']
          }
        }
      };

      const result = await poolConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该检测配置语法错误', async () => {
      const config = {
        pools: {
          invalid_pool: {
            // 缺少必需字段
            taskGroups: []
          }
        }
      };

      const result = await poolConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该警告缺少pools字段', async () => {
      const config = {
        // 缺少pools字段
      };

      const result = await poolConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(true); // 没有错误，只有警告
      expect(result.warnings).toContain('配置缺少 pools 字段');
    });
  });

  describe('reloadConfig 方法', () => {
    test('应该重新加载配置', async () => {
      await poolConfigLoader.reloadConfig();

      expect(mockConfigManager.reload).toHaveBeenCalled();
    });
  });
});