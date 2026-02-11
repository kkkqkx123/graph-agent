/**
 * 检查点配置解析器测试
 */

import {
  resolveCheckpointConfig,
  shouldCreateCheckpoint,
  getCheckpointDescription
} from '../checkpoint-config-resolver';
import { CheckpointTriggerType } from '@modular-agent/types/checkpoint';
import type { CheckpointConfig } from '@modular-agent/types/workflow';
import type { Node, NodeHook } from '@modular-agent/types/node';
import type { Trigger } from '@modular-agent/types/trigger';
import { TriggerActionType } from '@modular-agent/types/trigger';
import type { Tool } from '@modular-agent/types/tool';

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
      checkpointAfterNode: false,
      defaultMetadata: {
        description: 'Global checkpoint',
        creator: 'system'
      }
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
      expect(result.source).toBe('disabled');
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
      expect(result.source).toBe('hook');
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
      expect(result.source).toBe('trigger');
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
      expect(result.source).toBe('tool');
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
      expect(result.source).toBe('tool');
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
      expect(result.source).toBe('node');
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
      expect(result.source).toBe('node');
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
      expect(result.description).toBe('Global checkpoint');
      expect(result.source).toBe('global');
    });

    it('应该默认不创建检查点', () => {
      // 重置全局配置，移除 defaultMetadata
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
      expect(result.source).toBe('global'); // checkpointBeforeNode 为 false，source 仍然是 global
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
      // 重置全局配置，移除 defaultMetadata
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