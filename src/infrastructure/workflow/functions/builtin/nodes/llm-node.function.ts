import { injectable, inject } from 'inversify';
import { BaseNodeFunction, NodeFunctionConfig, NodeFunctionResult, WorkflowExecutionContext } from '../../base/base-workflow-function';
import { WrapperService } from '../../../../../application/llm/services/wrapper-service';
import { LLMRequest } from '../../../../../domain/llm/entities/llm-request';
import { ID } from '../../../../../domain/common/value-objects/id';
import { PromptBuilder, PromptSource } from '../../../helpers/prompt-builder';
import { ContextProcessor } from '../../../../../domain/workflow/services/context-processor-service.interface';
import { llmContextProcessor } from '../context-processors';

/**
 * LLM节点函数配置接口
 */
export interface LLMNodeConfig extends NodeFunctionConfig {
  /**
   * LLM包装器名称（必需）
   * 格式：
   * - 轮询池: "pool_name"
   * - 任务组: "group_name"
   * - 直接LLM: "provider:model" (如 "openai:gpt-4")
   */
  wrapperName: string;
  /**
   * 提示词来源（必需）
   * 支持两种类型：
   * - 直接内容: { type: 'direct', content: '...' }
   * - 模板引用: { type: 'template', category: '...', name: '...' }
   */
  prompt: PromptSource;
  /**
   * 系统提示词来源（可选）
   */
  systemPrompt?: PromptSource;
  /**
   * 上下文处理器名称（可选）
   * 默认使用 'llm' 处理器
   */
  contextProcessor?: string;
  /**
   * 温度参数（可选，默认由包装器配置决定）
   */
  temperature?: number;
  /**
   * 最大令牌数（可选，默认由包装器配置决定）
   */
  maxTokens?: number;
  /**
   * 是否流式响应（可选，默认false）
   */
  stream?: boolean;
}

/**
 * LLM节点函数
 *
 * 通过LLM包装器系统执行LLM推理，支持：
 * - 轮询池包装器（负载均衡）
 * - 任务组包装器（降级策略）
 * - 直接LLM包装器（直接调用）
 */
