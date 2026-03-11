/**
 * ThreadOperations 单元测试
 * 测试 Fork/Join/Copy 等线程操作工具函数
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types';

// Mock 依赖模块
vi.mock('../event/event-builder.js', () => ({
  buildThreadForkStartedEvent: vi.fn().mockReturnValue({ type: 'THREAD_FORK_STARTED' }),
  buildThreadForkCompletedEvent: vi.fn().mockReturnValue({ type: 'THREAD_FORK_COMPLETED' }),
  buildThreadJoinStartedEvent: vi.fn().mockReturnValue({ type: 'THREAD_JOIN_STARTED' }),
  buildThreadJoinConditionMetEvent: vi.fn().mockReturnValue({ type: 'THREAD_JOIN_CONDITION_MET' }),
  buildThreadCopyStartedEvent: vi.fn().mockReturnValue({ type: 'THREAD_COPY_STARTED' }),
  buildThreadCopyCompletedEvent: vi.fn().mockReturnValue({ type: 'THREAD_COPY_COMPLETED' })
}));

vi.mock('../../../../core/utils/event/event-emitter.js', () => ({
  safeEmit: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../event/event-waiter.js', () => ({
  waitForMultipleThreadsCompleted: vi.fn(),
  waitForAnyThreadCompleted: vi.fn(),
  waitForAnyThreadCompletion: vi.fn()
}));

// 在 mock 之后导入
import {
  fork,
  join,
  copy,
  type ForkConfig,
  type JoinStrategy
} from '../thread-operations.js';
import type { ThreadContext } from '../../context/thread-context.js';
import type { ThreadBuilder } from '../../thread-builder.js';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { EventManager } from '../../../services/event-manager.js';
import {
  buildThreadForkStartedEvent,
  buildThreadForkCompletedEvent,
  buildThreadJoinStartedEvent,
  buildThreadJoinConditionMetEvent,
  buildThreadCopyStartedEvent,
  buildThreadCopyCompletedEvent
} from '../event/event-builder.js';
import { safeEmit } from '../event/index.js';
import {
  waitForMultipleThreadsCompleted,
  waitForAnyThreadCompleted,
  waitForAnyThreadCompletion
} from '../event/event-waiter.js';

/**
 * 创建模拟 ThreadContext
 */
function createMockThreadContext(threadId: string, workflowId: string = 'test-workflow'): ThreadContext {
  return {
    getThreadId: vi.fn().mockReturnValue(threadId),
    getWorkflowId: vi.fn().mockReturnValue(workflowId),
    getCurrentNodeId: vi.fn().mockReturnValue('test-node'),
    setCurrentNodeId: vi.fn(),
    getStatus: vi.fn().mockReturnValue('RUNNING'),
    setStatus: vi.fn(),
    getStartTime: vi.fn().mockReturnValue(Date.now()),
    getOutput: vi.fn().mockReturnValue({}),
    getNodeResults: vi.fn().mockReturnValue([]),
    getErrors: vi.fn().mockReturnValue([]),
    getNavigator: vi.fn().mockReturnValue({}),
    getAbortSignal: vi.fn().mockReturnValue(new AbortController().signal),
    getInput: vi.fn().mockReturnValue({}),
    getVariable: vi.fn(),
    getTriggeredSubworkflowId: vi.fn(),
    getSubgraphStack: vi.fn().mockReturnValue([]),
    thread: {
      id: threadId,
      workflowId,
      status: 'RUNNING',
      currentNodeId: 'test-node',
      input: {},
      output: {},
      nodeResults: [],
      errors: [],
      startTime: Date.now(),
      graph: {} as any,
      variables: [],
      threadType: 'MAIN',
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      forkJoinContext: undefined
    },
    conversationManager: {
      getMessages: vi.fn().mockReturnValue([]),
      addMessage: vi.fn()
    }
  } as unknown as ThreadContext;
}

/**
 * 创建模拟 ThreadBuilder
 */
function createMockThreadBuilder(): ThreadBuilder {
  return {
    createFork: vi.fn().mockResolvedValue(createMockThreadContext('child-thread')),
    createCopy: vi.fn().mockResolvedValue(createMockThreadContext('copied-thread'))
  } as unknown as ThreadBuilder;
}

/**
 * 创建模拟 ThreadRegistry
 */
