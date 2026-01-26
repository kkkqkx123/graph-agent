/**
 * Tool节点执行器
 * 负责执行TOOL节点，调用工具服务，处理工具响应
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Tool节点配置
 */
interface ToolNodeConfig {
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  parameters: Record<string, any>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * Tool节点执行器
 */
export class ToolNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.TOOL) {
      return false;
    }

    const config = node.config as ToolNodeConfig;

    // 检查必需的配置项
    if (!config.toolName || typeof config.toolName !== 'string') {
      throw new ValidationError('Tool node must have a valid toolName', `node.${node.id}`);
    }

    if (!config.parameters || typeof config.parameters !== 'object') {
      throw new ValidationError('Tool node must have parameters object', `node.${node.id}`);
    }

    // 检查超时配置
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ValidationError('Tool node timeout must be a positive number', `node.${node.id}`);
    }

    // 检查重试配置
    if (config.retries !== undefined && (typeof config.retries !== 'number' || config.retries < 0)) {
      throw new ValidationError('Tool node retries must be a non-negative number', `node.${node.id}`);
    }

    if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
      throw new ValidationError('Tool node retryDelay must be a non-negative number', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as ToolNodeConfig;
    const timeout = config.timeout || 30000; // 默认30秒
    const retries = config.retries || 0;
    const retryDelay = config.retryDelay || 1000; // 默认1秒

    // 步骤1：解析参数中的变量引用
    const resolvedParameters = this.resolveVariableReferences(config.parameters, thread);

    // 步骤2：执行工具（带重试）
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const result = await this.executeTool(config.toolName, resolvedParameters, timeout);

        // 步骤3：记录执行历史
        thread.nodeResults.push({
          step: thread.nodeResults.length + 1,
          nodeId: node.id,
          nodeType: node.type,
          status: 'COMPLETED',
          timestamp: Date.now(),
          action: 'tool',
          details: {
            toolName: config.toolName,
            parameters: resolvedParameters,
            result,
            attempt: attempt + 1
          }
        });

        // 步骤4：返回执行结果
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          // 等待重试延迟
          await this.sleep(retryDelay);
          attempt++;
        } else {
          // 重试次数用完，抛出错误
          throw lastError;
        }
      }
    }

    // 理论上不会到达这里
    throw lastError || new Error('Tool execution failed');
  }

  /**
   * 解析参数中的变量引用
   * @param parameters 参数对象
   * @param thread Thread实例
   * @returns 解析后的参数对象
   */
  private resolveVariableReferences(parameters: Record<string, any>, thread: Thread): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // 解析字符串中的变量引用
        resolved[key] = this.resolveStringVariables(value, thread);
      } else if (typeof value === 'object' && value !== null) {
        // 递归解析嵌套对象
        resolved[key] = this.resolveVariableReferences(value, thread);
      } else {
        // 其他类型直接复制
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 解析字符串中的变量引用
   * @param str 字符串
   * @param thread Thread实例
   * @returns 解析后的字符串
   */
  private resolveStringVariables(str: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return str.replace(variablePattern, (match, varPath) => {
      // 从variableValues获取变量值
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return `{{${varPath}}}`; // 保持原样，变量不存在
        }
        value = value[part];
      }

      // 根据值的类型返回字符串表示
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param parameters 参数
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    timeout: number
  ): Promise<any> {
    // 注意：这里使用模拟的工具调用
    // 实际实现应该使用ToolService执行工具

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // 模拟工具执行延迟
        setTimeout(() => {
          clearTimeout(timer);

          // 模拟工具执行结果
          const mockResult = this.generateMockResult(toolName, parameters);

          resolve({
            success: true,
            toolName,
            parameters,
            result: mockResult,
            executionTime: 100
          });
        }, 100);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * 生成模拟结果
   * @param toolName 工具名称
   * @param parameters 参数
   * @returns 模拟结果
   */
  private generateMockResult(toolName: string, parameters: Record<string, any>): any {
    // 简单的模拟结果生成
    return {
      message: `Mock result for tool: ${toolName}`,
      parameters
    };
  }

  /**
   * 睡眠指定时间
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
