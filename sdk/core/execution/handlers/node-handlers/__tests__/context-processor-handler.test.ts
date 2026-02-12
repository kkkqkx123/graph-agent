/**
 * ContextProcessor节点处理函数单元测试
 */

import { contextProcessorHandler } from '../context-processor-handler';
import type { Node, ContextProcessorNodeConfig } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';
import { ValidationError, ExecutionError } from '@modular-agent/types/errors';
import type { LLMMessage } from '@modular-agent/types/llm';

// Mock ConversationManager
class MockConversationManager {
  private messages: LLMMessage[] = [];
  private markMap: {
    originalIndices: number[];
    typeIndices: { system: number[]; user: number[]; assistant: number[]; tool: number[] };
    batchBoundaries: number[];
    boundaryToBatch: number[];
    currentBatch: number
  } = {
    originalIndices: [],
    typeIndices: { system: [], user: [], assistant: [], tool: [] },
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  };
  private hasBeenFiltered = false;

  constructor(messages: LLMMessage[] = []) {
    this.messages = [...messages];
    this.markMap.originalIndices = messages.map((_, index) => index);
    // 初始化类型索引
    messages.forEach((msg, index) => {
      this.markMap.typeIndices[msg.role as keyof typeof this.markMap.typeIndices].push(index);
    });
  }

  getAllMessages(): LLMMessage[] {
    return this.messages;
  }

  getMessages(): LLMMessage[] {
    if (!this.hasBeenFiltered && this.markMap.originalIndices.length > 0) {
      // In initial state or append mode, return all messages
      return this.messages;
    } else if (this.markMap.originalIndices.length === 0) {
      return [];
    } else {
      return this.markMap.originalIndices.map(index => this.messages[index]!);
    }
  }

  getMarkMap() {
    return this.markMap;
  }

  setOriginalIndices(indices: number[]) {
    this.markMap.originalIndices = [...indices];
    this.hasBeenFiltered = true;
  }

  addMessage(message: LLMMessage): number {
    this.messages.push(message);
    return this.messages.length;
  }

  getIndexManager() {
    return {
      reset: () => {
        this.markMap.originalIndices = [];
      },
      startNewBatch: (boundaryIndex: number) => {
        this.markMap.originalIndices = this.markMap.originalIndices.filter(index => index >= boundaryIndex);
      }
    };
  }

  getTypeIndexManager() {
    return {
      getIndicesByRole: (role: string) => {
        return [...this.markMap.typeIndices[role as keyof typeof this.markMap.typeIndices]];
      }
    };
  }

  keepMessageIndices(indices: number[]) {
    const indexSet = new Set(indices);
    // 更新类型索引
    for (const role of ['system', 'user', 'assistant', 'tool'] as const) {
      this.markMap.typeIndices[role] = this.markMap.typeIndices[role].filter(idx => indexSet.has(idx));
    }
  }

  startNewBatchWithInitialTools(boundaryIndex: number) {
    if (boundaryIndex === 0) {
      // 清空所有消息，添加初始工具描述
      this.messages = [{ role: 'system', content: 'Initial tools description' }];
      this.markMap.originalIndices = [0];
      this.markMap.typeIndices = { system: [0], user: [], assistant: [], tool: [] };
    } else {
      // 保留系统消息
      const systemIndices = this.messages
        .map((msg, index) => msg.role === 'system' ? index : -1)
        .filter(index => index !== -1);
      this.markMap.originalIndices = systemIndices;
      this.markMap.typeIndices = {
        system: systemIndices,
        user: [],
        assistant: [],
        tool: []
      };
    }
    this.hasBeenFiltered = true;
    this.markMap.batchBoundaries = [0];
    this.markMap.boundaryToBatch = [0];
    this.markMap.currentBatch = 0;
  }
}