function createMockThreadRegistry(threads: Map<string, ThreadContext> = new Map()): ThreadRegistry {
  return {
    get: vi.fn().mockImplementation((id: string) => threads.get(id)),
    getAll: vi.fn().mockImplementation(() => Array.from(threads.values())),
    isWorkflowActive: vi.fn().mockReturnValue(false)
  } as unknown as ThreadRegistry;
}

/**
 * 创建模拟 EventManager
 */
function createMockEventManager(): EventManager {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    waitFor: vi.fn()
  } as unknown as EventManager;
}

describe('fork', () => {
  let mockParentContext: ThreadContext;
  let mockThreadBuilder: ThreadBuilder;
  let mockEventManager: EventManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParentContext = createMockThreadContext('parent-thread');
    mockThreadBuilder = createMockThreadBuilder();
    mockEventManager = createMockEventManager();
  });

  it('应该成功创建子线程', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1'
    };

    const childContext = await fork(mockParentContext, forkConfig, mockThreadBuilder, mockEventManager);

    expect(childContext).toBeDefined();
    expect(mockThreadBuilder.createFork).toHaveBeenCalledWith(mockParentContext, forkConfig);
  });

  it('应该触发 THREAD_FORK_STARTED 事件', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1'
    };

    await fork(mockParentContext, forkConfig, mockThreadBuilder, mockEventManager);

    expect(buildThreadForkStartedEvent).toHaveBeenCalledWith(mockParentContext, forkConfig);
    expect(safeEmit).toHaveBeenCalledWith(mockEventManager, expect.anything());
  });

  it('应该触发 THREAD_FORK_COMPLETED 事件', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1'
    };

    await fork(mockParentContext, forkConfig, mockThreadBuilder, mockEventManager);

    expect(buildThreadForkCompletedEvent).toHaveBeenCalledWith(mockParentContext, ['child-thread']);
    expect(safeEmit).toHaveBeenCalledWith(mockEventManager, expect.anything());
  });

  it('当没有 forkId 时抛出 RuntimeValidationError', async () => {
    const forkConfig = { forkId: '' };

    await expect(fork(mockParentContext, forkConfig as ForkConfig, mockThreadBuilder))
      .rejects
      .toThrow(RuntimeValidationError);

    await expect(fork(mockParentContext, forkConfig as ForkConfig, mockThreadBuilder))
      .rejects
      .toThrow('Fork config must have forkId');
  });

  it('当 forkStrategy 无效时抛出 RuntimeValidationError', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1',
      forkStrategy: 'invalid' as any
    };

    await expect(fork(mockParentContext, forkConfig, mockThreadBuilder))
      .rejects
      .toThrow(RuntimeValidationError);

    await expect(fork(mockParentContext, forkConfig, mockThreadBuilder))
      .rejects
      .toThrow('Invalid forkStrategy: invalid');
  });

  it('支持 serial 策略', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1',
      forkStrategy: 'serial'
    };

    await expect(fork(mockParentContext, forkConfig, mockThreadBuilder)).resolves.toBeDefined();
  });

  it('支持 parallel 策略', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1',
      forkStrategy: 'parallel'
    };

    await expect(fork(mockParentContext, forkConfig, mockThreadBuilder)).resolves.toBeDefined();
  });

  it('在没有 EventManager 时也能工作', async () => {
    const forkConfig: ForkConfig = {
      forkId: 'fork-1'
    };

    await expect(fork(mockParentContext, forkConfig, mockThreadBuilder, undefined))
      .resolves
      .toBeDefined();
  });
});

