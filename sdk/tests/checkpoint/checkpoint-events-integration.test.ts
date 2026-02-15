/**
 * Checkpoint 事件系统集成测试
 * 验证 checkpoint 操作时的事件触发
 */

import { CheckpointStateManager } from '../../core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../core/storage/memory-checkpoint-storage';
import { EventManager } from '../../core/services/event-manager';
import { EventType, ThreadStatus, MessageRole } from '@modular-agent/types';
import type { CheckpointCreatedEvent, CheckpointDeletedEvent, CheckpointFailedEvent } from '@modular-agent/types';

describe('Checkpoint 事件系统集成测试', () => {
  let stateManager: CheckpointStateManager;
  let eventManager: EventManager;
  let storage: MemoryCheckpointStorage;

  beforeEach(() => {
    storage = new MemoryCheckpointStorage();
    eventManager = new EventManager();
    stateManager = new CheckpointStateManager(storage, eventManager);
  });

  describe('CHECKPOINT_CREATED 事件', () => {
    it('应该在创建检查点时触发 CHECKPOINT_CREATED 事件', async () => {
      const events: CheckpointCreatedEvent[] = [];

      // 监听事件
      eventManager.on(EventType.CHECKPOINT_CREATED, (event: CheckpointCreatedEvent) => {
        events.push(event);
      });

      // 创建检查点
      const checkpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: {
            markMap: {
              originalIndices: [],
              batchBoundaries: [],
              boundaryToBatch: [],
              currentBatch: 0,
              typeIndices: {
                user: [],
                assistant: [],
                system: [],
                tool: []
              }
            },
            tokenUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            },
            currentRequestUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            }
          }
        },
        metadata: {
          description: 'Test checkpoint'
        }
      };

      await stateManager.create(checkpoint);

      // 验证事件
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe(EventType.CHECKPOINT_CREATED);
      expect(events[0]?.checkpointId).toBe('checkpoint-1');
      expect(events[0]?.threadId).toBe('thread-1');
      expect(events[0]?.workflowId).toBe('workflow-1');
      expect(events[0]?.description).toBe('Test checkpoint');
    });
  });

  describe('CHECKPOINT_DELETED 事件', () => {
    it('应该在删除检查点时触发 CHECKPOINT_DELETED 事件', async () => {
      const events: CheckpointDeletedEvent[] = [];

      // 监听事件
      eventManager.on(EventType.CHECKPOINT_DELETED, (event: CheckpointDeletedEvent) => {
        events.push(event);
      });

      // 先创建检查点
      const checkpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: {
            markMap: {
              originalIndices: [],
              batchBoundaries: [],
              boundaryToBatch: [],
              currentBatch: 0,
              typeIndices: {
                user: [],
                assistant: [],
                system: [],
                tool: []
              }
            },
            tokenUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            },
            currentRequestUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            }
          }
        },
        metadata: {}
      };

      await stateManager.create(checkpoint);

      // 删除检查点
      await stateManager.delete('checkpoint-1', 'manual');

      // 验证事件
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe(EventType.CHECKPOINT_DELETED);
      expect(events[0]?.checkpointId).toBe('checkpoint-1');
      expect(events[0]?.reason).toBe('manual');
    });
  });

  describe('CHECKPOINT_FAILED 事件', () => {
    it('应该在创建检查点失败时触发 CHECKPOINT_FAILED 事件', async () => {
      const events: CheckpointFailedEvent[] = [];

      // 监听事件
      eventManager.on(EventType.CHECKPOINT_FAILED, (event: CheckpointFailedEvent) => {
        events.push(event);
      });

      // 创建一个会失败的存储
      const failingStorage = new MemoryCheckpointStorage();
      const originalSave = failingStorage.save.bind(failingStorage);
      failingStorage.save = jest.fn().mockRejectedValue(new Error('Storage error'));

      const failingStateManager = new CheckpointStateManager(failingStorage, eventManager);

      // 尝试创建检查点
      const checkpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: {
            markMap: {
              originalIndices: [],
              batchBoundaries: [],
              boundaryToBatch: [],
              currentBatch: 0,
              typeIndices: {
                user: [],
                assistant: [],
                system: [],
                tool: []
              }
            },
            tokenUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            },
            currentRequestUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            }
          }
        },
        metadata: {}
      };

      await expect(failingStateManager.create(checkpoint)).rejects.toThrow('Storage error');

      // 验证事件
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe(EventType.CHECKPOINT_FAILED);
      expect(events[0]?.operation).toBe('create');
      expect(events[0]?.error).toBe('Storage error');
      // checkpointId 可能为 undefined，因为存储失败时可能还没有生成 ID
      expect(events[0]?.checkpointId).toBeUndefined();
    });
  });

  describe('没有 EventManager 的情况', () => {
    it('应该在没有 EventManager 时正常工作', async () => {
      const stateManagerWithoutEvents = new CheckpointStateManager(storage);

      const checkpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: {
            markMap: {
              originalIndices: [],
              batchBoundaries: [],
              boundaryToBatch: [],
              currentBatch: 0,
              typeIndices: {
                user: [],
                assistant: [],
                system: [],
                tool: []
              }
            },
            tokenUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            },
            currentRequestUsage: {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0
            }
          }
        },
        metadata: {}
      };

      // 应该正常工作，不会抛出异常
      const checkpointId = await stateManagerWithoutEvents.create(checkpoint);
      expect(checkpointId).toBe('checkpoint-1');
    });
  });
});