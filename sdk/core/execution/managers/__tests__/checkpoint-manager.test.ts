// Mock ExecutionContext to avoid LLMExecutor import
jest.mock('../../context/execution-context', () => {
  return {
    ExecutionContext: {
      createDefault: jest.fn(() => ({
        getEventManager: () => ({}),
        getToolService: () => ({}),
        getLlmExecutor: () => ({ executeLLMCall: () => Promise.resolve({}) })
      }))
    }
  };
});

import { CheckpointManager } from '../checkpoint-manager';
import { MemoryCheckpointStorage } from '../../../storage/memory-checkpoint-storage';
import { ThreadRegistry } from '../../../services/thread-registry';
import { WorkflowRegistry } from '../../../services/workflow-registry';
import { ThreadContext } from '../../context/thread-context';
import { ConversationManager } from '../conversation-manager';
import { ConfigurationError, NotFoundError } from '../../../../types/errors';
import type { Thread, ThreadStatus } from '../../../../types/thread';
import type { LLMMessage } from '../../../../types/llm';
import { GraphData } from '../../../entities/graph-data';
import { NodeType } from '../../../../types/node';
import { EdgeType } from '../../../../types/edge';

// Mock globalMessageStorage
jest.mock('../../../services/global-message-storage', () => {
  const actual = jest.requireActual('../../../services/global-message-storage');
  return {
    ...actual,
    globalMessageStorage: {
      storeMessages: jest.fn(),
      getMessages: jest.fn(),
      addReference: jest.fn()
    }
  };
});