describe('context-processor-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockContext: any;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: []
    };

    // 初始化mock context
    mockContext = {
      conversationManager: new MockConversationManager([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Assistant message 1' },
        { role: 'user', content: 'User message 2' },
        { role: 'assistant', content: 'Assistant message 2' }
      ])
    };
  });

  describe('截断操作测试', () => {
    it('应该正确处理keepFirst配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            keepFirst: 2
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(2);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    it('应该正确处理keepLast配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            keepLast: 2
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(2);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('应该正确处理removeFirst配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            removeFirst: 1
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(4);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('user'); // 第一个system消息被移除
    });

    it('应该正确处理removeLast配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            removeLast: 1
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(4);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(4);
      expect(messages[3].role).toBe('user'); // 最后一个assistant消息被移除
    });

    it('应该正确处理range配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            range: { start: 1, end: 3 }
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(2);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('应该在缺少truncate配置时抛出ValidationError', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate'
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该正确处理按类型过滤的keepLast配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            role: 'user',
            keepLast: 1
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(1);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('User message 2');
    });

    it('应该正确处理按类型过滤的keepFirst配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            role: 'assistant',
            keepFirst: 1
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(1);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Assistant message 1');
    });

    it('应该正确处理按类型过滤的range配置', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            role: 'user',
            range: { start: 0, end: 1 }
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('truncate');
      expect(result.messageCount).toBe(1);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('User message 1');
    });
  });

  describe('插入操作测试', () => {
    it('应该正确处理在末尾插入消息', async () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New user message' };
      
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'insert',
          insert: {
            position: -1,
            messages: [newMessage]
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('insert');
      expect(result.messageCount).toBe(6);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(6);
      expect(messages[5].content).toBe('New user message');
    });

    it('应该正确处理在指定位置插入消息', async () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Inserted message' };
      
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'insert',
          insert: {
            position: 1,
            messages: [newMessage]
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('insert');
      expect(result.messageCount).toBe(6);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(6);
      expect(messages[1].content).toBe('Inserted message');
      expect(messages[2].content).toBe('User message 1'); // 原来的消息向后移动
    });

    it('应该在缺少insert配置时抛出ValidationError', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'insert'
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('替换操作测试', () => {
    it('应该正确替换指定索引的消息', async () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'replace',
          replace: {
            index: 1,
            message: newMessage
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('replace');
      expect(result.messageCount).toBe(5);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(5);
      expect(messages[1].content).toBe('Replaced message');
    });

    it('应该在索引超出范围时抛出ExecutionError', async () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'replace',
          replace: {
            index: 10,
            message: newMessage
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ExecutionError);
    });

    it('应该在缺少replace配置时抛出ValidationError', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'replace'
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('清空操作测试', () => {
    it('应该保留系统消息并清空其他消息', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'clear',
          clear: {
            keepSystemMessage: true
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('clear');
      expect(result.messageCount).toBe(1);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('system');
    });

    it('应该清空所有消息（包括系统消息）', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'clear',
          clear: {
            keepSystemMessage: false
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('clear');
      expect(result.messageCount).toBe(1); // 应该添加初始工具描述
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(1);
    });
  });

  describe('过滤操作测试', () => {
    it('应该按角色过滤消息', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'filter',
          filter: {
            roles: ['user']
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('filter');
      expect(result.messageCount).toBe(2);

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages.every((msg: LLMMessage) => msg.role === 'user')).toBe(true);
    });

    it('应该按内容关键词过滤（包含）', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'filter',
          filter: {
            contentContains: ['message 1']
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('filter');
      expect(result.messageCount).toBe(2);
      expect(typeof result.executionTime).toBe('number');
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages.every((msg: LLMMessage) => (msg.content as string).includes('message 1'))).toBe(true);
    });

    it('应该按内容关键词过滤（排除）', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'filter',
          filter: {
            contentExcludes: ['message 2']
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      expect(result.operation).toBe('filter');
      expect(result.messageCount).toBe(3);
      expect(typeof result.executionTime).toBe('number');

      const messages = mockContext.conversationManager.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages.every((msg: LLMMessage) => !(msg.content as string).includes('message 2'))).toBe(true);
    });

    it('应该在缺少filter配置时抛出ValidationError', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'filter'
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理不支持的操作类型', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'unsupported' as any
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(contextProcessorHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ExecutionError);
    });

    it('应该正确处理执行时间计算', async () => {
      mockNode = {
        id: 'context-processor-node-1',
        name: 'Context Processor Node',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            keepFirst: 1
          }
        } as ContextProcessorNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await contextProcessorHandler(mockThread, mockNode, mockContext);

      // 执行时间可能为0，但应该是数字类型
      expect(typeof result.executionTime).toBe('number');
    });
  });
});