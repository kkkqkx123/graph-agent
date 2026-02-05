import { ExecutionState } from '../execution-state';

describe('ExecutionState', () => {
  let executionState: ExecutionState;

  beforeEach(() => {
    executionState = new ExecutionState();
  });

  describe('constructor', () => {
    it('should create ExecutionState with empty initial state', () => {
      expect(executionState.isInSubgraph()).toBe(false);
      expect(executionState.getCurrentSubgraphContext()).toBeNull();
      expect(executionState.getSubgraphStack()).toHaveLength(0);
      expect(executionState.getCurrentDepth()).toBe(0);
      expect(executionState.getSubgraphExecutionHistory()).toHaveLength(0);
      expect(executionState.isExecutingSubgraph()).toBe(false);
    });
  });

  describe('enterSubgraph and exitSubgraph', () => {
    it('should enter and exit subgraph correctly', () => {
      const workflowId = 'sub-workflow-1';
      const parentWorkflowId = 'parent-workflow-1';
      const input = { test: 'input' };

      executionState.enterSubgraph(workflowId, parentWorkflowId, input);

      expect(executionState.isInSubgraph()).toBe(true);
      expect(executionState.getCurrentDepth()).toBe(1);

      const context = executionState.getCurrentSubgraphContext();
      expect(context).not.toBeNull();
      expect(context!.workflowId).toBe(workflowId);
      expect(context!.parentWorkflowId).toBe(parentWorkflowId);
      expect(context!.input).toEqual(input);
      expect(context!.depth).toBe(0);

      executionState.exitSubgraph();

      expect(executionState.isInSubgraph()).toBe(false);
      expect(executionState.getCurrentSubgraphContext()).toBeNull();
      expect(executionState.getCurrentDepth()).toBe(0);
    });

    it('should handle nested subgraphs correctly', () => {
      // Enter first subgraph
      executionState.enterSubgraph('sub1', 'main', { level: 1 });
      
      expect(executionState.getCurrentDepth()).toBe(1);
      expect(executionState.getCurrentSubgraphContext()!.depth).toBe(0);

      // Enter second subgraph (nested)
      executionState.enterSubgraph('sub2', 'sub1', { level: 2 });
      
      expect(executionState.getCurrentDepth()).toBe(2);
      expect(executionState.getCurrentSubgraphContext()!.depth).toBe(1);

      // Exit second subgraph
      executionState.exitSubgraph();
      
      expect(executionState.getCurrentDepth()).toBe(1);
      expect(executionState.getCurrentSubgraphContext()!.workflowId).toBe('sub1');

      // Exit first subgraph
      executionState.exitSubgraph();
      
      expect(executionState.getCurrentDepth()).toBe(0);
      expect(executionState.isInSubgraph()).toBe(false);
    });
  });

  describe('getCurrentSubgraphContext', () => {
    it('should return null when not in subgraph', () => {
      expect(executionState.getCurrentSubgraphContext()).toBeNull();
    });

    it('should return current subgraph context when in subgraph', () => {
      executionState.enterSubgraph('sub-workflow', 'parent-workflow', { data: 'test' });
      
      const context = executionState.getCurrentSubgraphContext();
      expect(context).not.toBeNull();
      expect(context!.workflowId).toBe('sub-workflow');
      expect(context!.parentWorkflowId).toBe('parent-workflow');
      expect(context!.input).toEqual({ data: 'test' });
    });
  });

  describe('getSubgraphStack', () => {
    it('should return empty array when not in subgraph', () => {
      expect(executionState.getSubgraphStack()).toHaveLength(0);
    });

    it('should return copy of subgraph stack', () => {
      executionState.enterSubgraph('sub1', 'main', { level: 1 });
      executionState.enterSubgraph('sub2', 'sub1', { level: 2 });

      const stack = executionState.getSubgraphStack();
      expect(stack).toHaveLength(2);
      expect(stack[0]!.workflowId).toBe('sub1');
      expect(stack[1]!.workflowId).toBe('sub2');

      // Verify it's a copy, not the original array
      stack.push({} as any);
      expect(executionState.getSubgraphStack()).toHaveLength(2);
    });
  });

  describe('isInSubgraph', () => {
    it('should return false when not in subgraph', () => {
      expect(executionState.isInSubgraph()).toBe(false);
    });

    it('should return true when in subgraph', () => {
      executionState.enterSubgraph('sub', 'main', {});
      expect(executionState.isInSubgraph()).toBe(true);
    });
  });

  describe('getCurrentWorkflowId', () => {
    it('should return base workflow ID when not in subgraph', () => {
      const baseId = 'main-workflow';
      expect(executionState.getCurrentWorkflowId(baseId)).toBe(baseId);
    });

    it('should return subgraph workflow ID when in subgraph', () => {
      const baseId = 'main-workflow';
      const subId = 'sub-workflow';
      
      executionState.enterSubgraph(subId, baseId, {});
      expect(executionState.getCurrentWorkflowId(baseId)).toBe(subId);
    });
  });

  describe('getCurrentDepth', () => {
    it('should return 0 when not in subgraph', () => {
      expect(executionState.getCurrentDepth()).toBe(0);
    });

    it('should return correct depth when in subgraph', () => {
      executionState.enterSubgraph('sub1', 'main', {});
      expect(executionState.getCurrentDepth()).toBe(1);
      
      executionState.enterSubgraph('sub2', 'sub1', {});
      expect(executionState.getCurrentDepth()).toBe(2);
    });
  });

  describe('addSubgraphExecutionResult and getSubgraphExecutionHistory', () => {
    it('should not add results when not executing triggered subgraph', () => {
      executionState.addSubgraphExecutionResult({ result: 'test' });
      expect(executionState.getSubgraphExecutionHistory()).toHaveLength(0);
    });

    it('should add results when executing triggered subgraph', () => {
      executionState.startTriggeredSubgraphExecution('test-workflow');
      executionState.addSubgraphExecutionResult({ result: 'test1' });
      executionState.addSubgraphExecutionResult({ result: 'test2' });
      
      const history = executionState.getSubgraphExecutionHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ result: 'test1' });
      expect(history[1]).toEqual({ result: 'test2' });
    });

    it('should return copy of execution history', () => {
      executionState.startTriggeredSubgraphExecution('test-workflow');
      executionState.addSubgraphExecutionResult({ result: 'test' });
      
      const history = executionState.getSubgraphExecutionHistory();
      history.push({} as any);
      
      // Original history should not be modified
      expect(executionState.getSubgraphExecutionHistory()).toHaveLength(1);
    });
  });

  describe('startTriggeredSubgraphExecution and endTriggeredSubgraphExecution', () => {
    it('should manage triggered subgraph execution state', () => {
      expect(executionState.isExecutingSubgraph()).toBe(false);
      
      executionState.startTriggeredSubgraphExecution('test-workflow');
      expect(executionState.isExecutingSubgraph()).toBe(true);
      
      executionState.endTriggeredSubgraphExecution();
      expect(executionState.isExecutingSubgraph()).toBe(false);
    });

    it('should clear execution history when starting triggered subgraph', () => {
      executionState.startTriggeredSubgraphExecution('workflow1');
      executionState.addSubgraphExecutionResult({ result: 'test1' });
      
      executionState.startTriggeredSubgraphExecution('workflow2');
      expect(executionState.getSubgraphExecutionHistory()).toHaveLength(0);
    });
  });

  describe('isExecutingSubgraph', () => {
    it('should return false by default', () => {
      expect(executionState.isExecutingSubgraph()).toBe(false);
    });

    it('should return true when executing triggered subgraph', () => {
      executionState.startTriggeredSubgraphExecution('test-workflow');
      expect(executionState.isExecutingSubgraph()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all execution state', () => {
      // Set up some state
      executionState.enterSubgraph('sub', 'main', {});
      executionState.startTriggeredSubgraphExecution('triggered');
      executionState.addSubgraphExecutionResult({ result: 'test' });
      
      executionState.clear();
      
      expect(executionState.isInSubgraph()).toBe(false);
      expect(executionState.getCurrentSubgraphContext()).toBeNull();
      expect(executionState.getSubgraphStack()).toHaveLength(0);
      expect(executionState.getCurrentDepth()).toBe(0);
      expect(executionState.getSubgraphExecutionHistory()).toHaveLength(0);
      expect(executionState.isExecutingSubgraph()).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create deep copy of execution state', () => {
      // Set up some state
      executionState.enterSubgraph('sub', 'main', { data: 'test' });
      executionState.startTriggeredSubgraphExecution('triggered');
      executionState.addSubgraphExecutionResult({ result: 'test' });
      
      const cloned = executionState.clone();
      
      // Verify cloned state matches original
      expect(cloned.isInSubgraph()).toBe(executionState.isInSubgraph());
      expect(cloned.getCurrentDepth()).toBe(executionState.getCurrentDepth());
      expect(cloned.isExecutingSubgraph()).toBe(executionState.isExecutingSubgraph());
      
      const originalContext = executionState.getCurrentSubgraphContext();
      const clonedContext = cloned.getCurrentSubgraphContext();
      expect(clonedContext).not.toBeNull();
      expect(clonedContext!.workflowId).toBe(originalContext!.workflowId);
      expect(clonedContext!.input).toEqual(originalContext!.input);
      
      expect(cloned.getSubgraphExecutionHistory()).toEqual(executionState.getSubgraphExecutionHistory());
      
      // Verify modifications to original don't affect clone
      executionState.enterSubgraph('sub2', 'sub', { data: 'test2' });
      expect(cloned.getCurrentDepth()).toBe(1);
      expect(executionState.getCurrentDepth()).toBe(2);
    });
  });
});