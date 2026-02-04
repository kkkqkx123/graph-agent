import { VariableStateManager } from '../variable-state-manager';
import type { ThreadVariable, WorkflowVariable } from '../../../../types';

describe('VariableStateManager', () => {
  let manager: VariableStateManager;

  beforeEach(() => {
    manager = new VariableStateManager();
  });

  describe('initializeFromWorkflow', () => {
    it('should initialize empty state when no workflow variables provided', () => {
      manager.initializeFromWorkflow([]);
      
      expect(manager.getAllVariableDefinitions()).toEqual([]);
      expect(manager.getVariableScopes()).toEqual({
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      });
    });

    it('should initialize variables from workflow definition', () => {
      const workflowVariables: WorkflowVariable[] = [
        {
          name: 'globalVar',
          type: 'string',
          defaultValue: 'globalValue',
          scope: 'global'
        },
        {
          name: 'threadVar',
          type: 'number',
          defaultValue: 42,
          scope: 'thread'
        },
        {
          name: 'subgraphVar',
          type: 'boolean',
          defaultValue: true,
          scope: 'subgraph'
        },
        {
          name: 'loopVar',
          type: 'array',
          defaultValue: [1, 2, 3],
          scope: 'loop'
        }
      ];

      manager.initializeFromWorkflow(workflowVariables);

      // Check variable definitions
      const definitions = manager.getAllVariableDefinitions();
      expect(definitions).toHaveLength(4);
      expect(definitions[0]).toEqual({
        name: 'globalVar',
        value: 'globalValue',
        type: 'string',
        scope: 'global',
        readonly: false,
        metadata: { description: undefined, required: undefined }
      });

      // Check scopes - only global should be initialized with values
      const scopes = manager.getVariableScopes();
      expect(scopes.global).toEqual({ globalVar: 'globalValue' });
      expect(scopes.thread).toEqual({});
      expect(scopes.subgraph).toEqual([]);
      expect(scopes.loop).toEqual([]);
    });

    it('should handle variables without explicit scope (defaults to thread)', () => {
      const workflowVariables: WorkflowVariable[] = [
        {
          name: 'defaultScopeVar',
          type: 'string',
          defaultValue: 'defaultValue'
        }
      ];

      manager.initializeFromWorkflow(workflowVariables);

      const definitions = manager.getAllVariableDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]!.scope).toBe('thread');
    });
  });

  describe('initializeFromThreadVariables', () => {
    it('should initialize from thread variables', () => {
      const threadVariables: ThreadVariable[] = [
        {
          name: 'globalVar',
          value: 'globalValue',
          type: 'string',
          scope: 'global',
          readonly: false
        },
        {
          name: 'threadVar',
          value: 42,
          type: 'number',
          scope: 'thread',
          readonly: true
        }
      ];

      manager.initializeFromThreadVariables(threadVariables);

      const definitions = manager.getAllVariableDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions[0]).toEqual(threadVariables[0]);
      expect(definitions[1]).toEqual(threadVariables[1]);

      // Only global scope should have values
      const scopes = manager.getVariableScopes();
      expect(scopes.global).toEqual({ globalVar: 'globalValue' });
      expect(scopes.thread).toEqual({});
    });

    it('should handle empty thread variables array', () => {
      manager.initializeFromThreadVariables([]);
      
      expect(manager.getAllVariableDefinitions()).toEqual([]);
      expect(manager.getVariableScopes()).toEqual({
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      });
    });
  });

  describe('getVariableDefinition', () => {
    it('should return variable definition by name', () => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'testVar', type: 'string', defaultValue: 'test', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);

      const definition = manager.getVariableDefinition('testVar');
      expect(definition).toEqual({
        name: 'testVar',
        value: 'test',
        type: 'string',
        scope: 'thread',
        readonly: false,
        metadata: { description: undefined, required: undefined }
      });
    });

    it('should return undefined for non-existent variable', () => {
      manager.initializeFromWorkflow([]);
      expect(manager.getVariableDefinition('nonExistent')).toBeUndefined();
    });
  });

  describe('setVariableValue and getVariableValue', () => {
    beforeEach(() => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'testVar', type: 'string', defaultValue: 'initial', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
    });

    it('should set and get global variable value', () => {
      manager.setVariableValue('testVar', 'newValue', 'global');
      expect(manager.getVariableValue('testVar', 'global')).toBe('newValue');
      
      // Should also update the variable definition
      const definition = manager.getVariableDefinition('testVar');
      expect(definition?.value).toBe('newValue');
    });

    it('should set and get thread variable value', () => {
      manager.setVariableValue('testVar', 'threadValue', 'thread');
      expect(manager.getVariableValue('testVar', 'thread')).toBe('threadValue');
    });

    it('should set and get subgraph variable value', () => {
      manager.enterSubgraphScope();
      manager.setVariableValue('testVar', 'subgraphValue', 'subgraph');
      expect(manager.getVariableValue('testVar', 'subgraph')).toBe('subgraphValue');
    });

    it('should throw error when setting subgraph variable outside subgraph context', () => {
      expect(() => {
        manager.setVariableValue('testVar', 'value', 'subgraph');
      }).toThrow('Cannot set subgraph variable outside of subgraph context');
    });

    it('should return undefined when getting subgraph variable outside subgraph context', () => {
      expect(manager.getVariableValue('testVar', 'subgraph')).toBeUndefined();
    });

    it('should set and get loop variable value', () => {
      manager.enterLoopScope();
      manager.setVariableValue('testVar', 'loopValue', 'loop');
      expect(manager.getVariableValue('testVar', 'loop')).toBe('loopValue');
    });

    it('should throw error when setting loop variable outside loop context', () => {
      expect(() => {
        manager.setVariableValue('testVar', 'value', 'loop');
      }).toThrow('Cannot set loop variable outside of loop context');
    });

    it('should return undefined when getting loop variable outside loop context', () => {
      expect(manager.getVariableValue('testVar', 'loop')).toBeUndefined();
    });
  });

  describe('subgraph scope management', () => {
    beforeEach(() => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'subgraphVar', type: 'string', defaultValue: 'subgraphDefault', scope: 'subgraph' },
        { name: 'threadVar', type: 'string', defaultValue: 'threadDefault', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
    });

    it('should enter and exit subgraph scope', () => {
      manager.enterSubgraphScope();
      expect(manager.getVariableScopes().subgraph).toHaveLength(1);
      
      manager.exitSubgraphScope();
      expect(manager.getVariableScopes().subgraph).toHaveLength(0);
    });

    it('should initialize subgraph scope with default values', () => {
      manager.enterSubgraphScope();
      const subgraphScope = manager.getVariablesByScope('subgraph');
      expect(subgraphScope).toEqual({ subgraphVar: 'subgraphDefault' });
    });

    it('should throw error when exiting non-existent subgraph scope', () => {
      expect(() => {
        manager.exitSubgraphScope();
      }).toThrow('No subgraph scope to exit');
    });

    it('should handle nested subgraph scopes', () => {
      manager.enterSubgraphScope();
      manager.setVariableValue('subgraphVar', 'outerValue', 'subgraph');
      
      manager.enterSubgraphScope();
      manager.setVariableValue('subgraphVar', 'innerValue', 'subgraph');
      
      expect(manager.getVariableValue('subgraphVar', 'subgraph')).toBe('innerValue');
      
      manager.exitSubgraphScope();
      expect(manager.getVariableValue('subgraphVar', 'subgraph')).toBe('outerValue');
      
      manager.exitSubgraphScope();
      expect(manager.getVariableValue('subgraphVar', 'subgraph')).toBeUndefined();
    });
  });

  describe('loop scope management', () => {
    beforeEach(() => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'loopVar', type: 'number', defaultValue: 0, scope: 'loop' },
        { name: 'threadVar', type: 'string', defaultValue: 'threadDefault', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
    });

    it('should enter and exit loop scope', () => {
      manager.enterLoopScope();
      expect(manager.getVariableScopes().loop).toHaveLength(1);
      
      manager.exitLoopScope();
      expect(manager.getVariableScopes().loop).toHaveLength(0);
    });

    it('should initialize loop scope with default values', () => {
      manager.enterLoopScope();
      const loopScope = manager.getVariablesByScope('loop');
      expect(loopScope).toEqual({ loopVar: 0 });
    });

    it('should throw error when exiting non-existent loop scope', () => {
      expect(() => {
        manager.exitLoopScope();
      }).toThrow('No loop scope to exit');
    });

    it('should handle nested loop scopes', () => {
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 1, 'loop');
      
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 2, 'loop');
      
      expect(manager.getVariableValue('loopVar', 'loop')).toBe(2);
      
      manager.exitLoopScope();
      expect(manager.getVariableValue('loopVar', 'loop')).toBe(1);
      
      manager.exitLoopScope();
      expect(manager.getVariableValue('loopVar', 'loop')).toBeUndefined();
    });
  });

  describe('getAllVariables', () => {
    it('should merge variables from all scopes with correct priority', () => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'sharedVar', type: 'string', defaultValue: 'globalDefault', scope: 'global' },
        { name: 'threadVar', type: 'string', defaultValue: 'threadDefault', scope: 'thread' },
        { name: 'subgraphVar', type: 'string', defaultValue: 'subgraphDefault', scope: 'subgraph' },
        { name: 'loopVar', type: 'string', defaultValue: 'loopDefault', scope: 'loop' }
      ];
      manager.initializeFromWorkflow(workflowVariables);

      // Set values in different scopes
      manager.setVariableValue('sharedVar', 'globalValue', 'global');
      manager.setVariableValue('threadVar', 'threadValue', 'thread');
      manager.setVariableValue('sharedVar', 'threadValue', 'thread');
      
      manager.enterSubgraphScope();
      manager.setVariableValue('subgraphVar', 'subgraphValue', 'subgraph');
      manager.setVariableValue('sharedVar', 'subgraphValue', 'subgraph');
      
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 'loopValue', 'loop');
      manager.setVariableValue('sharedVar', 'loopValue', 'loop');

      const allVariables = manager.getAllVariables();
      
      // Loop scope has highest priority
      expect(allVariables['sharedVar']).toBe('loopValue');
      expect(allVariables['threadVar']).toBe('threadValue');
      expect(allVariables['subgraphVar']).toBe('subgraphValue');
      expect(allVariables['loopVar']).toBe('loopValue');
    });
  });

  describe('getVariablesByScope', () => {
    beforeEach(() => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'testVar', type: 'string', defaultValue: 'defaultValue', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
      manager.setVariableValue('testVar', 'threadValue', 'thread');
    });

    it('should return global scope variables', () => {
      manager.setVariableValue('globalVar', 'globalValue', 'global');
      expect(manager.getVariablesByScope('global')).toEqual({ globalVar: 'globalValue' });
    });

    it('should return thread scope variables', () => {
      expect(manager.getVariablesByScope('thread')).toEqual({ testVar: 'threadValue' });
    });

    it('should return empty object for subgraph scope when no subgraph context', () => {
      expect(manager.getVariablesByScope('subgraph')).toEqual({});
    });

    it('should return current subgraph scope variables', () => {
      manager.enterSubgraphScope();
      manager.setVariableValue('subgraphVar', 'subgraphValue', 'subgraph');
      expect(manager.getVariablesByScope('subgraph')).toEqual({ subgraphVar: 'subgraphValue' });
    });

    it('should return empty object for loop scope when no loop context', () => {
      expect(manager.getVariablesByScope('loop')).toEqual({});
    });

    it('should return current loop scope variables', () => {
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 'loopValue', 'loop');
      expect(manager.getVariablesByScope('loop')).toEqual({ loopVar: 'loopValue' });
    });
  });

  describe('createSnapshot and restoreFromSnapshot', () => {
    it('should create and restore snapshot correctly', () => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'testVar', type: 'string', defaultValue: 'initial', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
      manager.setVariableValue('testVar', 'modified', 'thread');
      
      manager.enterSubgraphScope();
      manager.setVariableValue('subgraphVar', 'subgraphValue', 'subgraph');
      
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 'loopValue', 'loop');

      const snapshot = manager.createSnapshot();
      
      // Create new manager and restore
      const newManager = new VariableStateManager();
      newManager.restoreFromSnapshot(snapshot);

      // Verify restored state
      expect(newManager.getVariableValue('testVar', 'thread')).toBe('modified');
      expect(newManager.getVariableValue('subgraphVar', 'subgraph')).toBe('subgraphValue');
      expect(newManager.getVariableValue('loopVar', 'loop')).toBe('loopValue');
      
      // Verify scopes structure
      const restoredScopes = newManager.getVariableScopes();
      expect(restoredScopes.subgraph).toHaveLength(1);
      expect(restoredScopes.loop).toHaveLength(1);
    });
  });

  describe('copyFrom', () => {
    it('should copy state from another manager with shared global scope', () => {
      const sourceManager = new VariableStateManager();
      const workflowVariables: WorkflowVariable[] = [
        { name: 'globalVar', type: 'string', defaultValue: 'globalValue', scope: 'global' },
        { name: 'threadVar', type: 'string', defaultValue: 'threadValue', scope: 'thread' }
      ];
      sourceManager.initializeFromWorkflow(workflowVariables);
      sourceManager.setVariableValue('globalVar', 'modifiedGlobal', 'global');
      sourceManager.setVariableValue('threadVar', 'modifiedThread', 'thread');

      manager.copyFrom(sourceManager);

      // Global scope values should be equal
      expect(manager.getVariableScopes().global).toEqual(sourceManager.getVariableScopes().global);
      expect(manager.getVariableValue('globalVar', 'global')).toBe('modifiedGlobal');
      
      // Thread scope should be copied (different reference)
      expect(manager.getVariableScopes().thread).not.toBe(sourceManager.getVariableScopes().thread);
      expect(manager.getVariableValue('threadVar', 'thread')).toBe('modifiedThread');
      
      // Subgraph and loop scopes should be empty
      expect(manager.getVariableScopes().subgraph).toEqual([]);
      expect(manager.getVariableScopes().loop).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should clear all state', () => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'testVar', type: 'string', defaultValue: 'test', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
      manager.setVariableValue('testVar', 'value', 'thread');
      manager.enterSubgraphScope();
      manager.enterLoopScope();

      manager.cleanup();

      expect(manager.getAllVariableDefinitions()).toEqual([]);
      expect(manager.getVariableScopes()).toEqual({
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      });
    });
  });

  describe('isInitialized', () => {
    it('should always return true', () => {
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('LifecycleCapable interface', () => {
    it('should implement all required methods', () => {
      expect(typeof manager.initialize).toBe('function');
      expect(typeof manager.cleanup).toBe('function');
      expect(typeof manager.createSnapshot).toBe('function');
      expect(typeof manager.restoreFromSnapshot).toBe('function');
      expect(typeof manager.isInitialized).toBe('function');
    });
  });
});