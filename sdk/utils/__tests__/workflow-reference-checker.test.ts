/**
 * checkWorkflowReferences 单元测试
 */

import { checkWorkflowReferences } from '../workflow-reference-checker';
import type { WorkflowRegistry } from '../../core/services/workflow-registry';
import type { ThreadRegistry } from '../../core/services/thread-registry';
import type { ThreadContext } from '../../core/execution/context/thread-context';

// Mock dependencies
const mockWorkflowRegistry = {
  workflowRelationships: new Map() as any,
  list: jest.fn() as any,
  get: jest.fn() as any,
  getParentWorkflow: jest.fn() as any,
  getWorkflowHierarchy: jest.fn() as any,
} as any;

const mockThreadRegistry = {
  getAll: jest.fn() as any,
  isWorkflowActive: jest.fn() as any,
} as any;

describe('checkWorkflowReferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 设置默认的 mock 返回值
    mockWorkflowRegistry.getParentWorkflow.mockReturnValue(null);
    mockWorkflowRegistry.getWorkflowHierarchy.mockReturnValue({ depth: 0 });
    mockThreadRegistry.isWorkflowActive.mockReturnValue(true);
  });

  describe('checkReferences', () => {
    it('should return empty references when no references exist', () => {
      mockWorkflowRegistry.list.mockReturnValue([]);
      mockThreadRegistry.getAll.mockReturnValue([]);
      mockThreadRegistry.isWorkflowActive.mockReturnValue(false);

      const result = checkWorkflowReferences(mockWorkflowRegistry, mockThreadRegistry, 'test-workflow');
      
      expect(result.hasReferences).toBe(false);
      expect(result.references).toHaveLength(0);
      expect(result.canSafelyDelete).toBe(true);
      expect(result.stats).toEqual({
        subgraphReferences: 0,
        triggerReferences: 0,
        threadReferences: 0,
        runtimeReferences: 0
      });
    });

    it('should detect subgraph references', () => {
      mockWorkflowRegistry.getParentWorkflow.mockReturnValue('parent-workflow');
      mockWorkflowRegistry.getWorkflowHierarchy.mockReturnValue({ depth: 1 });
      
      mockWorkflowRegistry.get.mockReturnValue({
        id: 'parent-workflow',
        name: 'Parent Workflow',
        version: '1.0.0',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      mockWorkflowRegistry.list.mockReturnValue([]);
      mockThreadRegistry.getAll.mockReturnValue([]);
      mockThreadRegistry.isWorkflowActive.mockReturnValue(false);

      const result = checkWorkflowReferences(mockWorkflowRegistry, mockThreadRegistry, 'test-workflow');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toEqual({
        type: 'subgraph',
        sourceId: 'parent-workflow',
        sourceName: 'Parent Workflow',
        isRuntimeReference: false,
        details: {
          relationshipType: 'parent-child',
          depth: 1
        }
      });
      expect(result.canSafelyDelete).toBe(true);
    });

    it('should detect thread references', () => {
      mockWorkflowRegistry.list.mockReturnValue([]);
      mockWorkflowRegistry.workflowRelationships.clear();
      
      const mockThreadContext = {
        getWorkflowId: () => 'test-workflow',
        getThreadId: () => 'thread-1',
        getStatus: () => 'RUNNING',
        getThreadType: () => 'MAIN',
        getTriggeredSubworkflowId: () => undefined,
        getSubgraphStack: () => []
      } as unknown as ThreadContext;
      
      mockThreadRegistry.getAll.mockReturnValue([mockThreadContext]);
      mockThreadRegistry.isWorkflowActive.mockReturnValue(true);

      const result = checkWorkflowReferences(mockWorkflowRegistry, mockThreadRegistry, 'test-workflow');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.type).toBe('thread');
      expect(result.references[0]!.isRuntimeReference).toBe(true);
      expect(result.canSafelyDelete).toBe(false);
    });

    it('should detect triggered subworkflow thread references', () => {
      mockWorkflowRegistry.list.mockReturnValue([]);
      mockWorkflowRegistry.workflowRelationships.clear();
      
      const mockThreadContext = {
        getWorkflowId: () => 'other-workflow',
        getThreadId: () => 'thread-1',
        getStatus: () => 'RUNNING',
        getThreadType: () => 'MAIN',
        getTriggeredSubworkflowId: () => 'test-workflow',
        getSubgraphStack: () => []
      } as unknown as ThreadContext;
      
      mockThreadRegistry.getAll.mockReturnValue([mockThreadContext]);
      mockThreadRegistry.isWorkflowActive.mockReturnValue(true);

      const result = checkWorkflowReferences(mockWorkflowRegistry, mockThreadRegistry, 'test-workflow');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.type).toBe('thread');
      expect(result.references[0]!.isRuntimeReference).toBe(true);
      expect(result.canSafelyDelete).toBe(false);
    });
  });

});