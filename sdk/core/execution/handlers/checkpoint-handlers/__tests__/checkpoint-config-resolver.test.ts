/**
 * 检查点配置解析器测试
 */

import {
  resolveCheckpointConfig,
  shouldCreateCheckpoint,
  getCheckpointDescription
} from '../checkpoint-config-resolver';
import { CheckpointTriggerType, CheckpointConfigSource } from '@modular-agent/types/checkpoint';
import type { CheckpointConfig, TriggeredSubworkflowConfig } from '@modular-agent/types/workflow';
import type { Node, NodeHook } from '@modular-agent/types/node';
import type { Trigger } from '@modular-agent/types/trigger';
import { TriggerActionType } from '@modular-agent/types/trigger';
import type { Tool } from '@modular-agent/types/tool';
import { WorkflowType } from '@modular-agent/types/workflow';
import type { ProcessedWorkflowDefinition } from '@modular-agent/types/workflow';

describe('CheckpointConfigResolver', () => {
  let globalConfig: CheckpointConfig;
  let nodeConfig: Node;
  let hookConfig: NodeHook;
  let triggerConfig: Trigger;
  let toolConfig: Tool;

  beforeEach(() => {
    // 全局配置
    globalConfig = {
      enabled: true,
      checkpointBeforeNode: false,
      checkpointAfterNode: false
    };

    // 节点配置
    nodeConfig = {
      id: 'node-1',
      type: 'CODE',
      name: 'Test Node',
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
      checkpointBeforeExecute: false,
      checkpointAfterExecute: false
    } as Node;

    // Hook配置
    hookConfig = {
      hookType: 'BEFORE_EXECUTE',
      eventName: 'test_event',
      createCheckpoint: false
    } as NodeHook;

    // Trigger配置
    triggerConfig = {
      id: 'trigger-1',
      name: 'Test Trigger',
      type: 'event',
      condition: {
        eventType: 'THREAD_STARTED'
      },
      action: {
        type: TriggerActionType.CUSTOM,
        parameters: {}
      },
      status: 'enabled',
      triggerCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createCheckpoint: false
    } as Trigger;

    // 工具配置
    toolConfig = {
      id: 'tool-1',
      name: 'test_tool',
      description: 'Test tool',
      createCheckpoint: false
    } as Tool;
  });

  describe('resolveCheckpointConfig', () => {
    it('应该返回不创建检查点当全局禁用时', () => {
      globalConfig.enabled = false;
      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        hookConfig,
        triggerConfig,
        toolConfig,
        { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE }
      );

      expect(result.shouldCreate).toBe(false);
      expect(result.source).toBe(CheckpointConfigSource.DISABLED);
    });

    it('应该优先使用Hook配置', () => {
      hookConfig.createCheckpoint = true;
      hookConfig.checkpointDescription = 'Hook checkpoint';

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        hookConfig,
        triggerConfig,
        toolConfig,
        { triggerType: CheckpointTriggerType.HOOK }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('Hook checkpoint');
      expect(result.source).toBe(CheckpointConfigSource.HOOK);
    });

    it('应该优先使用Trigger配置', () => {
      triggerConfig.createCheckpoint = true;
      triggerConfig.checkpointDescription = 'Trigger checkpoint';

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        triggerConfig,
        toolConfig,
        { triggerType: CheckpointTriggerType.TRIGGER }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('Trigger checkpoint');
      expect(result.source).toBe(CheckpointConfigSource.TRIGGER);
    });

    it('应该正确处理工具配置 - before', () => {
      toolConfig.createCheckpoint = 'before';
      toolConfig.checkpointDescriptionTemplate = 'Tool {{tool.name}} before';

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        toolConfig,
        { triggerType: CheckpointTriggerType.TOOL_BEFORE, toolName: 'test_tool' }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('Tool {{tool.name}} before');
      expect(result.source).toBe(CheckpointConfigSource.TOOL);
    });

    it('应该正确处理工具配置 - after', () => {
      toolConfig.createCheckpoint = 'after';

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        toolConfig,
        { triggerType: CheckpointTriggerType.TOOL_AFTER }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.source).toBe(CheckpointConfigSource.TOOL);
    });

    it('应该正确处理工具配置 - both', () => {
      toolConfig.createCheckpoint = 'both';

      const resultBefore = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        toolConfig,
        { triggerType: CheckpointTriggerType.TOOL_BEFORE }
      );

      const resultAfter = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        toolConfig,
        { triggerType: CheckpointTriggerType.TOOL_AFTER }
      );

      expect(resultBefore.shouldCreate).toBe(true);
      expect(resultAfter.shouldCreate).toBe(true);
    });

    it('应该正确处理工具配置 - true', () => {
      toolConfig.createCheckpoint = true;

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        toolConfig,
        { triggerType: CheckpointTriggerType.TOOL_BEFORE }
      );

      expect(result.shouldCreate).toBe(true);
    });

    it('应该优先使用节点配置 - before', () => {
      nodeConfig.checkpointBeforeExecute = true;

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        undefined,
        { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('Before node: Test Node');
      expect(result.source).toBe(CheckpointConfigSource.NODE);
    });

    it('应该优先使用节点配置 - after', () => {
      nodeConfig.checkpointAfterExecute = true;

      const result = resolveCheckpointConfig(
        globalConfig,
        nodeConfig,
        undefined,
        undefined,
        undefined,
        { triggerType: CheckpointTriggerType.NODE_AFTER_EXECUTE }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('After node: Test Node');
      expect(result.source).toBe(CheckpointConfigSource.NODE);
    });

    it('应该使用全局配置作为默认', () => {
      globalConfig.checkpointBeforeNode = true;

      const result = resolveCheckpointConfig(
        globalConfig,
        undefined, // 不提供节点配置
        undefined,
        undefined,
        undefined,
        { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE }
      );

      expect(result.shouldCreate).toBe(true);
      expect(result.description).toBe('Global checkpoint before node');
      expect(result.source).toBe(CheckpointConfigSource.GLOBAL);
    });

    it('应该默认不创建检查点', () => {
      const cleanGlobalConfig: CheckpointConfig = {
        enabled: true,
        checkpointBeforeNode: false,
        checkpointAfterNode: false
      };

      const result = resolveCheckpointConfig(
        cleanGlobalConfig,
        undefined, // 不提供节点配置
        undefined,
        undefined,
        undefined,
        { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE }
      );

      expect(result.shouldCreate).toBe(false);
      expect(result.source).toBe(CheckpointConfigSource.GLOBAL); // checkpointBeforeNode 为 false，source 仍然是 global
    });

    describe('triggered子工作流检查点配置', () => {
      // 创建mock的ProcessedWorkflowDefinition
      const createMockProcessedWorkflow = (
        type: WorkflowType,
        triggeredSubworkflowConfig?: TriggeredSubworkflowConfig
      ): ProcessedWorkflowDefinition => {
        const workflowDefinition: any = {
          id: 'test-workflow',
          name: 'Test Workflow',
          version: '1.0.0',
          type: type,
          nodes: [],
          edges: [],
          variables: [],
          triggers: [],
          config: {},
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        if (triggeredSubworkflowConfig) {
          workflowDefinition.triggeredSubworkflowConfig = triggeredSubworkflowConfig;
        }

        // 创建一个简单的mock对象，包含必要的属性
        return {
          type: type,
          triggers: [],
          graphAnalysis: {
            hasCycles: false,
            cycles: [],
            topologicalOrder: [],
            isDAG: true,
            startNodes: [],
            endNodes: [],
            isolatedNodes: []
          },
          validationResult: {
            isValid: true,
            errors: [],
            warnings: [],
            validatedAt: Date.now()
          },
          subgraphMergeLogs: [],
          processedAt: Date.now(),
          hasSubgraphs: false,
          subworkflowIds: new Set(),
          topologicalOrder: [],
          graph: {
            nodes: new Map(),
            edges: new Map(),
            adjacencyList: new Map(),
            reverseAdjacencyList: new Map()
          },
          get id() { return workflowDefinition.id; },
          get name() { return workflowDefinition.name; },
          get description() { return workflowDefinition.description; },
          get nodes() { return workflowDefinition.nodes; },
          get edges() { return workflowDefinition.edges; },
          get variables() { return workflowDefinition.variables; },
          get triggeredSubworkflowConfig() { return workflowDefinition.triggeredSubworkflowConfig; },
          get config() { return workflowDefinition.config; },
          get metadata() { return workflowDefinition.metadata; },
          get version() { return workflowDefinition.version; },
          get createdAt() { return workflowDefinition.createdAt; },
          get updatedAt() { return workflowDefinition.updatedAt; },
          get availableTools() { return workflowDefinition.availableTools; }
        } as unknown as ProcessedWorkflowDefinition;
      };

      let triggeredWorkflow: ProcessedWorkflowDefinition;

      beforeEach(() => {
        triggeredWorkflow = createMockProcessedWorkflow(WorkflowType.TRIGGERED_SUBWORKFLOW);
      });

      it('应该默认不创建检查点对于triggered子工作流', () => {
        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          triggeredWorkflow
        );

        expect(result.shouldCreate).toBe(false);
        expect(result.source).toBe(CheckpointConfigSource.TRIGGERED_SUBWORKFLOW);
      });

      it('应该不创建检查点即使全局配置启用', () => {
        globalConfig.enabled = true;
        globalConfig.checkpointBeforeNode = true;

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          triggeredWorkflow
        );

        expect(result.shouldCreate).toBe(false);
        expect(result.source).toBe(CheckpointConfigSource.TRIGGERED_SUBWORKFLOW);
      });

      it('应该不创建检查点即使节点配置启用', () => {
        nodeConfig.checkpointBeforeExecute = true;

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          triggeredWorkflow
        );

        expect(result.shouldCreate).toBe(false);
        expect(result.source).toBe(CheckpointConfigSource.TRIGGERED_SUBWORKFLOW);
      });

      it('应该创建检查点当enableCheckpoints为true时', () => {
        const workflowWithEnabledCheckpoints = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: true,
              checkpointAfterNode: true
            }
          }
        );

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          workflowWithEnabledCheckpoints
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.source).toBe(CheckpointConfigSource.GLOBAL);
      });

      it('应该使用triggered子工作流的专用配置', () => {
        const workflowWithCustomConfig = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: false,
              checkpointAfterNode: true
            }
          }
        );

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_AFTER_EXECUTE },
          workflowWithCustomConfig
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.description).toBe('Triggered workflow checkpoint');
        expect(result.source).toBe(CheckpointConfigSource.GLOBAL);
      });

      it('应该优先使用节点配置当enableCheckpoints为true时', () => {
        const workflowWithEnabledCheckpoints = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: false,
              checkpointAfterNode: false
            }
          }
        );

        nodeConfig.checkpointBeforeExecute = true;

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          workflowWithEnabledCheckpoints
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.source).toBe(CheckpointConfigSource.NODE);
      });

      it('应该优先使用Hook配置当enableCheckpoints为true时', () => {
        const workflowWithEnabledCheckpoints = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: false,
              checkpointAfterNode: false
            }
          }
        );

        hookConfig.createCheckpoint = true;
        hookConfig.checkpointDescription = 'Hook checkpoint in triggered workflow';

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.HOOK },
          workflowWithEnabledCheckpoints
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.description).toBe('Hook checkpoint in triggered workflow');
        expect(result.source).toBe(CheckpointConfigSource.HOOK);
      });

      it('应该优先使用Trigger配置当enableCheckpoints为true时', () => {
        const workflowWithEnabledCheckpoints = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: false,
              checkpointAfterNode: false
            }
          }
        );

        triggerConfig.createCheckpoint = true;
        triggerConfig.checkpointDescription = 'Trigger checkpoint in triggered workflow';

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.TRIGGER },
          workflowWithEnabledCheckpoints
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.description).toBe('Trigger checkpoint in triggered workflow');
        expect(result.source).toBe(CheckpointConfigSource.TRIGGER);
      });

      it('应该优先使用Tool配置当enableCheckpoints为true时', () => {
        const workflowWithEnabledCheckpoints = createMockProcessedWorkflow(
          WorkflowType.TRIGGERED_SUBWORKFLOW,
          {
            enableCheckpoints: true,
            checkpointConfig: {
              enabled: true,
              checkpointBeforeNode: false,
              checkpointAfterNode: false
            }
          }
        );

        toolConfig.createCheckpoint = 'before';

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.TOOL_BEFORE },
          workflowWithEnabledCheckpoints
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.source).toBe(CheckpointConfigSource.TOOL);
      });

      it('应该正确处理非triggered子工作流', () => {
        const standaloneWorkflow = createMockProcessedWorkflow(WorkflowType.STANDALONE);

        globalConfig.checkpointBeforeNode = true;

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          standaloneWorkflow
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.source).toBe(CheckpointConfigSource.GLOBAL);
      });

      it('应该正确处理DEPENDENT类型工作流', () => {
        const dependentWorkflow = createMockProcessedWorkflow(WorkflowType.DEPENDENT);

        globalConfig.checkpointBeforeNode = true;

        const result = resolveCheckpointConfig(
          globalConfig,
          nodeConfig,
          hookConfig,
          triggerConfig,
          toolConfig,
          { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE },
          dependentWorkflow
        );

        expect(result.shouldCreate).toBe(true);
        expect(result.source).toBe(CheckpointConfigSource.GLOBAL);
      });
    });
  });

  describe('shouldCreateCheckpoint', () => {
    it('应该返回正确的布尔值', () => {
      hookConfig.createCheckpoint = true;

      const result = shouldCreateCheckpoint(
        globalConfig,
        nodeConfig,
        hookConfig,
        triggerConfig,
        toolConfig,
        { triggerType: CheckpointTriggerType.HOOK }
      );

      expect(result).toBe(true);
    });
  });

  describe('getCheckpointDescription', () => {
    it('应该返回正确的描述', () => {
      hookConfig.checkpointDescription = 'Test description';

      const result = getCheckpointDescription(
        globalConfig,
        nodeConfig,
        hookConfig,
        triggerConfig,
        toolConfig,
        { triggerType: CheckpointTriggerType.HOOK }
      );

      expect(result).toBe('Test description');
    });

    it('应该返回undefined当没有描述时', () => {
      const cleanGlobalConfig: CheckpointConfig = {
        enabled: true,
        checkpointBeforeNode: false,
        checkpointAfterNode: false
      };

      const result = getCheckpointDescription(
        cleanGlobalConfig,
        undefined, // 不提供节点配置
        undefined,
        undefined,
        undefined,
        { triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE }
      );

      // 当 checkpointBeforeNode 为 false 时，会返回默认描述
      expect(result).toBe('Global checkpoint before node');
    });
  });
});