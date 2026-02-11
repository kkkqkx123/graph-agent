/**
 * WorkflowRegistryAPI 单元测试
 */

import { WorkflowRegistryAPI } from '../workflow-registry-api';
import type { APIDependencies } from '../../core/api-dependencies';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';

// Mock dependencies
const mockWorkflowRegistry = {
  get: jest.fn(),
  list: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  checkWorkflowReferences: jest.fn(),
} as any;

const mockDependencies: APIDependencies = {
  getWorkflowRegistry: () => mockWorkflowRegistry,
  getThreadRegistry: jest.fn(),
  getEventManager: jest.fn(),
  getCheckpointStateManager: jest.fn(),
  getToolService: jest.fn(),
  getLlmExecutor: jest.fn(),
  getGraphRegistry: jest.fn(),
  getCodeService: jest.fn(),
  getNodeTemplateRegistry: jest.fn(),
  getTriggerTemplateRegistry: jest.fn(),
} as any;

describe('WorkflowRegistryAPI', () => {
  let api: WorkflowRegistryAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new WorkflowRegistryAPI(mockDependencies);
  });

  describe('createVersionedUpdate', () => {
    const baseWorkflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should create new version with default patch strategy', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);

      const newId = await api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' });

      expect(newId).toBe('test-workflow');
      expect(mockWorkflowRegistry.register).toHaveBeenCalledWith({
        ...baseWorkflow,
        name: 'Updated Workflow',
        version: '1.0.1',
        updatedAt: expect.any(Number)
      });
    });

    it('should create new version with minor strategy', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);

      const newId = await api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' }, {
        versionStrategy: 'minor'
      });

      expect(newId).toBe('test-workflow');
      expect(mockWorkflowRegistry.register).toHaveBeenCalledWith({
        ...baseWorkflow,
        name: 'Updated Workflow',
        version: '1.1.0',
        updatedAt: expect.any(Number)
      });
    });

    it('should create new version with major strategy', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);

      const newId = await api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' }, {
        versionStrategy: 'major'
      });

      expect(newId).toBe('test-workflow');
      expect(mockWorkflowRegistry.register).toHaveBeenCalledWith({
        ...baseWorkflow,
        name: 'Updated Workflow',
        version: '2.0.0',
        updatedAt: expect.any(Number)
      });
    });

    it('should replace original when keepOriginal is false and no references', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);
      mockWorkflowRegistry.checkWorkflowReferences.mockReturnValue({
        hasReferences: false,
        references: [],
        canSafelyDelete: true,
        stats: { subgraphReferences: 0, triggerReferences: 0, threadReferences: 0, runtimeReferences: 0 }
      });

      const newId = await api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' }, {
        keepOriginal: false
      });

      expect(newId).toBe('test-workflow');
      expect(mockWorkflowRegistry.unregister).toHaveBeenCalledWith('test-workflow', {
        force: undefined,
        checkReferences: true,
        threadRegistry: expect.any(Object)
      });
    });

    it('should throw error when replacing original with references and no force', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);
      mockWorkflowRegistry.checkWorkflowReferences.mockReturnValue({
        hasReferences: true,
        references: [{ type: 'thread', sourceId: 'thread-1', sourceName: 'Thread 1', isRuntimeReference: true, details: {} }],
        canSafelyDelete: false,
        stats: { subgraphReferences: 0, triggerReferences: 0, threadReferences: 1, runtimeReferences: 1 }
      });

      await expect(
        api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' }, {
          keepOriginal: false
        })
      ).rejects.toThrow('Cannot replace workflow \'test-workflow\': it is referenced by 1 other components.');
    });

    it('should force replace original when force is true', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);
      mockWorkflowRegistry.checkWorkflowReferences.mockReturnValue({
        hasReferences: true,
        references: [{ type: 'thread', sourceId: 'thread-1', sourceName: 'Thread 1', isRuntimeReference: true, details: {} }],
        canSafelyDelete: false,
        stats: { subgraphReferences: 0, triggerReferences: 0, threadReferences: 1, runtimeReferences: 1 }
      });

      const newId = await api.createVersionedUpdate('test-workflow', { name: 'Updated Workflow' }, {
        keepOriginal: false,
        force: true
      });

      expect(newId).toBe('test-workflow');
      expect(mockWorkflowRegistry.unregister).toHaveBeenCalledWith('test-workflow', {
        force: true,
        checkReferences: true,
        threadRegistry: expect.any(Object)
      });
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(null);

      await expect(
        api.createVersionedUpdate('non-existent', { name: 'Updated Workflow' })
      ).rejects.toThrow('Workflow with ID \'non-existent\' not found');
    });
  });

  describe('updateResource', () => {
    const baseWorkflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should create new version and replace original when no references exist', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);
      mockWorkflowRegistry.checkWorkflowReferences.mockReturnValue({
        hasReferences: false,
        references: [],
        canSafelyDelete: true,
        stats: { subgraphReferences: 0, triggerReferences: 0, threadReferences: 0, runtimeReferences: 0 }
      });

      await (api as any).updateResource('test-workflow', { name: 'Updated Workflow' });

      expect(mockWorkflowRegistry.register).toHaveBeenCalledWith({
        ...baseWorkflow,
        name: 'Updated Workflow',
        version: '1.0.1',
        updatedAt: expect.any(Number)
      });
      expect(mockWorkflowRegistry.unregister).toHaveBeenCalledWith('test-workflow', {
        force: false,
        checkReferences: true
      });
    });

    it('should throw error when replacing original with references', async () => {
      mockWorkflowRegistry.get.mockResolvedValue(baseWorkflow);
      mockWorkflowRegistry.checkWorkflowReferences.mockReturnValue({
        hasReferences: true,
        references: [{ type: 'thread', sourceId: 'thread-1', sourceName: 'Thread 1', isRuntimeReference: true, details: {} }],
        canSafelyDelete: false,
        stats: { subgraphReferences: 0, triggerReferences: 0, threadReferences: 1, runtimeReferences: 1 }
      });

      await expect(
        (api as any).updateResource('test-workflow', { name: 'Updated Workflow' })
      ).rejects.toThrow('Cannot replace workflow \'test-workflow\': it is referenced by 1 other components.');
    });
  });
});