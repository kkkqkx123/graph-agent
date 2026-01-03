import { Session } from '../session';
import { SessionStatus, SessionConfig } from '../../value-objects';
import { Thread } from '../../../threads/entities/thread';
import { ID, Timestamp, Version } from '../../../common/value-objects';
import { ForkStrategy } from '../../value-objects/operations/fork/fork-strategy';
import { ForkOptions } from '../../value-objects/operations/fork/fork-context';
import { NodeId } from '../../../workflow/value-objects';
import { PromptContext } from '../../../workflow/value-objects/context/prompt-context';
import { ExecutionContext } from '../../../threads/value-objects/execution-context';
import { ThreadStatus, ThreadPriority, ThreadDefinition, ThreadExecution } from '../../../threads/value-objects';

/**
 * 创建测试用的 Thread
 */
function createTestThread(sessionId: ID, workflowId: ID, title?: string, description?: string): Thread {
  const now = Timestamp.now();
  const threadId = ID.generate();
  const threadPriority = ThreadPriority.normal();
  const threadStatus = ThreadStatus.pending();
  
  // 创建线程定义值对象
  const definition = ThreadDefinition.create(
    threadId,
    sessionId,
    workflowId,
    threadPriority,
    title,
    description,
    {}
  );
  
  // 创建执行上下文
  const promptContext = PromptContext.create('test template');
  const context = ExecutionContext.create(promptContext);
  
  // 创建线程执行值对象
  const execution = ThreadExecution.create(threadId, context);
  
  const props = {
    id: threadId,
    sessionId,
    workflowId,
    status: threadStatus,
    priority: threadPriority,
    title,
    description,
    metadata: {},
    definition,
    execution,
    createdAt: now,
    updatedAt: now,
    version: Version.initial(),
    isDeleted: false
  };
  
  return Thread.fromProps(props);
}

describe('Session - 线程生命周期管理', () => {
  let session: Session;
  let thread1: Thread;
  let thread2: Thread;

  beforeEach(() => {
    const userId = ID.generate();
    session = Session.create(userId, '测试会话');
    
    const sessionId = session.sessionId;
    const workflowId = ID.generate();
    
    thread1 = createTestThread(sessionId, workflowId, '线程1', '测试线程1');
    thread2 = createTestThread(sessionId, workflowId, '线程2', '测试线程2');
  });

  describe('添加线程', () => {
    it('应该成功添加线程', () => {
      session.addThread(thread1);
      
      expect(session.threadCount).toBe(1);
      expect(session.hasThread(thread1.threadId.toString())).toBe(true);
      expect(session.getThread(thread1.threadId.toString())).toBe(thread1);
    });

    it('应该拒绝添加已存在的线程', () => {
      session.addThread(thread1);
      
      expect(() => {
        session.addThread(thread1);
      }).toThrow('线程已存在');
    });

    it('应该拒绝在已删除的会话中添加线程', () => {
      session.markAsDeleted();
      
      expect(() => {
        session.addThread(thread1);
      }).toThrow('无法在已删除的会话中添加线程');
    });

    it('应该拒绝在非活跃状态的会话中添加线程', () => {
      session.changeStatus(SessionStatus.terminated());
      
      expect(() => {
        session.addThread(thread1);
      }).toThrow('无法在非活跃状态的会话中添加线程');
    });

    it('应该拒绝超过线程数量限制', () => {
      const config = SessionConfig.create({ maxThreads: 2 });
      session.updateConfig(config);
      
      session.addThread(thread1);
      session.addThread(thread2);
      
      const thread3 = createTestThread(session.sessionId, ID.generate());
      expect(() => {
        session.addThread(thread3);
      }).toThrow('会话线程数量已达上限');
    });
  });

  describe('移除线程', () => {
    beforeEach(() => {
      session.addThread(thread1);
      session.addThread(thread2);
    });

    it('应该成功移除线程', () => {
      // 完成线程1，使其可以被删除
      thread1.start();
      thread1.complete();
      
      session.removeThread(thread1.threadId.toString());
      
      expect(session.threadCount).toBe(1);
      expect(session.hasThread(thread1.threadId.toString())).toBe(false);
    });

    it('应该拒绝移除不存在的线程', () => {
      expect(() => {
        session.removeThread('non-existent-thread-id');
      }).toThrow('线程不存在');
    });

    it('应该拒绝移除活跃状态的线程', () => {
      thread1.start();
      
      expect(() => {
        session.removeThread(thread1.threadId.toString());
      }).toThrow('无法删除活跃状态的线程');
    });

    it('应该允许移除已完成状态的线程', () => {
      thread1.start();
      thread1.complete();
      
      expect(() => {
        session.removeThread(thread1.threadId.toString());
      }).not.toThrow();
    });
  });

  describe('线程统计', () => {
    beforeEach(() => {
      session.addThread(thread1);
      session.addThread(thread2);
    });

    it('应该正确统计活跃线程数量', () => {
      thread1.start();
      thread2.start();
      
      expect(session.getActiveThreadCount()).toBe(2);
    });

    it('应该正确统计已完成线程数量', () => {
      thread1.start();
      thread1.complete();
      thread2.start();
      thread2.complete();
      
      expect(session.getCompletedThreadCount()).toBe(2);
    });

    it('应该正确统计失败线程数量', () => {
      thread1.start();
      thread1.fail('测试失败');
      thread2.start();
      thread2.fail('测试失败2');
      
      expect(session.getFailedThreadCount()).toBe(2);
    });

    it('应该正确判断是否所有线程都已完成', () => {
      thread1.start();
      thread1.complete();
      
      expect(session.areAllThreadsCompleted()).toBe(false);
      
      thread2.start();
      thread2.complete();
      
      expect(session.areAllThreadsCompleted()).toBe(true);
    });

    it('应该正确判断是否有活跃线程', () => {
      // 创建一个新的空session来测试
      const emptySession = Session.create(ID.generate(), '空会话');
      
      // 初始状态没有活跃线程
      expect(emptySession.hasActiveThreads()).toBe(false);
      
      // 添加pending状态的线程后仍然没有活跃线程
      emptySession.addThread(thread1);
      expect(emptySession.hasActiveThreads()).toBe(false);
      
      // 启动线程后才有活跃线程
      thread1.start();
      expect(emptySession.hasActiveThreads()).toBe(true);
    });
  });
});