@injectable()
export class LLMNodeFunction extends BaseNodeFunction<LLMNodeConfig> {
  constructor(
    @inject('WrapperService') private wrapperService: WrapperService,
    @inject('PromptBuilder') private promptBuilder: PromptBuilder
  ) {
    super(
      'node:llm',
      'llm_node',
      '执行LLM推理的节点函数',
      '1.0.0',
      'builtin'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'wrapperName',
        type: 'string',
        required: true,
        description: 'LLM包装器名称（轮询池/任务组/直接LLM）'
      },
      {
        name: 'prompt',
        type: 'object',
        required: true,
        description: '提示词来源（{type: "direct", content: "..."} 或 {type: "template", category: "...", name: "..."}）'
      },
      {
        name: 'systemPrompt',
        type: 'object',
        required: false,
        description: '系统提示词来源（可选）'
      },
      {
        name: 'contextProcessor',
        type: 'string',
        required: false,
        description: '上下文处理器名称（可选，默认使用llm处理器）',
        defaultValue: 'llm'
      },
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: '生成温度（可选，默认由包装器配置决定）'
      },
      {
        name: 'maxTokens',
        type: 'number',
        required: false,
        description: '最大令牌数（可选，默认由包装器配置决定）'
      },
      {
        name: 'stream',
        type: 'boolean',
        required: false,
        description: '是否流式响应（可选，默认false）',
        defaultValue: false
      }
    ];
  }

  protected override validateCustomConfig(config: LLMNodeConfig): string[] {
    const errors: string[] = [];

    if (!config['wrapperName'] || typeof config['wrapperName'] !== 'string') {
      errors.push('wrapperName是必需的字符串参数');
    }

    // 验证 prompt
    const prompt = config['prompt'] as PromptSource;
    if (!prompt || typeof prompt !== 'object') {
      errors.push('prompt是必需的对象参数');
    } else if (!prompt.type || (prompt.type !== 'direct' && prompt.type !== 'template')) {
      errors.push('prompt.type必须是"direct"或"template"');
    } else if (prompt.type === 'direct' && !prompt.content) {
      errors.push('prompt.content在direct类型下是必需的');
    } else if (prompt.type === 'template' && (!prompt.category || !prompt.name)) {
      errors.push('prompt.category和prompt.name在template类型下是必需的');
    }

    // 验证 systemPrompt
    const systemPrompt = config['systemPrompt'] as PromptSource | undefined;
    if (systemPrompt) {
      if (typeof systemPrompt !== 'object') {
        errors.push('systemPrompt必须是对象类型');
      } else if (!systemPrompt.type || (systemPrompt.type !== 'direct' && systemPrompt.type !== 'template')) {
        errors.push('systemPrompt.type必须是"direct"或"template"');
      } else if (systemPrompt.type === 'direct' && !systemPrompt.content) {
        errors.push('systemPrompt.content在direct类型下是必需的');
      } else if (systemPrompt.type === 'template' && (!systemPrompt.category || !systemPrompt.name)) {
        errors.push('systemPrompt.category和systemPrompt.name在template类型下是必需的');
      }
    }

    if (config['temperature'] !== undefined &&
      (typeof config['temperature'] !== 'number' ||
        config['temperature'] < 0 ||
        config['temperature'] > 2)) {
      errors.push('temperature必须是0-2之间的数字');
    }

    if (config['maxTokens'] !== undefined &&
      (typeof config['maxTokens'] !== 'number' ||
        config['maxTokens'] <= 0)) {
      errors.push('maxTokens必须是正数');
    }

    if (config['stream'] !== undefined && typeof config['stream'] !== 'boolean') {
      errors.push('stream必须是布尔类型');
    }

    return errors;
  }

  override async execute(context: WorkflowExecutionContext, config: LLMNodeConfig): Promise<NodeFunctionResult> {
    this.checkInitialized();

    const wrapperName = config['wrapperName'] as string;
    const prompt = config['prompt'] as PromptSource;
    const systemPrompt = config['systemPrompt'] as PromptSource | undefined;
    const contextProcessorName = config['contextProcessor'] as string || 'llm';
    const temperature = config['temperature'] as number | undefined;
    const maxTokens = config['maxTokens'] as number | undefined;
    const stream = config['stream'] as boolean | undefined;

    const startTime = Date.now();

    try {
      // 准备上下文处理器
      const contextProcessors = new Map<string, ContextProcessor>();
      contextProcessors.set('llm', llmContextProcessor);
      // 可以添加更多内置处理器

      // 收集工作流上下文变量
      const workflowContext: Record<string, unknown> = {};
      // 从 context 中提取变量（这里简化处理，实际可能需要更复杂的逻辑）
      workflowContext['executionId'] = context.getExecutionId();
      workflowContext['workflowId'] = context.getWorkflowId();

      // 使用 PromptBuilder 构建消息列表
      const messages = await this.promptBuilder.buildMessages(
        {
          source: prompt,
          systemPrompt,
          contextProcessor: contextProcessorName
        },
        workflowContext,
        contextProcessors
      );

      // 获取工作流ID和节点ID（如果有）
      const workflowId = context.getWorkflowId() ? ID.fromString(context.getWorkflowId()) : undefined;
      const nodeId = context.getExecutionId() ? ID.fromString(context.getExecutionId()) : undefined;

      // 创建LLM请求
      const llmRequest = LLMRequest.create(
        'auto', // 模型名称由包装器决定
        messages,
        {
          workflowId,
          nodeId,
          temperature,
          maxTokens,
          stream: stream || false,
          metadata: {
            wrapperName,
            executionId: context.getExecutionId()
          }
        }
      );

      // 通过包装器服务调用LLM
      const llmResponse = await this.wrapperService.generateResponse(wrapperName, llmRequest);
      const executionTime = Date.now() - startTime;

      // 构建结果
      const result = {
        content: llmResponse.getContent(),
        model: llmResponse.model,
        finishReason: llmResponse.finishReason,
        usage: llmResponse.usage,
        duration: executionTime,
        responseId: llmResponse.responseId.toString()
      };

      // 更新上下文中的消息历史
      const existingMessages = context.getVariable('messages') || [];
      existingMessages.push({
        role: 'assistant',
        content: result.content,
        model: result.model,
        tokensUsed: result.usage.totalTokens,
        timestamp: new Date().toISOString()
      });
      context.setVariable('messages', existingMessages);

      // 存储完整的LLM响应
      context.setVariable(`llm_response_${context.getExecutionId()}`, {
        ...result,
        rawResponse: llmResponse
      });

      return {
        success: true,
        output: result,
        metadata: {
          wrapperName,
          model: result.model,
          temperature: temperature || 'default',
          maxTokens: maxTokens || 'default',
          tokensUsed: result.usage.totalTokens,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          executionTime,
          finishReason: result.finishReason
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          wrapperName,
          executionTime,
          temperature: temperature || 'default',
          maxTokens: maxTokens || 'default'
        }
      };
    }
  }
}