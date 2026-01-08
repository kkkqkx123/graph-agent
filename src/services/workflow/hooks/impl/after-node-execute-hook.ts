import { ID, Timestamp, Version } from '../../../domain/common/value-objects';
import { HookPointValue } from '../../../domain/workflow/value-objects/hook-point';
import {
  Hook,
  HookContext,
  HookExecutionResult,
  HookMetadata,
  HookParameter,
  HookValidationResult,
  HookProps,
} from '../../../domain/workflow/entities/hook';

/**
 * 节点执行后钩子配置接口
 */
export interface AfterNodeExecuteHookConfig {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly result?: any;
  readonly outputTransform?: {
    readonly rename?: Record<string, string>;
    readonly filter?: string[];
  };
}

/**
 * 节点执行后钩子
 * 在节点执行后调用，用于节点级别的后处理
 */
export class AfterNodeExecuteHook extends Hook {
  /**
   * 创建新的节点执行后钩子
   * @param nodeId 节点ID
   * @param nodeType 节点类型
   * @param name Hook名称
   * @param description Hook描述
   * @param config Hook配置
   * @param enabled 是否启用
   * @param priority 优先级
   * @param continueOnError 错误时是否继续
   * @param failFast 是否快速失败
   * @returns 新Hook实例
   */
  public static create(
    nodeId: string,
    nodeType: string,
    name: string,
    description?: string,
    config: Omit<AfterNodeExecuteHookConfig, 'nodeId' | 'nodeType'> = {},
    enabled: boolean = true,
    priority: number = 0,
    continueOnError: boolean = true,
    failFast: boolean = false
  ): AfterNodeExecuteHook {
    const now = Timestamp.now();
    const hookId = ID.generate();

    const fullConfig: AfterNodeExecuteHookConfig = {
      nodeId,
      nodeType,
      ...config,
    };

    const props: HookProps = {
      id: hookId,
      hookPoint: HookPointValue.afterNodeExecute(),
      name,
      description,
      config: fullConfig,
      enabled,
      priority,
      continueOnError,
      failFast,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    };

    return new AfterNodeExecuteHook(props);
  }

  /**
   * 从已有属性重建节点执行后钩子
   * @param props Hook属性
   * @returns Hook实例
   */
  public static fromProps(props: HookProps): AfterNodeExecuteHook {
    return new AfterNodeExecuteHook(props);
  }

  /**
   * 私有构造函数
   * @param props Hook属性
   */
  private constructor(props: HookProps) {
    super(props);
  }

  /**
   * 执行Hook
   * @param context Hook上下文
   * @returns 执行结果
   */
  public override async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const config = this.props.config as AfterNodeExecuteHookConfig;

    try {
      const data: Record<string, any> = {};

      // 执行输出转换
      if (config.outputTransform && config.result) {
        data['transformedResult'] = this.transformOutput(config.result, config.outputTransform);
      }

      // 记录节点执行完成
      data['executionCompleted'] = true;

      return {
        success: true,
        output: data,
        shouldContinue: true,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'after_node_execute',
          nodeId: config.nodeId,
          nodeType: config.nodeType,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        shouldContinue: this.props.continueOnError,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'after_node_execute',
          nodeId: config.nodeId,
          nodeType: config.nodeType,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * 验证Hook配置
   * @returns 验证结果
   */
  public validate(): HookValidationResult {
    const errors: string[] = [];
    const config = this.props.config as AfterNodeExecuteHookConfig;

    if (!config.nodeId) {
      errors.push('nodeId 是必需的');
    }

    if (!config.nodeType) {
      errors.push('nodeType 是必需的');
    }

    if (config.outputTransform && typeof config.outputTransform !== 'object') {
      errors.push('outputTransform 必须是对象类型');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取Hook元数据
   * @returns Hook元数据
   */
  public getMetadata(): HookMetadata {
    return {
      id: this.props.id.toString(),
      hookPoint: this.props.hookPoint.toString(),
      name: this.props.name,
      description: this.props.description,
      parameters: this.getParameters(),
      enabled: this.props.enabled,
      priority: this.props.priority,
    };
  }

  /**
   * 获取Hook参数
   * @returns 参数列表
   */
  private getParameters(): HookParameter[] {
    return [
      {
        name: 'nodeId',
        type: 'string',
        required: true,
        description: '节点ID',
      },
      {
        name: 'nodeType',
        type: 'string',
        required: true,
        description: '节点类型',
      },
      {
        name: 'result',
        type: 'any',
        required: false,
        description: '节点执行结果',
      },
      {
        name: 'outputTransform',
        type: 'object',
        required: false,
        description: '输出转换配置',
      },
    ];
  }

  /**
   * 转换输出
   * @param output 输出数据
   * @param transform 转换配置
   * @returns 转换后的输出
   */
  private transformOutput(
    output: any,
    transform: AfterNodeExecuteHookConfig['outputTransform']
  ): any {
    if (!output || !transform) {
      return output;
    }

    const result = { ...output };

    // 重命名字段
    if (transform.rename) {
      for (const [oldName, newName] of Object.entries(transform.rename)) {
        if (oldName in result) {
          result[newName] = result[oldName];
          delete result[oldName];
        }
      }
    }

    // 过滤字段
    if (transform.filter) {
      for (const field of transform.filter) {
        if (field in result) {
          delete result[field];
        }
      }
    }

    return result;
  }
}
