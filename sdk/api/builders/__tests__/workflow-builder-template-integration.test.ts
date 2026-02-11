/**
 * WorkflowBuilder 模板集成测试
 * 测试从节点模板和触发器模板添加节点和触发器的功能
 */

import { WorkflowBuilder } from '../workflow-builder';
import { NodeTemplateBuilder } from '../node-template-builder';
import { TriggerTemplateBuilder } from '../trigger-template-builder';
import { NodeType } from '@modular-agent/types/node';
import { EventType } from '@modular-agent/types/events';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { nodeTemplateRegistry } from '@modular-agent/sdk/core/services/node-template-registry';
import { triggerTemplateRegistry } from '@modular-agent/sdk/core/services/trigger-template-registry';

describe('WorkflowBuilder 模板集成', () => {
  beforeEach(() => {
    // 清空注册表
    nodeTemplateRegistry.clear();
    triggerTemplateRegistry.clear();
  });

  describe('从节点模板添加节点', () => {
    it('应该能够从节点模板添加节点', () => {
      // 注册节点模板
      NodeTemplateBuilder.create('test-llm', NodeType.LLM)
        .description('测试LLM节点')
        .config({
          profileId: 'gpt-4',
          prompt: '测试提示词'
        } as any)
        .buildAndRegister();

      // 从模板添加节点
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addNodeFromTemplate('llm-node', 'test-llm')
        .addEndNode()
        .addEdge('start', 'llm-node')
        .addEdge('llm-node', 'end')
        .build();

      expect(workflow.nodes).toHaveLength(3);
      const llmNode = workflow.nodes.find(n => n.id === 'llm-node');
      expect(llmNode).toBeDefined();
      expect(llmNode?.type).toBe(NodeType.LLM);
      expect(llmNode?.config).toEqual({
        profileId: 'gpt-4',
        prompt: '测试提示词'
      });
    });

    it('应该支持配置覆盖', () => {
      // 注册节点模板
      NodeTemplateBuilder.create('test-llm', NodeType.LLM)
        .config({
          profileId: 'gpt-4',
          prompt: '原始提示词'
        } as any)
        .buildAndRegister();

      // 从模板添加节点并覆盖配置
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addNodeFromTemplate('llm-node', 'test-llm', {
          prompt: '覆盖的提示词'
        })
        .addEndNode()
        .addEdge('start', 'llm-node')
        .addEdge('llm-node', 'end')
        .build();

      const llmNode = workflow.nodes.find(n => n.id === 'llm-node');
      expect((llmNode?.config as any).prompt).toBe('覆盖的提示词');
      expect((llmNode?.config as any).profileId).toBe('gpt-4'); // 未覆盖的配置保持不变
    });

    it('应该支持自定义节点名称', () => {
      // 注册节点模板
      NodeTemplateBuilder.create('test-llm', NodeType.LLM)
        .config({
          profileId: 'gpt-4',
          prompt: '测试提示词'
        } as any)
        .buildAndRegister();

      // 从模板添加节点并指定名称
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addNodeFromTemplate('llm-node', 'test-llm', undefined, '自定义LLM节点')
        .addEndNode()
        .addEdge('start', 'llm-node')
        .addEdge('llm-node', 'end')
        .build();

      const llmNode = workflow.nodes.find(n => n.id === 'llm-node');
      expect(llmNode?.name).toBe('自定义LLM节点');
    });

    it('当模板不存在时应该抛出错误', () => {
      expect(() => {
        WorkflowBuilder.create('test-workflow')
          .addStartNode()
          .addNodeFromTemplate('llm-node', 'non-existent-template')
          .addEndNode()
          .addEdge('start', 'llm-node')
          .addEdge('llm-node', 'end')
          .build();
      }).toThrow("节点模板 'non-existent-template' 不存在");
    });
  });

  describe('从触发器模板添加触发器', () => {
    it('应该能够从触发器模板添加触发器', () => {
      // 注册触发器模板
      TriggerTemplateBuilder.create('error-alert')
        .description('错误告警触发器')
        .condition({
          eventType: EventType.NODE_FAILED,
          metadata: { nodeId: 'critical-node' }
        })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            channel: 'email',
            recipients: ['admin@example.com']
          }
        })
        .enabled(true)
        .buildAndRegister();

      // 从模板添加触发器
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addEndNode()
        .addEdge('start', 'end')
        .addTriggerFromTemplate('trigger-1', 'error-alert')
        .build();

      expect(workflow.triggers).toHaveLength(1);
      const trigger = workflow.triggers![0]!;
      expect('templateName' in trigger).toBe(true);
      const reference = trigger as any;
      expect(reference.templateName).toBe('error-alert');
      expect(reference.triggerId).toBe('trigger-1');
    });

    it('应该支持配置覆盖', () => {
      // 注册触发器模板
      TriggerTemplateBuilder.create('error-alert')
        .condition({
          eventType: EventType.NODE_FAILED
        })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            channel: 'email',
            recipients: ['admin@example.com']
          }
        })
        .enabled(true)
        .buildAndRegister();

      // 从模板添加触发器并覆盖配置
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addEndNode()
        .addEdge('start', 'end')
        .addTriggerFromTemplate('trigger-1', 'error-alert', {
          enabled: false
        })
        .build();

      const trigger = workflow.triggers![0] as any;
      expect(trigger.configOverride.enabled).toBe(false);
    });

    it('应该支持自定义触发器名称', () => {
      // 注册触发器模板
      TriggerTemplateBuilder.create('error-alert')
        .condition({
          eventType: EventType.NODE_FAILED
        })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        })
        .buildAndRegister();

      // 从模板添加触发器并指定名称
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addEndNode()
        .addEdge('start', 'end')
        .addTriggerFromTemplate('trigger-1', 'error-alert', undefined, '自定义触发器')
        .build();

      const trigger = workflow.triggers![0] as any;
      expect(trigger.triggerName).toBe('自定义触发器');
    });

    it('当模板不存在时应该在验证时抛出错误', () => {
      expect(() => {
        WorkflowBuilder.create('test-workflow')
          .addStartNode()
          .addEndNode()
          .addEdge('start', 'end')
          .addTriggerFromTemplate('trigger-1', 'non-existent-template')
          .build();
      }).toThrow("触发器模板 'non-existent-template' 不存在");
    });
  });

  describe('混合使用模板和直接添加', () => {
    it('应该能够混合使用模板和直接添加节点', () => {
      // 注册节点模板
      NodeTemplateBuilder.create('data-fetch', NodeType.CODE)
        .config({
          scriptName: 'fetch-data',
          scriptType: 'javascript',
          risk: 'low'
        } as any)
        .buildAndRegister();

      // 混合使用
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addNodeFromTemplate('fetch', 'data-fetch')
        .addLLMNode('process', 'gpt-4', '处理数据')
        .addEndNode()
        .addEdge('start', 'fetch')
        .addEdge('fetch', 'process')
        .addEdge('process', 'end')
        .build();

      expect(workflow.nodes).toHaveLength(4);
      expect(workflow.nodes.find(n => n.id === 'fetch')?.type).toBe(NodeType.CODE);
      expect(workflow.nodes.find(n => n.id === 'process')?.type).toBe(NodeType.LLM);
    });

    it('应该能够混合使用模板和直接添加触发器', () => {
      // 注册触发器模板
      TriggerTemplateBuilder.create('error-alert')
        .condition({
          eventType: EventType.NODE_FAILED
        })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        })
        .buildAndRegister();

      // 混合使用
      const workflow = WorkflowBuilder.create('test-workflow')
        .addStartNode()
        .addEndNode()
        .addEdge('start', 'end')
        .addTriggerFromTemplate('trigger-1', 'error-alert')
        .addTrigger({
          id: 'trigger-2',
          name: '直接添加的触发器',
          condition: {
            eventType: EventType.THREAD_COMPLETED
          },
          action: {
            type: TriggerActionType.CUSTOM,
            parameters: { message: '工作流完成' }
          }
        })
        .build();

      expect(workflow.triggers).toHaveLength(2);
    });
  });

  describe('完整示例', () => {
    it('应该能够构建一个完整的工作流，使用多个模板', () => {
      // 注册节点模板
      NodeTemplateBuilder.create('greeting-llm', NodeType.LLM)
        .description('问候语生成LLM节点')
        .config({
          profileId: 'gpt-4',
          prompt: '请生成一个友好的问候语'
        } as any)
        .category('common')
        .tags('llm', 'greeting')
        .buildAndRegister();

      // 注册触发器模板
      TriggerTemplateBuilder.create('error-alert')
        .description('错误告警触发器')
        .condition({
          eventType: EventType.NODE_FAILED
        })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            channel: 'email',
            recipients: ['admin@example.com']
          }
        })
        .enabled(true)
        .buildAndRegister();

      // 构建工作流
      const workflow = WorkflowBuilder.create('greeting-workflow')
        .name('问候工作流')
        .description('使用模板构建的问候工作流')
        .addStartNode()
        .addNodeFromTemplate('greeting', 'greeting-llm', {
          prompt: '请生成一个中文问候语'
        })
        .addEndNode()
        .addEdge('start', 'greeting')
        .addEdge('greeting', 'end')
        .addTriggerFromTemplate('error-alert-1', 'error-alert', {
          enabled: true
        })
        .build();

      // 验证工作流
      expect(workflow.id).toBe('greeting-workflow');
      expect(workflow.name).toBe('问候工作流');
      expect(workflow.nodes).toHaveLength(3);
      expect(workflow.edges).toHaveLength(2);
      expect(workflow.triggers).toHaveLength(1);

      // 验证节点
      const greetingNode = workflow.nodes.find(n => n.id === 'greeting');
      expect(greetingNode?.type).toBe(NodeType.LLM);
      expect((greetingNode?.config as any).prompt).toBe('请生成一个中文问候语');

      // 验证触发器
      const trigger = workflow.triggers![0] as any;
      expect(trigger.templateName).toBe('error-alert');
    });
  });
});