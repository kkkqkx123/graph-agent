/**
 * workflow-processor.test.ts
 * 工流处理器的单元测试
 */

import { processWorkflow } from '../workflow-processor';
import type { WorkflowDefinition, Node, WorkflowTrigger, TriggerReference } from '@modular-agent/types';
import { NodeType, EdgeType, WorkflowType } from '@modular-agent/types';
import { ConfigurationValidationError, NodeTemplateNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import { nodeTemplateRegistry } from '../../services/node-template-registry';
import { triggerTemplateRegistry } from '../../services/trigger-template-registry';
import { graphRegistry } from '../../services/graph-registry';

// Mock dependencies
jest.mock('../../validation/workflow-validator');
jest.mock('../graph-builder');
jest.mock('../../validation/graph-validator');
jest.mock('../../services/node-template-registry');
jest.mock('../../services/trigger-template-registry');
jest.mock('../../services/graph-registry');

/**
 * 创建简单的工作流定义
 */
function createSimpleWorkflow(): WorkflowDefinition {
  return {
    id: 'wf1',
    name: 'Simple Workflow',
    description: 'A simple workflow',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: ['e1'],
        incomingEdgeIds: [],
      },
      {
        id: 'llm',
        type: NodeType.LLM,
        name: 'LLM',
        description: 'LLM node',
        config: {
          profileId: 'profile1',
          prompt: 'Hello',
        } as any,
        outgoingEdgeIds: ['e2'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e2'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'llm',
        type: EdgeType.DEFAULT,
        label: 'Start to LLM',
      },
      {
        id: 'e2',
        sourceNodeId: 'llm',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
        label: 'LLM to End',
      },
    ],
  };
}

/**
 * 创建包含节点引用的工作流定义
 */
function createWorkflowWithNodeReference(): WorkflowDefinition {
  return {
    id: 'wf2',
    name: 'Workflow with Node Reference',
    description: 'A workflow with node reference',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: ['e1'],
        incomingEdgeIds: [],
      },
      {
        id: 'llm',
        type: NodeType.LLM,
        name: 'LLM',
        description: 'LLM node',
        config: {
          templateName: 'llm-template',
          nodeId: 'llm',
          nodeName: 'LLM Node',
          configOverride: {
            profileId: 'profile1',
            prompt: 'Hello',
          },
        } as any,
        outgoingEdgeIds: ['e2'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e2'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'llm',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e2',
        sourceNodeId: 'llm',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建包含触发器的工作流定义
 */
function createWorkflowWithTriggers(): WorkflowDefinition {
  return {
    id: 'wf3',
    name: 'Workflow with Triggers',
    description: 'A workflow with triggers',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      },
    ],
    edges: [],
    triggers: [
      {
        id: 'trigger1',
        name: 'Webhook Trigger',
        description: 'A webhook trigger',
        condition: {
          type: 'event',
          eventType: 'webhook',
        } as any,
        action: {
          type: 'execute_workflow',
          parameters: {},
        } as any,
      },
    ],
  };
}

/**
 * 创建包含触发器引用的工作流定义
 */
function createWorkflowWithTriggerReference(): WorkflowDefinition {
  return {
    id: 'wf4',
    name: 'Workflow with Trigger Reference',
    description: 'A workflow with trigger reference',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      },
    ],
    edges: [],
    triggers: [
      {
        templateName: 'webhook-template',
        triggerId: 'trigger1',
        triggerName: 'Webhook Trigger',
        configOverride: {
          url: '/webhook',
        },
      } as TriggerReference,
    ],
  };
}

/**
 * 创建包含子工作流的工作流定义
 */
