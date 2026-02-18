/**
 * 脚本服务
 * 提供统一的脚本管理和执行接口
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 DI 容器统一管理
 */

import type { Script, ScriptType, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';
import type { ThreadContext } from '../execution/context/thread-context.js';
import type { IScriptExecutor } from '@modular-agent/script-executors';
import { ScriptExecutionError, ScriptNotFoundError, ConfigurationValidationError } from '@modular-agent/types';
import { tryCatchAsyncWithSignal, all } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 脚本服务类
 * 整合脚本注册表和执行器管理功能
 */
class ScriptService {
  private scripts: Map<string, Script> = new Map();
  private executors: Map<ScriptType, IScriptExecutor> = new Map();

  /**
   * 注册脚本执行器
   * @param type 脚本类型
   * @param executor 脚本执行器
   */
  registerExecutor(type: ScriptType, executor: IScriptExecutor): void {
    this.executors.set(type, executor);
  }

  /**
   * 获取脚本执行器
   * @param type 脚本类型
   * @returns 脚本执行器，如果不存在则返回undefined
   */
  getExecutor(type: ScriptType): IScriptExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * 检查执行器是否存在
   * @param type 脚本类型
   * @returns 是否存在
   */
  hasExecutor(type: ScriptType): boolean {
    return this.executors.has(type);
  }

  /**
   * 列出所有注册的执行器类型
   * @returns 脚本类型数组
   */
  listExecutorTypes(): ScriptType[] {
    return Array.from(this.executors.keys());
  }

  /**
   * 清空所有执行器
   */
  clearExecutors(): void {
    this.executors.clear();
  }

  /**
   * 注册脚本
   * @param script 脚本定义
   * @throws ValidationError 如果脚本定义无效或名称已存在
   */
  registerScript(script: Script): void {
    // 验证脚本定义
    this.validateScript(script);

    // 设置默认值
    const scriptWithDefaults: Script = {
      ...script,
      enabled: script.enabled !== undefined ? script.enabled : true
    };

    // 检查脚本名称是否已存在
    if (this.scripts.has(script.name)) {
      throw new ConfigurationValidationError(
        `Script with name '${script.name}' already exists`,
        {
          configType: 'script',
          field: 'name'
        }
      );
    }

    // 注册脚本
    this.scripts.set(script.name, scriptWithDefaults);
  }

  /**
   * 批量注册脚本
   * @param scripts 脚本定义数组
   */
  registerScripts(scripts: Script[]): void {
    for (const script of scripts) {
      this.registerScript(script);
    }
  }

  /**
   * 注销脚本
   * @param scriptName 脚本名称
   * @throws NotFoundError 如果脚本不存在
   */
  unregisterScript(scriptName: string): void {
    if (!this.scripts.has(scriptName)) {
      throw new ScriptNotFoundError(
        `Script '${scriptName}' not found`,
        scriptName
      );
    }
    this.scripts.delete(scriptName);
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义
   * @throws NotFoundError 如果脚本不存在
   */
  getScript(scriptName: string): Script {
    const script = this.scripts.get(scriptName);
    if (!script) {
      throw new ScriptNotFoundError(
        `Script '${scriptName}' not found`,
        scriptName
      );
    }
    return script;
  }

  /**
   * 获取脚本定义（可能返回undefined）
   * @param scriptName 脚本名称
   * @returns 脚本定义，如果不存在则返回undefined
   */
  findScript(scriptName: string): Script | undefined {
    return this.scripts.get(scriptName);
  }

  /**
   * 列出所有脚本
   * @returns 脚本定义数组
   */
  listScripts(): Script[] {
    return Array.from(this.scripts.values());
  }

  /**
   * 按类型列出脚本
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  listScriptsByType(type: string): Script[] {
    return this.listScripts().filter(script => script.type === type);
  }

  /**
   * 按分类列出脚本
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  listScriptsByCategory(category: string): Script[] {
    return this.listScripts().filter(
      script => script.metadata?.category === category
    );
  }

  /**
   * 搜索脚本
   * @param query 搜索关键词
   * @returns 匹配的脚本数组
   */
  searchScripts(query: string): Script[] {
    const lowerQuery = query.toLowerCase();
    return this.listScripts().filter(script => {
      return (
        script.name.toLowerCase().includes(lowerQuery) ||
        script.description.toLowerCase().includes(lowerQuery) ||
        script.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        script.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 检查脚本是否存在
   * @param scriptName 脚本名称
   * @returns 是否存在
   */
  hasScript(scriptName: string): boolean {
    return this.scripts.has(scriptName);
  }

  /**
   * 清空所有脚本
   */
  clearScripts(): void {
    this.scripts.clear();
  }

  /**
   * 获取脚本数量
   * @returns 脚本数量
   */
  scriptCount(): number {
    return this.scripts.size;
  }

  /**
   * 更新脚本定义
   * @param scriptName 脚本名称
   * @param updates 更新内容
   * @throws NotFoundError 如果脚本不存在
   */
  updateScript(scriptName: string, updates: Partial<Script>): void {
    const script = this.getScript(scriptName);

    const updatedScript = {
      ...script,
      ...updates,
      // 确保 enabled 字段有默认值
      enabled: updates.enabled !== undefined ? updates.enabled : (script.enabled ?? true)
    };

    this.validateScript(updatedScript);
    this.scripts.set(scriptName, updatedScript);
  }

  /**
   * 启用脚本
   * @param scriptName 脚本名称
   * @throws NotFoundError 如果脚本不存在
   */
  enableScript(scriptName: string): void {
    this.updateScript(scriptName, { enabled: true });
  }

  /**
   * 禁用脚本
   * @param scriptName 脚本名称
   * @throws NotFoundError 如果脚本不存在
   */
  disableScript(scriptName: string): void {
    this.updateScript(scriptName, { enabled: false });
  }

  /**
   * 检查脚本是否启用
   * @param scriptName 脚本名称
   * @returns 是否启用
   * @throws NotFoundError 如果脚本不存在
   */
  isScriptEnabled(scriptName: string): boolean {
    const script = this.getScript(scriptName);
    return script.enabled ?? true;
  }

  /**
   * 验证脚本定义
   * @param script 脚本定义
   * @returns 是否有效
   * @throws ValidationError 如果脚本定义无效
   */
  validateScript(script: Script): boolean {
    // 验证必需字段
    if (!script.name || typeof script.name !== 'string') {
      throw new ConfigurationValidationError(
        'Script name is required and must be a string',
        {
          configType: 'script',
          field: 'name'
        }
      );
    }

    if (!script.type || typeof script.type !== 'string') {
      throw new ConfigurationValidationError(
        'Script type is required and must be a string',
        {
          configType: 'script',
          field: 'type'
        }
      );
    }

    if (!script.description || typeof script.description !== 'string') {
      throw new ConfigurationValidationError(
        'Script description is required and must be a string',
        {
          configType: 'script',
          field: 'description'
        }
      );
    }

    // 验证脚本内容或文件路径至少有一个
    if (!script.content && !script.filePath) {
      throw new ConfigurationValidationError(
        'Script must have either content or filePath',
        {
          configType: 'script',
          field: 'content'
        }
      );
    }

    // 验证执行选项
    if (!script.options) {
      throw new ConfigurationValidationError(
        'Script options are required',
        {
          configType: 'script',
          field: 'options'
        }
      );
    }

    // 验证超时时间
    if (script.options.timeout !== undefined && script.options.timeout < 0) {
      throw new ConfigurationValidationError(
        'Script timeout must be a positive number',
        {
          configType: 'script',
          field: 'options.timeout'
        }
      );
    }

    // 验证重试次数
    if (script.options.retries !== undefined && script.options.retries < 0) {
      throw new ConfigurationValidationError(
        'Script retries must be a non-negative number',
        {
          configType: 'script',
          field: 'options.retries'
        }
      );
    }

    // 验证重试延迟
    if (script.options.retryDelay !== undefined && script.options.retryDelay < 0) {
      throw new ConfigurationValidationError(
        'Script retryDelay must be a non-negative number',
        {
          configType: 'script',
          field: 'options.retryDelay'
        }
      );
    }

    // 验证 enabled 字段（如果提供）
    if (script.enabled !== undefined && typeof script.enabled !== 'boolean') {
      throw new ConfigurationValidationError(
        'Script enabled must be a boolean',
        {
          configType: 'script',
          field: 'enabled'
        }
      );
    }

    return true;
  }

  /**
   * 验证脚本（使用执行器）
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  validateScriptWithExecutor(scriptName: string): { valid: boolean; errors: string[] } {
    try {
      const script = this.getScript(scriptName);
      const executor = this.executors.get(script.type);

      if (!executor) {
        return {
          valid: false,
          errors: [`No executor found for script type '${script.type}'`]
        };
      }

      // 使用执行器的验证方法
      return executor.validate(script);
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * 执行脚本
   * @param scriptName 脚本名称
   * @param options 执行选项（覆盖脚本默认选项）
   * @param threadContext 线程上下文（可选，用于沙箱隔离）
   * @returns Result<ScriptExecutionResult, ScriptExecutionError>
   */
 async execute(
   scriptName: string,
   options: Partial<ScriptExecutionOptions> = {},
   threadContext?: ThreadContext
 ): Promise<Result<ScriptExecutionResult, ScriptExecutionError>> {
    // 获取脚本定义
    const script = this.getScript(scriptName);

    // 获取对应的执行器
    const executor = this.executors.get(script.type);
    if (!executor) {
      return err(new ScriptExecutionError(
        `No executor found for script type '${script.type}'`,
        scriptName,
        script.type,
        { options }
      ));
    }

    // 合并执行选项（脚本默认选项 + 传入选项）
    const executionOptions: ScriptExecutionOptions = {
      ...script.options,
      ...options
    };

    // 使用 tryCatchAsyncWithSignal 确保 signal 正确传递
    const result = await tryCatchAsyncWithSignal(
      (signal: AbortSignal | undefined) => executor.execute(script, { ...executionOptions, signal }),
      executionOptions?.signal
    );

    if (result.isErr()) {
      return err(this.convertToScriptExecutionError(
        result.error,
        scriptName,
        script.type,
        executionOptions
      ));
    }

    return ok(result.value);
  }

  /**
    * 批量执行脚本
    * @param executions 执行任务数组
    * @param threadContext 线程上下文（可选）
    * @returns Result<ScriptExecutionResult[], ScriptExecutionError>
    */
  async executeBatch(
    executions: Array<{
      scriptName: string;
      options?: Partial<ScriptExecutionOptions>;
    }>,
    threadContext?: ThreadContext
  ): Promise<Result<ScriptExecutionResult[], ScriptExecutionError>> {
    // 并行执行所有脚本
    const results = await Promise.all(
      executions.map(exec =>
        this.execute(exec.scriptName, exec.options, threadContext)
      )
    );

    // 组合结果，全部成功时返回成功，否则返回第一个错误
    return all(results);
  }

  /**
    * 转换错误为ScriptExecutionError
    *
    * @param error 原始错误
    * @param scriptName 脚本名称
    * @param scriptType 脚本类型
    * @param options 执行选项
    * @returns ScriptExecutionError
    */
  private convertToScriptExecutionError(
    error: unknown,
    scriptName: string,
    scriptType: string,
    options: ScriptExecutionOptions
  ): ScriptExecutionError {
    // 如果已经是ScriptExecutionError，直接返回
    if (error instanceof ScriptExecutionError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    return new ScriptExecutionError(
      `Script execution failed: ${message}`,
      scriptName,
      scriptType,
      { options },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 导出ScriptService类
 */
export { ScriptService };