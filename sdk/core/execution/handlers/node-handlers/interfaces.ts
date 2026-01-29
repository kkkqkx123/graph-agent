/**
 * 节点处理器接口定义
 * 定义节点处理器的统一接口规范
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';

/**
 * 节点处理函数类型
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export type NodeHandler = (thread: Thread, node: Node) => Promise<any>;

/**
 * 节点处理器接口规范
 * 所有节点处理器应遵循以下规范：
 * 1. 验证节点配置（validate函数）
 * 2. 检查执行条件（canExecute函数）
 * 3. 执行节点逻辑（handler函数）
 * 4. 返回标准化的执行结果
 */
export interface NodeHandlerSpec {
  /** 处理器名称 */
  name: string;
  /** 支持的节点类型 */
  nodeType: string;
  /** 处理器函数 */
  handler: NodeHandler;
  /** 验证函数（可选） */
  validate?: (node: Node) => void;
  /** 执行条件检查函数（可选） */
  canExecute?: (thread: Thread, node: Node) => boolean;
}

/**
 * 节点执行结果接口
 */
export interface NodeExecutionResultSpec {
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 执行步骤 */
  step: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 执行数据（可选） */
  data?: any;
  /** 错误信息（可选） */
  error?: any;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 节点处理器映射接口
 *
 * 注意：节点类型是固定的（NodeType枚举），不需要注册机制
 * - 节点类型在编译时确定，由NodeType枚举定义
 * - 处理器在模块加载时静态映射
 * - 不支持运行时扩展新的节点类型
 *
 * 与Hook/Trigger的区别：
 * - Node: 节点类型固定，不需要注册机制
 * - Hook: Hook名称可扩展，需要注册机制
 * - Trigger: 动作类型可扩展，需要注册机制
 */
export interface NodeHandlerMap {
  /** 获取处理器 */
  get(nodeType: string): NodeHandler;
  /** 检查处理器是否存在 */
  has(nodeType: string): boolean;
  /** 获取所有处理器 */
  getAll(): Record<string, NodeHandler>;
}