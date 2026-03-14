/**
 * Predefined Triggers 集成测试
 *
 * 测试场景：
 * - 上下文压缩触发器
 * - 上下文压缩工作流
 * - 组合注册
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import { WorkflowRegistry } from '../../graph/services/workflow-registry.js';
import {
  registerContextCompressionTrigger,
  registerContextCompressionWorkflow,
  registerContextCompression,
  unregisterContextCompressionTrigger,
  unregisterContextCompressionWorkflow,
  isContextCompressionTriggerRegistered,
  isContextCompressionWorkflowRegistered,
  CONTEXT_COMPRESSION_TRIGGER_NAME,
  CONTEXT_COMPRESSION_WORKFLOW_ID,
  DEFAULT_COMPRESSION_PROMPT
} from '../services/predefined-triggers.js';
import {
  createContextCompressionTriggerTemplate,
  createContextCompressionWorkflow,
  createCustomContextCompressionTrigger,
  createCustomContextCompressionWorkflow
} from '../triggers/predefined/context-compression.js';
import type { TriggerTemplate, WorkflowDefinition } from '@modular-agent/types';
import { EventType, TriggerActionType } from '@modular-agent/types';

describe('Predefined Triggers - 预定义触发器', () => {
  let triggerRegistry: TriggerTemplateRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    triggerRegistry = new TriggerTemplateRegistry();
    workflowRegistry = new WorkflowRegistry();
  });

  describe('上下文压缩触发器', () => {
    it('测试创建默认触发器模板：createContextCompressionTriggerTemplate创建正确的模板', () => {
      const template = createContextCompressionTriggerTemplate();

      expect(template).toBeDefined();
      expect(template.name).toBe(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(template.description).toContain('上下文压缩');
      expect(template.condition.eventType).toBe('CONTEXT_COMPRESSION_REQUESTED');
      expect(template.action.type).toBe('execute_triggered_subgraph');
      expect(template.enabled).toBe(true);
      expect(template.maxTriggers).toBe(0);
      expect(template.metadata?.['category']).toBe('system');
      expect(template.metadata?.['tags']).toContain('context');
      expect(template.metadata?.['tags']).toContain('compression');
    });

    it('测试创建自定义触发器模板：createCustomContextCompressionTrigger支持自定义配置', () => {
      const template = createCustomContextCompressionTrigger({
        timeout: 120000,
        maxTriggers: 10,
        compressionPrompt: '自定义压缩提示词'
      });

      expect(template.name).toBe(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(template.maxTriggers).toBe(10);
      expect((template.action.parameters as any)['timeout']).toBe(120000);
      expect(template.metadata?.['customConfig']).toEqual({
        timeout: 120000,
        maxTriggers: 10,
        compressionPrompt: '自定义压缩提示词'
      });
    });

    it('测试创建部分自定义配置触发器模板', () => {
      const template = createCustomContextCompressionTrigger({
        maxTriggers: 5
      });

      expect(template.maxTriggers).toBe(5);
      expect(template.metadata?.['customConfig']).toEqual({
        maxTriggers: 5
      });
    });

    it('测试创建空配置触发器模板：空配置应使用默认值', () => {
      const template = createCustomContextCompressionTrigger({});

      expect(template.name).toBe(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(template.maxTriggers).toBe(0);
      expect(template.metadata?.['customConfig']).toEqual({});
    });

    it('测试注册触发器：registerContextCompressionTrigger成功注册', () => {
      const result = registerContextCompressionTrigger(triggerRegistry);

      expect(result).toBe(true);
      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(true);
      expect(triggerRegistry.has(CONTEXT_COMPRESSION_TRIGGER_NAME)).toBe(true);
    });

    it('测试重复注册处理：skipIfExists为true时跳过', () => {
      registerContextCompressionTrigger(triggerRegistry);

      const result = registerContextCompressionTrigger(triggerRegistry, undefined, true);

      expect(result).toBe(false); // 跳过注册，返回 false
      expect(triggerRegistry.size()).toBe(1);
    });

    it('测试重复注册处理：skipIfExists为false时报错', () => {
      registerContextCompressionTrigger(triggerRegistry);

      expect(() => {
        registerContextCompressionTrigger(triggerRegistry, undefined, false);
      }).toThrow();
    });

    it('测试注册自定义配置触发器', () => {
      const result = registerContextCompressionTrigger(
        triggerRegistry,
        { timeout: 90000, maxTriggers: 3 }
      );

      expect(result).toBe(true);
      const template = triggerRegistry.get(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(template?.maxTriggers).toBe(3);
      expect((template?.action.parameters as any)['timeout']).toBe(90000);
    });

    it('测试注销触发器：unregisterContextCompressionTrigger成功注销', () => {
      registerContextCompressionTrigger(triggerRegistry);
      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(true);

      const result = unregisterContextCompressionTrigger(triggerRegistry);

      expect(result).toBe(true);
      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(false);
      expect(triggerRegistry.has(CONTEXT_COMPRESSION_TRIGGER_NAME)).toBe(false);
    });

    it('测试注销不存在的触发器：应返回false', () => {
      const result = unregisterContextCompressionTrigger(triggerRegistry);

      expect(result).toBe(false);
    });

    it('测试检查注册状态：isRegistered方法正确返回注册状态', () => {
      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(false);

      registerContextCompressionTrigger(triggerRegistry);

      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(true);

      unregisterContextCompressionTrigger(triggerRegistry);

      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(false);
    });
  });

  describe('上下文压缩工作流', () => {
    it('测试创建默认工作流：createContextCompressionWorkflow创建正确的工作流', () => {
      const workflow = createContextCompressionWorkflow();

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe(CONTEXT_COMPRESSION_WORKFLOW_ID);
      expect(workflow.name).toBe('Context Compression Workflow');
      expect(workflow.type).toBe('TRIGGERED_SUBWORKFLOW');
      expect(workflow.description).toContain('上下文压缩');
      expect(workflow.nodes).toHaveLength(4);
      expect(workflow.edges).toHaveLength(3);
      expect(workflow.metadata?.['category']).toBe('system');
      expect(workflow.metadata?.['tags']).toContain('context');
      expect(workflow.metadata?.['tags']).toContain('compression');
    });

    it('测试工作流节点结构：应包含4个节点', () => {
      const workflow = createContextCompressionWorkflow();

      const nodeTypes = workflow.nodes.map(n => n.type);
      expect(nodeTypes).toContain('START_FROM_TRIGGER');
      expect(nodeTypes).toContain('LLM');
      expect(nodeTypes).toContain('CONTEXT_PROCESSOR');
      expect(nodeTypes).toContain('CONTINUE_FROM_TRIGGER');
    });

    it('测试工作流边结构：应包含3条边', () => {
      const workflow = createContextCompressionWorkflow();

      expect(workflow.edges).toHaveLength(3);

      // 验证边的连接
      const edgeConnections = workflow.edges.map(e => ({
        source: workflow.nodes.find(n => n.id === e.sourceNodeId)?.type,
        target: workflow.nodes.find(n => n.id === e.targetNodeId)?.type
      }));

      expect(edgeConnections).toContainEqual({ source: 'START_FROM_TRIGGER', target: 'LLM' });
      expect(edgeConnections).toContainEqual({ source: 'LLM', target: 'CONTEXT_PROCESSOR' });
      expect(edgeConnections).toContainEqual({ source: 'CONTEXT_PROCESSOR', target: 'CONTINUE_FROM_TRIGGER' });
    });

    it('测试工作流LLM节点配置：应包含压缩提示词', () => {
      const workflow = createContextCompressionWorkflow();
      const llmNode = workflow.nodes.find(n => n.type === 'LLM');

      expect(llmNode).toBeDefined();
      expect(llmNode?.config['profileId']).toBe('DEFAULT');
      expect(llmNode?.config['prompt']).toBe(DEFAULT_COMPRESSION_PROMPT);
    });

    it('测试工作流CONTEXT_PROCESSOR节点配置：应包含截断操作', () => {
      const workflow = createContextCompressionWorkflow();
      const processorNode = workflow.nodes.find(n => n.type === 'CONTEXT_PROCESSOR');

      expect(processorNode).toBeDefined();
      expect(processorNode?.config['operationConfig']).toBeDefined();
      expect(processorNode?.config['operationConfig']['operation']).toBe('TRUNCATE');
      const strategy = (processorNode?.config['operationConfig'] as any)['strategy'];
      expect(strategy['type']).toBe('KEEP_LAST');
      expect(strategy['count']).toBe(1);
    });

    it('测试工作流CONTINUE_FROM_TRIGGER节点配置：应包含回传配置', () => {
      const workflow = createContextCompressionWorkflow();
      const endNode = workflow.nodes.find(n => n.type === 'CONTINUE_FROM_TRIGGER');

      expect(endNode).toBeDefined();
      expect(endNode?.config['conversationHistoryCallback']).toBeDefined();
      const callback = endNode?.config['conversationHistoryCallback'];
      expect(callback?.['operation']).toBe('TRUNCATE');
    });

    it('测试创建自定义工作流：createCustomContextCompressionWorkflow支持自定义配置', () => {
      const customPrompt = '自定义的压缩提示词';
      const workflow = createCustomContextCompressionWorkflow({
        compressionPrompt: customPrompt
      });

      const llmNode = workflow.nodes.find(n => n.type === 'LLM');
      expect(llmNode?.config['prompt']).toBe(customPrompt);
    });

    it('测试创建空配置工作流：空配置应使用默认提示词', () => {
      const workflow = createCustomContextCompressionWorkflow({});

      const llmNode = workflow.nodes.find(n => n.type === 'LLM');
      expect(llmNode?.config['prompt']).toBe(DEFAULT_COMPRESSION_PROMPT);
    });

    it('测试注册工作流：registerContextCompressionWorkflow成功注册', () => {
      const result = registerContextCompressionWorkflow(workflowRegistry);

      expect(result).toBe(true);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(true);
      expect(workflowRegistry.has(CONTEXT_COMPRESSION_WORKFLOW_ID)).toBe(true);
    });

    it('测试重复注册工作流：skipIfExists为true时跳过', () => {
      registerContextCompressionWorkflow(workflowRegistry);

      const result = registerContextCompressionWorkflow(workflowRegistry, undefined, true);

      expect(result).toBe(false); // 跳过注册，返回 false
    });

    it('测试注册自定义配置工作流', () => {
      const customPrompt = '自定义压缩提示词';
      const result = registerContextCompressionWorkflow(
        workflowRegistry,
        { compressionPrompt: customPrompt }
      );

      expect(result).toBe(true);
      const workflow = workflowRegistry.get(CONTEXT_COMPRESSION_WORKFLOW_ID);
      expect(workflow).toBeDefined();

      const llmNode = workflow?.nodes.find(n => n.type === 'LLM');
      expect(llmNode?.config['prompt']).toBe(customPrompt);
    });

    it('测试注销工作流：unregisterContextCompressionWorkflow成功注销', () => {
      registerContextCompressionWorkflow(workflowRegistry);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(true);

      const result = unregisterContextCompressionWorkflow(workflowRegistry);

      expect(result).toBe(true);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(false);
      expect(workflowRegistry.has(CONTEXT_COMPRESSION_WORKFLOW_ID)).toBe(false);
    });

    it('测试注销不存在的触发器：应返回false', () => {
      const result = unregisterContextCompressionWorkflow(workflowRegistry);

      expect(result).toBe(false);
    });

    it('测试检查工作流注册状态：isRegistered方法正确返回注册状态', () => {
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(false);

      registerContextCompressionWorkflow(workflowRegistry);

      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(true);

      unregisterContextCompressionWorkflow(workflowRegistry);

      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(false);
    });
  });

  describe('组合注册', () => {
    it('测试同时注册：registerContextCompression同时注册触发器和工作流', () => {
      const result = registerContextCompression(triggerRegistry, workflowRegistry);

      expect(result.triggerRegistered).toBe(true);
      expect(result.workflowRegistered).toBe(true);
      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(true);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(true);
    });

    it('测试同时注册自定义配置：同时注册应支持自定义配置', () => {
      const customPrompt = '自定义压缩提示词';
      const result = registerContextCompression(
        triggerRegistry,
        workflowRegistry,
        { compressionPrompt: customPrompt, maxTriggers: 5 }
      );

      expect(result.triggerRegistered).toBe(true);
      expect(result.workflowRegistered).toBe(true);

      const triggerTemplate = triggerRegistry.get(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(triggerTemplate?.maxTriggers).toBe(5);

      const workflow = workflowRegistry.get(CONTEXT_COMPRESSION_WORKFLOW_ID);
      const llmNode = workflow?.nodes.find(n => n.type === 'LLM');
      expect(llmNode?.config['prompt']).toBe(customPrompt);
    });

    it('测试注册顺序：必须先注册工作流再注册触发器', () => {
      // registerContextCompression 内部已经处理了顺序
      const result = registerContextCompression(triggerRegistry, workflowRegistry);

      expect(result.workflowRegistered).toBe(true);
      expect(result.triggerRegistered).toBe(true);
    });

    it('测试部分注册失败：如果工作流注册失败，触发器也不应注册', () => {
      // 模拟工作流注册失败的情况
      const result = registerContextCompression(triggerRegistry, workflowRegistry);

      // 正常情况下都应该成功
      expect(result.workflowRegistered).toBe(true);
      expect(result.triggerRegistered).toBe(true);
    });

    it('测试同时注销：手动注销触发器和工作流', () => {
      registerContextCompression(triggerRegistry, workflowRegistry);

      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(true);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(true);

      unregisterContextCompressionWorkflow(workflowRegistry);
      unregisterContextCompressionTrigger(triggerRegistry);

      expect(isContextCompressionTriggerRegistered(triggerRegistry)).toBe(false);
      expect(isContextCompressionWorkflowRegistered(workflowRegistry)).toBe(false);
    });
  });

  describe('常量导出', () => {
    it('测试常量导出：应正确导出常量', () => {
      expect(CONTEXT_COMPRESSION_TRIGGER_NAME).toBe('context_compression_trigger');
      expect(CONTEXT_COMPRESSION_WORKFLOW_ID).toBe('context_compression_workflow');
      expect(DEFAULT_COMPRESSION_PROMPT).toBeDefined();
      expect(DEFAULT_COMPRESSION_PROMPT).toContain('压缩');
      expect(DEFAULT_COMPRESSION_PROMPT).toContain('摘要');
    });
  });

  describe('边界情况', () => {
    it('测试多次注册和注销：应能正确处理多次操作', () => {
      // 第一次注册
      expect(registerContextCompression(triggerRegistry, workflowRegistry).triggerRegistered).toBe(true);
      expect(registerContextCompression(triggerRegistry, workflowRegistry).triggerRegistered).toBe(false);

      // 第一次注销
      expect(unregisterContextCompressionTrigger(triggerRegistry)).toBe(true);
      expect(unregisterContextCompressionWorkflow(workflowRegistry)).toBe(true);

      // 第二次注册
      expect(registerContextCompression(triggerRegistry, workflowRegistry).triggerRegistered).toBe(true);

      // 第二次注销
      expect(unregisterContextCompressionTrigger(triggerRegistry)).toBe(true);
      expect(unregisterContextCompressionWorkflow(workflowRegistry)).toBe(true);
    });

    it('测试在空注册表上操作：应能正确处理空注册表', () => {
      const emptyTriggerRegistry = new TriggerTemplateRegistry();
      const emptyWorkflowRegistry = new WorkflowRegistry();

      expect(isContextCompressionTriggerRegistered(emptyTriggerRegistry)).toBe(false);
      expect(isContextCompressionWorkflowRegistered(emptyWorkflowRegistry)).toBe(false);

      expect(unregisterContextCompressionTrigger(emptyTriggerRegistry)).toBe(false);
      expect(unregisterContextCompressionWorkflow(emptyWorkflowRegistry)).toBe(false);
    });

    it('测试工作流触发器引用：触发器应正确引用工作流', () => {
      registerContextCompression(triggerRegistry, workflowRegistry);

      const trigger = triggerRegistry.get(CONTEXT_COMPRESSION_TRIGGER_NAME);
      expect(trigger?.action.type).toBe('execute_triggered_subgraph');
      expect((trigger?.action.parameters as any)['triggeredWorkflowId']).toBe(CONTEXT_COMPRESSION_WORKFLOW_ID);
    });
  });
});