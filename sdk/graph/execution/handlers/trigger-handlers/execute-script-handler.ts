import { ExecutionError } from '@modular-agent/types';
import { TriggerHandler } from '../index.js';
import { ScriptService } from '../../../../core/services/script-service.js';

/**
 * 执行脚本触发器处理器
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param dependencies 依赖项（可选）
 * @returns 执行结果
 */
export const executeScriptHandler: TriggerHandler = async (
  action,
  triggerId,
  ...dependencies
) => {
  // 类型断言确保参数符合 ExecuteScriptActionConfig
  const config = action.parameters as {
    scriptName: string;
    parameters?: Record<string, any>;
    timeout?: number;
    ignoreError?: boolean;
    validateExistence?: boolean;
  };

  try {
    // 获取脚本服务（假设通过依赖注入传递）
    const scriptService = dependencies[0] as ScriptService;

    // 执行脚本
    const result = await scriptService.execute(
      config.scriptName,
      {
        ...config.parameters,
        timeout: config.timeout
      }
    );

    return {
      triggerId,
      success: true,
      action,
      executionTime: Date.now(),
      result
    };
  } catch (error) {
    if (config.ignoreError) {
      return {
        triggerId,
        success: true,
        action,
        executionTime: Date.now(),
        warning: `Script execution failed but ignored: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    throw new ExecutionError(
      `Script execution failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      undefined,
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};