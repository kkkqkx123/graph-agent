/**
 * 节点验证器单元测试
 * 使用Result类型进行错误处理
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should return error for node without id', () => {
      const node = {
        name: 'Test',
        type: NodeType.START
      } as Node;
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'node.id')).toBe(true);
      }
    });

    it('should return error for node without name', () => {
      const node = {
        id: 'node-1',
        type: NodeType.START
      } as Node;
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'node.name')).toBe(true);
      }
    });

    it('should return error for node without type', () => {
      const node = {
        id: 'node-1',
        name: 'Test'
      } as Node;
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field === 'node.type')).toBe(true);
      }
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('variableName'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('variableType'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('expression'))).toBe(true);
      }
    });
  });

  describe('validateNodeConfig - FORK node', () => {
    it('should validate a valid FORK node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkPaths: [
            { pathId: 'path-1', childNodeId: 'child-1' },
            { pathId: 'path-2', childNodeId: 'child-2' }
          ],
          forkStrategy: 'serial'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should return error for FORK node without forkPaths', () => {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('forkPaths'))).toBe(true);
      }
    });

    it('should return error for FORK node without forkStrategy', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkPaths: [
            { pathId: 'path-1', childNodeId: 'child-1' }
          ]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('forkStrategy'))).toBe(true);
      }
    });

    it('should return error for FORK node with duplicate pathId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Fork',
        type: NodeType.FORK,
        config: {
          forkPaths: [
            { pathId: 'path-1', childNodeId: 'child-1' },
            { pathId: 'path-1', childNodeId: 'child-2' }
          ],
          forkStrategy: 'serial'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('forkPaths'))).toBe(true);
      }
    });
  });

  describe('validateNodeConfig - JOIN node', () => {
    it('should validate a valid JOIN node', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          forkPathIds: ['path-1', 'path-2'],
          joinStrategy: 'ALL_COMPLETED',
          mainPathId: 'path-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should validate a valid JOIN node with SUCCESS_COUNT_THRESHOLD', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          forkPathIds: ['path-1', 'path-2'],
          joinStrategy: 'SUCCESS_COUNT_THRESHOLD',
          threshold: 2,
          mainPathId: 'path-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should return error for JOIN node without forkPathIds', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          joinStrategy: 'ALL_COMPLETED',
          mainPathId: 'path-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('forkPathIds'))).toBe(true);
      }
    });

    it('should return error for JOIN node without joinStrategy', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          forkPathIds: ['path-1'],
          mainPathId: 'path-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('joinStrategy'))).toBe(true);
      }
    });

    it('should return error for JOIN node with SUCCESS_COUNT_THRESHOLD but no threshold', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Join',
        type: NodeType.JOIN,
        config: {
          forkPathIds: ['path-1'],
          joinStrategy: 'SUCCESS_COUNT_THRESHOLD',
          mainPathId: 'path-1'
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('threshold'))).toBe(true);
      }
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('scriptName'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('scriptType'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('risk'))).toBe(true);
      }
    });

    it('should validate CODE node without timeout', () => {
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
      expect(result.isOk()).toBe(true);
    });

    it('should validate CODE node without retries', () => {
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
      expect(result.isOk()).toBe(true);
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('profileId'))).toBe(true);
      }
    });
  });

  describe('validateNodeConfig - USER_INTERACTION node', () => {
    it('should validate a valid USER_INTERACTION node with UPDATE_VARIABLES operation', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [{
            variableName: 'approved',
            expression: '{{input}}',
            scope: 'thread'
          }],
          prompt: '是否批准？',
          timeout: 5000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should validate a valid USER_INTERACTION node with ADD_MESSAGE operation', () => {
      const node: Node = {
        id: 'node-2',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'ADD_MESSAGE',
          message: {
            role: 'user',
            contentTemplate: '{{input}}'
          },
          prompt: '请输入您的问题：',
          timeout: 30000
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should return error for USER_INTERACTION node without operationType', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {} as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('operationType'))).toBe(true);
      }
    });

    it('should return error for USER_INTERACTION node with UPDATE_VARIABLES but no variables', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          prompt: '是否批准？'
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
    });

    it('should return error for USER_INTERACTION node with ADD_MESSAGE but no message', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'ADD_MESSAGE',
          prompt: '请输入您的问题：'
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
    });

    it('should return error for USER_INTERACTION node without prompt', () => {
      const node: Node = {
        id: 'node-1',
        name: 'UserInteraction',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [{
            variableName: 'approved',
            expression: '{{input}}',
            scope: 'thread'
          }]
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('prompt'))).toBe(true);
      }
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
            { condition: { expression: 'input.value > 10' }, targetNodeId: 'node-2' },
            { condition: { expression: 'input.value <= 10' }, targetNodeId: 'node-3' }
          ]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('routes'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('condition'))).toBe(true);
      }
    });

    it('should return error for ROUTE node without route targetNodeId', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Route',
        type: NodeType.ROUTE,
        config: {
          routes: [{ condition: { expression: 'input.value > 10' } } as any]
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('targetNodeId'))).toBe(true);
      }
    });
  });

  describe('validateNodeConfig - CONTEXT_PROCESSOR node', () => {
    it('should validate a valid CONTEXT_PROCESSOR node with truncate operation', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate',
          truncate: {
            keepFirst: 10
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should validate a valid CONTEXT_PROCESSOR node with insert operation', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'insert',
          insert: {
            position: 0,
            messages: [
              { role: 'user', content: 'Hello' }
            ]
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should return error for CONTEXT_PROCESSOR node without operation', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {} as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('operation'))).toBe(true);
      }
    });

    it('should return error for CONTEXT_PROCESSOR node with missing operation-specific config', () => {
      const node: Node = {
        id: 'node-1',
        name: 'ContextProcessor',
        type: NodeType.CONTEXT_PROCESSOR,
        config: {
          operation: 'truncate'
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('loopId'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('maxIterations'))).toBe(true);
      }
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('variableName'))).toBe(true);
      }
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('loopId'))).toBe(true);
      }
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('subgraphId'))).toBe(true);
      }
    });

    it('should validate SUBGRAPH node without inputMapping', () => {
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('should validate SUBGRAPH node without outputMapping', () => {
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
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});