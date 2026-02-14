/**
 * 工作流验证器单元测试
 * 使用Result类型进行错误处理
 */

import { WorkflowValidator } from '../workflow-validator';
import { NodeType } from '@modular-agent/types';
import { EdgeType } from '@modular-agent/types';
import { WorkflowType } from '@modular-agent/types';
import type { WorkflowDefinition } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;

  beforeEach(() => {
    validator = new WorkflowValidator();
  });

  const createValidWorkflow = (type: WorkflowType = WorkflowType.STANDALONE): WorkflowDefinition => ({
    id: 'workflow-1',
    name: 'Test Workflow',
    version: '1.0.0',
    type: type,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'node-start',
        name: 'Start',
        type: NodeType.START,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: ['edge-1']
      },
      {
        id: 'node-end',
        name: 'End',
        type: NodeType.END,
        config: {},
        incomingEdgeIds: ['edge-1'],
        outgoingEdgeIds: []
      }
    ],
    edges: [
       {
         id: 'edge-1',
         sourceNodeId: 'node-start',
         targetNodeId: 'node-end',
         type: EdgeType.DEFAULT,
         condition: undefined
       }
     ]
  });

  describe('validate', () => {
    it('should validate a valid workflow', () => {
      const workflow = createValidWorkflow();
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(workflow);
    });

    it('should return errors for workflow without id', () => {
      const workflow = { ...createValidWorkflow(), id: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.id')).toBe(true);
      }
    });

    it('should return errors for workflow without name', () => {
      const workflow = { ...createValidWorkflow(), name: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.name')).toBe(true);
      }
    });

    it('should return errors for workflow without version', () => {
      const workflow = { ...createValidWorkflow(), version: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.version')).toBe(true);
      }
    });

    it('should return errors for workflow without nodes', () => {
      const workflow = { ...createValidWorkflow(), nodes: [] };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.nodes')).toBe(true);
      }
    });
  });

  describe('validateBasicInfo', () => {
    it('should validate workflow with all required basic info', () => {
      const workflow = createValidWorkflow();
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should return error for missing id', () => {
      const workflow = { ...createValidWorkflow(), id: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.id' && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for missing name', () => {
      const workflow = { ...createValidWorkflow(), name: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.name' && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for missing version', () => {
      const workflow = { ...createValidWorkflow(), version: '' };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.version' && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for empty nodes array', () => {
      const workflow = { ...createValidWorkflow(), nodes: [] };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'workflow.nodes' && e.message.includes('at least one'))).toBe(true);
      }
    });
  });

  describe('validateNodes', () => {
    it('should validate nodes with unique IDs', () => {
      const workflow = createValidWorkflow();
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should return error for duplicate node IDs', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Node 1',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-1',
            name: 'Node 2',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('unique'))).toBe(true);
      }
    });

    it('should return error for node without id', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: '',
            name: 'Node',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('id') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for node without name', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: '',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('name') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for node without type', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Node',
            type: '' as any,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('type') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for workflow without START node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Node',
            type: NodeType.LLM,
            config: { profileId: 'profile-1', prompt: 'Hello' },
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('START node'))).toBe(true);
      }
    });

    it('should return error for workflow with multiple START nodes', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start 1',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-2',
            name: 'Start 2',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('exactly one START node'))).toBe(true);
      }
    });

    it('should return error for workflow without END node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-2',
            name: 'LLM',
            type: NodeType.LLM,
            config: { profileId: 'profile-1', prompt: 'Hello' },
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('END node'))).toBe(true);
      }
    });

    it('should return error for triggered subgraph without START_FROM_TRIGGER node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Continue',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('START_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('should return error for triggered subgraph without CONTINUE_FROM_TRIGGER node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('CONTINUE_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('should return error for triggered subgraph with START node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'StartFromTrigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-2',
            name: 'ContinueFromTrigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-3',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain START node'))).toBe(true);
      }
    });

    it('should return error for triggered subgraph with END node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        nodes: [
          {
            id: 'node-1',
            name: 'StartFromTrigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-2',
            name: 'ContinueFromTrigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-3',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain END node'))).toBe(true);
      }
    });
  });

  describe('validateEdges', () => {
    it('should validate edges with unique IDs', () => {
      const workflow = createValidWorkflow();
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should return error for duplicate edge IDs', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-1',
            sourceNodeId: 'node-2',
            targetNodeId: 'node-3',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('unique'))).toBe(true);
      }
    });

    it('should return error for edge without id', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: '',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('id') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for edge without sourceNodeId', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: '',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('sourceNodeId') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for edge without targetNodeId', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: '',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('targetNodeId') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for edge without type', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: '' as any
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('type') && e.message.includes('required'))).toBe(true);
      }
    });

    it('should return error for edge with non-existent source node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'non-existent',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('source node not found'))).toBe(true);
      }
    });

    it('should return error for edge with non-existent target node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'non-existent',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('target node not found'))).toBe(true);
      }
    });
  });

  describe('validateReferences', () => {
    it('should validate workflow with correct references', () => {
      const workflow = createValidWorkflow();
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should return error for edge with non-existent source node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'non-existent',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('source node not found'))).toBe(true);
      }
    });

    it('should return error for edge with non-existent target node', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'non-existent',
            type: EdgeType.DEFAULT
          }
        ]
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('target node not found'))).toBe(true);
      }
    });
  });

  describe('validateConfig', () => {
    it('should validate workflow with valid config', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          timeout: 60000,
          maxSteps: 100,
          enableCheckpoints: true,
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          }
        }
      };
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should return error for negative timeout', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          timeout: -1
        }
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('timeout') && e.message.includes('non-negative'))).toBe(true);
      }
    });

    it('should return error for negative maxSteps', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          maxSteps: -1
        }
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('maxSteps') && e.message.includes('non-negative'))).toBe(true);
      }
    });

    it('should return error for negative maxRetries', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          retryPolicy: {
            maxRetries: -1
          }
        }
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('maxRetries') && e.message.includes('non-negative'))).toBe(true);
      }
    });

    it('should return error for negative retryDelay', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          retryPolicy: {
            retryDelay: -1
          }
        }
      };
      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('retryDelay') && e.message.includes('non-negative'))).toBe(true);
      }
    });

    it('should validate workflow with zero timeout', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          timeout: 0
        }
      };
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('should validate workflow with zero maxSteps', () => {
      const workflow: WorkflowDefinition = {
        ...createValidWorkflow(),
        config: {
          maxSteps: 0
        }
      };
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('complex workflow validation', () => {
    it('should validate a complex workflow with multiple nodes and edges', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-complex',
        name: 'Complex Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-llm',
            name: 'LLM',
            type: NodeType.LLM,
            config: {
              profileId: 'profile-1',
              prompt: 'Hello'
            },
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: ['edge-2']
          },
          {
            id: 'node-code',
            name: 'Code',
            type: NodeType.CODE,
            config: {
              scriptName: 'process',
              scriptType: 'javascript',
              risk: 'low',
              timeout: 5000,
              retries: 3
            },
            incomingEdgeIds: ['edge-2'],
            outgoingEdgeIds: ['edge-3']
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-3'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-llm',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-llm',
            targetNodeId: 'node-code',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-3',
            sourceNodeId: 'node-code',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          timeout: 60000,
          maxSteps: 100,
          enableCheckpoints: true
        }
      };
      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(workflow);
    });
  });

  describe('validateWorkflowType - 工作流类型验证', () => {
    it('应该验证TRIGGERED_SUBWORKFLOW类型 - 包含START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        type: WorkflowType.TRIGGERED_SUBWORKFLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-continue',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };

      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('应该拒绝TRIGGERED_SUBWORKFLOW类型 - 缺少START_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        type: WorkflowType.TRIGGERED_SUBWORKFLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('START_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('应该拒绝TRIGGERED_SUBWORKFLOW类型 - 缺少CONTINUE_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        type: WorkflowType.TRIGGERED_SUBWORKFLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('CONTINUE_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('应该拒绝TRIGGERED_SUBWORKFLOW类型 - 包含START节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        type: WorkflowType.TRIGGERED_SUBWORKFLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-start-regular',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain START node'))).toBe(true);
      }
    });

    it('应该拒绝TRIGGERED_SUBWORKFLOW类型 - 包含END节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        type: WorkflowType.TRIGGERED_SUBWORKFLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain END node'))).toBe(true);
      }
    });

    it('应该验证STANDALONE类型 - 包含START和END节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'standalone-workflow',
        name: 'Standalone Workflow',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };

      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('应该拒绝STANDALONE类型 - 包含START_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'standalone-workflow',
        name: 'Standalone Workflow',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-start-trigger',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain START_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('应该拒绝STANDALONE类型 - 包含CONTINUE_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'standalone-workflow',
        name: 'Standalone Workflow',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain CONTINUE_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('应该拒绝STANDALONE类型 - 包含SUBGRAPH节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'standalone-workflow',
        name: 'Standalone Workflow',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-subgraph',
            name: 'Subgraph',
            type: NodeType.SUBGRAPH,
            config: {
              subgraphId: 'sub-workflow'
            },
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain SUBGRAPH node'))).toBe(true);
      }
    });

    it('应该验证DEPENDENT类型 - 包含SUBGRAPH节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'dependent-workflow',
        name: 'Dependent Workflow',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-subgraph',
            name: 'Subgraph',
            type: NodeType.SUBGRAPH,
            config: {
              subgraphId: 'sub-workflow'
            },
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: ['edge-2']
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-2'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-subgraph',
            type: EdgeType.DEFAULT,
            condition: undefined
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-subgraph',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };

      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证DEPENDENT类型 - 包含EXECUTE_TRIGGERED_SUBGRAPH触发器', () => {
      const workflow: WorkflowDefinition = {
        id: 'dependent-workflow',
        name: 'Dependent Workflow',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: [
          {
            id: 'trigger-1',
            name: 'Execute Triggered Subgraph',
            type: 'event',
            condition: {
              eventType: 'NODE_COMPLETED'
            },
            action: {
              type: 'EXECUTE_TRIGGERED_SUBGRAPH',
              parameters: {
                subgraphId: 'triggered-sub-workflow'
              }
            },
            enabled: true
          }
        ]
      };

      const result = validator.validate(workflow);
      expect(result.isOk()).toBe(true);
    });

    it('应该拒绝DEPENDENT类型 - 不包含SUBGRAPH节点或EXECUTE_TRIGGERED_SUBGRAPH触发器', () => {
      const workflow: WorkflowDefinition = {
        id: 'dependent-workflow',
        name: 'Dependent Workflow',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('must contain SUBGRAPH node or EXECUTE_TRIGGERED_SUBGRAPH trigger'))).toBe(true);
      }
    });

    it('应该拒绝DEPENDENT类型 - 包含START_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'dependent-workflow',
        name: 'Dependent Workflow',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-start-trigger',
            name: 'Start From Trigger',
            type: NodeType.START_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain START_FROM_TRIGGER'))).toBe(true);
      }
    });

    it('应该拒绝DEPENDENT类型 - 包含CONTINUE_FROM_TRIGGER节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'dependent-workflow',
        name: 'Dependent Workflow',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-continue',
            name: 'Continue From Trigger',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          },
          {
            id: 'node-end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: []
          }
        ],
        edges: []
      };

      const result = validator.validate(workflow);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot contain CONTINUE_FROM_TRIGGER'))).toBe(true);
      }
    });
  });
});