describe('CheckpointManager', () => {
  let checkpointManager: CheckpointManager;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;
  let storage: MemoryCheckpointStorage;
  let mockThread: Thread;
  let mockConversationManager: ConversationManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize registries
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry();
    storage = new MemoryCheckpointStorage();
    
    // Create mock conversation manager
    mockConversationManager = new ConversationManager();
    mockConversationManager.addMessage({ role: 'user', content: 'Hello' });
    mockConversationManager.addMessage({ role: 'assistant', content: 'Hi there!' });
    
    // Create mock thread
    const mockGraph = new GraphData();
    
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: 'RUNNING' as ThreadStatus,
      currentNodeId: 'node-2',
      graph: mockGraph,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: { name: 'test' },
      output: {},
      nodeResults: [
        {
          nodeId: 'node-1',
          nodeType: 'START',
          status: 'COMPLETED',
          step: 1,
          data: { result: 'started' }
        }
      ],
      startTime: Date.now(),
      errors: []
    };
    
    // Create and register thread context
    const threadContext = new ThreadContext(
      mockThread,
      mockConversationManager,
      threadRegistry,
      workflowRegistry,
      {} as any, // eventManager
      {} as any, // toolService
      { executeLLMCall: jest.fn() } as any // llmExecutor
    );
    threadRegistry.register(threadContext);
    
    // Create mock thread for thread-2
    const mockGraph2 = new GraphData();
    const mockThread2: Thread = {
      id: 'thread-2',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: 'RUNNING' as ThreadStatus,
      currentNodeId: 'node-2',
      graph: mockGraph2,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: { name: 'test2' },
      output: {},
      nodeResults: [
        {
          nodeId: 'node-1',
          nodeType: 'START',
          status: 'COMPLETED',
          step: 1,
          data: { result: 'started2' }
        }
      ],
      startTime: Date.now(),
      errors: []
    };
    
    // Create and register thread context for thread-2
    const threadContext2 = new ThreadContext(
      mockThread2,
      mockConversationManager,
      threadRegistry,
      workflowRegistry,
      {} as any, // eventManager
      {} as any, // toolService
      { executeLLMCall: jest.fn() } as any // llmExecutor
    );
    threadRegistry.register(threadContext2);
    
    // Register workflow
    workflowRegistry.register({
      id: 'workflow-1',
      name: 'Test Workflow',
      version: '1.0.0',
      nodes: [
        {
          id: 'start-node',
          type: NodeType.START,
          name: 'Start Node',
          config: {},
          outgoingEdgeIds: ['edge-1'],
          incomingEdgeIds: []
        },
        {
          id: 'end-node',
          type: NodeType.END,
          name: 'End Node',
          config: {},
          outgoingEdgeIds: [],
          incomingEdgeIds: ['edge-1']
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'start-node',
          targetNodeId: 'end-node',
          type: EdgeType.DEFAULT
        }
      ],
      variables: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Create checkpoint manager
    checkpointManager = new CheckpointManager(storage, threadRegistry, workflowRegistry);
  });

  describe('constructor', () => {
    it('should throw ConfigurationError when threadRegistry is missing', () => {
      expect(() => {
        new CheckpointManager(storage, undefined, workflowRegistry);
      }).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when workflowRegistry is missing', () => {
      expect(() => {
        new CheckpointManager(storage, threadRegistry, undefined);
      }).toThrow(ConfigurationError);
    });

    it('should use MemoryCheckpointStorage when no storage provided', () => {
      const manager = new CheckpointManager(undefined, threadRegistry, workflowRegistry);
      expect(manager).toBeDefined();
    });
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint successfully', async () => {
      const metadata = { description: 'Test checkpoint', tags: ['test'] };
      const checkpointId = await checkpointManager.createCheckpoint('thread-1', metadata);
      
      expect(checkpointId).toBeDefined();
      expect(typeof checkpointId).toBe('string');
      
      // Verify that messages were stored in global storage
      expect(require('../../../services/global-message-storage').globalMessageStorage.storeMessages)
        .toHaveBeenCalledWith('thread-1', expect.any(Array));
      
      // Verify that reference was added
      expect(require('../../../services/global-message-storage').globalMessageStorage.addReference)
        .toHaveBeenCalledWith('thread-1');
    });

    it('should throw NotFoundError when thread not found', async () => {
      await expect(checkpointManager.createCheckpoint('non-existent-thread'))
        .rejects.toThrow(NotFoundError);
    });

    it('should include conversation state in checkpoint', async () => {
      const checkpointId = await checkpointManager.createCheckpoint('thread-1');
      const checkpoint = await checkpointManager.getCheckpoint(checkpointId);
      
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.threadState.conversationState).toBeDefined();
      expect(checkpoint!.threadState.conversationState!.markMap).toBeDefined();
      expect(checkpoint!.threadState.conversationState!.tokenUsage).toBeDefined();
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('should restore thread context from checkpoint', async () => {
      // First create a checkpoint
      const checkpointId = await checkpointManager.createCheckpoint('thread-1');
      
      // Clear the thread registry to simulate restoration
      threadRegistry = new ThreadRegistry();
      const newCheckpointManager = new CheckpointManager(storage, threadRegistry, workflowRegistry);
      
      // Mock global message storage to return messages
      (require('../../../services/global-message-storage').globalMessageStorage.getMessages as jest.Mock)
        .mockReturnValue([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]);
      
      // Restore from checkpoint
      const restoredContext = await newCheckpointManager.restoreFromCheckpoint(checkpointId);
      
      expect(restoredContext).toBeDefined();
      expect(restoredContext.getThreadId()).toBe('thread-1');
      expect(restoredContext.getWorkflowId()).toBe('workflow-1');
      expect(restoredContext.getStatus()).toBe('RUNNING');
      expect(restoredContext.getCurrentNodeId()).toBe('node-2');
    });

    it('should throw NotFoundError when checkpoint not found', async () => {
      await expect(checkpointManager.restoreFromCheckpoint('non-existent-checkpoint'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when message history not found', async () => {
      const checkpointId = await checkpointManager.createCheckpoint('thread-1');
      
      // Mock global message storage to return undefined
      (require('../../../services/global-message-storage').globalMessageStorage.getMessages as jest.Mock)
        .mockReturnValue(undefined);
      
      const newCheckpointManager = new CheckpointManager(storage, new ThreadRegistry(), workflowRegistry);
      await expect(newCheckpointManager.restoreFromCheckpoint(checkpointId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getCheckpoint', () => {
    it('should return null for non-existent checkpoint', async () => {
      const checkpoint = await checkpointManager.getCheckpoint('non-existent');
      expect(checkpoint).toBeNull();
    });

    it('should return checkpoint when exists', async () => {
      const checkpointId = await checkpointManager.createCheckpoint('thread-1');
      const checkpoint = await checkpointManager.getCheckpoint(checkpointId);
      
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.id).toBe(checkpointId);
      expect(checkpoint!.threadId).toBe('thread-1');
    });
  });

  describe('listCheckpoints', () => {
    it('should list all checkpoints', async () => {
      await checkpointManager.createCheckpoint('thread-1');
      await checkpointManager.createCheckpoint('thread-1');
      
      const checkpointIds = await checkpointManager.listCheckpoints();
      expect(checkpointIds.length).toBe(2);
    });

    it('should filter checkpoints by threadId', async () => {
      await checkpointManager.createCheckpoint('thread-1');
      await checkpointManager.createCheckpoint('thread-2');
      
      const checkpointIds = await checkpointManager.listCheckpoints({ threadId: 'thread-1' });
      expect(checkpointIds.length).toBe(1);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint successfully', async () => {
      const checkpointId = await checkpointManager.createCheckpoint('thread-1');
      
      // Verify checkpoint exists
      const checkpoint = await checkpointManager.getCheckpoint(checkpointId);
      expect(checkpoint).not.toBeNull();
      
      // Delete checkpoint
      await checkpointManager.deleteCheckpoint(checkpointId);
      
      // Verify checkpoint is deleted
      const deletedCheckpoint = await checkpointManager.getCheckpoint(checkpointId);
      expect(deletedCheckpoint).toBeNull();
    });
  });

  describe('createNodeCheckpoint', () => {
    it('should create node checkpoint with correct metadata', async () => {
      const checkpointId = await checkpointManager.createNodeCheckpoint('thread-1', 'node-3', {
        description: 'Custom description',
        tags: ['custom']
      });
      
      const checkpoint = await checkpointManager.getCheckpoint(checkpointId);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.metadata!.description).toBe('Node checkpoint for node node-3');
      expect((checkpoint!.metadata!.customFields as any).nodeId).toBe('node-3');
      expect(checkpoint!.metadata!.tags).toEqual(['custom']);
    });
  });

  describe('cleanupThreadCheckpoints', () => {
    it('should cleanup all checkpoints for a thread', async () => {
      await checkpointManager.createCheckpoint('thread-1');
      await checkpointManager.createCheckpoint('thread-1');
      await checkpointManager.createCheckpoint('thread-2');
      
      const deletedCount = await checkpointManager.cleanupThreadCheckpoints('thread-1');
      expect(deletedCount).toBe(2);
      
      const remainingCheckpoints = await checkpointManager.listCheckpoints();
      expect(remainingCheckpoints.length).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all checkpoints', async () => {
      await checkpointManager.createCheckpoint('thread-1');
      await checkpointManager.createCheckpoint('thread-2');
      
      await checkpointManager.clearAll();
      
      const checkpointIds = await checkpointManager.listCheckpoints();
      expect(checkpointIds.length).toBe(0);
    });
  });

  describe('lifecycle methods', () => {
    it('should have isInitialized return true', () => {
      expect(checkpointManager.isInitialized()).toBe(true);
    });

    it('should cleanup all checkpoints', async () => {
      await checkpointManager.createCheckpoint('thread-1');
      
      await checkpointManager.cleanup();
      
      const checkpointIds = await checkpointManager.listCheckpoints();
      expect(checkpointIds.length).toBe(0);
    });
  });
});