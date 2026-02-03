/**
 * Code节点处理函数
 * 负责执行CODE节点，执行脚本代码，支持多种脚本语言
 */

import type { Node, CodeNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';
import { codeService } from '../../../../core/services/code-service';

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
 * Code节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function codeHandler(thread: Thread, node: Node, context?: any): Promise<any> {
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

  // 根据风险等级选择执行策略
  validateRiskLevel(config.risk, config.scriptName);

  try {
    // 使用脚本服务执行脚本
    const result = await codeService.execute(config.scriptName);

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
    // 记录执行失败历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'FAILED',
      timestamp: now(),
      error: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}