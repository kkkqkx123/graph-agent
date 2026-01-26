/**
 * 节点执行器工厂
 * 负责根据节点类型创建对应的执行器
 */

import { NodeExecutor } from './node/base-node-executor';
import { NodeType } from '../../../types/node';

// 导入所有节点执行器
import { StartNodeExecutor } from './node/start-node-executor';
import { EndNodeExecutor } from './node/end-node-executor';
import { VariableNodeExecutor } from './node/variable-node-executor';
import { ForkNodeExecutor } from './node/fork-node-executor';
import { JoinNodeExecutor } from './node/join-node-executor';
import { CodeNodeExecutor } from './node/code-node-executor';
import { LLMNodeExecutor } from './node/llm-node-executor';
import { ToolNodeExecutor } from './node/tool-node-executor';
import { UserInteractionNodeExecutor } from './node/user-interaction-node-executor';
import { RouteNodeExecutor } from './node/route-node-executor';
import { ContextProcessorNodeExecutor } from './node/context-processor-node-executor';
import { LoopStartNodeExecutor } from './node/loop-start-node-executor';
import { LoopEndNodeExecutor } from './node/loop-end-node-executor';
import { SubgraphNodeExecutor } from './node/subgraph-node-executor';

/**
 * 节点执行器工厂
 */
export class NodeExecutorFactory {
  private static executorMap: Map<NodeType, new () => NodeExecutor> = new Map();

  /**
   * 初始化执行器映射
   */
  private static initializeExecutorMap(): void {
    // 注册所有节点执行器
    this.executorMap.set(NodeType.START, StartNodeExecutor);
    this.executorMap.set(NodeType.END, EndNodeExecutor);
    this.executorMap.set(NodeType.VARIABLE, VariableNodeExecutor);
    this.executorMap.set(NodeType.FORK, ForkNodeExecutor);
    this.executorMap.set(NodeType.JOIN, JoinNodeExecutor);
    this.executorMap.set(NodeType.CODE, CodeNodeExecutor);
    this.executorMap.set(NodeType.LLM, LLMNodeExecutor);
    this.executorMap.set(NodeType.TOOL, ToolNodeExecutor);
    this.executorMap.set(NodeType.USER_INTERACTION, UserInteractionNodeExecutor);
    this.executorMap.set(NodeType.ROUTE, RouteNodeExecutor);
    this.executorMap.set(NodeType.CONTEXT_PROCESSOR, ContextProcessorNodeExecutor);
    this.executorMap.set(NodeType.LOOP_START, LoopStartNodeExecutor);
    this.executorMap.set(NodeType.LOOP_END, LoopEndNodeExecutor);
    this.executorMap.set(NodeType.SUBGRAPH, SubgraphNodeExecutor);
  }

  /**
   * 创建节点执行器
   * @param nodeType 节点类型
   * @returns 节点执行器实例
   */
  static createExecutor(nodeType: NodeType): NodeExecutor {
    // 确保映射已初始化
    if (this.executorMap.size === 0) {
      this.initializeExecutorMap();
    }

    const ExecutorClass = this.executorMap.get(nodeType);
    if (!ExecutorClass) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }

    return new ExecutorClass();
  }

  /**
   * 注册自定义节点执行器
   * @param nodeType 节点类型
   * @param ExecutorClass 执行器类
   */
  static registerExecutor(
    nodeType: NodeType,
    ExecutorClass: new () => NodeExecutor
  ): void {
    this.executorMap.set(nodeType, ExecutorClass);
  }

  /**
   * 检查是否支持该节点类型
   * @param nodeType 节点类型
   * @returns 是否支持
   */
  static isSupported(nodeType: NodeType): boolean {
    return this.executorMap.has(nodeType);
  }
}