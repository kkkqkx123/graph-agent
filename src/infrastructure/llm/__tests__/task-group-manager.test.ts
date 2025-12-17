import { TaskGroupManager } from '../managers/task-group-manager';
import { TaskGroupConfigLoader } from '../config/task-group-config-loader';
import { TaskGroup } from '../../../domain/llm/entities/task-group';
import { Echelon } from '../../../domain/llm/value-objects/echelon';

describe('任务组管理器测试', () => {
  let taskGroupManager: TaskGroupManager;
  let mockConfigLoader: jest.Mocked<TaskGroupConfigLoader>;

  beforeEach(() => {
    mockConfigLoader = {
      loadTaskGroupConfig: jest.fn(),
      loadAllTaskGroupConfigs: jest.fn(),
      getTaskGroupConfigStatus: jest.fn(),
      validateConfigSyntax: jest.fn(),
      reloadConfig: jest.fn(),
      getConfigChangeHistory: jest.fn(),
      getEchelonConfig: jest.fn(),
      getEchelonsByPriority: jest.fn(),
      getTaskGroupStatistics: jest.fn()
    } as any;

    taskGroupManager = new TaskGroupManager(mockConfigLoader);
  });

  describe('getTaskGroup 方法', () => {
    test('应该获取存在的任务组', () => {
      const mockTaskGroup = new TaskGroup('fast_group', '快速任务组');
      (taskGroupManager as any).taskGroups.set('fast_group', mockTaskGroup);

      const taskGroup = taskGroupManager.getTaskGroup('fast_group');

      expect(taskGroup).toBe(mockTaskGroup);
    });

    test('应该返回null当任务组不存在', () => {
      const taskGroup = taskGroupManager.getTaskGroup('nonexistent_group');

      expect(taskGroup).toBeNull();
    });
  });

  describe('createTaskGroup 方法', () => {
    test('应该从配置创建任务组', async () => {
      const config = {
        name: 'test_group',
        echelon1: { priority: 1, models: ['openai:gpt-4o'] },
        echelon2: { priority: 2, models: ['openai:gpt-4o-mini'] }
      };

      mockConfigLoader.loadTaskGroupConfig.mockResolvedValue(config);

      await taskGroupManager.createTaskGroup('test_group');

      expect(mockConfigLoader.loadTaskGroupConfig).toHaveBeenCalledWith('test_group');
      expect(taskGroupManager.getTaskGroup('test_group')).toBeDefined();
    });

    test('应该处理配置加载失败', async () => {
      mockConfigLoader.loadTaskGroupConfig.mockRejectedValue(new Error('配置不存在'));

      await expect(taskGroupManager.createTaskGroup('nonexistent_group'))
        .rejects.toThrow('配置不存在');
    });

    test('应该处理重复创建', async () => {
      const config = {
        name: 'test_group',
        echelon1: { priority: 1, models: ['openai:gpt-4o'] }
      };

      mockConfigLoader.loadTaskGroupConfig.mockResolvedValue(config);

      // 第一次创建
      await taskGroupManager.createTaskGroup('test_group');

      // 第二次创建应该抛出错误
      await expect(taskGroupManager.createTaskGroup('test_group'))
        .rejects.toThrow('任务组已存在: test_group');
    });
  });

  describe('removeTaskGroup 方法', () => {
    test('应该移除存在的任务组', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      taskGroupManager.removeTaskGroup('test_group');

      expect(taskGroupManager.getTaskGroup('test_group')).toBeNull();
    });

    test('应该处理移除不存在的任务组', () => {
      expect(() => taskGroupManager.removeTaskGroup('nonexistent_group'))
        .toThrow('任务组不存在: nonexistent_group');
    });
  });

  describe('selectModel 方法', () => {
    test('应该从任务组中选择模型', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      const mockEchelon = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      mockTaskGroup.addEchelon(mockEchelon);

      jest.spyOn(mockTaskGroup, 'selectModel').mockReturnValue('openai:gpt-4o');

      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      const model = taskGroupManager.selectModel('test_group');

      expect(model).toBe('openai:gpt-4o');
      expect(mockTaskGroup.selectModel).toHaveBeenCalled();
    });

    test('应该处理任务组不存在的情况', () => {
      expect(() => taskGroupManager.selectModel('nonexistent_group'))
        .toThrow('任务组不存在: nonexistent_group');
    });

    test('应该处理没有可用模型的情况', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      jest.spyOn(mockTaskGroup, 'selectModel').mockReturnValue(null);

      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      const model = taskGroupManager.selectModel('test_group');

      expect(model).toBeNull();
    });
  });

  describe('markEchelonFailed 方法', () => {
    test('应该标记层级失败', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      jest.spyOn(mockTaskGroup, 'markEchelonFailed');

      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      taskGroupManager.markEchelonFailed('test_group', 'echelon1');

      expect(mockTaskGroup.markEchelonFailed).toHaveBeenCalledWith('echelon1');
    });

    test('应该处理任务组不存在的情况', () => {
      expect(() => taskGroupManager.markEchelonFailed('nonexistent_group', 'echelon1'))
        .toThrow('任务组不存在: nonexistent_group');
    });
  });

  describe('markEchelonSuccess 方法', () => {
    test('应该标记层级成功', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      jest.spyOn(mockTaskGroup, 'markEchelonSuccess');

      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      taskGroupManager.markEchelonSuccess('test_group', 'echelon1');

      expect(mockTaskGroup.markEchelonSuccess).toHaveBeenCalledWith('echelon1');
    });

    test('应该处理任务组不存在的情况', () => {
      expect(() => taskGroupManager.markEchelonSuccess('nonexistent_group', 'echelon1'))
        .toThrow('任务组不存在: nonexistent_group');
    });
  });

  describe('getTaskGroupStatus 方法', () => {
    test('应该获取任务组状态', () => {
      const mockTaskGroup = new TaskGroup('test_group', '测试任务组');
      const mockEchelon1 = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      const mockEchelon2 = new Echelon('echelon2', 2, ['openai:gpt-4o-mini']);
      
      mockTaskGroup.addEchelon(mockEchelon1);
      mockTaskGroup.addEchelon(mockEchelon2);

      (taskGroupManager as any).taskGroups.set('test_group', mockTaskGroup);

      const status = taskGroupManager.getTaskGroupStatus('test_group');

      expect(status.name).toBe('test_group');
      expect(status.displayName).toBe('测试任务组');
      expect(status.totalEchelons).toBe(2);
      expect(status.totalModels).toBe(2);
      expect(status.isActive).toBe(true);
    });

    test('应该处理任务组不存在的情况', () => {
      const status = taskGroupManager.getTaskGroupStatus('nonexistent_group');

      expect(status).toBeNull();
    });
  });

  describe('getAllTaskGroups 方法', () => {
    test('应该获取所有任务组', () => {
      const mockTaskGroup1 = new TaskGroup('group1', '任务组1');
      const mockTaskGroup2 = new TaskGroup('group2', '任务组2');

      (taskGroupManager as any).taskGroups.set('group1', mockTaskGroup1);
      (taskGroupManager as any).taskGroups.set('group2', mockTaskGroup2);

      const taskGroups = taskGroupManager.getAllTaskGroups();

      expect(taskGroups).toHaveLength(2);
      expect(taskGroups[0].name).toBe('group1');
      expect(taskGroups[1].name).toBe('group2');
    });

    test('应该处理没有任务组的情况', () => {
      const taskGroups = taskGroupManager.getAllTaskGroups();

      expect(taskGroups).toHaveLength(0);
    });
  });

  describe('initializeFromConfig 方法', () => {
    test('应该从配置初始化所有任务组', async () => {
      const configs = {
        fast_group: {
          name: 'fast_group',
          echelon1: { priority: 1, models: ['openai:gpt-4o'] }
        },
        economy_group: {
          name: 'economy_group',
          echelon1: { priority: 1, models: ['openai:gpt-4o-mini'] }
        }
      };

      mockConfigLoader.loadAllTaskGroupConfigs.mockResolvedValue(configs);

      await taskGroupManager.initializeFromConfig();

      expect(mockConfigLoader.loadAllTaskGroupConfigs).toHaveBeenCalled();
      expect(taskGroupManager.getAllTaskGroups()).toHaveLength(2);
    });

    test('应该处理配置加载失败', async () => {
      mockConfigLoader.loadAllTaskGroupConfigs.mockRejectedValue(new Error('配置加载失败'));

      await expect(taskGroupManager.initializeFromConfig())
        .rejects.toThrow('配置加载失败');
    });
  });

  describe('getEchelonConfig 方法', () => {
    test('应该获取层级配置', async () => {
      const mockConfig = { priority: 1, models: ['openai:gpt-4o'] };
      mockConfigLoader.getEchelonConfig.mockResolvedValue(mockConfig);

      const config = await taskGroupManager.getEchelonConfig('test_group', 'echelon1');

      expect(config).toBe(mockConfig);
      expect(mockConfigLoader.getEchelonConfig).toHaveBeenCalledWith('test_group', 'echelon1');
    });

    test('应该处理配置不存在的情况', async () => {
      mockConfigLoader.getEchelonConfig.mockResolvedValue(null);

      const config = await taskGroupManager.getEchelonConfig('nonexistent_group', 'echelon1');

      expect(config).toBeNull();
    });
  });

  describe('getEchelonsByPriority 方法', () => {
    test('应该获取按优先级排序的层级列表', async () => {
      const mockEchelons: Array<[string, number, string[]]> = [
        ['echelon1', 1, ['openai:gpt-4o']],
        ['echelon2', 2, ['openai:gpt-4o-mini']]
      ];

      mockConfigLoader.getEchelonsByPriority.mockResolvedValue(mockEchelons);

      const echelons = await taskGroupManager.getEchelonsByPriority('test_group');

      expect(echelons).toBe(mockEchelons);
      expect(mockConfigLoader.getEchelonsByPriority).toHaveBeenCalledWith('test_group');
    });

    test('应该处理任务组不存在的情况', async () => {
      mockConfigLoader.getEchelonsByPriority.mockResolvedValue([]);

      const echelons = await taskGroupManager.getEchelonsByPriority('nonexistent_group');

      expect(echelons).toHaveLength(0);
    });
  });

  describe('getTaskGroupStatistics 方法', () => {
    test('应该获取任务组统计信息', async () => {
      const mockStatistics = {
        name: 'test_group',
        totalEchelons: 2,
        totalModels: 3,
        echelons: [
          { name: 'echelon1', priority: 1, modelCount: 1, available: true },
          { name: 'echelon2', priority: 2, modelCount: 2, available: true }
        ]
      };

      mockConfigLoader.getTaskGroupStatistics.mockResolvedValue(mockStatistics);

      const statistics = await taskGroupManager.getTaskGroupStatistics('test_group');

      expect(statistics).toBe(mockStatistics);
      expect(mockConfigLoader.getTaskGroupStatistics).toHaveBeenCalledWith('test_group');
    });

    test('应该处理任务组不存在的情况', async () => {
      mockConfigLoader.getTaskGroupStatistics.mockResolvedValue({
        name: 'nonexistent_group',
        totalEchelons: 0,
        totalModels: 0,
        echelons: []
      });

      const statistics = await taskGroupManager.getTaskGroupStatistics('nonexistent_group');

      expect(statistics.totalEchelons).toBe(0);
    });
  });
});