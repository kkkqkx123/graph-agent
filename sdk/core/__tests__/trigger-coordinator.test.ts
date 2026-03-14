/**
 * Trigger Coordinator 集成测试
 *
 * 测试场景：
 * - 注册和注销
 * - 启用和禁用
 * - 查询功能
 * - 事件处理
 * - 检查点支持
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerCoordinator } from '../../graph/execution/coordinators/trigger-coordinator.js';
import { TriggerStateManager } from '../../graph/execution/managers/trigger-state-manager.js';
import { WorkflowRegistry } from '../../graph/services/workflow-registry.js';
import { GraphRegistry } from '../../graph/services/graph-registry.js';
import { ThreadRegistry } from '../../graph/services/thread-registry.js';
import type { WorkflowTrigger, Trigger, BaseEvent, NodeCustomEvent } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types';

// Mock implementations
const mockThreadRegistry = {
  get: vi.fn(),
  register: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
} as any;

const mockGraphRegistry = {
  get: vi.fn()
} as any;

const mockWorkflowRegistry = new WorkflowRegistry();

const mockEventManager = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
} as any;

const mockThreadLifecycleCoordinator = {
  stopThread: vi.fn(),
  pauseThread: vi.fn(),
  resumeThread: vi.fn()
} as any;

const mockThreadBuilder = {
  build: vi.fn()
} as any;

const mockTaskQueueManager = {
  submitSync: vi.fn(),
  submitAsync: vi.fn()
} as any;

const mockCheckpointStateManager = {
  createCheckpoint: vi.fn()
} as any;

describe('Trigger Coordinator - 触发器协调器', () => {
  let coordinator: TriggerCoordinator;
  let stateManager: TriggerStateManager;

  beforeEach(() => {
    // 清理 mocks
    vi.clearAllMocks();

    // 创建状态管理器
    stateManager = new TriggerStateManager('test-thread');
    stateManager.setWorkflowId('workflow-123');

    // 创建协调器
    coordinator = new TriggerCoordinator({
      threadRegistry: mockThreadRegistry,
      workflowRegistry: mockWorkflowRegistry,
      stateManager: stateManager,
      graphRegistry: mockGraphRegistry,
      eventManager: mockEventManager,
      threadLifecycleCoordinator: mockThreadLifecycleCoordinator,
      threadBuilder: mockThreadBuilder,
      taskQueueManager: mockTaskQueueManager,
      checkpointStateManager: mockCheckpointStateManager
    });

    // 注册一个测试工作流
    const testWorkflow = {
      id: 'workflow-123',
      name: 'Test Workflow',
      version: '1.0.0',
      type: 'STANDALONE' as const,
      description: 'Test workflow',
      nodes: [],
      edges: [],
      metadata: {},
      triggers: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockWorkflowRegistry.register(testWorkflow);
  });

  describe('注册和注销', () => {
    it('测试注册触发器：register方法正确初始化运行时状态', () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true,
        maxTriggers: 5
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      expect(stateManager.hasState('trigger-1')).toBe(true);
      const state = stateManager.getState('trigger-1');
      expect(state?.triggerId).toBe('trigger-1');
      expect(state?.threadId).toBe('test-thread');
      expect(state?.workflowId).toBe('workflow-123');
      expect(state?.status).toBe('enabled');
      expect(state?.triggerCount).toBe(0);
    });

    it('测试重复注册：重复注册应抛出错误', () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      expect(() => {
        coordinator.register(workflowTrigger, 'workflow-123');
      }).toThrow(RuntimeValidationError);
    });

    it('测试注销触发器：unregister方法正确删除状态', () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');
      expect(stateManager.hasState('trigger-1')).toBe(true);

      coordinator.unregister('trigger-1');

      expect(stateManager.hasState('trigger-1')).toBe(false);
    });

    it('测试注销不存在的触发器：应抛出错误', () => {
      expect(() => {
        coordinator.unregister('non-existent');
      }).toThrow(ExecutionError);
    });
  });

  describe('启用和禁用', () => {
    beforeEach(() => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');
    });

    it('测试启用触发器：enable方法正确更新状态', () => {
      // 先禁用
      stateManager.updateStatus('trigger-1', 'disabled');
      expect(stateManager.getState('trigger-1')?.status).toBe('disabled');

      // 再启用
      coordinator.enable('trigger-1');

      expect(stateManager.getState('trigger-1')?.status).toBe('enabled');
    });

    it('测试禁用触发器：disable方法正确更新状态', () => {
      expect(stateManager.getState('trigger-1')?.status).toBe('enabled');

      coordinator.disable('trigger-1');

      expect(stateManager.getState('trigger-1')?.status).toBe('disabled');
    });

    it('测试启用已启用的触发器：不应重复更新', () => {
      const state = stateManager.getState('trigger-1');
      const originalStatus = state?.status;

      coordinator.enable('trigger-1');

      expect(stateManager.getState('trigger-1')?.status).toBe(originalStatus);
    });

    it('测试禁用已禁用的触发器：不应重复更新', () => {
      coordinator.disable('trigger-1');
      const state = stateManager.getState('trigger-1');
      const originalStatus = state?.status;

      coordinator.disable('trigger-1');

      expect(stateManager.getState('trigger-1')?.status).toBe(originalStatus);
    });

    it('测试启用不存在的触发器：应抛出错误', () => {
      expect(() => {
        coordinator.enable('non-existent');
      }).toThrow(ExecutionError);
    });

    it('测试禁用不存在的触发器：应抛出错误', () => {
      expect(() => {
        coordinator.disable('non-existent');
      }).toThrow(ExecutionError);
    });
  });

  describe('查询功能', () => {
    beforeEach(() => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        description: '这是一个测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType,
          eventName: 'custom-event'
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true,
        maxTriggers: 5,
        metadata: { key: 'value' }
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      // 模拟触发一次
      stateManager.incrementTriggerCount('trigger-1');
    });

    it('测试获取触发器：get方法返回定义和状态的合并结果', () => {
      const trigger = coordinator.get('trigger-1');

      expect(trigger).toBeDefined();
      expect(trigger?.id).toBe('trigger-1');
      expect(trigger?.name).toBe('测试触发器');
      expect(trigger?.description).toBe('这是一个测试触发器');
      expect(trigger?.condition.eventType).toBe('THREAD_STARTED');
      expect(trigger?.condition.eventName).toBe('custom-event');
      expect(trigger?.action.type).toBe('stop_thread');
      expect(trigger?.enabled).toBe(true);
      expect(trigger?.maxTriggers).toBe(5);
      expect(trigger?.metadata).toEqual({ key: 'value' });
      expect(trigger?.status).toBe('enabled');
      expect(trigger?.triggerCount).toBe(1);
      expect(trigger?.threadId).toBe('test-thread');
    });

    it('测试获取所有触发器：getAll方法返回所有触发器', () => {
        const triggers = coordinator.getAll();

        expect(triggers).toHaveLength(1);
        expect(triggers[0]?.id).toBe('trigger-1');
      });

    it('测试获取不存在的触发器：返回undefined', () => {
      const trigger = coordinator.get('non-existent');

      expect(trigger).toBeUndefined();
    });

    it('测试获取多个触发器：getAll返回所有注册的触发器', () => {
      const workflowTrigger2: WorkflowTrigger = {
        id: 'trigger-2',
        name: '测试触发器2',
        condition: {
          eventType: 'THREAD_COMPLETED' as EventType
        },
        action: {
          type: 'pause_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(workflowTrigger2, 'workflow-123');

      const triggers = coordinator.getAll();

      expect(triggers).toHaveLength(2);
      expect(triggers.map(t => t?.id)).toContain('trigger-1');
      expect(triggers.map(t => t?.id)).toContain('trigger-2');
    });
  });

  describe('事件处理', () => {
    beforeEach(() => {
      const workflowTrigger1: WorkflowTrigger = {
        id: 'trigger-1',
        name: '匹配的触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true,
        maxTriggers: 5
      };

      const workflowTrigger2: WorkflowTrigger = {
        id: 'trigger-2',
        name: '不匹配的触发器',
        condition: {
          eventType: 'THREAD_COMPLETED' as EventType
        },
        action: {
          type: 'pause_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      const workflowTrigger3: WorkflowTrigger = {
        id: 'trigger-3',
        name: '禁用的触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'resume_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: false
      };

      coordinator.register(workflowTrigger1, 'workflow-123');
      coordinator.register(workflowTrigger2, 'workflow-123');
      coordinator.register(workflowTrigger3, 'workflow-123');
    });

    it('测试匹配事件：handleEvent方法正确匹配并执行触发器', async () => {
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证匹配的触发器被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
    });

    it('测试不匹配事件：不匹配的事件不应触发', async () => {
      const event: BaseEvent = {
        type: 'NODE_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证没有触发器被执行
      expect(mockThreadLifecycleCoordinator.stopThread).not.toHaveBeenCalled();
    });

    it('测试禁用触发器不执行：disabled状态的触发器不应执行', async () => {
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证禁用的触发器未被执行
      expect(mockThreadLifecycleCoordinator.resumeThread).not.toHaveBeenCalled();
    });

    it('测试达到最大次数不执行：达到maxTriggers的触发器不应执行', async () => {
      // 模拟达到最大触发次数
      for (let i = 0; i < 5; i++) {
        stateManager.incrementTriggerCount('trigger-1');
      }

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证达到最大次数的触发器未被执行
      expect(mockThreadLifecycleCoordinator.stopThread).not.toHaveBeenCalled();
    });

    it('测试NODE_CUSTOM_EVENT事件：正确匹配eventName', async () => {
      const customTrigger: WorkflowTrigger = {
        id: 'custom-trigger',
        name: '自定义事件触发器',
        condition: {
          eventType: 'NODE_CUSTOM_EVENT' as EventType,
          eventName: 'my-custom-event'
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(customTrigger, 'workflow-123');

      const event: NodeCustomEvent = {
        type: 'NODE_CUSTOM_EVENT',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        nodeId: 'node-1',
        nodeType: 'LLM',
        eventName: 'my-custom-event',
        eventData: {},
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证匹配的触发器被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
    });

    it('测试NODE_CUSTOM_EVENT不匹配eventName：不匹配eventName时不执行', async () => {
      const customTrigger: WorkflowTrigger = {
        id: 'custom-trigger',
        name: '自定义事件触发器',
        condition: {
          eventType: 'NODE_CUSTOM_EVENT' as EventType,
          eventName: 'my-custom-event'
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(customTrigger, 'workflow-123');

      const event: NodeCustomEvent = {
        type: 'NODE_CUSTOM_EVENT',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        nodeId: 'node-1',
        nodeType: 'LLM',
        eventName: 'different-event',
        eventData: {},
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证不匹配的触发器未被执行
      expect(mockThreadLifecycleCoordinator.stopThread).not.toHaveBeenCalled();
    });
  });

  describe('检查点支持', () => {
    beforeEach(() => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true,
        createCheckpoint: true,
        checkpointDescription: '检查点描述'
      };

      coordinator.register(workflowTrigger, 'workflow-123');
    });

    it('测试触发前创建检查点：createCheckpoint配置正确创建检查点', async () => {
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证检查点被创建
      expect(mockCheckpointStateManager.createCheckpoint).toHaveBeenCalled();
    });

    it('测试检查点创建失败不影响执行：检查点失败不应影响触发器执行', async () => {
      // 模拟检查点创建失败
      mockCheckpointStateManager.createCheckpoint.mockRejectedValue(new Error('Checkpoint failed'));

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 不应抛出错误
      await expect(coordinator.handleEvent(event)).resolves.not.toThrow();

      // 验证触发器仍然被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
    });
  });

  describe('清空功能', () => {
    it('测试清空所有触发器状态：clear方法清空所有状态', () => {
      const workflowTrigger1: WorkflowTrigger = {
        id: 'trigger-1',
        name: '触发器1',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'stop_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      const workflowTrigger2: WorkflowTrigger = {
        id: 'trigger-2',
        name: '触发器2',
        condition: { eventType: 'THREAD_COMPLETED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(workflowTrigger1, 'workflow-123');
      coordinator.register(workflowTrigger2, 'workflow-123');

      expect(stateManager.size()).toBe(2);

      coordinator.clear();

      expect(stateManager.size()).toBe(0);
      expect(stateManager.getAllStates().size).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('测试处理无触发器的事件：应正常处理', async () => {
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 不应抛出错误
      await expect(coordinator.handleEvent(event)).resolves.not.toThrow();
    });

    it('测试处理多个匹配的触发器：应执行所有匹配的触发器', async () => {
      const workflowTrigger1: WorkflowTrigger = {
        id: 'trigger-1',
        name: '触发器1',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'stop_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      const workflowTrigger2: WorkflowTrigger = {
        id: 'trigger-2',
        name: '触发器2',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(workflowTrigger1, 'workflow-123');
      coordinator.register(workflowTrigger2, 'workflow-123');

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证两个触发器都被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalled();
    });
  });
});