describe('join', () => {
  let mockThreadRegistry: ThreadRegistry;
  let mockEventManager: EventManager;
  let mockParentContext: ThreadContext;
  let mockChildContext: ThreadContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockParentContext = createMockThreadContext('parent-thread');
    mockChildContext = createMockThreadContext('child-thread');

    // 设置子线程的 forkJoinContext，使其成为主线程
    mockChildContext.thread.forkJoinContext = {
      forkId: 'fork-1',
      forkPathId: 'main-path'
    };

    const threads = new Map([
      ['parent-thread', mockParentContext],
      ['child-thread', mockChildContext]
    ]);

    mockThreadRegistry = createMockThreadRegistry(threads);
    mockEventManager = createMockEventManager();

    // Mock 等待函数
    (waitForMultipleThreadsCompleted as any).mockResolvedValue(undefined);
    (waitForAnyThreadCompleted as any).mockResolvedValue('child-thread');
    (waitForAnyThreadCompletion as any).mockResolvedValue({ completedThreads: [mockChildContext.thread], failedThreads: [] });
  });

  it('应该成功合并子线程结果', async () => {
    const childThreadIds = ['child-thread'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    // Mock 子线程状态为 COMPLETED
    mockChildContext.thread.status = 'COMPLETED';

    const result = await join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    );

    expect(result.success).toBe(true);
    expect(result.completedThreads).toHaveLength(1);
  });

  it('当没有 joinStrategy 时抛出 RuntimeValidationError', async () => {
    await expect(join(
      ['child-thread'],
      '' as any,
      mockThreadRegistry,
      'main-path'
    )).rejects.toThrow(RuntimeValidationError);

    await expect(join(
      ['child-thread'],
      '' as any,
      mockThreadRegistry,
      'main-path'
    )).rejects.toThrow('Join config must have joinStrategy');
  });

  it('当 timeout 为负数时抛出 RuntimeValidationError', async () => {
    await expect(join(
      ['child-thread'],
      'ALL_COMPLETED',
      mockThreadRegistry,
      'main-path',
      -1
    )).rejects.toThrow(RuntimeValidationError);

    await expect(join(
      ['child-thread'],
      'ALL_COMPLETED',
      mockThreadRegistry,
      'main-path',
      -1
    )).rejects.toThrow('Join timeout must be non-negative');
  });

  it('应该触发 THREAD_JOIN_STARTED 事件', async () => {
    const childThreadIds = ['child-thread'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    mockChildContext.thread.status = 'COMPLETED';

    await join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    );

    expect(buildThreadJoinStartedEvent).toHaveBeenCalledWith(
      mockParentContext,
      childThreadIds,
      joinStrategy
    );
  });

  it('ALL_COMPLETED 策略：等待所有线程完成', async () => {
    const childThreadIds = ['child-1', 'child-2'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    const threads = new Map<string, ThreadContext>([
      ['parent-thread', mockParentContext],
      ['child-1', { ...mockChildContext, thread: { ...mockChildContext.thread, id: 'child-1', status: 'COMPLETED', forkJoinContext: { forkId: 'fork-1', forkPathId: 'main-path' } } } as ThreadContext],
      ['child-2', { ...mockChildContext, thread: { ...mockChildContext.thread, id: 'child-2', status: 'COMPLETED', forkJoinContext: { forkId: 'fork-1', forkPathId: 'other-path' } } } as ThreadContext]
    ]);
    mockThreadRegistry = createMockThreadRegistry(threads);

    await join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    );

    expect(waitForMultipleThreadsCompleted).toHaveBeenCalledWith(
      mockEventManager,
      childThreadIds,
      undefined
    );
  });

  it('ANY_COMPLETED 策略：等待任意线程完成', async () => {
    const childThreadIds = ['child-1', 'child-2'];
    const joinStrategy: JoinStrategy = 'ANY_COMPLETED';

    (waitForAnyThreadCompleted as any).mockResolvedValue('child-1');

    // 创建独立的 mock child-1 context，确保 id 正确
    const mockChild1Context = createMockThreadContext('child-1');
    mockChild1Context.thread.status = 'COMPLETED';
    mockChild1Context.thread.forkJoinContext = { forkId: 'fork-1', forkPathId: 'main-path' };

    const mockChild2Context = createMockThreadContext('child-2');
    mockChild2Context.thread.status = 'RUNNING';
    mockChild2Context.thread.forkJoinContext = { forkId: 'fork-1', forkPathId: 'other-path' };

    const threads = new Map<string, ThreadContext>([
      ['parent-thread', mockParentContext],
      ['child-1', mockChild1Context],
      ['child-2', mockChild2Context]
    ]);
    mockThreadRegistry = createMockThreadRegistry(threads);

    await join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    );

    expect(waitForAnyThreadCompleted).toHaveBeenCalledWith(
      mockEventManager,
      childThreadIds,
      undefined
    );
  });

  it('应该合并主线程对话历史到父线程', async () => {
    const childThreadIds = ['child-thread'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    mockChildContext.thread.status = 'COMPLETED';
    mockChildContext.thread.forkJoinContext = { forkPathId: 'main-path', forkId: 'fork-1' };

    const mockConversationManager = {
      getMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'test' }]),
      addMessage: vi.fn()
    };
    Object.defineProperty(mockParentContext, 'conversationManager', { value: mockConversationManager, configurable: true });
    Object.defineProperty(mockChildContext, 'conversationManager', { value: mockConversationManager, configurable: true });

    await join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    );

    expect(mockConversationManager.addMessage).toHaveBeenCalled();
  });

  it('当 Join 条件不满足时抛出 ExecutionError', async () => {
    const childThreadIds = ['child-thread'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    // Mock 子线程状态为 FAILED
    mockChildContext.thread.status = 'FAILED';

    const threads = new Map([
      ['parent-thread', mockParentContext],
      ['child-thread', mockChildContext]
    ]);
    mockThreadRegistry = createMockThreadRegistry(threads);

    await expect(join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    )).rejects.toThrow(ExecutionError);

    await expect(join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    )).rejects.toThrow('Join condition not met: ALL_COMPLETED');
  });

  it('当找不到主线程时抛出 ExecutionError', async () => {
    const childThreadIds = ['child-thread'];
    const joinStrategy: JoinStrategy = 'ALL_COMPLETED';

    mockChildContext.thread.status = 'COMPLETED';
    mockChildContext.thread.forkJoinContext = { forkPathId: 'other-path', forkId: 'fork-1' };

    const threads = new Map<string, ThreadContext>([
      ['parent-thread', mockParentContext],
      ['child-thread', mockChildContext]
    ]);
    mockThreadRegistry = createMockThreadRegistry(threads);

    const mockConversationManager = {
      getMessages: vi.fn(),
      addMessage: vi.fn()
    };
    Object.defineProperty(mockParentContext, 'conversationManager', { value: mockConversationManager, configurable: true });
    Object.defineProperty(mockChildContext, 'conversationManager', { value: mockConversationManager, configurable: true });

    await expect(join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    )).rejects.toThrow(ExecutionError);

    await expect(join(
      childThreadIds,
      joinStrategy,
      mockThreadRegistry,
      'main-path',
      0,
      'parent-thread',
      mockEventManager
    )).rejects.toThrow('Main thread not found for mainPathId: main-path');
  });
});

