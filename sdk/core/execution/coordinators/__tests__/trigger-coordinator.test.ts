/**
 * TriggerCoordinator 单元测试
 */

import { TriggerCoordinator } from '../trigger-coordinator';
import { ThreadRegistry } from '../../../services/thread-registry';
import { WorkflowRegistry } from '../../../services/workflow-registry';
import { TriggerStateManager } from '../../managers/trigger-state-manager';
import { EventType } from '@modular-agent/types/events';
import { ValidationError, ExecutionError } from '@modular-agent/types/errors';
import { TriggerActionType, TriggerStatus, TriggerType } from '@modular-agent/types/trigger';
import { now } from '../../../../utils';

// Mock 依赖
jest.mock('../../../services/thread-registry');
jest.mock('../../../services/workflow-registry');
jest.mock('../../managers/trigger-state-manager');
jest.mock('../../handlers/trigger-handlers');

describe('TriggerCoordinator', () => {
  let coordinator: TriggerCoordinator;
  let mockThreadRegistry: jest.Mocked<ThreadRegistry>;
  let mockWorkflowRegistry: jest.Mocked<WorkflowRegistry>;
  let mockStateManager: jest.Mocked<TriggerStateManager>;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock 实例
    mockThreadRegistry = {} as any;

    mockWorkflowRegistry = {
      getProcessed: jest.fn()
    } as any;

    mockStateManager = {
      hasState: jest.fn(),
      register: jest.fn(),
      deleteState: jest.fn(),
      getState: jest.fn(),
      getAllStates: jest.fn(),
      updateStatus: jest.fn(),
      incrementTriggerCount: jest.fn(),
      clear: jest.fn(),
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1')
    } as any;

    // 创建协调器实例
    coordinator = new TriggerCoordinator(
      mockThreadRegistry,
      mockWorkflowRegistry,
      mockStateManager
    );
  });

  describe('构造函数', () => {
    it('应该正确初始化协调器', () => {
      expect(coordinator).toBeInstanceOf(TriggerCoordinator);
    });
  });

  describe('register', () => {
    const mockWorkflowTrigger = {
      id: 'trigger-1',
      name: 'Test Trigger',
      condition: {
        eventType: EventType.NODE_COMPLETED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      },
      enabled: true
    };

    it('应该成功注册触发器', () => {
      // Mock 状态管理器
      mockStateManager.hasState.mockReturnValue(false);

      // 执行测试
      coordinator.register(mockWorkflowTrigger, 'workflow-1');

      // 验证状态注册
      expect(mockStateManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerId: 'trigger-1',
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          status: 'enabled',
          triggerCount: 0,
          updatedAt: expect.any(Number)
        })
      );
    });

    it('应该验证触发器 ID', () => {
      const invalidTrigger = {
        ...mockWorkflowTrigger,
        id: ''
      };

      // 执行测试并验证错误
      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow(ValidationError);

      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow('触发器 ID 不能为空');
    });

    it('应该验证触发器名称', () => {
      const invalidTrigger = {
        ...mockWorkflowTrigger,
        name: ''
      };

      // 执行测试并验证错误
      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow(ValidationError);

      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow('触发器名称不能为空');
    });

    it('应该验证触发条件', () => {
      const invalidTrigger = {
        ...mockWorkflowTrigger,
        condition: undefined as any
      };

      // 执行测试并验证错误
      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow(ValidationError);

      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow('触发条件不能为空');
    });

    it('应该验证触发动作', () => {
      const invalidTrigger = {
        ...mockWorkflowTrigger,
        action: undefined as any
      };

      // 执行测试并验证错误
      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow(ValidationError);

      expect(() => {
        coordinator.register(invalidTrigger, 'workflow-1');
      }).toThrow('触发动作不能为空');
    });

    it('应该防止重复注册', () => {
      // Mock 状态已存在
      mockStateManager.hasState.mockReturnValue(true);

      // 执行测试并验证错误
      expect(() => {
        coordinator.register(mockWorkflowTrigger, 'workflow-1');
      }).toThrow(ValidationError);

      expect(() => {
        coordinator.register(mockWorkflowTrigger, 'workflow-1');
      }).toThrow('触发器状态 trigger-1 已存在');
    });

    it('应该正确处理禁用的触发器', () => {
      const disabledTrigger = {
        ...mockWorkflowTrigger,
        enabled: false
      };

      mockStateManager.hasState.mockReturnValue(false);

      // 执行测试
      coordinator.register(disabledTrigger, 'workflow-1');

      // 验证状态为禁用
      expect(mockStateManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'disabled'
        })
      );
    });
  });

  describe('unregister', () => {
    it('应该成功注销触发器', () => {
      // Mock 状态存在
      mockStateManager.hasState.mockReturnValue(true);

      // 执行测试
      coordinator.unregister('trigger-1');

      // 验证状态删除
      expect(mockStateManager.deleteState).toHaveBeenCalledWith('trigger-1');
    });

    it('应该处理不存在的触发器', () => {
      // Mock 状态不存在
      mockStateManager.hasState.mockReturnValue(false);

      // 执行测试并验证错误
      expect(() => {
        coordinator.unregister('non-existent-trigger');
      }).toThrow(ExecutionError);

      expect(() => {
        coordinator.unregister('non-existent-trigger');
      }).toThrow('触发器状态 non-existent-trigger 不存在');
    });
  });

  describe('enable', () => {
    it('应该成功启用触发器', () => {
      // Mock 状态存在且为禁用状态
      mockStateManager.hasState.mockReturnValue(true);
      mockStateManager.getState.mockReturnValue({
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.DISABLED,
        triggerCount: 0,
        updatedAt: now()
      });

      // 执行测试
      coordinator.enable('trigger-1');

      // 验证状态更新
      expect(mockStateManager.updateStatus).toHaveBeenCalledWith('trigger-1', TriggerStatus.ENABLED);
    });

    it('应该忽略已启用的触发器', () => {
      // Mock 状态存在且为启用状态
      mockStateManager.hasState.mockReturnValue(true);
      mockStateManager.getState.mockReturnValue({
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: now()
      });

      // 执行测试
      coordinator.enable('trigger-1');

      // 验证没有调用状态更新
      expect(mockStateManager.updateStatus).not.toHaveBeenCalled();
    });

    it('应该处理不存在的触发器', () => {
      // Mock 状态不存在
      mockStateManager.hasState.mockReturnValue(false);

      // 执行测试并验证错误
      expect(() => {
        coordinator.enable('non-existent-trigger');
      }).toThrow(ExecutionError);
    });
  });

  describe('disable', () => {
    it('应该成功禁用触发器', () => {
      // Mock 状态存在且为启用状态
      mockStateManager.hasState.mockReturnValue(true);
      mockStateManager.getState.mockReturnValue({
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: now()
      });

      // 执行测试
      coordinator.disable('trigger-1');

      // 验证状态更新
      expect(mockStateManager.updateStatus).toHaveBeenCalledWith('trigger-1', TriggerStatus.DISABLED);
    });

    it('应该忽略已禁用的触发器', () => {
      // Mock 状态存在且为禁用状态
      mockStateManager.hasState.mockReturnValue(true);
      mockStateManager.getState.mockReturnValue({
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.DISABLED,
        triggerCount: 0,
        updatedAt: now()
      });

      // 执行测试
      coordinator.disable('trigger-1');

      // 验证没有调用状态更新
      expect(mockStateManager.updateStatus).not.toHaveBeenCalled();
    });

    it('应该处理不存在的触发器', () => {
      // Mock 状态不存在
      mockStateManager.hasState.mockReturnValue(false);

      // 执行测试并验证错误
      expect(() => {
        coordinator.disable('non-existent-trigger');
      }).toThrow(ExecutionError);
    });
  });

  describe('get', () => {
    it('应该成功获取触发器', () => {
      // Mock 状态
      const mockState = {
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.ENABLED,
        triggerCount: 5,
        updatedAt: now()
      };

      // Mock 工作流触发器定义
      const mockWorkflowTrigger = {
        id: 'trigger-1',
        name: 'Test Trigger',
        condition: { eventType: EventType.NODE_COMPLETED },
        action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
        maxTriggers: 10
      };

      mockStateManager.getState.mockReturnValue(mockState);
      mockWorkflowRegistry.getProcessed.mockReturnValue({
        id: 'workflow-1',
        name: 'Test Workflow',
        triggers: [mockWorkflowTrigger],
        graph: {} as any,
        graphAnalysis: {} as any,
        validationResult: {} as any,
        subgraphMergeLogs: [],
        processedAt: now(),
        hasSubgraphs: false,
        subworkflowIds: new Set(),
        topologicalOrder: []
      } as any);

      // 执行测试
      const result = coordinator.get('trigger-1');

      // 验证结果
      expect(result).toBeDefined();
      expect(result?.id).toBe('trigger-1');
      expect(result?.name).toBe('Test Trigger');
      expect(result?.status).toBe('enabled');
      expect(result?.triggerCount).toBe(5);
      expect(result?.threadId).toBe('thread-1');
    });

    it('应该返回 undefined 当状态不存在', () => {
      // Mock 状态不存在
      mockStateManager.getState.mockReturnValue(undefined);

      // 执行测试
      const result = coordinator.get('non-existent-trigger');

      // 验证结果
      expect(result).toBeUndefined();
    });

    it('应该返回 undefined 当定义不存在', () => {
      // Mock 状态存在但定义不存在
      mockStateManager.getState.mockReturnValue({
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: now()
      });

      mockWorkflowRegistry.getProcessed.mockReturnValue({
        id: 'workflow-1',
        name: 'Test Workflow',
        triggers: [],
        graph: {} as any,
        graphAnalysis: {} as any,
        validationResult: {} as any,
        subgraphMergeLogs: [],
        processedAt: now(),
        hasSubgraphs: false,
        subworkflowIds: new Set(),
        topologicalOrder: []
      } as any);

      // 执行测试
      const result = coordinator.get('trigger-1');

      // 验证结果
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('应该成功获取所有触发器', () => {
      // Mock 状态
      const mockStates = new Map([
        ['trigger-1', {
          triggerId: 'trigger-1',
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          status: TriggerStatus.ENABLED,
          triggerCount: 5,
          updatedAt: now()
        }],
        ['trigger-2', {
          triggerId: 'trigger-2',
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          status: TriggerStatus.DISABLED,
          triggerCount: 0,
          updatedAt: now()
        }]
      ]);

      // Mock 工作流触发器定义
      const mockWorkflowTriggers = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} }
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: { eventType: EventType.NODE_STARTED },
          action: { type: TriggerActionType.STOP_THREAD, parameters: {} }
        }
      ];

      mockStateManager.getAllStates.mockReturnValue(mockStates);
      mockWorkflowRegistry.getProcessed.mockReturnValue({
        id: 'workflow-1',
        name: 'Test Workflow',
        triggers: mockWorkflowTriggers,
        graph: {} as any,
        graphAnalysis: {} as any,
        validationResult: {} as any,
        subgraphMergeLogs: [],
        processedAt: now(),
        hasSubgraphs: false,
        subworkflowIds: new Set(),
        topologicalOrder: []
      } as any);

      // 执行测试
      const result = coordinator.getAll();

      // 验证结果
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('trigger-1');
      expect(result[0]!.status).toBe(TriggerStatus.ENABLED);
      expect(result[1]!.id).toBe('trigger-2');
      expect(result[1]!.status).toBe(TriggerStatus.DISABLED);
    });

    it('应该过滤掉定义不存在的触发器', () => {
      // Mock 状态
      const mockStates = new Map([
        ['trigger-1', {
          triggerId: 'trigger-1',
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          status: TriggerStatus.ENABLED,
          triggerCount: 5,
          updatedAt: now()
        }],
        ['trigger-2', {
          triggerId: 'trigger-2',
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          updatedAt: now()
        }]
      ]);

      // Mock 只有 trigger-1 有定义
      mockStateManager.getAllStates.mockReturnValue(mockStates);
      mockWorkflowRegistry.getProcessed.mockReturnValue({
        id: 'workflow-1',
        name: 'Test Workflow',
        triggers: [{
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} }
        }],
        graph: {} as any,
        graphAnalysis: {} as any,
        validationResult: {} as any,
        subgraphMergeLogs: [],
        processedAt: now(),
        hasSubgraphs: false,
        subworkflowIds: new Set(),
        topologicalOrder: []
      } as any);

      // 执行测试
      const result = coordinator.getAll();

      // 验证结果 - 只包含 trigger-1
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('trigger-1');
    });

    it('应该返回空数组当没有触发器时', () => {
      // Mock 没有状态
      mockStateManager.getAllStates.mockReturnValue(new Map());

      // 执行测试
      const result = coordinator.getAll();

      // 验证结果
      expect(result).toHaveLength(0);
    });
  });

  describe('handleEvent', () => {
    const mockEvent = {
      type: EventType.NODE_COMPLETED,
      timestamp: now(),
      workflowId: 'workflow-1',
      threadId: 'thread-1',
      nodeId: 'node-1'
    };

    it('应该执行匹配的触发器', async () => {
      // Mock 触发器
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          maxTriggers: 10,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      // Mock getAll 返回触发器
      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      // Mock trigger handler
      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      getTriggerHandler.mockReturnValue(mockHandler);

      // 执行测试
      await coordinator.handleEvent(mockEvent);

      // 验证触发器执行
      expect(mockHandler).toHaveBeenCalledWith(
        { type: TriggerActionType.START_WORKFLOW, parameters: {} },
        'trigger-1',
        expect.objectContaining({
          getThreadRegistry: expect.any(Function),
          getWorkflowRegistry: expect.any(Function),
          getCurrentThreadId: expect.any(Function)
        })
      );

      // 验证触发次数更新
      expect(mockStateManager.incrementTriggerCount).toHaveBeenCalledWith('trigger-1');
    });

    it('应该过滤掉不匹配事件类型的触发器', async () => {
      // Mock 触发器 - 监听不同的事件类型
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: { eventType: EventType.NODE_STARTED }, // 不同的事件类型
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      // 执行测试
      await coordinator.handleEvent(mockEvent);

      // 验证没有执行触发器
      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      expect(getTriggerHandler).not.toHaveBeenCalled();
    });

    it('应该过滤掉禁用的触发器', async () => {
      // Mock 触发器 - 禁用状态
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.DISABLED, // 禁用状态
          triggerCount: 0,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      // 执行测试
      await coordinator.handleEvent(mockEvent);

      // 验证没有执行触发器
      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      expect(getTriggerHandler).not.toHaveBeenCalled();
    });

    it('应该处理自定义事件的事件名称匹配', async () => {
      const customEvent = {
        type: EventType.NODE_CUSTOM_EVENT,
        timestamp: now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        eventName: 'custom.event'
      };

      // Mock 触发器 - 匹配事件名称
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: {
            eventType: EventType.NODE_CUSTOM_EVENT,
            eventName: 'custom.event' // 匹配的事件名称
          },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      getTriggerHandler.mockReturnValue(jest.fn().mockResolvedValue({}));

      // 执行测试
      await coordinator.handleEvent(customEvent);

      // 验证触发器执行
      expect(getTriggerHandler).toHaveBeenCalled();
    });

    it('应该过滤掉不匹配事件名称的自定义事件', async () => {
      const customEvent = {
        type: EventType.NODE_CUSTOM_EVENT,
        timestamp: now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        eventName: 'custom.event'
      };

      // Mock 触发器 - 不匹配的事件名称
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: {
            eventType: EventType.NODE_CUSTOM_EVENT,
            eventName: 'different.event' // 不匹配的事件名称
          },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      // 执行测试
      await coordinator.handleEvent(customEvent);

      // 验证没有执行触发器
      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      expect(getTriggerHandler).not.toHaveBeenCalled();
    });

    it('应该处理一次性触发器', async () => {
      // Mock 一次性触发器
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          maxTriggers: 1, // 一次性触发器
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      getTriggerHandler.mockReturnValue(jest.fn().mockResolvedValue({}));

      // 执行测试
      await coordinator.handleEvent(mockEvent);

      // 验证触发器被禁用
      expect(mockStateManager.updateStatus).toHaveBeenCalledWith('trigger-1', TriggerStatus.DISABLED);
    });

    it('应该静默处理触发器执行错误', async () => {
      // Mock 触发器
      const mockTriggers = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          type: TriggerType.EVENT,
          condition: { eventType: EventType.NODE_COMPLETED },
          action: { type: TriggerActionType.START_WORKFLOW, parameters: {} },
          status: TriggerStatus.ENABLED,
          triggerCount: 0,
          workflowId: 'workflow-1',
          threadId: 'thread-1',
          createdAt: now(),
          updatedAt: now()
        }
      ];

      jest.spyOn(coordinator, 'getAll').mockReturnValue(mockTriggers);

      // Mock trigger handler 抛出错误
      const { getTriggerHandler } = require('../../handlers/trigger-handlers');
      getTriggerHandler.mockReturnValue(jest.fn().mockRejectedValue(new Error('Handler error')));

      // 执行测试 - 不应该抛出错误
      await expect(coordinator.handleEvent(mockEvent)).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('应该清空所有触发器状态', () => {
      // 执行测试
      coordinator.clear();

      // 验证状态清空
      expect(mockStateManager.clear).toHaveBeenCalled();
    });
  });
});