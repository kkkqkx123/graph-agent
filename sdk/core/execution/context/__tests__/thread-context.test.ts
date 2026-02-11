import { ThreadContext } from '../thread-context';
import type { Thread, VariableScope } from '../../../../types';
import type { LLMMessage } from '@modular-agent/types/llm';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import { ConversationManager } from '../../managers/conversation-manager';
import { GraphNavigator } from '../../../graph/graph-navigator';

// Mock services
const mockThreadRegistry = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  threadContexts: new Map(),
  register: jest.fn(),
  getAll: jest.fn(),
  clear: jest.fn()
};

const mockWorkflowRegistry = {
  get: jest.fn(),
  register: jest.fn(),
  has: jest.fn()
};

const mockEventManager = {
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn()
};

const mockToolService = {
  execute: jest.fn(),
  getTool: jest.fn()
};

const mockLlmExecutor = {
  execute: jest.fn()
};

describe('ThreadContext', () => {
  let threadContext: ThreadContext;
  let mockThread: Thread;
  let conversationManager: ConversationManager;

  beforeEach(() => {
    // Create mock thread
    mockThread = {
      id: 'test-thread',
      workflowId: 'test-workflow',
      workflowVersion: '1.0.0',
      status: 'RUNNING' as any,
      currentNodeId: 'start',
      graph: {
        nodes: [],
        edges: [],
        getOutgoingEdges: jest.fn().mockReturnValue([])
      },
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: { test: 'input' },
      output: {},
      nodeResults: [],
      errors: [],
      startTime: Date.now(),
      endTime: undefined,
      contextData: {},
      shouldPause: false,
      shouldStop: false
    } as any;

    // Create conversation manager
    conversationManager = new ConversationManager();

    // Create thread context
    threadContext = new ThreadContext(
      mockThread,
      conversationManager,
      mockThreadRegistry as any,
      mockWorkflowRegistry as any,
      mockEventManager as any,
      mockToolService as any,
      mockLlmExecutor as any
    );
  });

  afterEach(() => {
    // Clean up
    threadContext.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(threadContext.getThreadId()).toBe('test-thread');
      expect(threadContext.getWorkflowId()).toBe('test-workflow');
      expect(threadContext.getStatus()).toBe('RUNNING');
      expect(threadContext.getCurrentNodeId()).toBe('start');
      expect(threadContext.getInput()).toEqual({ test: 'input' });
      expect(threadContext.getOutput()).toEqual({});
    });

    it('should initialize managers correctly', () => {
      expect(threadContext.getConversationManager()).toBeDefined();
      expect(threadContext['variableStateManager']).toBeDefined();
      expect(threadContext['variableCoordinator']).toBeDefined();
      expect(threadContext['triggerStateManager']).toBeDefined();
      expect(threadContext['triggerManager']).toBeDefined();
      expect(threadContext['executionState']).toBeDefined();
    });
  });

  describe('status management', () => {
    it('should get and set status correctly', () => {
      expect(threadContext.getStatus()).toBe('RUNNING');
      
      threadContext.setStatus('COMPLETED');
      expect(threadContext.getStatus()).toBe('COMPLETED');
      expect(mockThread.status).toBe('COMPLETED');
    });
  });

  describe('node management', () => {
    it('should get and set current node ID correctly', () => {
      expect(threadContext.getCurrentNodeId()).toBe('start');
      
      threadContext.setCurrentNodeId('end');
      expect(threadContext.getCurrentNodeId()).toBe('end');
      expect(mockThread.currentNodeId).toBe('end');
    });
  });

  describe('pause/stop management', () => {
    it('should manage pause flag correctly', () => {
      expect(threadContext.getShouldPause()).toBe(false);
      
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);
      expect(mockThread.shouldPause).toBe(true);
    });

    it('should manage stop flag correctly', () => {
      expect(threadContext.getShouldStop()).toBe(false);
      
      threadContext.setShouldStop(true);
      expect(threadContext.getShouldStop()).toBe(true);
      expect(mockThread.shouldStop).toBe(true);
    });
  });

  describe('output management', () => {
    it('should get and set output correctly', () => {
      const output = { result: 'success' };
      threadContext.setOutput(output);
      
      expect(threadContext.getOutput()).toEqual(output);
      expect(mockThread.output).toEqual(output);
    });
  });

  describe('variable management', () => {
    it('should handle variable operations through coordinator', () => {
      // Initialize variables
      threadContext.initializeVariables();
      
      // Test variable operations
      expect(threadContext.hasVariable('nonExistent')).toBe(false);
      expect(threadContext.getAllVariables()).toEqual({});
      
      // Variables are managed by VariableCoordinator, so we'll test the delegation
      expect(threadContext['variableCoordinator']).toBeDefined();
    });
  });

  describe('node results management', () => {
    it('should add and get node results correctly', () => {
      const result = { nodeId: 'test-node', output: 'test-output' };
      threadContext.addNodeResult(result);
      
      const results = threadContext.getNodeResults();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(result);
    });

    it('should not add results to main history when executing subgraph', () => {
      threadContext.startTriggeredSubgraphExecution('sub-workflow');
      
      const result = { nodeId: 'test-node', output: 'test-output' };
      threadContext.addNodeResult(result);
      
      // Should not be added to main thread history
      expect(threadContext.getNodeResults()).toHaveLength(0);
      
      // But should be available in execution state history
      expect(threadContext['executionState'].getSubgraphExecutionHistory()).toHaveLength(1);
    });
  });

  describe('error management', () => {
    it('should add and get errors correctly', () => {
      const error = { message: 'test error' };
      threadContext.addError(error);
      
      const errors = threadContext.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(error);
    });
  });

  describe('time management', () => {
    it('should get start time correctly', () => {
      expect(threadContext.getStartTime()).toBe(mockThread.startTime);
    });

    it('should get and set end time correctly', () => {
      expect(threadContext.getEndTime()).toBeUndefined();
      
      const endTime = Date.now();
      threadContext.setEndTime(endTime);
      
      expect(threadContext.getEndTime()).toBe(endTime);
      expect(mockThread.endTime).toBe(endTime);
    });
  });

  describe('conversation management', () => {
    it('should add and get conversation messages correctly', () => {
      const message: LLMMessage = {
        role: 'user',
        content: 'Hello'
      };
      
      threadContext.addMessageToConversation(message);
      
      const history = threadContext.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(message);
    });
  });

  describe('subgraph execution', () => {
    it('should enter and exit subgraph correctly', () => {
      expect(threadContext.isInSubgraph()).toBe(false);
      
      threadContext.enterSubgraph('sub-workflow', 'main-workflow', { input: 'test' });
      
      expect(threadContext.isInSubgraph()).toBe(true);
      expect(threadContext.getCurrentWorkflowId()).toBe('sub-workflow');
      
      threadContext.exitSubgraph();
      
      expect(threadContext.isInSubgraph()).toBe(false);
      expect(threadContext.getCurrentWorkflowId()).toBe('test-workflow');
    });

    it('should manage triggered subgraph execution', () => {
      expect(threadContext.isExecutingSubgraph()).toBe(false);
      
      threadContext.startTriggeredSubgraphExecution('triggered-workflow');
      expect(threadContext.isExecutingSubgraph()).toBe(true);
      
      threadContext.endTriggeredSubgraphExecution();
      expect(threadContext.isExecutingSubgraph()).toBe(false);
    });
  });

  describe('tool management', () => {
    it('should register and get stateful tools correctly', () => {
      const mockFactory = {
        create: jest.fn().mockReturnValue({ tool: 'instance' })
      };
      
      threadContext.registerStatefulTool('test-tool', mockFactory as any);
      
      const toolInstance = threadContext.getStatefulTool('test-tool');
      expect(toolInstance).toEqual({ tool: 'instance' });
      expect(mockFactory.create).toHaveBeenCalled();
    });

    it('should throw error for unregistered tool factory', () => {
      expect(() => {
        threadContext.getStatefulTool('non-existent-tool');
      }).toThrow('No factory registered for tool: non-existent-tool');
    });

    it('should cleanup stateful tools correctly', () => {
      const cleanupMock = jest.fn();
      const mockFactory = {
        create: jest.fn().mockReturnValue({ cleanup: cleanupMock })
      };
      
      threadContext.registerStatefulTool('test-tool', mockFactory as any);
      threadContext.getStatefulTool('test-tool');
      
      threadContext.cleanupStatefulTool('test-tool');
      expect(cleanupMock).toHaveBeenCalled();
    });
  });

  describe('available tools management', () => {
    it('should initialize and manage available tools correctly', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test workflow',
        graph: { nodes: [], edges: [] },
        availableTools: {
          initial: ['tool1', 'tool2']
        }
      } as any;
      
      threadContext.initializeAvailableTools(workflow);
      
      expect(threadContext.getAvailableTools()).toEqual(['tool1', 'tool2']);
      expect(threadContext.isToolAvailable('tool1')).toBe(true);
      expect(threadContext.isToolAvailable('tool3')).toBe(false);
      
      threadContext.addDynamicTools(['tool3', 'tool4']);
      expect(threadContext.isToolAvailable('tool3')).toBe(true);
      expect(threadContext.isToolAvailable('tool4')).toBe(true);
    });
  });

  describe('lifecycle methods', () => {
    it('should implement LifecycleCapable interface correctly', () => {
      expect(typeof threadContext.initialize).toBe('function');
      expect(typeof threadContext.cleanup).toBe('function');
      expect(typeof threadContext.createSnapshot).toBe('function');
      expect(typeof threadContext.restoreFromSnapshot).toBe('function');
      expect(typeof threadContext.isInitialized).toBe('function');
    });

    it('should cleanup resources correctly', () => {
      // Setup some state
      threadContext.enterSubgraph('sub', 'main', {});
      threadContext.registerStatefulTool('test-tool', {
        create: () => ({ cleanup: jest.fn() })
      } as any);
      threadContext.getStatefulTool('test-tool');
      
      // Cleanup should not throw error
      expect(() => threadContext.cleanup()).not.toThrow();
      
      // After cleanup, should be in clean state
      expect(threadContext.isInSubgraph()).toBe(false);
    });

    it('should create and restore snapshot correctly', () => {
      const snapshot = threadContext.createSnapshot();
      
      expect(snapshot).toHaveProperty('variableState');
      expect(snapshot).toHaveProperty('triggerState');
      expect(snapshot).toHaveProperty('conversationState');
      
      // Restore should not throw error
      expect(() => threadContext.restoreFromSnapshot(snapshot)).not.toThrow();
    });
  });

  describe('navigator', () => {
    it('should get navigator correctly', () => {
      const navigator = threadContext.getNavigator();
      expect(navigator).toBeInstanceOf(GraphNavigator);
    });

    it('should get next node correctly', () => {
      // This will depend on the graph structure, but should not throw error
      expect(() => threadContext.getNextNode()).not.toThrow();
    });
  });
});