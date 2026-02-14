/**
 * 具体节点配置更新器实现
 * 为每种节点类型提供专门的ID映射工具函数
 */

import type { NodeConfigUpdater, IdMapping } from '@modular-agent/types';
import type { ID } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { nodeConfigUpdaterRegistry } from './node-config-updater-registry';

/**
 * ROUTE节点配置更新器
 * 处理ROUTE节点配置中的targetNodeId和defaultTargetNodeId
 */
class RouteNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.ROUTE;
  
  /**
   * 检查配置是否包含ID引用
   */
  containsIdReferences(config: any): boolean {
    if (!config || !config.routes) {
      return false;
    }
    
    // 检查routes中的targetNodeId
    for (const route of config.routes) {
      if (route.targetNodeId) {
        return true;
      }
    }
    
    // 检查defaultTargetNodeId
    if (config.defaultTargetNodeId) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 更新配置中的ID引用
   */
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedRoutes = config.routes?.map((route: any) => ({
      ...route,
      targetNodeId: this.mapNodeId(route.targetNodeId, idMapping)
    })) || [];
    
    const updatedDefaultTargetNodeId = config.defaultTargetNodeId 
      ? this.mapNodeId(config.defaultTargetNodeId, idMapping)
      : undefined;
    
    return {
      ...config,
      routes: updatedRoutes,
      defaultTargetNodeId: updatedDefaultTargetNodeId
    };
  }
  
  /**
   * 映射节点ID
   */
  private mapNodeId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.nodeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

/**
 * FORK节点配置更新器
 * 处理FORK节点配置中的forkPaths.pathId
 */
class ForkNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.FORK;
  
  containsIdReferences(config: any): boolean {
    if (!config || !config.forkPaths) {
      return false;
    }
    
    for (const forkPath of config.forkPaths) {
      if (forkPath.pathId) {
        return true;
      }
    }
    
    return false;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPaths = config.forkPaths?.map((forkPath: any) => ({
      ...forkPath,
      pathId: this.mapPathId(forkPath.pathId, idMapping)
    })) || [];
    
    return {
      ...config,
      forkPaths: updatedForkPaths
    };
  }
  
  private mapPathId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.edgeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

/**
 * JOIN节点配置更新器
 * 处理JOIN节点配置中的forkPathIds和mainPathId
 */
class JoinNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.JOIN;
  
  containsIdReferences(config: any): boolean {
    if (!config) {
      return false;
    }
    
    if (config.forkPathIds && config.forkPathIds.length > 0) {
      return true;
    }
    
    if (config.mainPathId) {
      return true;
    }
    
    return false;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPathIds = config.forkPathIds?.map((id: ID) => 
      this.mapPathId(id, idMapping)
    ) || [];
    
    const updatedMainPathId = config.mainPathId 
      ? this.mapPathId(config.mainPathId, idMapping)
      : undefined;
    
    return {
      ...config,
      forkPathIds: updatedForkPathIds,
      mainPathId: updatedMainPathId
    };
  }
  
  private mapPathId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.edgeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

/**
 * SUBGRAPH节点配置更新器
 * 处理SUBGRAPH节点配置中的subgraphId
 * 注意：subgraphId引用的是工作流ID，不是节点ID，不需要映射
 */
class SubgraphNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.SUBGRAPH;
  
  containsIdReferences(config: any): boolean {
    if (!config || !config.subgraphId) {
      return false;
    }
    return true;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    // SUBGRAPH节点的subgraphId不需要映射，因为它引用的是工作流ID，不是节点ID
    return config;
  }
}

/**
 * 注册所有节点配置更新器
 */
export function registerNodeConfigUpdaters(): void {
  nodeConfigUpdaterRegistry.register(new RouteNodeConfigUpdater());
  nodeConfigUpdaterRegistry.register(new ForkNodeConfigUpdater());
  nodeConfigUpdaterRegistry.register(new JoinNodeConfigUpdater());
  nodeConfigUpdaterRegistry.register(new SubgraphNodeConfigUpdater());
}

// 自动注册所有更新器
registerNodeConfigUpdaters();