describe('Session - Fork 线程', () => {
  let session: Session;
  let parentThread: Thread;

  beforeEach(() => {
    const userId = ID.generate();
    session = Session.create(userId, '测试会话');
    
    const sessionId = session.sessionId;
    const workflowId = ID.generate();
    
    parentThread = createTestThread(sessionId, workflowId, '父线程', '测试父线程');
    parentThread.start();
    
    session.addThread(parentThread);
  });

  it('应该成功 fork 线程', () => {
    const forkPoint = new NodeId(ID.generate().value);
    const forkStrategy = ForkStrategy.createPartial();
    const forkOptions = ForkOptions.createDefault();
    
    const forkedThread = session.forkThread(
      parentThread.threadId.toString(),
      forkPoint,
      forkStrategy,
      forkOptions
    );
    
    expect(forkedThread).toBeDefined();
    expect(session.threadCount).toBe(2);
    expect(forkedThread.title).toContain('Fork');
  });

  it('应该拒绝 fork 不存在的线程', () => {
    const forkPoint = new NodeId(ID.generate().value);
    const forkStrategy = ForkStrategy.createPartial();
    const forkOptions = ForkOptions.createDefault();
    
    expect(() => {
      session.forkThread('non-existent-thread-id', forkPoint, forkStrategy, forkOptions);
    }).toThrow('父线程不存在');
  });

  it('应该拒绝在已删除的会话中 fork 线程', () => {
    session.markAsDeleted();
    
    const forkPoint = new NodeId(ID.generate().value);
    const forkStrategy = ForkStrategy.createPartial();
    const forkOptions = ForkOptions.createDefault();
    
    expect(() => {
      session.forkThread(parentThread.threadId.toString(), forkPoint, forkStrategy, forkOptions);
    }).toThrow('无法在已删除的会话中fork线程');
  });

  it('应该拒绝超过线程数量限制', () => {
    const config = SessionConfig.create({ maxThreads: 1 });
    session.updateConfig(config);
    
    const forkPoint = new NodeId(ID.generate().value);
    const forkStrategy = ForkStrategy.createPartial();
    const forkOptions = ForkOptions.createDefault();
    
    expect(() => {
      session.forkThread(parentThread.threadId.toString(), forkPoint, forkStrategy, forkOptions);
    }).toThrow('会话线程数量已达上限');
  });
});

describe('Session - 资源协调', () => {
  let session: Session;

  beforeEach(() => {
    const userId = ID.generate();
    session = Session.create(userId, '测试会话');
  });

  it('应该成功设置共享资源', () => {
    session.setSharedResource('key1', 'value1');
    session.setSharedResource('key2', { data: 'test' });
    
    expect(session.getSharedResource('key1')).toBe('value1');
    expect(session.getSharedResource('key2')).toEqual({ data: 'test' });
  });

  it('应该成功更新已存在的共享资源', () => {
    session.setSharedResource('key1', 'value1');
    session.setSharedResource('key1', 'value2');
    
    expect(session.getSharedResource('key1')).toBe('value2');
  });

  it('应该成功移除共享资源', () => {
    session.setSharedResource('key1', 'value1');
    session.removeSharedResource('key1');
    
    expect(session.hasSharedResource('key1')).toBe(false);
  });

  it('应该拒绝移除不存在的共享资源', () => {
    expect(() => {
      session.removeSharedResource('non-existent-key');
    }).toThrow('共享资源不存在');
  });

  it('应该拒绝在已删除的会话中设置共享资源', () => {
    session.markAsDeleted();
    
    expect(() => {
      session.setSharedResource('key1', 'value1');
    }).toThrow('无法在已删除的会话中设置共享资源');
  });

  it('应该正确获取所有共享资源', () => {
    session.setSharedResource('key1', 'value1');
    session.setSharedResource('key2', 'value2');
    
    const resources = session.getSharedResources();
    expect(resources.size).toBe(2);
    expect(resources.get('key1')).toBe('value1');
    expect(resources.get('key2')).toBe('value2');
  });
});

