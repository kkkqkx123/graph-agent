import { injectable } from 'inversify';
import { BaseHookFunction } from './base-hook-function';
import { WorkflowExecutionContext, NodeFunctionResult, NodeFunctionConfig } from '../types';

/**
 * 执行后钩子函数
 * 在工作流执行后调用，用于后处理、清理、日志记录等
 */
@injectable()
export class AfterExecuteHookFunction extends BaseHookFunction<NodeFunctionConfig> {
  constructor() {
    super(
      'hook:after_execute',
      'after_execute_hook',
      '在工作流执行后调用的钩子，用于后处理、清理、日志记录等'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'postprocessing',
        type: 'object',
        required: false,
        description: '后处理配置'
      },
      {
        name: 'logging',
        type: 'object',
        required: false,
        description: '日志记录配置'
      },
      {
        name: 'cleanup',
        type: 'object',
        required: false,
        description: '清理配置'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config['postprocessing'] && typeof config['postprocessing'] !== 'object') {
      errors.push('postprocessing 必须是对象类型');
    }

    if (config['logging'] && typeof config['logging'] !== 'object') {
      errors.push('logging 必须是对象类型');
    }

    if (config['cleanup'] && typeof config['cleanup'] !== 'object') {
      errors.push('cleanup 必须是对象类型');
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
          hookPoint: 'after_execute',
          timestamp: Date.now()
        }
      };

      // 执行后处理
      if (config['postprocessing']) {
        result.data['postprocessed'] = this.postprocessContext(context, config['postprocessing']);
      }

      // 执行日志记录
      if (config['logging']) {
        result.data['logs'] = this.logExecution(context, config['logging']);
      }

      // 执行清理
      if (config['cleanup']) {
        result.data['cleaned'] = this.cleanupResources(context, config['cleanup']);
      }

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

  private postprocessContext(context: WorkflowExecutionContext, postprocessing: any): any {
    // 简化的后处理逻辑
    const result = { ...context };

    if (postprocessing.transform) {
      for (const [key, transform] of Object.entries(postprocessing.transform)) {
        if (key in result) {
          (result as Record<string, any>)[key] = transform;
        }
      }
    }

    return result;
  }

  private logExecution(context: WorkflowExecutionContext, logging: any): any {
    // 简化的日志记录逻辑
    const logs = [];

    if (logging['logResults']) {
      logs.push({
        type: 'result',
        data: context.getVariable('result'),
        timestamp: Date.now()
      });
    }

    if (logging['logErrors']) {
      const error = context.getVariable('error');
      if (error) {
        logs.push({
          type: 'error',
          data: error,
          timestamp: Date.now()
        });
      }
    }

    return logs;
  }

  private cleanupResources(context: WorkflowExecutionContext, cleanup: any): any {
    // 简化的清理逻辑
    const cleaned: Record<string, any> = {};

    if (cleanup.clearVariables) {
      for (const variable of cleanup.clearVariables) {
        if (variable in context) {
          cleaned[variable] = 'cleared';
        }
      }
    }

    return cleaned;
  }
}