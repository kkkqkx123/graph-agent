import { TaskGroupConfigLoader } from '../task-group-config-loader';
import { ConfigManager } from '../../../../common/config/config-manager.interface';

describe('任务组配置加载器测试', () => {
  let taskGroupConfigLoader: TaskGroupConfigLoader;
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

    taskGroupConfigLoader = new TaskGroupConfigLoader(mockConfigManager);
  });

  describe('loadTaskGroupConfig 方法', () => {
    test('应该成功加载任务组配置', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet'] },
            echelon2: { priority: 2, models: ['openai:gpt-4o-mini'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await taskGroupConfigLoader.loadTaskGroupConfig('fast_group');

      expect(config.name).toBe('fast_group');
      expect(config.echelon1.priority).toBe(1);
      expect(config.echelon1.models).toEqual(['openai:gpt-4o', 'anthropic:claude-3-5-sonnet']);
      expect(config.echelon2.priority).toBe(2);
    });

    test('应该处理任务组配置不存在的情况', async () => {
      const mockConfig = {
        taskGroups: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(taskGroupConfigLoader.loadTaskGroupConfig('nonexistent_group'))
        .rejects.toThrow('任务组配置不存在: nonexistent_group');
    });

    test('应该验证配置必需字段', async () => {
      const mockConfig = {
        taskGroups: {
          invalid_group: {
            // 缺少name字段
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(taskGroupConfigLoader.loadTaskGroupConfig('invalid_group'))
        .rejects.toThrow('任务组配置缺少必需字段: name');
    });

    test('应该验证层级配置', async () => {
      const mockConfig = {
        taskGroups: {
          invalid_group: {
            name: 'invalid_group'
            // 缺少层级配置
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(taskGroupConfigLoader.loadTaskGroupConfig('invalid_group'))
        .rejects.toThrow('任务组 invalid_group 必须配置至少一个层级');
    });

    test('应该验证层级配置字段', async () => {
      const mockConfig = {
        taskGroups: {
          invalid_group: {
            name: 'invalid_group',
            echelon1: {
              // 缺少priority字段
              models: ['openai:gpt-4o']
            }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(taskGroupConfigLoader.loadTaskGroupConfig('invalid_group'))
        .rejects.toThrow('层级配置 invalid_group.echelon1 缺少必需字段: priority');
    });

    test('应该验证模型列表', async () => {
      const mockConfig = {
        taskGroups: {
          invalid_group: {
            name: 'invalid_group',
            echelon1: {
              priority: 1,
              models: [] // 空模型列表
            }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      await expect(taskGroupConfigLoader.loadTaskGroupConfig('invalid_group'))
        .rejects.toThrow('层级 invalid_group.echelon1 必须配置至少一个模型');
    });

    test('应该合并默认配置', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await taskGroupConfigLoader.loadTaskGroupConfig('fast_group');

      // 应该包含默认配置
      expect(config.fallbackStrategy).toBe('echelon_down');
      expect(config.maxAttempts).toBe(3);
      expect(config.retryDelay).toBe(1.0);
      expect(config.circuitBreaker.failureThreshold).toBe(5);
      expect(config.circuitBreaker.recoveryTime).toBe(60);
    });
  });

  describe('loadAllTaskGroupConfigs 方法', () => {
    test('应该加载所有任务组配置', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          },
          economy_group: {
            name: 'economy_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o-mini'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await taskGroupConfigLoader.loadAllTaskGroupConfigs();

      expect(Object.keys(configs)).toHaveLength(2);
      expect(configs.fast_group.name).toBe('fast_group');
      expect(configs.economy_group.name).toBe('economy_group');
    });

    test('应该跳过无效配置', async () => {
      const mockConfig = {
        taskGroups: {
          valid_group: {
            name: 'valid_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          },
          invalid_group: {
            // 无效配置
            name: 'invalid_group'
            // 缺少层级配置
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await taskGroupConfigLoader.loadAllTaskGroupConfigs();

      // 应该只包含有效配置
      expect(Object.keys(configs)).toHaveLength(1);
      expect(configs.valid_group.name).toBe('valid_group');
    });

    test('应该处理没有任务组配置的情况', async () => {
      const mockConfig = {
        taskGroups: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const configs = await taskGroupConfigLoader.loadAllTaskGroupConfigs();

      expect(Object.keys(configs)).toHaveLength(0);
    });
  });

  describe('getTaskGroupConfigStatus 方法', () => {
    test('应该获取任务组配置状态', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] },
            echelon2: { priority: 2, models: ['openai:gpt-4o-mini'] }
          },
          invalid_group: {
            // 无效配置
            name: 'invalid_group'
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const status = await taskGroupConfigLoader.getTaskGroupConfigStatus();

      expect(status.totalGroups).toBe(2);
      expect(status.validGroups).toBe(1);
      expect(status.invalidGroups).toBe(1);
      expect(status.groups.fast_group.valid).toBe(true);
      expect(status.groups.invalid_group.valid).toBe(false);
    });

    test('应该处理没有任务组配置的情况', async () => {
      const mockConfig = {
        taskGroups: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const status = await taskGroupConfigLoader.getTaskGroupConfigStatus();

      expect(status.totalGroups).toBe(0);
      expect(status.validGroups).toBe(0);
      expect(status.invalidGroups).toBe(0);
    });
  });

  describe('validateConfigSyntax 方法', () => {
    test('应该验证配置语法', async () => {
      const config = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          }
        }
      };

      const result = await taskGroupConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该检测配置语法错误', async () => {
      const config = {
        taskGroups: {
          invalid_group: {
            name: 'invalid_group'
            // 缺少层级配置
          }
        }
      };

      const result = await taskGroupConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该警告缺少taskGroups字段', async () => {
      const config = {
        // 缺少taskGroups字段
      };

      const result = await taskGroupConfigLoader.validateConfigSyntax(config);

      expect(result.valid).toBe(true); // 没有错误，只有警告
      expect(result.warnings).toContain('配置缺少 taskGroups 字段');
    });
  });

  describe('getEchelonConfig 方法', () => {
    test('应该获取层级配置', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await taskGroupConfigLoader.getEchelonConfig('fast_group', 'echelon1');

      expect(config).toEqual({ priority: 1, models: ['openai:gpt-4o'] });
    });

    test('应该处理层级配置不存在的情况', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const config = await taskGroupConfigLoader.getEchelonConfig('fast_group', 'nonexistent_echelon');

      expect(config).toBeNull();
    });
  });

  describe('getEchelonsByPriority 方法', () => {
    test('应该获取按优先级排序的层级列表', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] },
            echelon2: { priority: 2, models: ['openai:gpt-4o-mini'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const echelons = await taskGroupConfigLoader.getEchelonsByPriority('fast_group');

      expect(echelons).toHaveLength(2);
      expect(echelons[0][0]).toBe('echelon1'); // 优先级1
      expect(echelons[0][1]).toBe(1);
      expect(echelons[1][0]).toBe('echelon2'); // 优先级2
      expect(echelons[1][1]).toBe(2);
    });

    test('应该处理任务组不存在的情况', async () => {
      const mockConfig = {
        taskGroups: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const echelons = await taskGroupConfigLoader.getEchelonsByPriority('nonexistent_group');

      expect(echelons).toHaveLength(0);
    });
  });

  describe('getTaskGroupStatistics 方法', () => {
    test('应该获取任务组统计信息', async () => {
      const mockConfig = {
        taskGroups: {
          fast_group: {
            name: 'fast_group',
            echelon1: { priority: 1, models: ['openai:gpt-4o'] },
            echelon2: { priority: 2, models: ['openai:gpt-4o-mini', 'anthropic:claude-3-5-sonnet'] }
          }
        }
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const statistics = await taskGroupConfigLoader.getTaskGroupStatistics('fast_group');

      expect(statistics.name).toBe('fast_group');
      expect(statistics.totalEchelons).toBe(2);
      expect(statistics.totalModels).toBe(3);
      expect(statistics.echelons).toHaveLength(2);
    });

    test('应该处理任务组不存在的情况', async () => {
      const mockConfig = {
        taskGroups: {}
      };

      mockConfigManager.getConfigStructure.mockReturnValue(mockConfig as any);

      const statistics = await taskGroupConfigLoader.getTaskGroupStatistics('nonexistent_group');

      expect(statistics.name).toBe('nonexistent_group');
      expect(statistics.totalEchelons).toBe(0);
      expect(statistics.totalModels).toBe(0);
    });
  });

  describe('reloadConfig 方法', () => {
    test('应该重新加载配置', async () => {
      await taskGroupConfigLoader.reloadConfig();

      expect(mockConfigManager.reload).toHaveBeenCalled();
    });
  });
});