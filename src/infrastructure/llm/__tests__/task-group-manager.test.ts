import { TaskGroupManager } from '../managers/task-group-manager';
import { ConfigManager } from '../../config/config-manager';

describe('任务组管理器测试', () => {
  let taskGroupManager: TaskGroupManager;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      reload: jest.fn(),
      getConfigPath: jest.fn(),
      validate: jest.fn(),
      isLoaded: jest.fn(),
      getSourceInfo: jest.fn(),
      watch: jest.fn(),
      getModule: jest.fn(),
      mergeConfig: jest.fn(),
      getConfigStatus: jest.fn(),
      getLoadHistory: jest.fn(),
      sources: [],
      processors: [],
      validators: [],
      config: {},
      eventEmitter: undefined as any
    } as any;

    taskGroupManager = new TaskGroupManager(mockConfigManager);
  });

  describe('getModelsForGroup 方法', () => {
    test('应该获取任务组的所有模型', async () => {
      const mockConfig = {
        taskGroups: {
          'fast_group': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const models = await taskGroupManager.getModelsForGroup('fast_group');

      expect(models).toEqual(['openai:gpt-4o']);
      expect(mockConfigManager.get).toHaveBeenCalledWith('llm');
    });

    test('应该获取特定层级的模型', async () => {
      const mockConfig = {
        taskGroups: {
          'fast_group': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] },
              'echelon2': { priority: 2, models: ['openai:gpt-4o-mini'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const models = await taskGroupManager.getModelsForGroup('fast_group.echelon1');

      expect(models).toEqual(['openai:gpt-4o']);
    });

    test('应该返回空数组当任务组不存在', async () => {
      mockConfigManager.get.mockReturnValue({});

      const models = await taskGroupManager.getModelsForGroup('nonexistent_group');

      expect(models).toEqual([]);
    });
  });

  describe('parseGroupReference 方法', () => {
    test('应该正确解析组引用', () => {
      const [groupName, echelon] = taskGroupManager.parseGroupReference('fast_group.echelon1');

      expect(groupName).toBe('fast_group');
      expect(echelon).toBe('echelon1');
    });

    test('应该处理没有层级的组引用', () => {
      const [groupName, echelon] = taskGroupManager.parseGroupReference('fast_group');

      expect(groupName).toBe('fast_group');
      expect(echelon).toBeNull();
    });
  });

  describe('getFallbackGroups 方法', () => {
    test('应该返回降级组', async () => {
      const mockConfig = {
        taskGroups: {
          'fast_group': {
            fallbackStrategy: 'echelon_down',
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] },
              'echelon2': { priority: 2, models: ['openai:gpt-4o-mini'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const fallbackGroups = await taskGroupManager.getFallbackGroups('fast_group.echelon1');

      expect(fallbackGroups).toContain('fast_group.echelon2');
    });

    test('应该返回空数组当任务组不存在', async () => {
      mockConfigManager.get.mockReturnValue({});

      const fallbackGroups = await taskGroupManager.getFallbackGroups('nonexistent_group.echelon1');

      expect(fallbackGroups).toEqual([]);
    });
  });

  describe('getEchelonConfig 方法', () => {
    test('应该获取层级配置', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const config = await taskGroupManager.getEchelonConfig('test_group', 'echelon1');

      expect(config).toEqual({ priority: 1, models: ['openai:gpt-4o'] });
    });

    test('应该返回null当层级不存在', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {}
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const config = await taskGroupManager.getEchelonConfig('test_group', 'nonexistent');

      expect(config).toBeNull();
    });
  });

  describe('getGroupModelsByPriority 方法', () => {
    test('应该按优先级返回模型列表', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {
              'echelon2': { priority: 2, models: ['openai:gpt-4o-mini'] },
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const models = await taskGroupManager.getGroupModelsByPriority('test_group');

      expect(models).toHaveLength(2);
      expect(models[0][0]).toBe('echelon1');
      expect(models[1][0]).toBe('echelon2');
    });

    test('应该返回空数组当任务组不存在', async () => {
      mockConfigManager.get.mockReturnValue({});

      const models = await taskGroupManager.getGroupModelsByPriority('nonexistent_group');

      expect(models).toEqual([]);
    });
  });

  describe('listTaskGroups 方法', () => {
    test('应该列出所有任务组名称', async () => {
      const mockConfig = {
        taskGroups: {
          'group1': {},
          'group2': {},
          'group3': {}
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const groups = await taskGroupManager.listTaskGroups();

      expect(groups).toHaveLength(3);
      expect(groups).toContain('group1');
      expect(groups).toContain('group2');
      expect(groups).toContain('group3');
    });

    test('应该返回空数组当没有任务组', async () => {
      mockConfigManager.get.mockReturnValue({});

      const groups = await taskGroupManager.listTaskGroups();

      expect(groups).toEqual([]);
    });
  });

  describe('validateGroupReference 方法', () => {
    test('应该验证有效的组引用', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const isValid = await taskGroupManager.validateGroupReference('test_group.echelon1');

      expect(isValid).toBe(true);
    });

    test('应该拒绝无效的组引用', async () => {
      mockConfigManager.get.mockReturnValue({});

      const isValid = await taskGroupManager.validateGroupReference('nonexistent_group.echelon1');

      expect(isValid).toBe(false);
    });

    test('应该验证只有组名的引用', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {}
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const isValid = await taskGroupManager.validateGroupReference('test_group');

      expect(isValid).toBe(true);
    });
  });

  describe('getFallbackConfig 方法', () => {
    test('应该获取任务组的降级配置', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            fallbackConfig: {
              strategy: 'echelon_down',
              maxAttempts: 3,
              retryDelay: 1.0
            },
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] },
              'echelon2': { priority: 2, models: ['openai:gpt-4o-mini'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const fallbackConfig = await taskGroupManager.getFallbackConfig('test_group');

      expect(fallbackConfig.strategy).toBe('echelon_down');
      expect(fallbackConfig.maxAttempts).toBe(3);
      expect(fallbackConfig.retryDelay).toBe(1.0);
    });

    test('应该返回默认降级配置', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            fallbackStrategy: 'echelon_down',
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const fallbackConfig = await taskGroupManager.getFallbackConfig('test_group');

      expect(fallbackConfig).toBeDefined();
      expect(fallbackConfig.maxAttempts).toBe(3);
      expect(fallbackConfig.retryDelay).toBe(1.0);
    });
  });

  describe('getTaskGroupStatus 方法', () => {
    test('应该获取任务组状态', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] },
              'echelon2': { priority: 2, models: ['openai:gpt-4o-mini'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const status = await taskGroupManager.getTaskGroupStatus('test_group');

      expect(status.name).toBe('test_group');
      expect(status.totalEchelons).toBe(2);
      expect(status.totalModels).toBe(2);
      expect(status.available).toBe(true);
    });

    test('应该返回未激活的状态当没有层级', async () => {
      const mockConfig = {
        taskGroups: {
          'test_group': {
            echelons: {}
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const status = await taskGroupManager.getTaskGroupStatus('test_group');

      expect(status.totalEchelons).toBe(0);
      expect(status.available).toBe(false);
    });
  });

  describe('getAllTaskGroupsStatus 方法', () => {
    test('应该获取所有任务组的状态', async () => {
      const mockConfig = {
        taskGroups: {
          'group1': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o'] }
            }
          },
          'group2': {
            echelons: {
              'echelon1': { priority: 1, models: ['openai:gpt-4o-mini'] }
            }
          }
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const status = await taskGroupManager.getAllTaskGroupsStatus();

      expect(status['group1']).toBeDefined();
      expect(status['group2']).toBeDefined();
      expect(status['group1'].totalEchelons).toBe(1);
      expect(status['group2'].totalEchelons).toBe(1);
    });
  });

  describe('reloadConfig 方法', () => {
    test('应该调用ConfigManager的reload方法', async () => {
      await taskGroupManager.reloadConfig();

      expect(mockConfigManager.reload).toHaveBeenCalled();
    });
  });

  describe('getConfigStatus 方法', () => {
    test('应该获取配置状态', async () => {
      const mockConfig = {
        taskGroups: {
          'group1': {},
          'group2': {}
        },
        pollingPools: {
          'pool1': {}
        },
        globalFallback: {
          strategy: 'default'
        }
      };

      mockConfigManager.get.mockReturnValue(mockConfig);

      const status = await taskGroupManager.getConfigStatus();

      expect(status.loaded).toBe(true);
      expect(status.taskGroupsCount).toBe(2);
      expect(status.pollingPoolsCount).toBe(1);
      expect(status.hasGlobalFallback).toBe(true);
    });
  });
});
