/**
 * 节点验证器单元测试
 */

import { NodeValidator } from '../node-validator';
import { NodeType } from '../../../types/node';
import type { Node } from '../../../types/node';

describe('NodeValidator', () => {
  let validator: NodeValidator;

  beforeEach(() => {
    validator = new NodeValidator();
  });

  describe('validateNode', () => {
    it('should validate a valid START node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start',
        type: NodeType.START,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid END node', () => {
      const node: Node = {
        id: 'node-2',
        name: 'End',
        type: NodeType.END,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for node without id', () => {
      const node = {
        name: 'Test',
        type: NodeType.START
      } as Node;
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'node.id')).toBe(true);
    });

    it('should return error for node without name', () => {
      const node = {
        id: 'node-1',
        type: NodeType.START
      } as Node;
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'node.name')).toBe(true);
    });

    it('should return error for node without type', () => {
      const node = {
        id: 'node-1',
        name: 'Test'
      } as Node;
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'node.type')).toBe(true);
    });
  });

  describe('validateNodeConfig - VARIABLE node', () => {
    it('should validate a valid VARIABLE node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Variable',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'myVar',
          variableType: 'string',
          expression: 'input.value'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for VARIABLE node without variableName', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Variable',
        type: NodeType.VARIABLE,
        config: {
          variableType: 'string',
          expression: 'input.value'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('variableName'))).toBe(true);
    });

    it('should return error for VARIABLE node without variableType', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Variable',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'myVar',
          expression: 'input.value'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('variableType'))).toBe(true);
    });

    it('should return error for VARIABLE node without expression', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Variable',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'myVar',
          variableType: 'string'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('expression'))).toBe(true);
    });
  });

  describe('validateNodeConfig - FORK node', () => {
    it('should validate a valid FORK node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkId: 'fork-1',
          forkStrategy: 'serial'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for FORK node without forkId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkStrategy: 'serial'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('forkId'))).toBe(true);
    });

    it('should return error for FORK node without forkStrategy', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkId: 'fork-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('forkStrategy'))).toBe(true);
    });
  });

  describe('validateNodeConfig - JOIN node', () => {
    it('should validate a valid JOIN node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinId: 'join-1',
          joinStrategy: 'ALL_COMPLETED'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid JOIN node with SUCCESS_COUNT_THRESHOLD', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinId: 'join-1',
          joinStrategy: 'SUCCESS_COUNT_THRESHOLD',
          threshold: 2
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for JOIN node without joinId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinStrategy: 'ALL_COMPLETED'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('joinId'))).toBe(true);
    });

    it('should return error for JOIN node without joinStrategy', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinId: 'join-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('joinStrategy'))).toBe(true);
    });

    it('should return error for JOIN node with SUCCESS_COUNT_THRESHOLD but no threshold', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinId: 'join-1',
          joinStrategy: 'SUCCESS_COUNT_THRESHOLD'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('threshold'))).toBe(true);
    });
  });

  describe('validateNodeConfig - CODE node', () => {
    it('should validate a valid CODE node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptName: 'myScript',
          scriptType: 'javascript',
          risk: 'low',
          timeout: 5000,
          retries: 3,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for CODE node without scriptName', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptType: 'javascript',
          risk: 'low',
          timeout: 5000,
          retries: 3,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('scriptName'))).toBe(true);
    });

    it('should return error for CODE node without scriptType', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptName: 'myScript',
          risk: 'low',
          timeout: 5000,
          retries: 3,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('scriptType'))).toBe(true);
    });

    it('should return error for CODE node without risk', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptName: 'myScript',
          scriptType: 'javascript',
          timeout: 5000,
          retries: 3,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('risk'))).toBe(true);
    });

    it('should return error for CODE node without timeout', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptName: 'myScript',
          scriptType: 'javascript',
          risk: 'low',
          retries: 3,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      // timeout is now optional, so this should be valid
      expect(result.valid).toBe(true);
    });

    it('should return error for CODE node without retries', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: {
          scriptName: 'myScript',
          scriptType: 'javascript',
          risk: 'low',
          timeout: 5000,
          retryDelay: 1000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      // retries is now optional, so this should be valid
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNodeConfig - LLM node', () => {
    it('should validate a valid LLM node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LLM',
        type: NodeType.LLM,
        config: {
          profileId: 'profile-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for LLM node without profileId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LLM',
        type: NodeType.LLM,
        config: {} as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('profileId'))).toBe(true);
    });
  });

  describe('validateNodeConfig - TOOL node', () => {
    it('should validate a valid TOOL node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Tool',
        type: NodeType.TOOL,
        config: {
          toolName: 'get_weather',
          parameters: { location: 'Beijing' },
          timeout: 5000,
          retries: 3
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for TOOL node without toolName', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Tool',
        type: NodeType.TOOL,
        config: {
          parameters: { location: 'Beijing' },
          timeout: 5000,
          retries: 3
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('toolName'))).toBe(true);
    });

    it('should return error for TOOL node without parameters', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Tool',
        type: NodeType.TOOL,
        config: {
          toolName: 'get_weather',
          timeout: 5000,
          retries: 3
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('parameters'))).toBe(true);
    });
  });

  describe('validateNodeConfig - USER_INTERACTION node', () => {
    it('should validate a valid USER_INTERACTION node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          userInteractionType: 'ask_for_input'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for USER_INTERACTION node without userInteractionType', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {} as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('userInteractionType'))).toBe(true);
    });
  });

  describe('validateNodeConfig - ROUTE node', () => {
    it('should validate a valid ROUTE node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Route',
        type: NodeType.ROUTE,
        config: {
          routes: [
            { condition: 'input.value > 10', targetNodeId: 'node-2' },
            { condition: 'input.value <= 10', targetNodeId: 'node-3' }
          ]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for ROUTE node without routes', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Route',
        type: NodeType.ROUTE,
        config: {
          routes: []
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('routes'))).toBe(true);
    });

    it('should return error for ROUTE node without route condition', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Route',
        type: NodeType.ROUTE,
        config: {
          routes: [{ targetNodeId: 'node-2' } as any]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('condition'))).toBe(true);
    });

    it('should return error for ROUTE node without route targetNodeId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Route',
        type: NodeType.ROUTE,
        config: {
          routes: [{ condition: 'input.value > 10' } as any]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('targetNodeId'))).toBe(true);
    });
  });

  describe('validateNodeConfig - CONTEXT_PROCESSOR node', () => {
    it('should validate a valid CONTEXT_PROCESSOR node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          processorType: 'transform',
          rules: [
            { sourcePath: 'input.value', targetPath: 'output.value' }
          ]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for CONTEXT_PROCESSOR node without processorType', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          rules: []
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('processorType'))).toBe(true);
    });

    it('should return error for CONTEXT_PROCESSOR node without rules', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          processorType: 'transform',
          rules: []
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('rules'))).toBe(true);
    });
  });

  describe('validateNodeConfig - LOOP_START node', () => {
    it('should validate a valid LOOP_START node with dataSource (data-driven loop)', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LoopStart',
        type: NodeType.LOOP_START,
        config: {
          loopId: 'loop-1',
          dataSource: {
            iterable: 'items',
            variableName: 'item'
          },
          maxIterations: 10
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid LOOP_START node without dataSource (counting loop)', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LoopStart',
        type: NodeType.LOOP_START,
        config: {
          loopId: 'loop-1',
          maxIterations: 10
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for LOOP_START node without loopId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LoopStart',
        type: NodeType.LOOP_START,
        config: {
          dataSource: {
            iterable: 'items',
            variableName: 'item'
          },
          maxIterations: 10
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('loopId'))).toBe(true);
    });

    it('should return error for LOOP_START node without maxIterations', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LoopStart',
        type: NodeType.LOOP_START,
        config: {
          loopId: 'loop-1',
          dataSource: {
            iterable: 'items',
            variableName: 'item'
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('maxIterations'))).toBe(true);
    });

    it('should return error for LOOP_START node with dataSource missing variableName', () => {
      const node: Node = {
        id: 'node-1',
        name: 'LoopStart',
        type: NodeType.LOOP_START,
        config: {
          loopId: 'loop-1',
          dataSource: {
            iterable: 'items'
            // variableName missing
          } as any,
          maxIterations: 10
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('variableName'))).toBe(true);
    });
  });

  describe('validateNodeConfig - LOOP_END node', () => {
    it('should validate a valid LOOP_END node with breakCondition', () => {
      const node: Node = {
        id: 'node-2',
        name: 'LoopEnd',
        type: NodeType.LOOP_END,
        config: {
          loopId: 'loop-1',
          breakCondition: { type: 'condition', expression: 'item.done' },
          loopStartNodeId: 'node-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid LOOP_END node without breakCondition', () => {
      const node: Node = {
        id: 'node-2',
        name: 'LoopEnd',
        type: NodeType.LOOP_END,
        config: {
          loopId: 'loop-1',
          loopStartNodeId: 'node-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for LOOP_END node without loopId', () => {
      const node: Node = {
        id: 'node-2',
        name: 'LoopEnd',
        type: NodeType.LOOP_END,
        config: {
          breakCondition: { type: 'condition', expression: 'item.done' },
          loopStartNodeId: 'node-1'
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('loopId'))).toBe(true);
    });
  });

  describe('validateNodeConfig - SUBGRAPH node', () => {
    it('should validate a valid SUBGRAPH node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: { input: 'workflowInput' },
          outputMapping: { output: 'workflowOutput' },
          async: false
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for SUBGRAPH node without subgraphId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          inputMapping: {},
          outputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('subgraphId'))).toBe(true);
    });

    it('should return error for SUBGRAPH node without inputMapping', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          outputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('inputMapping'))).toBe(true);
    });

    it('should return error for SUBGRAPH node without outputMapping', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('outputMapping'))).toBe(true);
    });
  });

  describe('validateNodeConfig - Unknown node type', () => {
    it('should return error for unknown node type', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Unknown',
        type: 'UNKNOWN' as any,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});