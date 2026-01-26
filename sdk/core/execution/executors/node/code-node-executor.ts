/**
 * Code节点执行器
 * 负责执行CODE节点，执行脚本代码，支持多种脚本语言
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Code节点配置
 */
interface CodeNodeConfig {
  /** 脚本名称或代码内容 */
  scriptName: string;
  /** 脚本类型 */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  /** 风险等级 */
  risk: 'none' | 'low' | 'medium' | 'high';
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否为内联代码 */
  inline?: boolean;
}

/**
 * Code节点执行器
 */
export class CodeNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.CODE) {
      return false;
    }

    const config = node.config as CodeNodeConfig;

    // 检查必需的配置项
    if (!config.scriptName || typeof config.scriptName !== 'string') {
      throw new ValidationError('Code node must have a valid scriptName', `node.${node.id}`);
    }

    if (!config.scriptType || !['shell', 'cmd', 'powershell', 'python', 'javascript'].includes(config.scriptType)) {
      throw new ValidationError('Code node must have a valid scriptType (shell, cmd, powershell, python, or javascript)', `node.${node.id}`);
    }

    if (!config.risk || !['none', 'low', 'medium', 'high'].includes(config.risk)) {
      throw new ValidationError('Code node must have a valid risk level (none, low, medium, or high)', `node.${node.id}`);
    }

    // 检查超时配置
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ValidationError('Code node timeout must be a positive number', `node.${node.id}`);
    }

    // 检查重试配置
    if (config.retries !== undefined && (typeof config.retries !== 'number' || config.retries < 0)) {
      throw new ValidationError('Code node retries must be a non-negative number', `node.${node.id}`);
    }

    if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
      throw new ValidationError('Code node retryDelay must be a non-negative number', `node.${node.id}`);
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
    const config = node.config as CodeNodeConfig;
    const timeout = config.timeout || 30000; // 默认30秒
    const retries = config.retries || 0;
    const retryDelay = config.retryDelay || 1000; // 默认1秒

    // 步骤1：根据风险等级选择执行策略
    this.validateRiskLevel(config.risk, config.scriptName);

    // 步骤2：执行脚本代码（带重试）
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const result = await this.executeScript(config, timeout);

        // 步骤3：记录执行历史
        thread.executionHistory.push({
          step: thread.executionHistory.length + 1,
          nodeId: node.id,
          nodeType: node.type,
          status: 'COMPLETED',
          timestamp: Date.now(),
          action: 'code',
          details: {
            scriptName: config.scriptName,
            scriptType: config.scriptType,
            risk: config.risk,
            exitCode: result.exitCode,
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
    throw lastError || new Error('Script execution failed');
  }

  /**
   * 验证风险等级
   * @param risk 风险等级
   * @param scriptName 脚本名称
   */
  private validateRiskLevel(risk: string, scriptName: string): void {
    // 根据风险等级进行不同的安全检查
    switch (risk) {
      case 'none':
        // 不进行任何安全检查
        break;
      case 'low':
        // 基本安全检查
        if (scriptName.includes('..') || scriptName.includes('~')) {
          throw new ValidationError('Script path contains invalid characters', 'code.security');
        }
        break;
      case 'medium':
        // 严格安全检查
        const dangerousCommands = ['rm -rf', 'del /f', 'format', 'shutdown'];
        if (dangerousCommands.some(cmd => scriptName.toLowerCase().includes(cmd))) {
          throw new ValidationError('Script contains dangerous commands', 'code.security');
        }
        break;
      case 'high':
        // 高风险检查（实际应该在沙箱中执行）
        if (!scriptName.endsWith('.js') && !scriptName.endsWith('.py')) {
          throw new ValidationError('High risk scripts must be JavaScript or Python', 'code.security');
        }
        break;
    }
  }

  /**
   * 执行脚本
   * @param config 节点配置
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeScript(config: CodeNodeConfig, timeout: number): Promise<any> {
    // 注意：这里使用eval执行JavaScript代码作为示例
    // 实际生产环境应该使用更安全的执行方式，如子进程执行

    if (config.scriptType === 'javascript' && config.inline) {
      // 执行内联JavaScript代码
      return this.executeJavaScript(config.scriptName, timeout);
    } else {
      // 对于其他脚本类型，返回模拟结果
      // 实际实现应该使用子进程执行脚本
      return {
        stdout: 'Script executed: ' + config.scriptName,
        stderr: '',
        exitCode: 0
      };
    }
  }

  /**
   * 执行JavaScript代码
   * @param code JavaScript代码
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeJavaScript(code: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Script execution timeout after ' + timeout + 'ms'));
      }, timeout);

      try {
        // 解析变量引用
        const resolvedCode = this.resolveVariableReferences(code);

        // 执行代码
        const result = new Function('context', 'with (context) { return (' + resolvedCode + '); }')({});

        clearTimeout(timer);
        resolve({
          stdout: JSON.stringify(result),
          stderr: '',
          exitCode: 0,
          result
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * 解析代码中的变量引用
   * @param code 代码
   * @returns 解析后的代码
   */
  private resolveVariableReferences(code: string): string {
    // 这里可以添加变量引用解析逻辑
    // 例如将 {{variableName}} 替换为实际值
    return code;
  }

  /**
   * 睡眠指定时间
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
