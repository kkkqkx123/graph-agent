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
import { FunctionRegistry } from '../functions/function-registry';
import { PromptContext } from '../../../domain/workflow/value-objects/context/prompt-context';

/**
 * 上下文处理器节点
 *
 * 作为独立的集成点，用于在工作流中处理和转换提示词上下文
 * 可以在 LLM 节点之前插入，实现灵活的上下文处理
 */
export class ContextProcessorNode extends Node {
  constructor(
    id: NodeId,
    public readonly processorName: string,
    public readonly processorConfig?: Record<string, unknown>,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.contextProcessor(NodeContextTypeValue.TRANSFORM),
      name,
      description,
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取函数注册表
      const functionRegistry = context.getService<FunctionRegistry>('FunctionRegistry');

      // 构建处理器函数ID
      const processorId = `context:${this.processorName}`;

      // 获取处理器函数
      const processorFunction = functionRegistry.getFunction(processorId);
      if (!processorFunction) {
        throw new Error(`上下文处理器 "${this.processorName}" 不存在`);
      }

      // 从上下文中获取 PromptContext
      const promptContext = context.getVariable('promptContext') as PromptContext;
      if (!promptContext) {
        throw new Error('上下文中缺少 promptContext 变量');
      }

      // 执行处理器
      const processedContext = await processorFunction.execute(
        context,
        this.processorConfig
      );

      // 更新上下文中的 PromptContext
      context.setVariable('promptContext', processedContext);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: processedContext,
        executionTime,
        metadata: {
          processorName: this.processorName,
          processorConfig: this.processorConfig,
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
          processorName: this.processorName,
          processorConfig: this.processorConfig,
        },
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.processorName || typeof this.processorName !== 'string') {
      errors.push('processorName 是必需的字符串参数');
    }

    if (this.processorConfig !== undefined && typeof this.processorConfig !== 'object') {
      errors.push('processorConfig 必须是对象类型');
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
          name: 'processorName',
          type: 'string',
          required: true,
          description: '上下文处理器名称（如 llm_context、tool_context、regex_filter 等）',
        },
        {
          name: 'processorConfig',
          type: 'Record<string, unknown>',
          required: false,
          description: '处理器配置参数（可选）',
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        promptContext: {
          type: 'object',
          description: '提示词上下文',
        },
      },
      required: ['promptContext'],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        promptContext: {
          type: 'object',
          description: '处理后的提示词上下文',
        },
      },
      required: ['promptContext'],
    };
  }

  protected createNodeFromProps(props: any): any {
    return new ContextProcessorNode(
      props.id,
      props.processorName,
      props.processorConfig,
      props.name,
      props.description,
      props.position
    );
  }
}