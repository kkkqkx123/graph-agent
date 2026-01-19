import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeTypeValue,
  NodeContextTypeValue,
} from '../../../domain/workflow/value-objects/node/node-type';
import {
  Node,
  NodeExecutionResult,
  NodeMetadata,
  ValidationResult,
  WorkflowExecutionContext,
} from '../../../domain/workflow/entities/node';
import { Wrapper } from '../../llm/wrapper';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { ID } from '../../../domain/common/value-objects/id';
import {
  PromptBuilder,
  PromptSource,
  PromptBuildConfig,
} from '../../prompts/prompt-builder';
import { llmContextProcessor } from '../functions/nodes/context-processors';
import { WrapperConfig, validateWrapperConfig } from '../../../domain/llm/value-objects/wrapper-reference';

/**
 * LLM节点
 * 通过LLM包装器系统执行LLM推理，支持：
 * - 轮询池包装器（负载均衡）
 * - 任务组包装器（降级策略）
 * - 直接LLM包装器（直接调用）
 *
 * 使用结构化的wrapper配置，提供类型安全和自动参数继承
 */
export class LLMNode extends Node {
  constructor(
    id: NodeId,
    public readonly wrapperConfig: WrapperConfig,
    public readonly prompt: PromptSource,
    public readonly systemPrompt?: PromptSource,
    public readonly contextProcessorName: string = 'llm',
    public readonly temperature?: number,
    public readonly maxTokens?: number,
    public readonly stream: boolean = false,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(id, NodeType.llm(NodeContextTypeValue.LLM_CONTEXT), name, description, position);
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取服务
      const wrapper = context.getService<Wrapper>('Wrapper');
      const promptBuilder = context.getService<PromptBuilder>('PromptBuilder');

      // 注册上下文处理器（如果尚未注册）
      if (!promptBuilder.hasContextProcessor(this.contextProcessorName)) {
        promptBuilder.registerContextProcessor(this.contextProcessorName, llmContextProcessor);
      }

      // 收集工作流上下文变量
      const variables: Record<string, unknown> = {
        executionId: context.getExecutionId(),
        workflowId: context.getWorkflowId(),
      };

      // 构建 PromptBuildConfig
      const buildConfig: PromptBuildConfig = {
        source: this.prompt,
        systemPrompt: this.systemPrompt,
        contextProcessor: this.contextProcessorName,
        variables,
      };

      // 使用 PromptBuilder 构建消息列表
      const messages = await promptBuilder.buildMessages(buildConfig, variables);

      // 获取工作流ID和节点ID
      const workflowId = context.getWorkflowId()
        ? ID.fromString(context.getWorkflowId())
        : undefined;
      const nodeId = context.getExecutionId() ? ID.fromString(context.getExecutionId()) : undefined;

      // 创建LLM请求
      const llmRequest = LLMRequest.create('auto', messages, {
        workflowId,
        nodeId,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        stream: this.stream,
        metadata: {
          wrapperConfig: this.wrapperConfig,
          executionId: context.getExecutionId(),
        },
      });

      // 根据 wrapper 类型选择合适的调用方式
      let llmResponse;
      if (this.wrapperConfig.type === 'direct') {
        // 对于 direct 类型，使用直接调用方式避免额外开销
        llmResponse = await wrapper.generateDirectResponse(
          this.wrapperConfig.provider!,
          this.wrapperConfig.model!,
          llmRequest
        );
      } else {
        // 对于 pool/group 类型，使用原有的 wrapper 调用方式
        llmResponse = await wrapper.generateResponse(this.wrapperConfig, llmRequest);
      }
      const executionTime = Date.now() - startTime;

      // 构建结果
      const result = {
        content: llmResponse.getContent(),
        model: llmResponse.model,
        finishReason: llmResponse.finishReason,
        usage: llmResponse.usage,
        duration: executionTime,
        responseId: llmResponse.responseId.toString(),
      };

      // 更新上下文中的消息历史
      const existingMessages = context.getVariable('messages') || [];
      existingMessages.push({
        role: 'assistant',
        content: result.content,
        model: result.model,
        tokensUsed: result.usage.totalTokens,
        timestamp: new Date().toISOString(),
      });
      context.setVariable('messages', existingMessages);

      // 存储完整的LLM响应
      context.setVariable(`llm_response_${context.getExecutionId()}`, {
        ...result,
        rawResponse: llmResponse,
      });

      return {
        success: true,
        output: result,
        executionTime,
        metadata: {
          wrapperConfig: this.wrapperConfig,
          model: result.model,
          temperature: this.temperature || 'default',
          maxTokens: this.maxTokens || 'default',
          tokensUsed: result.usage.totalTokens,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          finishReason: result.finishReason,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          wrapperConfig: this.wrapperConfig,
          temperature: this.temperature || 'default',
          maxTokens: this.maxTokens || 'default',
        },
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.wrapperConfig || typeof this.wrapperConfig !== 'object') {
      errors.push('wrapperConfig是必需的对象参数');
    } else {
      // 使用集中验证函数
      const validation = validateWrapperConfig(this.wrapperConfig);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    if (!this.prompt || typeof this.prompt !== 'object') {
      errors.push('prompt是必需的对象参数');
    } else if (
      !this.prompt.type ||
      (this.prompt.type !== 'direct' && this.prompt.type !== 'template')
    ) {
      errors.push('prompt.type必须是"direct"或"template"');
    } else if (this.prompt.type === 'direct' && !this.prompt.content) {
      errors.push('prompt.content在direct类型下是必需的');
    } else if (this.prompt.type === 'template' && (!this.prompt.category || !this.prompt.name)) {
      errors.push('prompt.category和prompt.name在template类型下是必需的');
    }

    if (this.systemPrompt) {
      if (typeof this.systemPrompt !== 'object') {
        errors.push('systemPrompt必须是对象类型');
      } else if (
        !this.systemPrompt.type ||
        (this.systemPrompt.type !== 'direct' && this.systemPrompt.type !== 'template')
      ) {
        errors.push('systemPrompt.type必须是"direct"或"template"');
      } else if (this.systemPrompt.type === 'direct' && !this.systemPrompt.content) {
        errors.push('systemPrompt.content在direct类型下是必需的');
      } else if (
        this.systemPrompt.type === 'template' &&
        (!this.systemPrompt.category || !this.systemPrompt.name)
      ) {
        errors.push('systemPrompt.category和systemPrompt.name在template类型下是必需的');
      }
    }

    if (
      this.temperature !== undefined &&
      (typeof this.temperature !== 'number' || this.temperature < 0 || this.temperature > 2)
    ) {
      errors.push('temperature必须是0-2之间的数字');
    }

    if (
      this.maxTokens !== undefined &&
      (typeof this.maxTokens !== 'number' || this.maxTokens <= 0)
    ) {
      errors.push('maxTokens必须是正数');
    }

    if (typeof this.stream !== 'boolean') {
      errors.push('stream必须是布尔类型');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [
        {
          name: 'wrapperConfig',
          type: 'WrapperConfig',
          required: true,
          description: 'LLM包装器配置（结构化对象）',
        },
        {
          name: 'prompt',
          type: 'PromptSource',
          required: true,
          description:
            '提示词来源（{type: "direct", content: "..."} 或 {type: "template", category: "...", name: "..."}）',
        },
        {
          name: 'systemPrompt',
          type: 'PromptSource',
          required: false,
          description: '系统提示词来源（可选）',
        },
        {
          name: 'contextProcessorName',
          type: 'string',
          required: false,
          description: '上下文处理器名称（可选，默认使用llm处理器）',
          defaultValue: 'llm',
        },
        {
          name: 'temperature',
          type: 'number',
          required: false,
          description: '生成温度（可选，默认由包装器配置决定）',
        },
        {
          name: 'maxTokens',
          type: 'number',
          required: false,
          description: '最大令牌数（可选，默认由包装器配置决定）',
        },
        {
          name: 'stream',
          type: 'boolean',
          required: false,
          description: '是否流式响应（可选，默认false）',
          defaultValue: false,
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        text: { type: 'string', description: '输入文本' },
        prompt: { type: 'string', description: '提示词模板' },
      },
      required: ['text'],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'LLM响应' },
        model: { type: 'string', description: '使用的模型' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new LLMNode(
      props.id,
      props.wrapperConfig,
      props.prompt,
      props.systemPrompt,
      props.contextProcessorName,
      props.temperature,
      props.maxTokens,
      props.stream,
      props.name,
      props.description,
      props.position
    );
  }
}