describe('Session - 线程间通信', () => {
  let session: Session;
  let thread1: Thread;
  let thread2: Thread;

  beforeEach(() => {
    const userId = ID.generate();
    session = Session.create(userId, '测试会话');
    
    const sessionId = session.sessionId;
    const workflowId = ID.generate();
    
    thread1 = createTestThread(sessionId, workflowId, '线程1', '测试线程1');
    thread2 = createTestThread(sessionId, workflowId, '线程2', '测试线程2');
    
    session.addThread(thread1);
    session.addThread(thread2);
  });

  it('应该成功发送线程间消息', () => {
    const messageId = session.sendMessage(
      thread1.threadId,
      thread2.threadId,
      'data',
      { message: 'Hello from thread1' }
    );
    
    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
  });

  it('应该正确统计未读消息数量', () => {
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'Hello' });
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'World' });
    
    const unreadCount = session.getUnreadMessageCount(thread2.threadId);
    expect(unreadCount).toBe(2);
  });

  it('应该正确获取线程的消息', () => {
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'Hello' });
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'World' });
    
    const messages = session.getMessagesForThread(thread2.threadId, false);
    expect(messages.length).toBe(2);
  });

  it('应该成功广播消息到所有线程', () => {
    const messageIds = session.broadcastMessage(
      thread1.threadId,
      'data',
      { message: 'Broadcast' }
    );
    
    expect(messageIds.length).toBe(1); // 只有 thread2 接收到消息
  });

  it('应该成功标记消息为已读', () => {
    const messageId = session.sendMessage(
      thread1.threadId,
      thread2.threadId,
      'data',
      { message: 'Hello' }
    );
    
    session.markMessageAsRead(messageId);
    
    const unreadCount = session.getUnreadMessageCount(thread2.threadId);
    expect(unreadCount).toBe(0);
  });

  it('应该成功标记线程的所有消息为已读', () => {
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'Hello' });
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'World' });
    
    session.markAllMessagesAsRead(thread2.threadId);
    
    const unreadCount = session.getUnreadMessageCount(thread2.threadId);
    expect(unreadCount).toBe(0);
  });

  it('应该正确检查线程是否有未读消息', () => {
    expect(session.hasUnreadMessages(thread2.threadId)).toBe(false);
    
    session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'Hello' });
    
    expect(session.hasUnreadMessages(thread2.threadId)).toBe(true);
  });

  it('应该拒绝发送消息给不存在的线程', () => {
    const nonExistentThreadId = ID.generate();
    
    expect(() => {
      session.sendMessage(thread1.threadId, nonExistentThreadId, 'data', { message: 'Hello' });
    }).toThrow('接收线程不存在');
  });

  it('应该拒绝在已删除的会话中发送消息', () => {
    session.markAsDeleted();
    
    expect(() => {
      session.sendMessage(thread1.threadId, thread2.threadId, 'data', { message: 'Hello' });
    }).toThrow('无法在已删除的会话中发送消息');
  });
});

describe('Session - 并行策略', () => {
  let session: Session;

  beforeEach(() => {
    const userId = ID.generate();
    session = Session.create(userId, '测试会话', undefined, undefined, 'sequential');
  });

  it('应该正确获取并行策略', () => {
    expect(session.parallelStrategy).toBe('sequential');
  });

  it('应该成功更新并行策略', () => {
    session.updateParallelStrategy('parallel');
    expect(session.parallelStrategy).toBe('parallel');
    
    session.updateParallelStrategy('hybrid');
    expect(session.parallelStrategy).toBe('hybrid');
  });

  it('应该拒绝在有活跃线程时更改并行策略', () => {
    const thread = createTestThread(session.sessionId, ID.generate());
    session.addThread(thread);
    thread.start();
    
    expect(() => {
      session.updateParallelStrategy('parallel');
    }).toThrow('无法在有活跃线程时更改并行策略');
  });

  it('应该拒绝在已删除的会话中更新并行策略', () => {
    session.markAsDeleted();
    
    expect(() => {
      session.updateParallelStrategy('parallel');
    }).toThrow('无法更新已删除会话的并行策略');
  });
});