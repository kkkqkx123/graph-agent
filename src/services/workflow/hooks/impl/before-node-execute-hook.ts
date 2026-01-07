import { ID, Timestamp, Version } from '../../../../domain/common/value-objects';
import { HookPointValue } from '../../../../domain/workflow/value-objects/hook-point';
import {
  Hook,
  HookContext,
  HookExecutionResult,
  HookMetadata,
  HookParameter,
  HookValidationResult,
  HookProps,
} from '../../../../domain/workflow/entities/hook';

/**
 * 节点执行前钩子配置接口
 */
export interface BeforeNodeExecuteHookConfig {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly inputValidation?: {
    readonly required?: string[];
    readonly typeCheck?: Record<string, string>;
  };
}

/**
 * 节点执行前钩子
 * 在节点执行前调用，用于节点级别的预处理
 */
export class BeforeNodeExecuteHook extends Hook {
  /**
   * 创建新的节点执行前钩子
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
    config: Omit<BeforeNodeExecuteHookConfig, 'nodeId' | 'nodeType'> = {},
    enabled: boolean = true,
    priority: number = 0,
    continueOnError: boolean = true,
    failFast: boolean = false
  ): BeforeNodeExecuteHook {
    const now = Timestamp.now();
    const hookId = ID.generate();

    const fullConfig: BeforeNodeExecuteHookConfig = {
      nodeId,
      nodeType,
      ...config,
    };

    const props: HookProps = {
      id: hookId,
      hookPoint: HookPointValue.beforeNodeExecute(),
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

    return new BeforeNodeExecuteHook(props);
  }

  /**
   * 从已有属性重建节点执行前钩子
   * @param props Hook属性
   * @returns Hook实例
   */
  public static fromProps(props: HookProps): BeforeNodeExecuteHook {
    return new BeforeNodeExecuteHook(props);
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
    const config = this.props.config as BeforeNodeExecuteHookConfig;

    try {
      const data: Record<string, any> = {};

      // 执行输入验证
      if (config.inputValidation) {
        const validationResult = this.validateNodeInput(context, config.inputValidation);
        if (!validationResult.valid) {
          return {
            success: false,
            output: {
              validationErrors: validationResult.errors,
            },
            error: '输入验证失败',
            shouldContinue: false,
            executionTime: Date.now() - startTime,
            metadata: {
              hookPoint: 'before_node_execute',
              nodeId: config.nodeId,
              nodeType: config.nodeType,
              timestamp: Date.now(),
            },
          };
        }
      }

      // 记录节点执行开始
      data['executionStarted'] = true;

      return {
        success: true,
        output: data,
        shouldContinue: true,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'before_node_execute',
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
          hookPoint: 'before_node_execute',
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
    const config = this.props.config as BeforeNodeExecuteHookConfig;

    if (!config.nodeId) {
      errors.push('nodeId 是必需的');
    }

    if (!config.nodeType) {
      errors.push('nodeType 是必需的');
    }

    if (config.inputValidation && typeof config.inputValidation !== 'object') {
      errors.push('inputValidation 必须是对象类型');
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
        name: 'inputValidation',
        type: 'object',
        required: false,
        description: '输入验证规则',
      },
    ];
  }

  /**
   * 验证节点输入
   * @param context Hook上下文
   * @param rules 验证规则
   * @returns 验证结果
   */
  private validateNodeInput(
    context: HookContext,
    rules: BeforeNodeExecuteHookConfig['inputValidation']
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rules) {
      return { valid: true, errors: [] };
    }

    // 检查必需字段
    if (rules.required) {
      for (const field of rules.required) {
        if (context.getVariable(field) === undefined) {
          errors.push(`节点输入缺少必需字段: ${field}`);
        }
      }
    }

    // 检查字段类型
    if (rules.typeCheck) {
      for (const [field, expectedType] of Object.entries(rules.typeCheck)) {
        const value = context.getVariable(field);
        if (value !== undefined && typeof value !== expectedType) {
          errors.push(`字段 ${field} 类型错误，期望 ${expectedType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