function createSubgraphWorkflow(): WorkflowDefinition {
  return {
    id: 'wf5',
    name: 'Subgraph Workflow',
    description: 'A workflow with subgraph',
    version: '1.0.0',
    type: WorkflowType.DEPENDENT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: ['e1'],
        incomingEdgeIds: [],
      },
      {
        id: 'subgraph',
        type: NodeType.SUBGRAPH,
        name: 'Subgraph',
        description: 'Subgraph node',
        config: {
          subgraphId: 'subwf1',
          async: false,
        } as any,
        outgoingEdgeIds: ['e2'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e2'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'subgraph',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e2',
        sourceNodeId: 'subgraph',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建子工作流定义
 */
function createSubWorkflow(): WorkflowDefinition {
  return {
    id: 'subwf1',
    name: 'Sub Workflow',
    description: 'A sub workflow',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'subStart',
        type: NodeType.START,
        name: 'Sub Start',
        description: 'Sub start node',
        config: {} as any,
        outgoingEdgeIds: ['subE1'],
        incomingEdgeIds: [],
      },
      {
        id: 'subLLM',
        type: NodeType.LLM,
        name: 'Sub LLM',
        description: 'Sub LLM node',
        config: { profileId: 'profile1' } as any,
        outgoingEdgeIds: ['subE2'],
        incomingEdgeIds: ['subE1'],
      },
      {
        id: 'subEnd',
        type: NodeType.END,
        name: 'Sub End',
        description: 'Sub end node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['subE2'],
      },
    ],
    edges: [
      {
        id: 'subE1',
        sourceNodeId: 'subStart',
        targetNodeId: 'subLLM',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'subE2',
        sourceNodeId: 'subLLM',
        targetNodeId: 'subEnd',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

describe('processWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic workflow processing', () => {
    it('should process a simple workflow', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
        addNode: jest.fn(),
        addEdge: jest.fn(),
        getNode: jest.fn(),
        getEdge: jest.fn(),
        getIncomingEdges: jest.fn(() => []),
        getOutgoingEdges: jest.fn(() => []),
      };
      GraphBuilder.build = jest.fn(() => mockGraph);
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(result).toBeDefined();
      expect(result.workflowId).toBe('wf1');
      expect(result.workflowVersion).toBe('1.0.0');
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.idMapping).toBeDefined();
      expect(result.nodeConfigs).toBeDefined();
      expect(result.triggerConfigs).toBeDefined();
      expect(result.subgraphRelationships).toBeDefined();
      expect(result.graphAnalysis).toBeDefined();
      expect(result.validationResult).toBeDefined();
      expect(result.topologicalOrder).toBeDefined();
      expect(result.processedAt).toBeDefined();
    });

    it('should throw ConfigurationValidationError for invalid workflow', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator to return error
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => false,
          isErr: () => true,
          error: [{ message: 'Invalid workflow' }],
          _tag: 'Err',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      await expect(processWorkflow(workflow)).rejects.toThrow(ConfigurationValidationError);
      await expect(processWorkflow(workflow)).rejects.toThrow('Workflow validation failed');
    });

    it('should throw ConfigurationValidationError for graph build failure', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder to return invalid result
      const { GraphBuilder } = require('../graph-builder');
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: null,
        isValid: false,
        errors: ['Graph build error'],
      }));

      await expect(processWorkflow(workflow)).rejects.toThrow(ConfigurationValidationError);
      await expect(processWorkflow(workflow)).rejects.toThrow('Graph build failed');
    });

    it('should throw ConfigurationValidationError for graph validation failure', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator to return error
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => false,
        isErr: () => true,
        error: [{ message: 'Graph validation error' }],
        _tag: 'Err',
      }));

      await expect(processWorkflow(workflow)).rejects.toThrow(ConfigurationValidationError);
      await expect(processWorkflow(workflow)).rejects.toThrow('Graph validation failed');
    });
  });

  describe('node reference expansion', () => {
    it('should expand node references', async () => {
      const workflow = createWorkflowWithNodeReference();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock nodeTemplateRegistry
      (nodeTemplateRegistry.get as jest.Mock).mockReturnValue({
        name: 'llm-template',
        type: NodeType.LLM,
        description: 'LLM template',
        config: {
          profileId: 'default-profile',
          prompt: 'Default prompt',
        },
        metadata: {},
      });

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(nodeTemplateRegistry.get).toHaveBeenCalledWith('llm-template');
      expect(result).toBeDefined();
    });

    it('should throw NodeTemplateNotFoundError for missing template', async () => {
      const workflow = createWorkflowWithNodeReference();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock nodeTemplateRegistry to return undefined
      (nodeTemplateRegistry.get as jest.Mock).mockReturnValue(undefined);

      await expect(processWorkflow(workflow)).rejects.toThrow(NodeTemplateNotFoundError);
      await expect(processWorkflow(workflow)).rejects.toThrow('Node template not found: llm-template');
    });
  });

  describe('trigger reference expansion', () => {
    it('should expand trigger references', async () => {
      const workflow = createWorkflowWithTriggerReference();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock triggerTemplateRegistry
      (triggerTemplateRegistry.convertToWorkflowTrigger as jest.Mock).mockReturnValue({
        id: 'trigger1',
        type: 'webhook',
        name: 'Webhook Trigger',
        description: 'A webhook trigger',
        config: {
          url: '/webhook',
        },
      });

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(triggerTemplateRegistry.convertToWorkflowTrigger).toHaveBeenCalledWith(
        'webhook-template',
        'trigger1',
        'Webhook Trigger',
        { url: '/webhook' }
      );
      expect(result).toBeDefined();
    });

    it('should handle workflow triggers without references', async () => {
      const workflow = createWorkflowWithTriggers();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(triggerTemplateRegistry.convertToWorkflowTrigger).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.triggers).toBeDefined();
      expect(result.triggers?.length).toBe(1);
    });
  });

  describe('subgraph processing', () => {
    it('should process subgraphs', async () => {
      const workflow = createSubgraphWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: ['subStart', 'subLLM', 'subEnd'],
        removedNodeIds: ['subgraph'],
        subworkflowIds: ['subwf1'],
        nodeIdMapping: new Map([['subStart', 'sg_subStart']]),
        edgeIdMapping: new Map([['subE1', 'sg_subE1']]),
        errors: [],
      }));

      // Mock workflowRegistry
      const workflowRegistry = {
        get: jest.fn((id: string) => {
          if (id === 'subwf1') {
            return createSubWorkflow();
          }
          return undefined;
        }),
      };

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow, { workflowRegistry });

      expect(GraphBuilder.processSubgraphs).toHaveBeenCalled();
      expect(result.hasSubgraphs).toBe(true);
      expect(result.subworkflowIds.has('subwf1')).toBe(true);
      expect(result.subgraphMergeLogs).toBeDefined();
    });

    it('should throw ConfigurationValidationError for subgraph processing failure', async () => {
      const workflow = createSubgraphWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: false,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: ['Subgraph processing error'],
      }));

      // Mock workflowRegistry
      const workflowRegistry = {
        get: jest.fn(),
      };

      await expect(processWorkflow(workflow, { workflowRegistry })).rejects.toThrow(ConfigurationValidationError);
      await expect(processWorkflow(workflow, { workflowRegistry })).rejects.toThrow('Subgraph processing failed');
    });

    it('should handle triggered workflows', async () => {
      const workflow = createWorkflowWithTriggers();
      
      // Add trigger with EXECUTE_TRIGGERED_SUBGRAPH action
      workflow.triggers = [
        {
          id: 'trigger1',
          type: 'webhook',
          name: 'Webhook Trigger',
          description: 'A webhook trigger',
          config: {} as any,
          action: {
            type: 'execute_triggered_subgraph',
            parameters: {
              triggeredWorkflowId: 'triggeredWf1',
            },
          },
        } as any,
      ];
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow, { workflowRegistry: {} });

      expect(graphRegistry.ensureProcessed).toHaveBeenCalledWith('triggeredWf1');
      expect(result.subworkflowIds.has('triggeredWf1')).toBe(true);
    });

    it('should throw WorkflowNotFoundError for missing triggered workflow', async () => {
      const workflow = createWorkflowWithTriggers();
      
      // Add trigger with EXECUTE_TRIGGERED_SUBGRAPH action
      workflow.triggers = [
        {
          id: 'trigger1',
          type: 'webhook',
          name: 'Webhook Trigger',
          description: 'A webhook trigger',
          config: {} as any,
          action: {
            type: 'execute_triggered_subgraph',
            parameters: {
              triggeredWorkflowId: 'missingWf',
            },
          },
        } as any,
      ];
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({ isOk: () => true }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry to return undefined
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(undefined);

      await expect(processWorkflow(workflow, { workflowRegistry: {} })).rejects.toThrow(WorkflowNotFoundError);
      await expect(processWorkflow(workflow, { workflowRegistry: {} })).rejects.toThrow('Triggered workflow');
    });
  });

  describe('preprocessed graph creation', () => {
    it('should create PreprocessedGraphData with correct structure', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(result.workflowId).toBe('wf1');
      expect(result.workflowVersion).toBe('1.0.0');
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.adjacencyList).toBeDefined();
      expect(result.reverseAdjacencyList).toBeDefined();
      expect(result.startNodeId).toBeDefined();
      expect(result.endNodeIds).toBeDefined();
      expect(result.idMapping).toBeDefined();
      expect(result.nodeConfigs).toBeDefined();
      expect(result.triggerConfigs).toBeDefined();
      expect(result.subgraphRelationships).toBeDefined();
      expect(result.graphAnalysis).toBeDefined();
      expect(result.validationResult).toBeDefined();
      expect(result.topologicalOrder).toBeDefined();
      expect(result.subgraphMergeLogs).toBeDefined();
      expect(result.processedAt).toBeDefined();
      expect(result.triggers).toBeDefined();
      expect(result.variables).toBeUndefined();
      expect(result.hasSubgraphs).toBeDefined();
      expect(result.subworkflowIds).toBeDefined();
    });

    it('should set hasSubgraphs to false when no subgraphs', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(result.hasSubgraphs).toBe(false);
      expect(result.subworkflowIds.size).toBe(0);
    });
  });

  describe('options handling', () => {
    it('should use default options when not provided', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const result = await processWorkflow(workflow);

      expect(result).toBeDefined();
    });

    it('should use custom options when provided', async () => {
      const workflow = createSimpleWorkflow();
      
      // Mock WorkflowValidator
      const { WorkflowValidator } = require('../../validation/workflow-validator');
      const mockValidator = {
        validate: jest.fn().mockReturnValue({
          isOk: () => true,
          isErr: () => false,
          value: undefined,
          _tag: 'Ok',
        }),
      };
      WorkflowValidator.mockImplementation(() => mockValidator);

      // Mock GraphBuilder
      const { GraphBuilder } = require('../graph-builder');
      const mockGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
        reverseAdjacencyList: new Map(),
        startNodeId: 'start',
        endNodeIds: new Set(['end']),
      };
      GraphBuilder.buildAndValidate = jest.fn(() => ({
        graph: mockGraph,
        isValid: true,
        errors: [],
      }));
      GraphBuilder.processSubgraphs = jest.fn(() => ({
        success: true,
        addedNodeIds: [],
        removedNodeIds: [],
        subworkflowIds: [],
        nodeIdMapping: new Map(),
        edgeIdMapping: new Map(),
        errors: [],
      }));

      // Mock GraphValidator
      const { GraphValidator } = require('../../validation/graph-validator');
      GraphValidator.validate = jest.fn(() => ({
        isOk: () => true,
        isErr: () => false,
        value: undefined,
        _tag: 'Ok',
      }));
      GraphValidator.analyze = jest.fn(() => ({
        topologicalSort: {
          sortedNodes: ['start', 'llm', 'end'],
          hasCycle: false,
        },
        reachability: {},
        cycles: [],
      }));

      // Mock graphRegistry
      (graphRegistry as any).ensureProcessed = jest.fn().mockResolvedValue(mockGraph);

      const workflowRegistry = {
        get: jest.fn(),
      };

      const result = await processWorkflow(workflow, {
        workflowRegistry,
        maxRecursionDepth: 5,
      });

      expect(result).toBeDefined();
      expect(GraphBuilder.processSubgraphs).toHaveBeenCalledWith(
        mockGraph,
        workflowRegistry,
        5
      );
    });
  });
});