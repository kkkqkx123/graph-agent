/**
 * 节点配置更新器注册表
 * 集中管理所有节点类型的ID更新逻辑
 */

import type { NodeConfigUpdater, IdMapping } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { NodeType } from '@modular-agent/types';

/**
 * 节点配置更新器注册表类
 * 负责注册和管理所有节点类型的配置更新器
 */
export class NodeConfigUpdaterRegistry {
  private updaters: Map<NodeType, NodeConfigUpdater> = new Map();
  
  /**
   * 注册节点配置更新器
   * @param updater 节点配置更新器
   */
  register(updater: NodeConfigUpdater): void {
    this.updaters.set(updater.nodeType, updater);
  }
  
  /**
   * 获取节点配置更新器
   * @param nodeType 节点类型
   * @returns 节点配置更新器，如果不存在则返回undefined
   */
  get(nodeType: NodeType): NodeConfigUpdater | undefined {
    return this.updaters.get(nodeType);
  }
  
  /**
   * 检查节点配置是否包含ID引用
   * @param node 节点
   * @returns 是否包含ID引用
   */
  containsIdReferences(node: Node): boolean {
    const updater = this.get(node.type);
    if (!updater) {
      return false;
    }
    return updater.containsIdReferences(node.config);
  }
  
  /**
   * 更新节点配置中的ID引用
   * @param node 节点
   * @param idMapping ID映射表
   * @returns 更新后的节点
   */
  updateIdReferences(node: Node, idMapping: IdMapping): Node {
    const updater = this.get(node.type);
    if (!updater) {
      return node;
    }
    
    const updatedConfig = updater.updateIdReferences(node.config, idMapping);
    
    return {
      ...node,
      config: updatedConfig
    };
  }
  
  /**
   * 获取所有已注册的节点类型
   * @returns 节点类型数组
   */
  getRegisteredNodeTypes(): NodeType[] {
    return Array.from(this.updaters.keys());
  }
  
  /**
   * 检查是否已注册指定节点类型的更新器
   * @param nodeType 节点类型
   * @returns 是否已注册
   */
  has(nodeType: NodeType): boolean {
    return this.updaters.has(nodeType);
  }
  
  /**
   * 清空所有已注册的更新器
   */
  clear(): void {
    this.updaters.clear();
  }
}

/**
 * 全局单例实例
 */
export const nodeConfigUpdaterRegistry = new NodeConfigUpdaterRegistry();