describe('copy', () => {
  let mockSourceContext: ThreadContext;
  let mockThreadBuilder: ThreadBuilder;
  let mockEventManager: EventManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSourceContext = createMockThreadContext('source-thread');
    mockThreadBuilder = createMockThreadBuilder();
    mockEventManager = createMockEventManager();
  });

  it('应该成功创建线程副本', async () => {
    const copiedContext = await copy(mockSourceContext, mockThreadBuilder, mockEventManager);

    expect(copiedContext).toBeDefined();
    expect(mockThreadBuilder.createCopy).toHaveBeenCalledWith(mockSourceContext);
  });

  it('应该触发 THREAD_COPY_STARTED 事件', async () => {
    await copy(mockSourceContext, mockThreadBuilder, mockEventManager);

    expect(buildThreadCopyStartedEvent).toHaveBeenCalledWith(mockSourceContext);
    expect(safeEmit).toHaveBeenCalledWith(mockEventManager, expect.anything());
  });

  it('应该触发 THREAD_COPY_COMPLETED 事件', async () => {
    await copy(mockSourceContext, mockThreadBuilder, mockEventManager);

    expect(buildThreadCopyCompletedEvent).toHaveBeenCalledWith(mockSourceContext, 'copied-thread');
    expect(safeEmit).toHaveBeenCalledWith(mockEventManager, expect.anything());
  });

  it('当源线程上下文为 null 时抛出 ExecutionError', async () => {
    await expect(copy(null as any, mockThreadBuilder, mockEventManager))
      .rejects
      .toThrow(ExecutionError);

    await expect(copy(null as any, mockThreadBuilder, mockEventManager))
      .rejects
      .toThrow('Source thread context is null or undefined');
  });

  it('在没有 EventManager 时也能工作', async () => {
    await expect(copy(mockSourceContext, mockThreadBuilder, undefined))
      .resolves
      .toBeDefined();
  });
});
