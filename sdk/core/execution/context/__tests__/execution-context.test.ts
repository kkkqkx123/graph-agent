import { ExecutionContext } from '../execution-context';
import { EventManager } from '../../../services/event-manager';
import { WorkflowRegistry } from '../../../services/workflow-registry';
import { ThreadRegistry } from '../../../services/thread-registry';
import { CheckpointStateManager } from '../../managers/checkpoint-state-manager';
import { CheckpointCoordinator } from '../../coordinators/checkpoint-coordinator';
import { ThreadLifecycleManager } from '../../managers/thread-lifecycle-manager';
import { ThreadLifecycleCoordinator } from '../../coordinators/thread-lifecycle-coordinator';
import { MemoryCheckpointStorage } from '../../../storage/memory-checkpoint-storage';

// Mock services
const mockToolService = { name: 'mockToolService' };
const mockLlmExecutor = { name: 'mockLlmExecutor' };
const mockGraphRegistry = { name: 'mockGraphRegistry' };

describe('ExecutionContext', () => {
  let executionContext: ExecutionContext;

  beforeEach(() => {
    // Reset SingletonRegistry before each test
    const { SingletonRegistry } = require('../singleton-registry');
    SingletonRegistry.reset();
    
    // Create fresh execution context
    executionContext = new ExecutionContext();
  });

  afterEach(() => {
    // Clean up after each test
    if (executionContext.isInitialized()) {
      executionContext.destroy();
    }
    
    // Reset SingletonRegistry after each test
    const { SingletonRegistry } = require('../singleton-registry');
    SingletonRegistry.reset();
  });

  describe('constructor', () => {
    it('should create ExecutionContext with uninitialized state', () => {
      expect(executionContext.isInitialized()).toBe(false);
    });

    it('should initialize component registry and lifecycle manager', () => {
      // @ts-ignore - accessing private properties for testing
      expect(executionContext.componentRegistry).toBeDefined();
      // @ts-ignore - accessing private properties for testing
      expect(executionContext.lifecycleManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize all required components', () => {
      executionContext.initialize();
      
      expect(executionContext.isInitialized()).toBe(true);
      
      // Verify all getters work correctly
      expect(executionContext.getEventManager()).toBeDefined();
      expect(executionContext.getWorkflowRegistry()).toBeDefined();
      expect(executionContext.getThreadRegistry()).toBeDefined();
      expect(executionContext.getCheckpointStateManager()).toBeDefined();
      expect(executionContext.getCheckpointCoordinator()).toBeDefined();
      expect(executionContext.getThreadLifecycleManager()).toBeDefined();
      expect(executionContext.getLifecycleCoordinator()).toBeDefined();
      expect(executionContext.getToolService()).toBeDefined();
      expect(executionContext.getLlmExecutor()).toBeDefined();
      expect(executionContext.getGraphRegistry()).toBeDefined();
    });

    it('should only initialize once', () => {
      executionContext.initialize();
      const firstEventManager = executionContext.getEventManager();
      
      executionContext.initialize(); // Second call should not re-initialize
      const secondEventManager = executionContext.getEventManager();
      
      expect(firstEventManager).toBe(secondEventManager);
    });

    it('should initialize SingletonRegistry if not already initialized', () => {
      const { SingletonRegistry } = require('../singleton-registry');
      expect(SingletonRegistry.isInitialized()).toBe(false);
      
      executionContext.initialize();
      
      expect(SingletonRegistry.isInitialized()).toBe(true);
    });
  });

  describe('createDefault', () => {
    it('should create and initialize a default execution context', () => {
      const context = ExecutionContext.createDefault();
      
      expect(context.isInitialized()).toBe(true);
      expect(context.getEventManager()).toBeDefined();
      
      // Clean up
      context.destroy();
    });
  });

  describe('register', () => {
    it('should register custom component successfully', () => {
      executionContext.initialize();
      
      const customHandler = { handle: jest.fn() };
      executionContext.register('customHandler', customHandler);
      
      expect(executionContext.get('customHandler')).toBe(customHandler);
    });

    it('should overwrite existing component when re-registering', () => {
      executionContext.initialize();
      
      const handler1 = { name: 'handler1' };
      const handler2 = { name: 'handler2' };
      
      executionContext.register('testHandler', handler1);
      executionContext.register('testHandler', handler2);
      
      expect(executionContext.get('testHandler')).toBe(handler2);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      executionContext.initialize();
    });

    it('should get WorkflowRegistry correctly', () => {
      const workflowRegistry = executionContext.getWorkflowRegistry();
      expect(workflowRegistry).toBeInstanceOf(WorkflowRegistry);
    });

    it('should get ThreadRegistry correctly', () => {
      const threadRegistry = executionContext.getThreadRegistry();
      expect(threadRegistry).toBeInstanceOf(ThreadRegistry);
    });

    it('should get EventManager correctly', () => {
      const eventManager = executionContext.getEventManager();
      expect(eventManager).toBeInstanceOf(EventManager);
    });

    it('should get CheckpointStateManager correctly', () => {
      const checkpointStateManager = executionContext.getCheckpointStateManager();
      expect(checkpointStateManager).toBeInstanceOf(CheckpointStateManager);
    });

    it('should get CheckpointCoordinator correctly', () => {
      const checkpointCoordinator = executionContext.getCheckpointCoordinator();
      expect(checkpointCoordinator).toBeInstanceOf(CheckpointCoordinator);
    });

    it('should get ThreadLifecycleManager correctly', () => {
      const lifecycleManager = executionContext.getThreadLifecycleManager();
      expect(lifecycleManager).toBeInstanceOf(ThreadLifecycleManager);
    });

    it('should get LifecycleCoordinator correctly', () => {
      const lifecycleCoordinator = executionContext.getLifecycleCoordinator();
      expect(lifecycleCoordinator).toBeInstanceOf(ThreadLifecycleCoordinator);
    });

    it('should get ToolService correctly', () => {
      const toolService = executionContext.getToolService();
      expect(toolService).toBeDefined();
    });

    it('should get LlmExecutor correctly', () => {
      const llmExecutor = executionContext.getLlmExecutor();
      expect(llmExecutor).toBeDefined();
    });

    it('should get GraphRegistry correctly', () => {
      const graphRegistry = executionContext.getGraphRegistry();
      expect(graphRegistry).toBeDefined();
    });
  });

  describe('handler setters and getters', () => {
    beforeEach(() => {
      executionContext.initialize();
    });

    it('should set and get HumanRelayHandler', () => {
      const handler = { handle: jest.fn() };
      executionContext.setHumanRelayHandler(handler);
      
      expect(executionContext.getHumanRelayHandler()).toBe(handler);
    });

    it('should set and get UserInteractionHandler', () => {
      const handler = { handle: jest.fn() };
      executionContext.setUserInteractionHandler(handler);
      
      expect(executionContext.getUserInteractionHandler()).toBe(handler);
    });

    it('should return undefined for unset handlers', () => {
      expect(executionContext.getHumanRelayHandler()).toBeUndefined();
      expect(executionContext.getUserInteractionHandler()).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('should cleanup all managed components', async () => {
      executionContext.initialize();
      
      // Verify components are created
      const checkpointStateManager = executionContext.getCheckpointStateManager();
      const checkpointCoordinator = executionContext.getCheckpointCoordinator();
      
      // Spy on cleanup methods
      const cleanupSpy1 = jest.spyOn(checkpointStateManager, 'cleanup');
      
      await executionContext.destroy();
      
      expect(cleanupSpy1).toHaveBeenCalled();
      expect(executionContext.isInitialized()).toBe(false);
    });

    it('should not cleanup global singletons', async () => {
      executionContext.initialize();
      
      const eventManager = executionContext.getEventManager();
      const workflowRegistry = executionContext.getWorkflowRegistry();
      
      await executionContext.destroy();
      
      // Global singletons should still be accessible through SingletonRegistry
      const { SingletonRegistry } = require('../singleton-registry');
      expect(SingletonRegistry.get('eventManager')).toBe(eventManager);
      expect(SingletonRegistry.get('workflowRegistry')).toBe(workflowRegistry);
    });

    it('should handle destroy when not initialized', async () => {
      // Should not throw error
      await expect(executionContext.destroy()).resolves.not.toThrow();
      expect(executionContext.isInitialized()).toBe(false);
    });
  });

  describe('getLifecycleManagers', () => {
    it('should return only managed lifecycle-capable components', () => {
      executionContext.initialize();
      
      const managers = executionContext.getLifecycleManagers();
      
      // Should include only the components created by ExecutionContext that implement LifecycleCapable
      const managerNames = managers.map(m => m.name);
      expect(managerNames).toContain('checkpointStateManager');
      
      // Should not include lifecycleManager and lifecycleCoordinator (don't implement LifecycleCapable)
      expect(managerNames).not.toContain('lifecycleManager');
      expect(managerNames).not.toContain('lifecycleCoordinator');
      
      // Should not include checkpointCoordinator (doesn't implement LifecycleCapable)
      expect(managerNames).not.toContain('checkpointCoordinator');
      
      // Should not include global singletons
      expect(managerNames).not.toContain('eventManager');
      expect(managerNames).not.toContain('workflowRegistry');
      expect(managerNames).not.toContain('threadRegistry');
    });
  });

  describe('thread ID management', () => {
    it('should set and get current thread ID correctly', () => {
      const threadId = 'test-thread-id';
      
      executionContext.setCurrentThreadId(threadId);
      expect(executionContext.getCurrentThreadId()).toBe(threadId);
    });

    it('should return null when no thread ID is set', () => {
      expect(executionContext.getCurrentThreadId()).toBeNull();
    });
  });

  describe('createForTesting', () => {
    it('should create execution context with custom singletons', () => {
      // Ensure SingletonRegistry is not initialized before test
      const { SingletonRegistry: TestSingletonRegistry } = require('../singleton-registry');
      TestSingletonRegistry.reset();
      
      // Verify it's not initialized
      expect(TestSingletonRegistry.isInitialized()).toBe(false);
      
      const customEventManager = { name: 'customEventManager', on: jest.fn(), emit: jest.fn() };
      const customSingletons = new Map<string, any>([
        ['eventManager', customEventManager]
      ]);
      
      const context = ExecutionContext.createForTesting(customSingletons);
      
      // Verify that the custom singleton is registered in SingletonRegistry
      const { SingletonRegistry: TestSingletonRegistry2 } = require('../singleton-registry');
      expect(TestSingletonRegistry2.get('eventManager')).toBe(customEventManager);
      
      // Clean up
      context.destroy();
      ExecutionContext.resetTestingEnvironment();
    });
  });

  describe('resetTestingEnvironment', () => {
    it('should reset SingletonRegistry to clean state', () => {
      // Ensure SingletonRegistry is not initialized before test
      const { SingletonRegistry: TestSingletonRegistry3 } = require('../singleton-registry');
      TestSingletonRegistry3.reset();
      
      // Verify it's not initialized
      expect(TestSingletonRegistry3.isInitialized()).toBe(false);
      
      const customEventManager = { name: 'customEventManager' };
      const customSingletons = new Map<string, any>([
        ['eventManager', customEventManager]
      ]);
      
      ExecutionContext.createForTesting(customSingletons);
      
      // Verify custom singleton is registered
      expect(TestSingletonRegistry3.get('eventManager')).toBe(customEventManager);
      
      ExecutionContext.resetTestingEnvironment();
      
      // After reset, should use default singletons
      const context = ExecutionContext.createDefault();
      expect(context.getEventManager()).not.toBe(customEventManager);
      
      context.destroy();
    });
  });

  describe('error handling', () => {
    it('should automatically initialize when accessing components before explicit initialization', () => {
      // Should not throw error, should auto-initialize
      expect(() => executionContext.getEventManager()).not.toThrow();
      expect(executionContext.isInitialized()).toBe(true);
    });

    it('should handle missing components gracefully in destroy', async () => {
      executionContext.initialize();
      
      // Remove a component to simulate missing component
      // @ts-ignore - accessing private properties for testing
      executionContext.componentRegistry.register('checkpointStateManager', null);
      
      // Should not throw error
      await expect(executionContext.destroy()).resolves.not.toThrow();
    });
  });
});