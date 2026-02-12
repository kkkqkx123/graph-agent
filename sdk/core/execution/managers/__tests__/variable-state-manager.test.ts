import { VariableStateManager } from '../variable-state-manager';
import type { ThreadVariable, WorkflowVariable } from '@modular-agent/types';

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
        local: [],
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
          name: 'localVar',
          type: 'boolean',
          defaultValue: true,
          scope: 'local'
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
      expect(scopes.local).toEqual([]);
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
        local: [],
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

    it('should set and get local variable value', () => {
      manager.enterLocalScope();
      manager.setVariableValue('testVar', 'localValue', 'local');
      expect(manager.getVariableValue('testVar', 'local')).toBe('localValue');
    });

    it('should throw error when setting local variable outside local context', () => {
      expect(() => {
        manager.setVariableValue('testVar', 'value', 'local');
      }).toThrow('Cannot set local variable outside of local scope context');
    });

    it('should return undefined when getting local variable outside local context', () => {
      expect(manager.getVariableValue('testVar', 'local')).toBeUndefined();
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

  describe('local scope management', () => {
    beforeEach(() => {
      const workflowVariables: WorkflowVariable[] = [
        { name: 'localVar', type: 'string', defaultValue: 'localDefault', scope: 'local' },
        { name: 'threadVar', type: 'string', defaultValue: 'threadDefault', scope: 'thread' }
      ];
      manager.initializeFromWorkflow(workflowVariables);
    });

    it('should enter and exit local scope', () => {
      manager.enterLocalScope();
      expect(manager.getVariableScopes().local).toHaveLength(1);
      
      manager.exitLocalScope();
      expect(manager.getVariableScopes().local).toHaveLength(0);
    });

    it('should initialize local scope with default values', () => {
      manager.enterLocalScope();
      const localScope = manager.getVariablesByScope('local');
      expect(localScope).toEqual({ localVar: 'localDefault' });
    });

    it('should throw error when exiting non-existent local scope', () => {
      expect(() => {
        manager.exitLocalScope();
      }).toThrow('No local scope to exit');
    });

    it('should handle nested local scopes', () => {
      manager.enterLocalScope();
      manager.setVariableValue('localVar', 'outerValue', 'local');
      
      manager.enterLocalScope();
      manager.setVariableValue('localVar', 'innerValue', 'local');
      
      expect(manager.getVariableValue('localVar', 'local')).toBe('innerValue');
      
      manager.exitLocalScope();
      expect(manager.getVariableValue('localVar', 'local')).toBe('outerValue');
      
      manager.exitLocalScope();
      expect(manager.getVariableValue('localVar', 'local')).toBeUndefined();
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
        { name: 'localVar', type: 'string', defaultValue: 'localDefault', scope: 'local' },
        { name: 'loopVar', type: 'string', defaultValue: 'loopDefault', scope: 'loop' }
      ];
      manager.initializeFromWorkflow(workflowVariables);

      // Set values in different scopes
      manager.setVariableValue('sharedVar', 'globalValue', 'global');
      manager.setVariableValue('threadVar', 'threadValue', 'thread');
      manager.setVariableValue('sharedVar', 'threadValue', 'thread');
      
      manager.enterLocalScope();
      manager.setVariableValue('localVar', 'localValue', 'local');
      manager.setVariableValue('sharedVar', 'localValue', 'local');
      
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 'loopValue', 'loop');
      manager.setVariableValue('sharedVar', 'loopValue', 'loop');

      const allVariables = manager.getAllVariables();
      
      // Loop scope has highest priority
      expect(allVariables['sharedVar']).toBe('loopValue');
      expect(allVariables['threadVar']).toBe('threadValue');
      expect(allVariables['localVar']).toBe('localValue');
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

    it('should return empty object for local scope when no local context', () => {
      expect(manager.getVariablesByScope('local')).toEqual({});
    });

    it('should return current local scope variables', () => {
      manager.enterLocalScope();
      manager.setVariableValue('localVar', 'localValue', 'local');
      expect(manager.getVariablesByScope('local')).toEqual({ localVar: 'localValue' });
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
      
      manager.enterLocalScope();
      manager.setVariableValue('localVar', 'localValue', 'local');
      
      manager.enterLoopScope();
      manager.setVariableValue('loopVar', 'loopValue', 'loop');

      const snapshot = manager.createSnapshot();
      
      // Create new manager and restore
      const newManager = new VariableStateManager();
      newManager.restoreFromSnapshot(snapshot);

      // Verify restored state
      expect(newManager.getVariableValue('testVar', 'thread')).toBe('modified');
      expect(newManager.getVariableValue('localVar', 'local')).toBe('localValue');
      expect(newManager.getVariableValue('loopVar', 'loop')).toBe('loopValue');
      
      // Verify scopes structure
      const restoredScopes = newManager.getVariableScopes();
      expect(restoredScopes.local).toHaveLength(1);
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
      expect(manager.getVariableScopes().local).toEqual([]);
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
      manager.enterLocalScope();
      manager.enterLoopScope();

      manager.cleanup();

      expect(manager.getAllVariableDefinitions()).toEqual([]);
      expect(manager.getVariableScopes()).toEqual({
        global: {},
        thread: {},
        local: [],
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