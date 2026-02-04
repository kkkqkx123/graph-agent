/**
 * CodeServiceAPI - 脚本管理API
 * 封装CodeService和CodeRegistry，提供脚本注册、查询和执行功能
 */

import { codeService } from '../../core/services/code-service';
import type { Script, ScriptExecutionOptions, ScriptExecutionResult } from '../../types/code';
import { ScriptType } from '../../types/code';
import type { 
  ScriptFilter, 
  ScriptOptions, 
  ScriptTestResult, 
  ScriptExecutionLog, 
  ScriptStatistics,
  ScriptRegistrationConfig,
  ScriptBatchExecutionConfig
} from '../types/code-types';
import { NotFoundError } from '../../types/errors';

/**
 * CodeServiceAPI - 脚本管理API
 */
export class CodeServiceAPI {
  private codeService = codeService;
  private executionLog: ScriptExecutionLog[] = [];

  /**
   * 注册脚本
   * @param script 脚本定义
   * @param config 注册配置
   */
  async registerScript(script: Script, config?: ScriptRegistrationConfig): Promise<void> {
    const registrationConfig = {
      overwrite: config?.overwrite ?? false,
      validate: config?.validate ?? true,
      enable: config?.enable ?? true
    };

    // 检查脚本是否已存在
    if (this.codeService.hasScript(script.name) && !registrationConfig.overwrite) {
      throw new Error(`Script '${script.name}' already exists`);
    }

    // 验证脚本
    if (registrationConfig.validate) {
      const validation = this.codeService.validateScript(script.name);
      if (!validation.valid) {
        throw new Error(`Script validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // 注册脚本
    this.codeService.registerScript(script);
  }

  /**
   * 批量注册脚本
   * @param scripts 脚本定义数组
   * @param config 注册配置
   */
  async registerScripts(scripts: Script[], config?: ScriptRegistrationConfig): Promise<void> {
    for (const script of scripts) {
      await this.registerScript(script, config);
    }
  }

  /**
   * 注销脚本
   * @param scriptName 脚本名称
   */
  async unregisterScript(scriptName: string): Promise<void> {
    this.codeService.unregisterScript(scriptName);
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义，如果不存在则返回null
   */
  async getScript(scriptName: string): Promise<Script | null> {
    try {
      return this.codeService.getScript(scriptName);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取脚本列表
   * @param filter 过滤条件
   * @returns 脚本定义数组
   */
  async getScripts(filter?: ScriptFilter): Promise<Script[]> {
    let scripts = this.codeService.listScripts();

    // 应用过滤条件
    if (filter) {
      scripts = this.applyFilter(scripts, filter);
    }

    return scripts;
  }

  /**
   * 按类型获取脚本列表
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  async getScriptsByType(type: ScriptType): Promise<Script[]> {
    return this.codeService.listScriptsByType(type);
  }

  /**
   * 按分类获取脚本列表
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  async getScriptsByCategory(category: string): Promise<Script[]> {
    return this.codeService.listScriptsByCategory(category);
  }

  /**
   * 搜索脚本
   * @param query 搜索关键词
   * @returns 脚本定义数组
   */
  async searchScripts(query: string): Promise<Script[]> {
    return this.codeService.searchScripts(query);
  }

  /**
   * 检查脚本是否存在
   * @param scriptName 脚本名称
   * @returns 是否存在
   */
  async hasScript(scriptName: string): Promise<boolean> {
    return this.codeService.hasScript(scriptName);
  }

  /**
   * 执行脚本
   * @param scriptName 脚本名称
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeScript(
    scriptName: string,
    options?: ScriptOptions
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const executionOptions: Partial<ScriptExecutionOptions> = {
      timeout: options?.timeout,
      retries: options?.retries,
      retryDelay: options?.retryDelay,
      workingDirectory: options?.workingDirectory,
      environment: options?.environment,
      sandbox: options?.sandbox
    };

    try {
      // 验证脚本
      const validation = this.codeService.validateScript(scriptName);
      if (!validation.valid) {
        return {
          success: false,
          scriptName,
          scriptType: ScriptType.SHELL, // 默认类型，实际会从脚本定义获取
          stdout: undefined,
          stderr: `脚本验证失败: ${validation.errors.join(', ')}`,
          exitCode: 1,
          executionTime: Date.now() - startTime,
          error: `脚本验证失败: ${validation.errors.join(', ')}`
        };
      }

      // 执行脚本
      const result = await this.codeService.execute(scriptName, executionOptions);
      const executionTime = Date.now() - startTime;

      const executionResult: ScriptExecutionResult = {
        ...result,
        executionTime
      };

      // 记录执行日志
      if (options?.enableLogging ?? true) {
        this.executionLog.push({
          scriptName,
          options: executionOptions as ScriptExecutionOptions,
          result: executionResult,
          timestamp: Date.now()
        });
      }

      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      const executionResult: ScriptExecutionResult = {
        success: false,
        scriptName,
        scriptType: ScriptType.SHELL, // 默认类型
        stdout: undefined,
        stderr: errorMessage,
        exitCode: 1,
        executionTime,
        error: errorMessage
      };

      // 记录执行日志
      if (options?.enableLogging ?? true) {
        this.executionLog.push({
          scriptName,
          options: executionOptions as ScriptExecutionOptions,
          result: executionResult,
          timestamp: Date.now()
        });
      }

      return executionResult;
    }
  }

  /**
   * 批量执行脚本
   * @param executions 执行任务数组
   * @param config 批量执行配置
   * @returns 执行结果数组
   */
  async executeScriptsBatch(
    executions: Array<{
      scriptName: string;
      options?: ScriptOptions;
    }>,
    config?: ScriptBatchExecutionConfig
  ): Promise<ScriptExecutionResult[]> {
    const batchConfig = {
      parallel: config?.parallel ?? true,
      maxConcurrency: config?.maxConcurrency ?? 5,
      continueOnFailure: config?.continueOnFailure ?? false,
      enableLogging: config?.enableLogging ?? true
    };

    if (batchConfig.parallel) {
      // 并行执行
      const results: ScriptExecutionResult[] = [];
      const chunks = this.chunkArray(executions, batchConfig.maxConcurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(exec =>
            this.executeScript(exec.scriptName, {
              ...exec.options,
              enableLogging: batchConfig.enableLogging
            }).catch(error => {
              if (batchConfig.continueOnFailure) {
                return {
                  success: false,
                  scriptName: exec.scriptName,
                  scriptType: ScriptType.SHELL,
                  stdout: undefined,
                  stderr: error instanceof Error ? error.message : '未知错误',
                  exitCode: 1,
                  executionTime: 0,
                  error: error instanceof Error ? error.message : '未知错误'
                };
              }
              throw error;
            })
          )
        );
        results.push(...chunkResults);
      }

      return results;
    } else {
      // 串行执行
      const results: ScriptExecutionResult[] = [];
      for (const exec of executions) {
        try {
          const result = await this.executeScript(exec.scriptName, {
            ...exec.options,
            enableLogging: batchConfig.enableLogging
          });
          results.push(result);
        } catch (error) {
          if (batchConfig.continueOnFailure) {
            results.push({
              success: false,
              scriptName: exec.scriptName,
              scriptType: ScriptType.SHELL,
              stdout: undefined,
              stderr: error instanceof Error ? error.message : '未知错误',
              exitCode: 1,
              executionTime: 0,
              error: error instanceof Error ? error.message : '未知错误'
            });
          } else {
            throw error;
          }
        }
      }
      return results;
    }
  }

  /**
   * 测试脚本
   * @param scriptName 脚本名称
   * @param options 执行选项
   * @returns 测试结果
   */
  async testScript(
    scriptName: string,
    options?: ScriptOptions
  ): Promise<ScriptTestResult> {
    const startTime = Date.now();

    try {
      // 验证脚本
      const validation = this.codeService.validateScript(scriptName);
      if (!validation.valid) {
        return {
          passed: false,
          error: `脚本验证失败: ${validation.errors.join(', ')}`,
          testTime: Date.now() - startTime,
          scriptName
        };
      }

      // 检查脚本是否存在
      const script = await this.getScript(scriptName);
      if (!script) {
        return {
          passed: false,
          error: `脚本不存在: ${scriptName}`,
          testTime: Date.now() - startTime,
          scriptName
        };
      }

      // 执行测试（使用较短的默认超时）
      const result = await this.executeScript(scriptName, {
        ...options,
        timeout: options?.timeout ?? 10000,
        enableLogging: false
      });

      return {
        passed: result.success,
        result: result,
        error: result.error,
        testTime: Date.now() - startTime,
        scriptName
      };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        testTime: Date.now() - startTime,
        scriptName
      };
    }
  }

  /**
   * 验证脚本
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  async validateScript(scriptName: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.codeService.validateScript(scriptName);
  }

  /**
   * 更新脚本定义
   * @param scriptName 脚本名称
   * @param updates 更新内容
   */
  async updateScript(scriptName: string, updates: Partial<Script>): Promise<void> {
    this.codeService.updateScript(scriptName, updates);
  }

  /**
   * 获取脚本数量
   * @returns 脚本数量
   */
  async getScriptCount(): Promise<number> {
    const scripts = await this.getScripts();
    return scripts.length;
  }

  /**
   * 清空所有脚本
   */
  async clearScripts(): Promise<void> {
    this.codeService.clearScripts();
    this.executionLog = [];
  }

  /**
   * 获取执行日志
   * @param scriptName 脚本名称（可选）
   * @param limit 返回数量限制
   * @returns 执行日志数组
   */
  async getExecutionLog(scriptName?: string, limit?: number): Promise<ScriptExecutionLog[]> {
    let logs = this.executionLog;

    // 按脚本名称过滤
    if (scriptName) {
      logs = logs.filter(log => log.scriptName === scriptName);
    }

    // 按时间倒序排序
    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    // 限制返回数量
    if (limit && limit > 0) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * 清空执行日志
   */
  async clearExecutionLog(): Promise<void> {
    this.executionLog = [];
  }

  /**
   * 获取脚本统计信息
   * @returns 统计信息
   */
  async getStatistics(): Promise<ScriptStatistics> {
    const scripts = await this.getScripts();
    const logs = await this.getExecutionLog();

    // 按类型统计
    const byType: Record<ScriptType, number> = {} as Record<ScriptType, number>;
    Object.values(ScriptType).forEach(type => {
      byType[type] = scripts.filter(s => s.type === type).length;
    });

    // 按分类统计
    const byCategory: Record<string, number> = {};
    scripts.forEach(script => {
      const category = script.metadata?.category || 'uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    // 执行统计
    const executionCount = logs.length;
    const successCount = logs.filter(log => log.result.success).length;
    const failureCount = executionCount - successCount;
    const averageExecutionTime = executionCount > 0 
      ? logs.reduce((sum, log) => sum + log.result.executionTime, 0) / executionCount 
      : 0;

    return {
      totalScripts: scripts.length,
      byType,
      byCategory,
      executionCount,
      successCount,
      failureCount,
      averageExecutionTime
    };
  }


  /**
   * 应用过滤条件
   * @param scripts 脚本数组
   * @param filter 过滤条件
   * @returns 过滤后的脚本数组
   */
  private applyFilter(scripts: Script[], filter: ScriptFilter): Script[] {
    return scripts.filter(script => {
      if (filter.name && !script.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && script.type !== filter.type) {
        return false;
      }
      if (filter.category && script.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.tags && script.metadata?.tags) {
        if (!filter.tags.every(tag => script.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.enabled !== undefined) {
        // 注意：Script接口目前没有enabled字段，这里假设所有脚本都是启用的
        // 如果需要支持禁用脚本，需要在Script接口中添加enabled字段
        return true;
      }
      return true;
    });
  }

  /**
   * 将数组分块
   * @param array 原始数组
   * @param chunkSize 块大小
   * @returns 分块后的数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}