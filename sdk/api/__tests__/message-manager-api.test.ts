/**
 * MessageManagerAPI 单元测试
 */

import { MessageManagerAPI } from '../management/message-manager-api';
import { threadRegistry } from '../../core/services/thread-registry';
import { ThreadContext } from '../../core/execution/context/thread-context';
import { ConversationManager } from '../../core/execution/conversation';
import type { Thread } from '../../types/thread';
import { ThreadStatus } from '../../types/thread';
import { NotFoundError } from '../../types/errors';
import type { LLMMessage } from '../../types/llm';

describe('MessageManagerAPI', () => {
  let api: MessageManagerAPI;

  beforeEach(() => {
    api = new MessageManagerAPI(threadRegistry);
  });

  /**
   * 创建测试线程
   */
  async function createTestThread(
    messages: LLMMessage[] = []
  ): Promise<string> {
    const { ThreadContext } = await import('../../core/execution/context/thread-context');
    const { ConversationManager } = await import('../../core/execution/conversation');
    const { generateId } = await import('../../utils');
    const { GraphBuilder } = await import('../../core/graph/graph-builder');
    const { NodeType } = await import('../../types/node');
    const { EdgeType } = await import('../../types/edge');

    const threadId = generateId();

    // 创建简单的工作流定义
    const workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: NodeType.START,
          config: {},
          incomingEdgeIds: [],
          outgoingEdgeIds: ['edge1']
        },
        {
          id: 'end',
          name: 'End',
          type: NodeType.END,
          config: {},
          incomingEdgeIds: ['edge1'],
          outgoingEdgeIds: []
        }
      ],
      edges: [
        {
          id: 'edge1',
          sourceNodeId: 'start',
          targetNodeId: 'end',
          type: EdgeType.DEFAULT,
          condition: undefined
        }
      ]
    };

    const graph = GraphBuilder.build(workflow);
    const conversationManager = new ConversationManager({
      threadId,
      workflowId: 'test-workflow'
    });

    // 添加测试消息
    for (const message of messages) {
      conversationManager.addMessage(message);
    }

    const thread = {
      id: threadId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: ThreadStatus.RUNNING,
      currentNodeId: 'start',
      graph,
      variables: [],
      variableValues: {},
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: Date.now(),
      errors: []
    };

    const threadContext = new ThreadContext(thread, conversationManager, threadRegistry);
    threadRegistry.register(threadContext);

    return threadId;
  }

  describe('getMessages', () => {
    it('应该成功获取消息列表', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.getMessages(threadId);

      expect(result).toHaveLength(3);
      expect(result[0]?.role).toBe('system');
      expect(result[1]?.role).toBe('user');
      expect(result[2]?.role).toBe('assistant');
    });

    it('应该支持分页查询', async () => {
      const messages: LLMMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      }));

      const threadId = await createTestThread(messages);

      const result = await api.getMessages(threadId, { offset: 5, limit: 3 });

      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Message 5');
    });

    it('应该支持倒序排列', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'user', content: 'Second' },
        { role: 'user', content: 'Third' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.getMessages(threadId, { orderBy: 'desc' });

      expect(result[0]?.content).toBe('Third');
      expect(result[2]?.content).toBe('First');
    });

    it('应该在线程不存在时抛出错误', async () => {
      await expect(api.getMessages('non-existent-thread')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllMessages', () => {
    it('应该获取所有消息（包括压缩的）', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.getAllMessages(threadId);

      expect(result).toHaveLength(2);
    });
  });

  describe('searchMessages', () => {
    it('应该成功搜索包含关键词的消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello world' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'Goodbye world' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.searchMessages(threadId, 'world');

      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('Hello world');
      expect(result[1]?.content).toBe('Goodbye world');
    });

    it('应该不区分大小写搜索', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'HELLO' },
        { role: 'assistant', content: 'hello' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.searchMessages(threadId, 'hello');

      expect(result).toHaveLength(2);
    });

    it('应该在没有匹配时返回空数组', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.searchMessages(threadId, 'nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterMessages', () => {
    it('应该按角色过滤消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User 1' },
        { role: 'assistant', content: 'Assistant' },
        { role: 'user', content: 'User 2' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.filterMessages(threadId, { role: 'user' });

      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.role === 'user')).toBe(true);
    });

    it('应该按关键词过滤消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello world' },
        { role: 'user', content: 'Goodbye' },
        { role: 'user', content: 'Hello again' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.filterMessages(threadId, { keyword: 'Hello' });

      expect(result).toHaveLength(2);
    });

    it('应该支持组合过滤条件', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Goodbye' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.filterMessages(threadId, {
        role: 'user',
        keyword: 'Hello'
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('user');
      expect(result[0]?.content).toBe('Hello');
    });
  });

  describe('getMessageStats', () => {
    it('应该正确统计消息数量', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User 1' },
        { role: 'user', content: 'User 2' },
        { role: 'assistant', content: 'Assistant' },
        { role: 'tool', content: 'Tool result' }
      ];

      const threadId = await createTestThread(messages);

      const stats = await api.getMessageStats(threadId);

      expect(stats.totalMessages).toBe(5);
      expect(stats.systemMessages).toBe(1);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.toolMessages).toBe(1);
    });

    it('应该在线程不存在时抛出错误', async () => {
      await expect(api.getMessageStats('non-existent-thread')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTokenUsage', () => {
    it('应该返回Token使用统计', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const threadId = await createTestThread(messages);

      const stats = await api.getTokenUsage(threadId);

      expect(stats).toBeDefined();
      expect(stats.totalTokens).toBeGreaterThanOrEqual(0);
      expect(stats.promptTokens).toBeGreaterThanOrEqual(0);
      expect(stats.completionTokens).toBeGreaterThanOrEqual(0);
    });

    it('应该在没有Token使用时返回0', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const threadId = await createTestThread(messages);

      const stats = await api.getTokenUsage(threadId);

      expect(stats.totalTokens).toBe(0);
      expect(stats.promptTokens).toBe(0);
      expect(stats.completionTokens).toBe(0);
    });
  });

  describe('exportMessages', () => {
    it('应该导出JSON格式', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];

      const threadId = await createTestThread(messages);

      const exported = await api.exportMessages(threadId, 'json');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]?.role).toBe('user');
    });

    it('应该导出CSV格式', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];

      const threadId = await createTestThread(messages);

      const exported = await api.exportMessages(threadId, 'csv');

      expect(exported).toBeDefined();
      expect(exported).toContain('role,content');
      expect(exported).toContain('user,"Hello"');
      expect(exported).toContain('assistant,"Hi"');
    });

    it('应该正确转义CSV中的特殊字符', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello "world"' }
      ];

      const threadId = await createTestThread(messages);

      const exported = await api.exportMessages(threadId, 'csv');

      expect(exported).toContain('Hello ""world""');
    });

    it('应该在不支持的格式时抛出错误', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const threadId = await createTestThread(messages);

      await expect(api.exportMessages(threadId, 'xml' as any)).rejects.toThrow();
    });
  });

  describe('clearMessages', () => {
    it('应该清空所有消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' }
      ];

      const threadId = await createTestThread(messages);

      await api.clearMessages(threadId, false);

      const result = await api.getMessages(threadId);
      expect(result).toHaveLength(0);
    });

    it('应该保留系统消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' }
      ];

      const threadId = await createTestThread(messages);

      await api.clearMessages(threadId, true);

      const result = await api.getAllMessages(threadId);
      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('system');
    });
  });

  describe('getRecentMessages', () => {
    it('应该获取最近N条消息', async () => {
      const messages: LLMMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      }));

      const threadId = await createTestThread(messages);

      const result = await api.getRecentMessages(threadId, 3);

      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Message 7');
      expect(result[2]?.content).toBe('Message 9');
    });

    it('应该在N大于消息总数时返回所有消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'user', content: 'Message 2' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.getRecentMessages(threadId, 10);

      expect(result).toHaveLength(2);
    });
  });

  describe('getMessagesByRole', () => {
    it('应该按角色获取消息', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User 1' },
        { role: 'assistant', content: 'Assistant' },
        { role: 'user', content: 'User 2' }
      ];

      const threadId = await createTestThread(messages);

      const result = await api.getMessagesByRole(threadId, 'user');

      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.role === 'user')).toBe(true);
    });
  });

  describe('getMessagesByRange', () => {
    it('应该获取指定索引范围的消息', async () => {
      const messages: LLMMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      }));

      const threadId = await createTestThread(messages);

      const result = await api.getMessagesByRange(threadId, 3, 6);

      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Message 3');
      expect(result[2]?.content).toBe('Message 5');
    });
  });
});