import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';
import { BaseHookFunction, WorkflowExecutionContext, NodeFunctionResult, NodeFunctionConfig } from '../../base/base-workflow-function';

/**
 * 节点执行后钩子函数
 * 在节点执行后调用，用于节点级别的后处理
 */
@injectable()
export class AfterNodeExecuteHookFunction extends BaseHookFunction {
  constructor() {
    super(
      'hook:after_node_execute',
      'after_node_execute_hook',
      '在节点执行后调用的钩子，用于节点级别的后处理'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'nodeId',
        type: 'string',
        required: true,
        description: '节点ID'
      },
      {
        name: 'nodeType',
        type: 'string',
        required: true,
        description: '节点类型'
      },
      {
        name: 'result',
        type: 'any',
        required: false,
        description: '节点执行结果'
      },
      {
        name: 'outputTransform',
        type: 'object',
        required: false,
        description: '输出转换配置'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.nodeId) {
      errors.push('nodeId 是必需的');
    }

    if (!config.nodeType) {
      errors.push('nodeType 是必需的');
    }

    if (config.outputTransform && typeof config.outputTransform !== 'object') {
      errors.push('outputTransform 必须是对象类型');
    }

    return errors;
  }

  override async execute(context: WorkflowExecutionContext, config: NodeFunctionConfig): Promise<NodeFunctionResult> {
    this.checkInitialized();

    try {
      const result: {
        success: boolean;
        shouldContinue: boolean;
        data: Record<string, any>;
        metadata: Record<string, any>;
      } = {
        success: true,
        shouldContinue: true,
        data: {},
        metadata: {
          hookPoint: 'after_node_execute',
          nodeId: config['nodeId'],
          nodeType: config['nodeType'],
          timestamp: Date.now()
        }
      };

      // 执行输出转换
      if (config['outputTransform'] && config['result']) {
        result.data['transformedResult'] = this.transformOutput(config['result'], config['outputTransform']);
      }

      // 记录节点执行完成
      result.data['executionCompleted'] = true;

      return {
        success: true,
        output: result,
        metadata: result.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private transformOutput(output: any, transform: any): any {
    // 简化的输出转换逻辑
    const result = { ...output };

    if (transform['rename']) {
      for (const [oldName, newName] of Object.entries(transform['rename'])) {
        if (oldName in result) {
          (result as Record<string, any>)[newName as string] = (result as Record<string, any>)[oldName as string];
          delete (result as Record<string, any>)[oldName as string];
        }
      }
    }

    if (transform['filter']) {
      for (const field of transform['filter']) {
        if (field in result) {
          delete (result as Record<string, any>)[field as string];
        }
      }
    }

    return result;
  }
}