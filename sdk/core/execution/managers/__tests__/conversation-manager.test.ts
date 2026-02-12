import { ConversationManager, ConversationManagerOptions } from '../conversation-manager';
import { ValidationError } from '@modular-agent/types/errors';
import type { LLMMessage } from '@modular-agent/types/llm';
import { EventManager } from '../../../services/event-manager';

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  let mockMessages: LLMMessage[];

  beforeEach(() => {
    mockMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there! How can I help you?' }
    ];
    
    conversationManager = new ConversationManager();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(conversationManager).toBeDefined();
    });

    it('should accept options', () => {
      const options: ConversationManagerOptions = {
        tokenLimit: 1000,
        eventManager: new EventManager(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };
      
      const manager = new ConversationManager(options);
      expect(manager).toBeDefined();
    });
  });

  describe('addMessage', () => {
    it('should add a valid message', () => {
      const message: LLMMessage = { role: 'user', content: 'Test message' };
      const length = conversationManager.addMessage(message);
      
      expect(length).toBe(1);
      expect(conversationManager.getMessages()).toEqual([message]);
    });

    it('should throw ValidationError for invalid message', () => {
      expect(() => {
        conversationManager.addMessage({} as LLMMessage);
      }).toThrow(ValidationError);
      
      expect(() => {
        conversationManager.addMessage({ role: 'user' } as LLMMessage);
      }).toThrow(ValidationError);
      
      expect(() => {
        conversationManager.addMessage({ content: 'test' } as LLMMessage);
      }).toThrow(ValidationError);
    });

    it('should not mutate original message', () => {
      const originalMessage: LLMMessage = { role: 'user', content: 'Test' };
      conversationManager.addMessage(originalMessage);
      
      // Modify original message
      (originalMessage as any).modified = true;
      
      // Get stored message
      const storedMessage = conversationManager.getMessages()[0];
      
      // Should not have the modified property
      expect((storedMessage as any).modified).toBeUndefined();
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages', () => {
      const length = conversationManager.addMessages(...mockMessages);
      
      expect(length).toBe(3);
      expect(conversationManager.getMessages()).toEqual(mockMessages);
    });

    it('should handle empty array', () => {
      const length = conversationManager.addMessages();
      expect(length).toBe(0);
    });
  });

  describe('getMessages', () => {
    it('should return uncompressed messages', () => {
      conversationManager.addMessages(...mockMessages);
      
      const messages = conversationManager.getMessages();
      expect(messages).toEqual(mockMessages);
    });

    it('should return empty array when no messages', () => {
      const messages = conversationManager.getMessages();
      expect(messages).toEqual([]);
    });
  });

  describe('getAllMessages', () => {
    it('should return all messages including compressed ones', () => {
      conversationManager.addMessages(...mockMessages);
      
      const messages = conversationManager.getAllMessages();
      expect(messages).toEqual(mockMessages);
    });
  });

  describe('getMessagesByRange', () => {
    it('should return messages in specified range', () => {
      conversationManager.addMessages(...mockMessages);
      
      const messages = conversationManager.getMessagesByRange(1, 3);
      expect(messages).toEqual(mockMessages.slice(1, 3));
    });

    it('should handle out of bounds range', () => {
      conversationManager.addMessages(...mockMessages);
      
      const messages = conversationManager.getMessagesByRange(5, 10);
      expect(messages).toEqual([]);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages when keepSystemMessage is false', () => {
      conversationManager.addMessages(...mockMessages);
      conversationManager.clearMessages(false);
      
      expect(conversationManager.getMessages()).toEqual([]);
    });

    it('should keep system message when keepSystemMessage is true', () => {
      conversationManager.addMessages(...mockMessages);
      conversationManager.clearMessages(true);
      
      expect(conversationManager.getAllMessages()).toEqual([mockMessages[0]]);
    });

    it('should clear all messages when first message is not system', () => {
      const nonSystemMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi!' }
      ];
      
      conversationManager.addMessages(...nonSystemMessages);
      conversationManager.clearMessages(true);
      
      expect(conversationManager.getMessages()).toEqual([]);
    });
  });

  describe('token usage methods', () => {
    it('should update token usage', () => {
      const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      conversationManager.updateTokenUsage(usage);
      conversationManager.finalizeCurrentRequest();
      
      const tokenUsage = conversationManager.getTokenUsage();
      expect(tokenUsage).not.toBeNull();
      expect(tokenUsage!.totalTokens).toBe(15);
    });

    it('should accumulate stream usage', () => {
      const usage1 = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      const usage2 = { promptTokens: 0, completionTokens: 3, totalTokens: 3 };
      
      conversationManager.accumulateStreamUsage(usage1);
      conversationManager.accumulateStreamUsage(usage2);
      
      conversationManager.finalizeCurrentRequest();
      
      const tokenUsage = conversationManager.getTokenUsage();
      expect(tokenUsage).not.toBeNull();
      // accumulateStreamUsage overwrites the current usage, so the final value is from usage2
      expect(tokenUsage!.totalTokens).toBe(3);
    });

    it('should get token usage history', () => {
      const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      conversationManager.updateTokenUsage(usage);
      conversationManager.finalizeCurrentRequest();
      
      const history = conversationManager.getUsageHistory();
      expect(history.length).toBe(1);
      expect(history[0]?.totalTokens).toBe(15);
    });
  });

  describe('message filtering methods', () => {
    beforeEach(() => {
      conversationManager.addMessages(...mockMessages);
    });

    it('should get recent messages', () => {
      const recent = conversationManager.getRecentMessages(2);
      expect(recent).toEqual(mockMessages.slice(-2));
    });

    it('should filter messages by role', () => {
      const userMessages = conversationManager.filterMessagesByRole('user');
      expect(userMessages).toEqual([mockMessages[1]]);
      
      const assistantMessages = conversationManager.filterMessagesByRole('assistant');
      expect(assistantMessages).toEqual([mockMessages[2]]);
    });
  });

  describe('type-based message methods', () => {
    beforeEach(() => {
      conversationManager.addMessages(...mockMessages);
    });

    it('should get messages by role', () => {
      const systemMessages = conversationManager.getMessagesByRole('system');
      expect(systemMessages).toEqual([mockMessages[0]]);
      
      const userMessages = conversationManager.getMessagesByRole('user');
      expect(userMessages).toEqual([mockMessages[1]]);
      
      const assistantMessages = conversationManager.getMessagesByRole('assistant');
      expect(assistantMessages).toEqual([mockMessages[2]]);
    });

    it('should get recent messages by role', () => {
      // 添加更多用户消息
      conversationManager.addMessage({ role: 'user', content: 'User message 2' });
      conversationManager.addMessage({ role: 'user', content: 'User message 3' });
      
      const recentUserMessages = conversationManager.getRecentMessagesByRole('user', 2);
      expect(recentUserMessages.length).toBe(2);
      expect(recentUserMessages[0]?.content).toBe('User message 2');
      expect(recentUserMessages[1]?.content).toBe('User message 3');
    });

    it('should get messages by role range', () => {
      // 添加更多助手消息
      conversationManager.addMessage({ role: 'assistant', content: 'Assistant message 2' });
      conversationManager.addMessage({ role: 'assistant', content: 'Assistant message 3' });
      
      const assistantMessages = conversationManager.getMessagesByRoleRange('assistant', 0, 2);
      expect(assistantMessages.length).toBe(2);
      expect(assistantMessages[0]?.content).toBe('Hi there! How can I help you?');
      expect(assistantMessages[1]?.content).toBe('Assistant message 2');
    });

    it('should get message count by role', () => {
      expect(conversationManager.getMessageCountByRole('system')).toBe(1);
      expect(conversationManager.getMessageCountByRole('user')).toBe(1);
      expect(conversationManager.getMessageCountByRole('assistant')).toBe(1);
      expect(conversationManager.getMessageCountByRole('tool')).toBe(0);
    });

    it('should handle empty role queries', () => {
      const toolMessages = conversationManager.getMessagesByRole('tool');
      expect(toolMessages).toEqual([]);
      
      const recentToolMessages = conversationManager.getRecentMessagesByRole('tool', 5);
      expect(recentToolMessages).toEqual([]);
      
      expect(conversationManager.getMessageCountByRole('tool')).toBe(0);
    });
  });

  describe('type index management', () => {
    it('should get type index manager', () => {
      const typeIndexManager = conversationManager.getTypeIndexManager();
      expect(typeIndexManager).toBeDefined();
    });

    it('should remove message indices', () => {
      conversationManager.addMessages(...mockMessages);
      
      conversationManager.removeMessageIndices([1]);
      
      expect(conversationManager.getMessageCountByRole('user')).toBe(0);
      expect(conversationManager.getMessageCountByRole('system')).toBe(1);
      expect(conversationManager.getMessageCountByRole('assistant')).toBe(1);
    });

    it('should keep message indices', () => {
      conversationManager.addMessages(...mockMessages);
      
      conversationManager.keepMessageIndices([0, 2]);
      
      expect(conversationManager.getMessageCountByRole('system')).toBe(1);
      expect(conversationManager.getMessageCountByRole('user')).toBe(0);
      expect(conversationManager.getMessageCountByRole('assistant')).toBe(1);
    });
  });

  describe('index management', () => {
    it('should get mark map', () => {
      const markMap = conversationManager.getMarkMap();
      expect(markMap).toBeDefined();
      expect(markMap.originalIndices).toEqual([]);
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);
    });

    it('should rollback to batch', () => {
      // Add some messages and simulate batches
      conversationManager.addMessages(...mockMessages);
      
      // This should not throw an error
      conversationManager.rollbackToBatch(0);
      
      // Verify messages are still there (rollback doesn't remove messages in this implementation)
      expect(conversationManager.getAllMessages().length).toBe(3);
    });
  });

  describe('clone', () => {
    it('should create a clone with same messages', () => {
      conversationManager.addMessages(...mockMessages);
      
      const cloned = conversationManager.clone();
      
      expect(cloned.getMessages()).toEqual(conversationManager.getMessages());
      expect(cloned).not.toBe(conversationManager);
    });

    it('should clone type index manager', () => {
      conversationManager.addMessages(...mockMessages);
      
      const cloned = conversationManager.clone();
      
      // 修改原始管理器
      conversationManager.addMessage({ role: 'user', content: 'New message' });
      
      // 克隆的管理器应该不受影响
      expect(conversationManager.getMessageCountByRole('user')).toBe(2);
      expect(cloned.getMessageCountByRole('user')).toBe(1);
    });
  });

  describe('snapshot methods', () => {
    it('should create and restore snapshot', () => {
      conversationManager.addMessages(...mockMessages);
      
      const snapshot = conversationManager.createSnapshot();
      expect(snapshot.messages).toEqual(mockMessages);
      
      // Clear and restore
      conversationManager.clearMessages(false);
      conversationManager.restoreFromSnapshot(snapshot);
      
      expect(conversationManager.getMessages()).toEqual(mockMessages);
    });
  });

  describe('cleanup', () => {
    it('should clear all messages and token stats', () => {
      conversationManager.addMessages(...mockMessages);
      const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      conversationManager.updateTokenUsage(usage);
      
      conversationManager.cleanup();
      
      expect(conversationManager.getMessages()).toEqual([]);
      expect(conversationManager.getTokenUsage()).toBeNull();
    });
  });

  describe('tool description methods', () => {
    it('should check if tool description message exists', () => {
      // No tool description message initially
      expect((conversationManager as any).hasToolDescriptionMessage()).toBe(false);
      
      // Add tool description message
      conversationManager.addMessage({
        role: 'system',
        content: '可用工具:\n- testTool: Test tool description'
      });
      
      expect((conversationManager as any).hasToolDescriptionMessage()).toBe(true);
    });

    it('should get initial tool description message', () => {
      // Mock tool service and available tools
      const mockToolService = {
        getTool: jest.fn().mockReturnValue({
          name: 'testTool',
          description: 'Test tool description'
        })
      };
      
      const managerWithOptions = new ConversationManager({
        toolService: mockToolService,
        availableTools: {
          initial: new Set(['tool1', 'tool2'])
        }
      });
      
      const toolMessage = (managerWithOptions as any).getInitialToolDescriptionMessage();
      expect(toolMessage).toBeDefined();
      expect(toolMessage!.role).toBe('system');
      expect(toolMessage!.content).toContain('可用工具:');
    });

    it('should start new batch with initial tools', () => {
      const mockToolService = {
        getTool: jest.fn().mockReturnValue({
          name: 'testTool',
          description: 'Test tool description'
        })
      };
      
      const managerWithOptions = new ConversationManager({
        toolService: mockToolService,
        availableTools: {
          initial: new Set(['tool1'])
        }
      });
      
      // Should add tool description message when starting new batch
      managerWithOptions.startNewBatchWithInitialTools(0);
      
      const messages = managerWithOptions.getAllMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]?.role).toBe('system');
      expect(messages[0]?.content).toContain('可用工具:');
    });
  });
});