/**
 * Code节点处理函数
 * 负责执行CODE节点，执行脚本代码，支持多种脚本语言
 * 
 * 设计原则：
 * - 仅提供纯执行能力，不包含业务决策逻辑
 * - 所有验证、安全检查、状态判断由应用层负责
 * - 记录执行历史供上层使用
 */

import type { Node, CodeNodeConfig } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { now, getErrorMessage } from '@modular-agent/common-utils';
import { SingletonRegistry } from '../../context/singleton-registry';

/**
 * Code节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 * 
 * 注意：
 * - 应用层应负责检查 Thread 状态（RUNNING/PAUSED/COMPLETED）
 * - 应用层应负责实现风险等级策略（通过 middleware 或 interceptor）
 * - 应用层应负责脚本安全验证（白名单、沙箱配置等）
 */
export async function codeHandler(thread: Thread, node: Node, context?: any): Promise<any> {
  const config = node.config as CodeNodeConfig;

  try {
    // 使用脚本服务执行脚本
    const codeService = SingletonRegistry.getCodeService();
    const result = await codeService.execute(config.scriptName);

    // 记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: now(),
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
      error: getErrorMessage(error)
    });

    throw error;
  }
}