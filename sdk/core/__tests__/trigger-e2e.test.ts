/**
 * Trigger End-to-End 集成测试
 *
 * 测试场景：
 * - 完整触发流程
 * - 状态一致性
 * - 错误处理
 * - 性能测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerCoordinator } from '../../graph/execution/coordinators/trigger-coordinator.js';
import { TriggerStateManager } from '../../graph/execution/managers/trigger-state-manager.js';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import { WorkflowRegistry } from '../../graph/services/workflow-registry.js';
import { GraphRegistry } from '../../graph/services/graph-registry.js';
import { ThreadRegistry } from '../../graph/services/thread-registry.js';
import {
  registerContextCompression,
  CONTEXT_COMPRESSION_TRIGGER_NAME,
  CONTEXT_COMPRESSION_WORKFLOW_ID
} from '../services/predefined-triggers.js';
import type { WorkflowTrigger, BaseEvent, NodeCustomEvent } from '@modular-agent/types';
import { EventType, TriggerActionType } from '@modular-agent/types';
import { ExecutionError, ConfigurationValidationError } from '@modular-agent/types';

// Mock implementations
const mockThreadRegistry = {
  get: vi.fn(),
  register: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setVariable: vi.fn(),
  applyMessageOperation: vi.fn()
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
  submitAsync: vi.fn(),
  cancelTask: vi.fn(),
  getQueueStats: vi.fn(),
  drain: vi.fn()
} as any;

const mockCheckpointStateManager = {
  createCheckpoint: vi.fn()
} as any;

describe('Trigger End-to-End - 端到端集成测试', () => {
  let coordinator: TriggerCoordinator;
  let stateManager: TriggerStateManager;
  let triggerTemplateRegistry: TriggerTemplateRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建状态管理器
    stateManager = new TriggerStateManager('test-thread');
    stateManager.setWorkflowId('workflow-123');

    // 创建触发器模板注册表
    triggerTemplateRegistry = new TriggerTemplateRegistry();

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

  describe('完整触发流程', () => {
    it('测试从事件触发到动作执行的完整流程', async () => {
      // 1. 注册触发器
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'pause_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true,
        maxTriggers: 5
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      // 2. 触发事件
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 3. 验证触发器被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalledWith('test-thread', false);

      // 4. 验证状态更新
      const trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(1);
      expect(trigger?.status).toBe('enabled');
    });

    it('测试多个触发器同时触发', async () => {
      // 注册多个监听同一事件的触发器
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: '触发器1',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: '触发器2',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        },
        {
          id: 'trigger-3',
          name: '触发器3',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'resume_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        }
      ];

      triggers.forEach(trigger => coordinator.register(trigger, 'workflow-123'));

      // 触发事件
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证所有触发器都被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalled();
      expect(mockThreadLifecycleCoordinator.resumeThread).toHaveBeenCalled();

      // 验证所有触发器的计数都增加
      expect(coordinator.get('trigger-1')?.triggerCount).toBe(1);
      expect(coordinator.get('trigger-2')?.triggerCount).toBe(1);
      expect(coordinator.get('trigger-3')?.triggerCount).toBe(1);
    });

    it('测试触发器链式触发', async () => {
      // 注册触发器A：停止线程
      const triggerA: WorkflowTrigger = {
        id: 'trigger-a',
        name: '触发器A',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(triggerA, 'workflow-123');

      // 注册触发器B：暂停线程（假设在停止后触发）
      const triggerB: WorkflowTrigger = {
        id: 'trigger-b',
        name: '触发器B',
        condition: { eventType: 'THREAD_PAUSED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(triggerB, 'workflow-123');

      // 模拟触发第一个事件
      const event1: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event1);

      // 验证触发器A被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();

      // 模拟触发第二个事件
      const event2: BaseEvent = {
        type: 'THREAD_PAUSED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event2);

      // 验证触发器B被执行
      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalled();
    });
  });

  describe('状态一致性', () => {
    it('测试触发后状态正确更新', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true,
        maxTriggers: 3
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      // 第一次触发
      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      let trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(1);
      expect(trigger?.status).toBe('enabled');

      // 第二次触发
      await coordinator.handleEvent(event);

      trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(2);

      // 第三次触发
      await coordinator.handleEvent(event);

      trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(3);
      expect(trigger?.status).toBe('disabled'); // 达到最大次数后自动禁用
    });

    it('测试并发触发时状态一致性', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true,
        maxTriggers: 10
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 并发触发多次
      const promises = Array(5).fill(null).map(() => coordinator.handleEvent(event));

      await Promise.all(promises);

      const trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(5);
    });

    it('测试快照和恢复后状态一致性', () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true,
        maxTriggers: 5
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      // 创建快照
      const snapshot = stateManager.createSnapshot();

      // 修改状态
      stateManager.updateStatus('trigger-1', 'disabled');
      stateManager.incrementTriggerCount('trigger-1');

      // 恢复快照
      stateManager.restoreFromSnapshot(snapshot);

      // 验证状态已恢复
      const state = stateManager.getState('trigger-1');
      expect(state?.status).toBe('enabled');
      expect(state?.triggerCount).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('测试触发器执行失败时的错误处理', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      // 模拟处理器失败
      mockThreadLifecycleCoordinator.stopThread.mockRejectedValue(new Error('Stop failed'));

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 不应抛出错误，错误应被静默处理
      await expect(coordinator.handleEvent(event)).resolves.not.toThrow();
    });

    it('测试部分触发器失败不影响其他触发器', async () => {
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: '失败的触发器',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: '成功的触发器',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        }
      ];

      triggers.forEach(trigger => coordinator.register(trigger, 'workflow-123'));

      // 模拟第一个触发器失败
      mockThreadLifecycleCoordinator.stopThread.mockRejectedValue(new Error('Failed'));

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      await coordinator.handleEvent(event);

      // 验证第二个触发器仍然被执行
      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalled();
    });

    it('测试依赖缺失时的错误提示', async () => {
      // 创建没有必需依赖的协调器
      const incompleteCoordinator = new TriggerCoordinator({
        threadRegistry: mockThreadRegistry,
        workflowRegistry: mockWorkflowRegistry,
        stateManager: stateManager
        // 缺少 threadLifecycleCoordinator
      });

      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      incompleteCoordinator.register(workflowTrigger, 'workflow-123');

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 应该抛出依赖注入错误
      await expect(incompleteCoordinator.handleEvent(event)).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('测试大量触发器的匹配性能', async () => {
      // 注册大量触发器
      const triggerCount = 100;
      const triggers: WorkflowTrigger[] = [];

      for (let i = 0; i < triggerCount; i++) {
        triggers.push({
          id: `trigger-${i}`,
          name: `触发器${i}`,
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        });
      }

      triggers.forEach(trigger => coordinator.register(trigger, 'workflow-123'));

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 测量执行时间
      const startTime = Date.now();
      await coordinator.handleEvent(event);
      const executionTime = Date.now() - startTime;

      // 验证在合理时间内完成（< 1秒）
      expect(executionTime).toBeLessThan(1000);
    });

    it('测试高频事件的处理性能', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      const eventCount = 50;
      const events: BaseEvent[] = [];

      for (let i = 0; i < eventCount; i++) {
        events.push({
          type: 'THREAD_STARTED',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          timestamp: Date.now()
        });
      }

      // 测量执行时间
      const startTime = Date.now();
      await Promise.all(events.map(event => coordinator.handleEvent(event)));
      const executionTime = Date.now() - startTime;

      // 验证在合理时间内完成（< 2秒）
      expect(executionTime).toBeLessThan(2000);

      // 验证所有触发都被计数
      const trigger = coordinator.get('trigger-1');
      expect(trigger?.triggerCount).toBe(eventCount);
    });

    it('测试并发触发的性能', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '测试触发器',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
        enabled: true,
        maxTriggers: 100
      };

      coordinator.register(workflowTrigger, 'workflow-123');

      const event: BaseEvent = {
        type: 'THREAD_STARTED',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        timestamp: Date.now()
      };

      // 并发触发
      const startTime = Date.now();
      await Promise.all(Array(20).fill(null).map(() => coordinator.handleEvent(event)));
      const executionTime = Date.now() - startTime;

      // 验证在合理时间内完成（< 1秒）
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('预定义触发器集成测试', () => {
    it('测试注册和使用预定义触发器', async () => {
      // 注册预定义触发器和工作流
      const result = registerContextCompression(
        triggerTemplateRegistry,
        mockWorkflowRegistry
      );

      expect(result.triggerRegistered).toBe(true);
      expect(result.workflowRegistered).toBe(true);

      // 验证触发器模板已注册
      expect(triggerTemplateRegistry.has(CONTEXT_COMPRESSION_TRIGGER_NAME)).toBe(true);
      expect(mockWorkflowRegistry.has(CONTEXT_COMPRESSION_WORKFLOW_ID)).toBe(true);

      // 获取触发器模板
      const triggerTemplate = triggerTemplateRegistry.get(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(triggerTemplate).toBeDefined();
      expect(triggerTemplate?.condition.eventType).toBe('CONTEXT_COMPRESSION_REQUESTED');
      expect(triggerTemplate?.action.type).toBe('execute_triggered_subgraph');
    });
  });

  describe('NODE_CUSTOM_EVENT 事件测试', () => {
    it('测试NODE_CUSTOM_EVENT事件的正确匹配和执行', async () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'custom-trigger-1',
        name: '自定义事件触发器',
        condition: {
          eventType: 'NODE_CUSTOM_EVENT' as EventType,
          eventName: 'my-custom-event'
        },
        action: {
          type: 'pause_thread',
          parameters: { threadId: 'test-thread' }
        },
        enabled: true
      };

      coordinator.register(workflowTrigger, 'workflow-123');

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

      // 验证触发器被执行
      expect(mockThreadLifecycleCoordinator.stopThread).toHaveBeenCalled();
      expect(coordinator.get('custom-trigger-1')?.triggerCount).toBe(1);
    });
  });

  describe('清理和重置', () => {
    it('测试清理所有触发器状态', () => {
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: '触发器1',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: '触发器2',
          condition: { eventType: 'THREAD_COMPLETED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'test-thread' } },
          enabled: true
        }
      ];

      triggers.forEach(trigger => coordinator.register(trigger, 'workflow-123'));

      expect(stateManager.size()).toBe(2);

      coordinator.clear();

      expect(stateManager.size()).toBe(0);
    });
  });
});
