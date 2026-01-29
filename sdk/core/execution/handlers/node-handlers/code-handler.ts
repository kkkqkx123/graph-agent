/**
 * Code节点处理函数
 * 负责执行CODE节点，执行脚本代码，支持多种脚本语言
 */

import type { Node, CodeNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }
  return true;
}

/**
 * 验证风险等级
 */
function validateRiskLevel(risk: string, scriptName: string): void {
  switch (risk) {
    case 'none':
      break;
    case 'low':
      if (scriptName.includes('..') || scriptName.includes('~')) {
        throw new ValidationError('Script path contains invalid characters', 'code.security');
      }
      break;
    case 'medium':
      const dangerousCommands = ['rm -rf', 'del /f', 'format', 'shutdown'];
      if (dangerousCommands.some(cmd => scriptName.toLowerCase().includes(cmd))) {
        throw new ValidationError('Script contains dangerous commands', 'code.security');
      }
      break;
    case 'high':
      // 高风险允许所有操作，但记录警告
      console.warn(`Executing high-risk script: ${scriptName}`);
      break;
  }
}

/**
 * 执行脚本代码
 */
async function executeScript(config: CodeNodeConfig, timeout: number): Promise<any> {
  // 注意：这里使用模拟的脚本执行
  // 实际实现应该使用相应的脚本执行器

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Script execution timeout after ${timeout}ms`));
    }, timeout);

    try {
      // 模拟脚本执行延迟
      setTimeout(() => {
        clearTimeout(timer);

        // 模拟脚本执行结果
        resolve({
          success: true,
          scriptName: config.scriptName,
          scriptType: config.scriptType,
          output: `Mock output for ${config.scriptName}`,
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
 * 睡眠指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Code节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function codeHandler(thread: Thread, node: Node): Promise<any> {
  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };
  }

  const config = node.config as CodeNodeConfig;
  const timeout = config.timeout || 30000;
  const retries = config.retries || 0;
  const retryDelay = config.retryDelay || 1000;

  // 根据风险等级选择执行策略
  validateRiskLevel(config.risk, config.scriptName);

  // 执行脚本代码（带重试）
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const result = await executeScript(config, timeout);

      // 记录执行历史
      thread.nodeResults.push({
        step: thread.nodeResults.length + 1,
        nodeId: node.id,
        nodeType: node.type,
        status: 'COMPLETED',
        timestamp: now(),
        data: result
      });

      // 返回执行结果
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await sleep(retryDelay);
        attempt++;
      } else {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Script execution failed');
}