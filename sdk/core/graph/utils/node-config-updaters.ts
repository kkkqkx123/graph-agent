/**
 * 节点配置更新器工具函数
 * 为每种节点类型提供专门的ID映射工具函数
 */

import type { NodeConfigUpdater, IdMapping, Node } from '@modular-agent/types';
import type { ID } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';

/**
 * 映射节点ID
 */
function mapNodeId(originalId: ID, idMapping: IdMapping): ID {
  const index = idMapping.nodeIds.get(originalId);
  if (index === undefined) {
    return originalId;
  }
  return index.toString();
}

/**
 * 映射路径ID
 */
function mapPathId(originalId: ID, idMapping: IdMapping): ID {
  const index = idMapping.edgeIds.get(originalId);
  if (index === undefined) {
    return originalId;
  }
  return index.toString();
}

/**
 * ROUTE节点配置更新器
 * 处理ROUTE节点配置中的targetNodeId和defaultTargetNodeId
 */
const routeNodeConfigUpdater: NodeConfigUpdater = {
  nodeType: NodeType.ROUTE,
  
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
  },
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedRoutes = config.routes?.map((route: any) => ({
      ...route,
      targetNodeId: mapNodeId(route.targetNodeId, idMapping)
    })) || [];
    
    const updatedDefaultTargetNodeId = config.defaultTargetNodeId 
      ? mapNodeId(config.defaultTargetNodeId, idMapping)
      : undefined;
    
    return {
      ...config,
      routes: updatedRoutes,
      defaultTargetNodeId: updatedDefaultTargetNodeId
    };
  }
};

/**
 * FORK节点配置更新器
 * 处理FORK节点配置中的forkPaths.pathId
 */
const forkNodeConfigUpdater: NodeConfigUpdater = {
  nodeType: NodeType.FORK,
  
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
  },
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPaths = config.forkPaths?.map((forkPath: any) => ({
      ...forkPath,
      pathId: mapPathId(forkPath.pathId, idMapping)
    })) || [];
    
    return {
      ...config,
      forkPaths: updatedForkPaths
    };
  }
};

/**
 * JOIN节点配置更新器
 * 处理JOIN节点配置中的forkPathIds和mainPathId
 */
const joinNodeConfigUpdater: NodeConfigUpdater = {
  nodeType: NodeType.JOIN,
  
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
  },
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPathIds = config.forkPathIds?.map((id: ID) => 
      mapPathId(id, idMapping)
    ) || [];
    
    const updatedMainPathId = config.mainPathId 
      ? mapPathId(config.mainPathId, idMapping)
      : undefined;
    
    return {
      ...config,
      forkPathIds: updatedForkPathIds,
      mainPathId: updatedMainPathId
    };
  }
};

/**
 * SUBGRAPH节点配置更新器
 * 处理SUBGRAPH节点配置中的subgraphId
 * 注意：subgraphId引用的是工作流ID，不是节点ID，不需要映射
 */
const subgraphNodeConfigUpdater: NodeConfigUpdater = {
  nodeType: NodeType.SUBGRAPH,
  
  containsIdReferences(config: any): boolean {
    if (!config || !config.subgraphId) {
      return false;
    }
    return true;
  },
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    // SUBGRAPH节点的subgraphId不需要映射，因为它引用的是工作流ID，不是节点ID
    return config;
  }
};

/**
 * 节点配置更新器映射表
 */
const nodeConfigUpdaters: Partial<Record<NodeType, NodeConfigUpdater>> = {
  [NodeType.ROUTE]: routeNodeConfigUpdater,
  [NodeType.FORK]: forkNodeConfigUpdater,
  [NodeType.JOIN]: joinNodeConfigUpdater,
  [NodeType.SUBGRAPH]: subgraphNodeConfigUpdater
};

/**
 * 获取指定节点类型的配置更新器
 * @param nodeType 节点类型
 * @returns 节点配置更新器，如果不存在则返回undefined
 */
export function getNodeConfigUpdater(nodeType: NodeType): NodeConfigUpdater | undefined {
  return nodeConfigUpdaters[nodeType];
}

/**
 * 检查节点配置是否包含ID引用
 * @param node 节点
 * @returns 是否包含ID引用
 */
export function containsIdReferences(node: Node): boolean {
  const updater = getNodeConfigUpdater(node.type);
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
export function updateIdReferences(node: Node, idMapping: IdMapping): Node {
  const updater = getNodeConfigUpdater(node.type);
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
 * 获取所有支持的节点类型
 * @returns 节点类型数组
 */
export function getSupportedNodeTypes(): NodeType[] {
  return Object.keys(nodeConfigUpdaters) as NodeType[];
}

/**
 * 检查是否支持指定节点类型的更新器
 * @param nodeType 节点类型
 * @returns 是否支持
 */
export function isNodeTypeSupported(nodeType: NodeType): boolean {
  return nodeType in nodeConfigUpdaters;
}