import { ID, Timestamp, Version } from '../../../../domain/common/value-objects';
import { HookPointValue } from '../../../../domain/workflow/value-objects/hook-point';
import {
  Hook,
  HookContext,
  HookExecutionResult,
  HookMetadata,
  HookParameter,
  ValidationResult,
  HookProps
} from '../../../../domain/workflow/entities/hook';

/**
 * 执行前钩子配置接口
 */
export interface BeforeExecuteHookConfig {
  readonly validationRules?: {
    readonly required?: string[];
    readonly typeCheck?: Record<string, string>;
  };
  readonly preprocessing?: {
    readonly transform?: Record<string, any>;
  };
}

/**
 * 执行前钩子
 * 在工作流执行前调用，用于预处理、验证等
 */
export class BeforeExecuteHook extends Hook {
  /**
   * 创建新的执行前钩子
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
    name: string,
    description?: string,
    config: BeforeExecuteHookConfig = {},
    enabled: boolean = true,
    priority: number = 0,
    continueOnError: boolean = true,
    failFast: boolean = false
  ): BeforeExecuteHook {
    const now = Timestamp.now();
    const hookId = ID.generate();

    const props: HookProps = {
      id: hookId,
      hookPoint: HookPointValue.beforeExecute(),
      name,
      description,
      config,
      enabled,
      priority,
      continueOnError,
      failFast,
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };

    return new BeforeExecuteHook(props);
  }

  /**
   * 从已有属性重建执行前钩子
   * @param props Hook属性
   * @returns Hook实例
   */
  public static fromProps(props: HookProps): BeforeExecuteHook {
    return new BeforeExecuteHook(props);
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

    try {
      const config = this.props.config as BeforeExecuteHookConfig;
      const data: Record<string, any> = {};

      // 执行验证
      if (config.validationRules) {
        const validationResult = this.validateContext(context, config.validationRules);
        if (!validationResult.valid) {
          return {
            success: false,
            output: {
              validationErrors: validationResult.errors
            },
            error: '验证失败',
            shouldContinue: false,
            executionTime: Date.now() - startTime,
            metadata: {
              hookPoint: 'before_execute',
              timestamp: Date.now()
            }
          };
        }
      }

      // 执行预处理
      if (config.preprocessing) {
        data['preprocessed'] = this.preprocessContext(context, config.preprocessing);
      }

      return {
        success: true,
        output: data,
        shouldContinue: true,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'before_execute',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        shouldContinue: this.props.continueOnError,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'before_execute',
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * 验证Hook配置
   * @returns 验证结果
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const config = this.props.config as BeforeExecuteHookConfig;

    if (config.validationRules && typeof config.validationRules !== 'object') {
      errors.push('validationRules 必须是对象类型');
    }

    if (config.preprocessing && typeof config.preprocessing !== 'object') {
      errors.push('preprocessing 必须是对象类型');
    }

    return {
      valid: errors.length === 0,
      errors
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
      priority: this.props.priority
    };
  }

  /**
   * 获取Hook参数
   * @returns 参数列表
   */
  private getParameters(): HookParameter[] {
    return [
      {
        name: 'validationRules',
        type: 'object',
        required: false,
        description: '验证规则配置'
      },
      {
        name: 'preprocessing',
        type: 'object',
        required: false,
        description: '预处理配置'
      }
    ];
  }

  /**
   * 验证上下文
   * @param context Hook上下文
   * @param rules 验证规则
   * @returns 验证结果
   */
  private validateContext(context: HookContext, rules: BeforeExecuteHookConfig['validationRules']): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rules) {
      return { valid: true, errors: [] };
    }

    // 检查必需字段
    if (rules.required) {
      for (const field of rules.required) {
        if (context.getVariable(field) === undefined) {
          errors.push(`缺少必需字段: ${field}`);
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
      errors
    };
  }

  /**
   * 预处理上下文
   * @param context Hook上下文
   * @param preprocessing 预处理配置
   * @returns 预处理结果
   */
  private preprocessContext(context: HookContext, preprocessing: BeforeExecuteHookConfig['preprocessing']): any {
    const result: Record<string, any> = {};

    if (!preprocessing) {
      return result;
    }

    if (preprocessing.transform) {
      for (const [key, transform] of Object.entries(preprocessing.transform)) {
        if (context.getVariable(key) !== undefined) {
          result[key] = transform;
        }
      }
    }

    return result;
  }
}