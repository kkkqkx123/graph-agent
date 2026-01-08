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
 * 执行后钩子配置接口
 */
export interface AfterExecuteHookConfig {
  readonly postprocessing?: {
    readonly transform?: Record<string, any>;
  };
  readonly logging?: {
    readonly logResults?: boolean;
    readonly logErrors?: boolean;
    readonly logMetadata?: boolean;
  };
  readonly cleanup?: {
    readonly clearVariables?: string[];
  };
}

/**
 * 执行后钩子
 * 在工作流执行后调用，用于后处理、清理、日志记录等
 */
export class AfterExecuteHook extends Hook {
  /**
   * 创建新的执行后钩子
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
    config: AfterExecuteHookConfig = {},
    enabled: boolean = true,
    priority: number = 0,
    continueOnError: boolean = true,
    failFast: boolean = false
  ): AfterExecuteHook {
    const now = Timestamp.now();
    const hookId = ID.generate();

    const props: HookProps = {
      id: hookId,
      hookPoint: HookPointValue.afterExecute(),
      name,
      description,
      config,
      enabled,
      priority,
      continueOnError,
      failFast,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    };

    return new AfterExecuteHook(props);
  }

  /**
   * 从已有属性重建执行后钩子
   * @param props Hook属性
   * @returns Hook实例
   */
  public static fromProps(props: HookProps): AfterExecuteHook {
    return new AfterExecuteHook(props);
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
      const config = this.props.config as AfterExecuteHookConfig;
      const data: Record<string, any> = {};

      // 执行后处理
      if (config.postprocessing) {
        data['postprocessed'] = this.postprocessContext(context, config.postprocessing);
      }

      // 执行日志记录
      if (config.logging) {
        data['logs'] = this.logExecution(context, config.logging);
      }

      // 执行清理
      if (config.cleanup) {
        data['cleaned'] = this.cleanupResources(context, config.cleanup);
      }

      return {
        success: true,
        output: data,
        shouldContinue: true,
        executionTime: Date.now() - startTime,
        metadata: {
          hookPoint: 'after_execute',
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
          hookPoint: 'after_execute',
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
    const config = this.props.config as AfterExecuteHookConfig;

    if (config.postprocessing && typeof config.postprocessing !== 'object') {
      errors.push('postprocessing 必须是对象类型');
    }

    if (config.logging && typeof config.logging !== 'object') {
      errors.push('logging 必须是对象类型');
    }

    if (config.cleanup && typeof config.cleanup !== 'object') {
      errors.push('cleanup 必须是对象类型');
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
        name: 'postprocessing',
        type: 'object',
        required: false,
        description: '后处理配置',
      },
      {
        name: 'logging',
        type: 'object',
        required: false,
        description: '日志记录配置',
      },
      {
        name: 'cleanup',
        type: 'object',
        required: false,
        description: '清理配置',
      },
    ];
  }

  /**
   * 后处理上下文
   * @param context Hook上下文
   * @param postprocessing 后处理配置
   * @returns 后处理结果
   */
  private postprocessContext(
    context: HookContext,
    postprocessing: AfterExecuteHookConfig['postprocessing']
  ): any {
    const result: Record<string, any> = {};

    if (!postprocessing) {
      return result;
    }

    if (postprocessing.transform) {
      for (const [key, transform] of Object.entries(postprocessing.transform)) {
        const value = context.getVariable(key);
        if (value !== undefined) {
          result[key] = transform;
        }
      }
    }

    return result;
  }

  /**
   * 记录执行日志
   * @param context Hook上下文
   * @param logging 日志配置
   * @returns 日志记录
   */
  private logExecution(context: HookContext, logging: AfterExecuteHookConfig['logging']): any {
    const logs: any[] = [];

    if (!logging) {
      return logs;
    }

    if (logging.logResults) {
      logs.push({
        type: 'result',
        data: context.getVariable('result'),
        timestamp: Date.now(),
      });
    }

    if (logging.logErrors) {
      const error = context.getVariable('error');
      if (error) {
        logs.push({
          type: 'error',
          data: error,
          timestamp: Date.now(),
        });
      }
    }

    if (logging.logMetadata) {
      logs.push({
        type: 'metadata',
        data: context.metadata,
        timestamp: Date.now(),
      });
    }

    return logs;
  }

  /**
   * 清理资源
   * @param context Hook上下文
   * @param cleanup 清理配置
   * @returns 清理结果
   */
  private cleanupResources(context: HookContext, cleanup: AfterExecuteHookConfig['cleanup']): any {
    const cleaned: Record<string, any> = {};

    if (!cleanup) {
      return cleaned;
    }

    if (cleanup.clearVariables) {
      for (const variable of cleanup.clearVariables) {
        const value = context.getVariable(variable);
        if (value !== undefined) {
          context.setVariable(variable, undefined);
          cleaned[variable] = 'cleared';
        }
      }
    }

    return cleaned;
  }
}
