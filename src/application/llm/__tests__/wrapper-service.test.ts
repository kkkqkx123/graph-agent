import { WrapperService } from '../services/wrapper-service';
import { PollingPoolManager } from '../../../infrastructure/llm/managers/pool-manager';
import { TaskGroupManager } from '../../../infrastructure/llm/managers/task-group-manager';
import { LLMWrapperFactory } from '../../../infrastructure/llm/wrappers/wrapper-factory';

describe('包装器服务测试', () => {
  let wrapperService: WrapperService;
  let mockPoolManager: jest.Mocked<PollingPoolManager>;
  let mockTaskGroupManager: jest.Mocked<TaskGroupManager>;
  let mockWrapperFactory: jest.Mocked<LLMWrapperFactory>;

  beforeEach(() => {
    mockPoolManager = {
      getPool: jest.fn(),
      createPool: jest.fn(),
      removePool: jest.fn(),
      selectInstance: jest.fn(),
      markInstanceHealthy: jest.fn(),
      markInstanceUnhealthy: jest.fn(),
      getPoolStatus: jest.fn(),
      getAllPools: jest.fn()
    } as any;

    mockTaskGroupManager = {
      getTaskGroup: jest.fn(),
      createTaskGroup: jest.fn(),
      removeTaskGroup: jest.fn(),
      selectModel: jest.fn(),
      markEchelonFailed: jest.fn(),
      markEchelonSuccess: jest.fn(),
      getTaskGroupStatus: jest.fn(),
      getAllTaskGroups: jest.fn()
    } as any;

    mockWrapperFactory = {
      createWrapper: jest.fn(),
      getWrapper: jest.fn(),
      removeWrapper: jest.fn(),
      getAllWrappers: jest.fn()
    } as any;

    wrapperService = new WrapperService(mockPoolManager, mockTaskGroupManager, mockWrapperFactory);
  });

  describe('generateResponse 方法', () => {
    test('应该通过轮询池包装器生成响应', async () => {
      const mockResponse = {
        content: '测试响应',
        tokenUsage: { promptTokens: 10, completionTokens: 5 }
      };

      const mockWrapper = {
        generateResponse: jest.fn().mockResolvedValue(mockResponse)
      };

      mockWrapperFactory.getWrapper.mockReturnValue(mockWrapper);

      const request = {
        messages: [{ role: 'user', content: '你好' }],
        model: 'gpt-4o'
      };

      const result = await wrapperService.generateResponse('fast_pool', request);

      expect(mockWrapper.generateResponse).toHaveBeenCalledWith(request);
      expect(result).toBe(mockResponse);
    });

    test('应该通过任务组包装器生成响应', async () => {
      const mockResponse = {
        content: '测试响应',
        tokenUsage: { promptTokens: 10, completionTokens: 5 }
      };

      const mockWrapper = {
        generateResponse: jest.fn().mockResolvedValue(mockResponse)
      };

      mockWrapperFactory.getWrapper.mockReturnValue(mockWrapper);

      const request = {
        messages: [{ role: 'user', content: '你好' }],
        model: 'gpt-4o'
      };

      const result = await wrapperService.generateResponse('fast_group', request);

      expect(mockWrapper.generateResponse).toHaveBeenCalledWith(request);
      expect(result).toBe(mockResponse);
    });

    test('应该通过直接LLM包装器生成响应', async () => {
      const mockResponse = {
        content: '测试响应',
        tokenUsage: { promptTokens: 10, completionTokens: 5 }
      };

      const mockWrapper = {
        generateResponse: jest.fn().mockResolvedValue(mockResponse)
      };

      mockWrapperFactory.getWrapper.mockReturnValue(mockWrapper);

      const request = {
        messages: [{ role: 'user', content: '你好' }],
        model: 'gpt-4o'
      };

      const result = await wrapperService.generateResponse('openai_client', request);

      expect(mockWrapper.generateResponse).toHaveBeenCalledWith(request);
      expect(result).toBe(mockResponse);
    });

    test('应该处理包装器不存在的情况', async () => {
      mockWrapperFactory.getWrapper.mockReturnValue(null);

      const request = {
        messages: [{ role: 'user', content: '你好' }],
        model: 'gpt-4o'
      };

      await expect(wrapperService.generateResponse('nonexistent_wrapper', request))
        .rejects.toThrow('包装器不存在: nonexistent_wrapper');
    });

    test('应该处理包装器生成响应失败的情况', async () => {
      const mockWrapper = {
        generateResponse: jest.fn().mockRejectedValue(new Error('API调用失败'))
      };

      mockWrapperFactory.getWrapper.mockReturnValue(mockWrapper);

      const request = {
        messages: [{ role: 'user', content: '你好' }],
        model: 'gpt-4o'
      };

      await expect(wrapperService.generateResponse('fast_pool', request))
        .rejects.toThrow('API调用失败');
    });
  });

  describe('getWrapperStatus 方法', () => {
    test('应该获取包装器状态', () => {
      const mockStatus = {
        name: 'fast_pool',
        type: 'polling_pool',
        isActive: true,
        instances: 3,
        healthyInstances: 2
      };

      const mockWrapper = {
        getStatus: jest.fn().mockReturnValue(mockStatus)
      };

      mockWrapperFactory.getWrapper.mockReturnValue(mockWrapper);

      const status = wrapperService.getWrapperStatus('fast_pool');

      expect(mockWrapper.getStatus).toHaveBeenCalled();
      expect(status).toBe(mockStatus);
    });

    test('应该处理包装器不存在的情况', () => {
      mockWrapperFactory.getWrapper.mockReturnValue(null);

      const status = wrapperService.getWrapperStatus('nonexistent_wrapper');

      expect(status).toBeNull();
    });
  });

  describe('getAllWrapperStatuses 方法', () => {
    test('应该获取所有包装器状态', () => {
      const mockWrapper1 = {
        getStatus: jest.fn().mockReturnValue({
          name: 'fast_pool',
          type: 'polling_pool',
          isActive: true
        })
      };

      const mockWrapper2 = {
        getStatus: jest.fn().mockReturnValue({
          name: 'fast_group',
          type: 'task_group',
          isActive: true
        })
      };

      mockWrapperFactory.getAllWrappers.mockReturnValue({
        fast_pool: mockWrapper1,
        fast_group: mockWrapper2
      });

      const statuses = wrapperService.getAllWrapperStatuses();

      expect(statuses).toHaveLength(2);
      expect(statuses[0].name).toBe('fast_pool');
      expect(statuses[1].name).toBe('fast_group');
    });

    test('应该处理没有包装器的情况', () => {
      mockWrapperFactory.getAllWrappers.mockReturnValue({});

      const statuses = wrapperService.getAllWrapperStatuses();

      expect(statuses).toHaveLength(0);
    });
  });

  describe('createWrapper 方法', () => {
    test('应该创建轮询池包装器', () => {
      const config = {
        type: 'polling_pool',
        name: 'test_pool',
        instances: [
          { name: 'instance1', provider: 'openai', model: 'gpt-4o', weight: 1 }
        ]
      };

      wrapperService.createWrapper(config);

      expect(mockWrapperFactory.createWrapper).toHaveBeenCalledWith(config);
    });

    test('应该创建任务组包装器', () => {
      const config = {
        type: 'task_group',
        name: 'test_group',
        echelons: [
          { name: 'echelon1', priority: 1, models: ['openai:gpt-4o'] }
        ]
      };

      wrapperService.createWrapper(config);

      expect(mockWrapperFactory.createWrapper).toHaveBeenCalledWith(config);
    });

    test('应该创建直接LLM包装器', () => {
      const config = {
        type: 'direct_llm',
        name: 'openai_client',
        provider: 'openai',
        model: 'gpt-4o'
      };

      wrapperService.createWrapper(config);

      expect(mockWrapperFactory.createWrapper).toHaveBeenCalledWith(config);
    });
  });

  describe('removeWrapper 方法', () => {
    test('应该移除包装器', () => {
      wrapperService.removeWrapper('fast_pool');

      expect(mockWrapperFactory.removeWrapper).toHaveBeenCalledWith('fast_pool');
    });
  });
});