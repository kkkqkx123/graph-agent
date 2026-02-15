/**
 * 脚本服务
 * 提供统一的脚本执行接口
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { Script, ScriptType, ScriptExecutor, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';
import type { ThreadContext } from '../execution/context/thread-context';
import { CodeRegistry } from '../code/code-registry';
import { CodeExecutionError, ScriptNotFoundError } from '@modular-agent/types';
import { tryCatchAsync } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 脚本执行器注册表
 */
class ScriptExecutorRegistry {
  private executors: Map<ScriptType, ScriptExecutor> = new Map();

  /**
   * 注册脚本执行器
   * @param type 脚本类型
   * @param executor 脚本执行器
   */
  register(type: ScriptType, executor: ScriptExecutor): void {
    this.executors.set(type, executor);
  }

  /**
   * 获取脚本执行器
   * @param type 脚本类型
   * @returns 脚本执行器，如果不存在则返回undefined
   */
  get(type: ScriptType): ScriptExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * 检查执行器是否存在
   * @param type 脚本类型
   * @returns 是否存在
   */
  has(type: ScriptType): boolean {
    return this.executors.has(type);
  }

  /**
   * 列出所有注册的执行器类型
   * @returns 脚本类型数组
   */
  listTypes(): ScriptType[] {
    return Array.from(this.executors.keys());
  }

  /**
   * 清空所有执行器
   */
  clear(): void {
    this.executors.clear();
  }
}

/**
 * 脚本服务类
 */
class CodeService {
  private registry: CodeRegistry;
  private executorRegistry: ScriptExecutorRegistry;

  constructor() {
    this.registry = new CodeRegistry();
    this.executorRegistry = new ScriptExecutorRegistry();
  }

  /**
   * 注册脚本
   * @param script 脚本定义
   */
  registerScript(script: Script): void {
    this.registry.register(script);
  }

  /**
   * 批量注册脚本
   * @param scripts 脚本定义数组
   */
  registerScripts(scripts: Script[]): void {
    this.registry.registerBatch(scripts);
  }

  /**
   * 注销脚本
   * @param scriptName 脚本名称
   */
  unregisterScript(scriptName: string): void {
    this.registry.remove(scriptName);
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义
   * @throws NotFoundError 如果脚本不存在
   */
  getScript(scriptName: string): Script {
    const script = this.registry.get(scriptName);
    if (!script) {
      throw new ScriptNotFoundError(
        `Script '${scriptName}' not found`,
        scriptName
      );
    }
    return script;
  }

  /**
   * 列出所有脚本
   * @returns 脚本定义数组
   */
  listScripts(): Script[] {
    return this.registry.list();
  }

  /**
   * 按类型列出脚本
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  listScriptsByType(type: string): Script[] {
    return this.registry.listByType(type);
  }

  /**
   * 按分类列出脚本
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  listScriptsByCategory(category: string): Script[] {
    return this.registry.listByCategory(category);
  }

  /**
   * 搜索脚本
   * @param query 搜索关键词
   * @returns 匹配的脚本数组
   */
  searchScripts(query: string): Script[] {
    return this.registry.search(query);
  }

  /**
   * 检查脚本是否存在
   * @param scriptName 脚本名称
   * @returns 是否存在
   */
  hasScript(scriptName: string): boolean {
    return this.registry.has(scriptName);
  }

  /**
   * 注册脚本执行器
   * @param type 脚本类型
   * @param executor 脚本执行器
   */
  registerExecutor(type: ScriptType, executor: ScriptExecutor): void {
    this.executorRegistry.register(type, executor);
  }

  /**
   * 执行脚本
   * @param scriptName 脚本名称
   * @param options 执行选项（覆盖脚本默认选项）
   * @param threadContext 线程上下文（可选，用于沙箱隔离）
   * @returns Result<ScriptExecutionResult, CodeExecutionError>
   */
  async execute(
    scriptName: string,
    options: Partial<ScriptExecutionOptions> = {},
    threadContext?: ThreadContext
  ): Promise<Result<ScriptExecutionResult, CodeExecutionError>> {
    // 获取脚本定义
    const script = this.getScript(scriptName);

    // 获取对应的执行器
    const executor = this.executorRegistry.get(script.type);
    if (!executor) {
      return err(new CodeExecutionError(
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

    // 执行脚本
    const result = await tryCatchAsync(
      executor.execute(script, executionOptions)
    );
    
    if (result.isErr()) {
      return err(this.convertToCodeExecutionError(
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
   * @returns Result<ScriptExecutionResult[], CodeExecutionError>
   */
  async executeBatch(
    executions: Array<{
      scriptName: string;
      options?: Partial<ScriptExecutionOptions>;
    }>,
    threadContext?: ThreadContext
  ): Promise<Result<ScriptExecutionResult[], CodeExecutionError>> {
    // 并行执行所有脚本
    const results = await Promise.all(
      executions.map(exec =>
        this.execute(exec.scriptName, exec.options, threadContext)
      )
    );
    
    // 检查是否有错误
    for (const result of results) {
      if (result.isErr()) {
        return result; // 返回第一个错误
      }
    }
    
    // 全部成功，返回结果数组
    const successResults = results as Array<{ isOk(): true; value: ScriptExecutionResult }>;
    return ok(successResults.map(r => r.value));
  }

  /**
   * 验证脚本
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  validateScript(scriptName: string): { valid: boolean; errors: string[] } {
    try {
      const script = this.getScript(scriptName);
      const executor = this.executorRegistry.get(script.type);

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
   * 清空所有脚本
   */
  clearScripts(): void {
    this.registry.clear();
  }

  /**
   * 清空所有执行器
   */
  clearExecutors(): void {
    this.executorRegistry.clear();
  }

  /**
   * 更新脚本定义
   * @param scriptName 脚本名称
   * @param updates 更新内容
   * @throws NotFoundError 如果脚本不存在
   */
  updateScript(scriptName: string, updates: Partial<Script>): void {
    this.registry.update(scriptName, updates);
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
   * 转换错误为CodeExecutionError
   *
   * @param error 原始错误
   * @param scriptName 脚本名称
   * @param scriptType 脚本类型
   * @param options 执行选项
   * @returns CodeExecutionError
   */
  private convertToCodeExecutionError(
    error: unknown,
    scriptName: string,
    scriptType: string,
    options: ScriptExecutionOptions
  ): CodeExecutionError {
    // 如果已经是CodeExecutionError，直接返回
    if (error instanceof CodeExecutionError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    
    return new CodeExecutionError(
      `Script execution failed: ${message}`,
      scriptName,
      scriptType,
      { options },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 导出CodeService类
 */
export { CodeService };