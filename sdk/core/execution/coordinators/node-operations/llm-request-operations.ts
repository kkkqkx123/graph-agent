/**
 * LLM请求相关操作
 * 提供LLM节点类型判断和请求数据提取功能。处理对象包括LLM、TOOL、User_INTERACTION节点
 * 
 * 职责：
 * - 判断节点是否需要LLM执行器托管
 * - 从节点配置中提取LLM请求数据
 * - 提供可复用的数据转换函数
 */

import { ExecutionError } from '../../../../types/errors';
import type { Node } from '../../../../types/node';
import { NodeType } from '../../../../types/node';
import type { LLMExecutionRequestData } from '../../llm-executor';
import {
  transformLLMNodeConfig,
  transformToolNodeConfig,
  transformUserInteractionNodeConfig
} from '../../handlers/node-handlers/config-utils';

/**
 * 检查是否为需要LLM执行器托管的节点
 * @param nodeType 节点类型
 * @returns 是否为LLM托管节点
 */
export function isLLMManagedNode(nodeType: NodeType): boolean {
  return [
    NodeType.LLM,
    NodeType.TOOL,
    NodeType.USER_INTERACTION
  ].includes(nodeType);
}

/**
 * 从节点配置中提取LLM请求数据
 * @param node 节点定义
 * @param threadContext 线程上下文
 * @returns LLM请求数据
 * @throws Error 当配置无效或节点类型未知时抛出异常
 */
export function extractLLMRequestData(node: Node, threadContext: any): LLMExecutionRequestData {
  const config = node.config;

  // 根据节点类型提取特定配置（配置已在工作流注册时通过静态验证）
  switch (node.type) {
    case NodeType.LLM: {
      return transformLLMNodeConfig(config as any);
    }

    case NodeType.TOOL: {
      return transformToolNodeConfig(config as any);
    }

    case NodeType.USER_INTERACTION: {
      return transformUserInteractionNodeConfig(config as any);
    }

    default:
      throw new ExecutionError(`Unknown node type: ${node.type}`, node.id);
  }
}