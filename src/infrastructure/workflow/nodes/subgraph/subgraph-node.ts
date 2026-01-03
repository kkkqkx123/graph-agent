import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../../domain/workflow/entities/node';
import { ID } from '../../../../domain/common/value-objects/id';

/**
 * 参数映射接口
 */
export interface ParameterMapping {
  /** 源变量名 */
  source: string;
  /** 目标变量名 */
  target: string;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
}

/**
 * 子工作流节点
 * 引用并执行另一个工作流定义
 */
export class SubgraphNode extends Node {
  constructor(
    id: NodeId,
    public readonly subworkflowId: ID,
    public readonly inputMappings: ParameterMapping[] = [],
    public readonly outputMappings: ParameterMapping[] = [],
    public readonly propagateErrors: boolean = true,
    public readonly timeout: number = 300000, // 默认5分钟超时
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.subworkflow(NodeContextTypeValue.ISOLATE),
      name || 'Subgraph',
      description || `子工作流节点: ${subworkflowId.toString()}`,
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取工作流执行服务
      const workflowService = context.getService<any>('WorkflowService');
      if (!workflowService) {
        throw new Error('WorkflowService不可用，无法执行子工作流');
      }

      // 准备子工作流的输入参数
      const subworkflowInputs = this.prepareInputs(context);

      // 创建子工作流执行上下文
      const subworkflowContext = this.createSubworkflowContext(context, subworkflowInputs);

      // 执行子工作流
      const subworkflowResult = await workflowService.executeWorkflow(
        this.subworkflowId,
        subworkflowContext,
        {
          timeout: this.timeout,
          propagateErrors: this.propagateErrors
        }
      );

      // 处理子工作流的输出
      const outputs = this.processOutputs(subworkflowResult, context);

      const executionTime = Date.now() - startTime;

      return {
        success: subworkflowResult.success,
        output: {
          message: '子工作流执行完成',
          subworkflowId: this.subworkflowId.toString(),
          outputs,
          subworkflowResult: subworkflowResult
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          subworkflowId: this.subworkflowId.toString(),
          inputCount: Object.keys(subworkflowInputs).length,
          outputCount: Object.keys(outputs).length,
          propagateErrors: this.propagateErrors
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误
      const errors = context.getVariable('errors') || [];
      errors.push({
        type: 'subworkflow_execution_error',
        subworkflowId: this.subworkflowId.toString(),
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          subworkflowId: this.subworkflowId.toString(),
          propagateErrors: this.propagateErrors
        }
      };
    }
  }

  /**
   * 准备子工作流的输入参数
   * @param context 父工作流上下文
   * @returns 子工作流输入参数
   */
  private prepareInputs(context: WorkflowExecutionContext): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    for (const mapping of this.inputMappings) {
      try {
        let value = context.getVariable(mapping.source);

        // 如果值为undefined且提供了默认值，使用默认值
        if (value === undefined && mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        }

        // 如果值为undefined且是必需参数，抛出错误
        if (value === undefined && mapping.required) {
          throw new Error(`必需参数 ${mapping.source} 未提供`);
        }

        inputs[mapping.target] = value;
      } catch (error) {
        if (mapping.required) {
          throw new Error(`无法获取参数 ${mapping.source}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // 非必需参数，跳过
      }
    }

    return inputs;
  }

  /**
   * 创建子工作流执行上下文
   * @param parentContext 父工作流上下文
   * @param inputs 输入参数
   * @returns 子工作流上下文
   */
  private createSubworkflowContext(
    parentContext: WorkflowExecutionContext,
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      parentExecutionId: parentContext.getExecutionId(),
      parentWorkflowId: parentContext.getWorkflowId(),
      inputs,
      variables: { ...inputs },
      metadata: {
        isSubworkflow: true,
        parentNodeId: this.nodeId.toString()
      }
    };
  }

  /**
   * 处理子工作流的输出
   * @param subworkflowResult 子工作流执行结果
   * @param parentContext 父工作流上下文
   * @returns 处理后的输出
   */
  private processOutputs(
    subworkflowResult: any,
    parentContext: WorkflowExecutionContext
  ): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    if (!subworkflowResult.success) {
      return outputs;
    }

    const subworkflowOutputs = subworkflowResult.output || {};

    for (const mapping of this.outputMappings) {
      try {
        let value = subworkflowOutputs[mapping.source];

        // 如果值为undefined且提供了默认值，使用默认值
        if (value === undefined && mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        }

        // 将输出设置到父上下文
        if (value !== undefined) {
          parentContext.setVariable(mapping.target, value);
          outputs[mapping.target] = value;
        }
      } catch (error) {
        // 忽略输出处理错误
      }
    }

    // 如果没有输出映射，将所有输出复制到父上下文
    if (this.outputMappings.length === 0) {
      for (const [key, value] of Object.entries(subworkflowOutputs)) {
        parentContext.setVariable(key, value);
        outputs[key] = value;
      }
    }

    return outputs;
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.subworkflowId) {
      errors.push('subworkflowId是必需的');
    }

    if (!Array.isArray(this.inputMappings)) {
      errors.push('inputMappings必须是数组');
    } else {
      this.inputMappings.forEach((mapping, index) => {
        if (!mapping.source || typeof mapping.source !== 'string') {
          errors.push(`inputMappings[${index}]缺少source`);
        }
        if (!mapping.target || typeof mapping.target !== 'string') {
          errors.push(`inputMappings[${index}]缺少target`);
        }
      });
    }

    if (!Array.isArray(this.outputMappings)) {
      errors.push('outputMappings必须是数组');
    } else {
      this.outputMappings.forEach((mapping, index) => {
        if (!mapping.source || typeof mapping.source !== 'string') {
          errors.push(`outputMappings[${index}]缺少source`);
        }
        if (!mapping.target || typeof mapping.target !== 'string') {
          errors.push(`outputMappings[${index}]缺少target`);
        }
      });
    }

    if (typeof this.propagateErrors !== 'boolean') {
      errors.push('propagateErrors必须是布尔类型');
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0) {
      errors.push('timeout必须是正数');
    }

    return {
      valid: errors.length === 0,
      errors
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
          name: 'subworkflowId',
          type: 'string',
          required: true,
          description: '子工作流ID'
        },
        {
          name: 'inputMappings',
          type: 'array',
          required: false,
          description: '输入参数映射',
          defaultValue: []
        },
        {
          name: 'outputMappings',
          type: 'array',
          required: false,
          description: '输出参数映射',
          defaultValue: []
        },
        {
          name: 'propagateErrors',
          type: 'boolean',
          required: false,
          description: '是否传播错误',
          defaultValue: true
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: '超时时间（毫秒）',
          defaultValue: 300000
        }
      ]
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        subworkflowId: { type: 'string', description: '子工作流ID' },
        outputs: { type: 'object', description: '输出参数' },
        subworkflowResult: { type: 'object', description: '子工作流执行结果' }
      }
    };
  }

  protected createNodeFromProps(props: any): any {
    return new SubgraphNode(
      props.id,
      props.subworkflowId,
      props.inputMappings,
      props.outputMappings,
      props.propagateErrors,
      props.timeout,
      props.name,
      props.description,
      props.position
    );
  }
}