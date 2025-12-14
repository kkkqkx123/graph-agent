import { ID } from '../../common/value-objects/id';
import {
  ValidationRule, 
  ValidationContext, 
  ValidationError, 
  ValidationSeverity, 
  ValidationErrorType,
  ValidationUtils
} from './validation-rules';

/**
 * 图结构验证规则
 */
export class GraphStructureRule implements ValidationRule {
  readonly id = 'graph_structure';
  readonly name = '图结构验证';
  readonly description = '验证图的基本结构完整性';
  readonly type = ValidationErrorType.STRUCTURE;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {};

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { graphData, nodes, edges } = context;

    // 检查图数据是否存在
    if (!graphData) {
      errors.push(
        ValidationUtils.createStructureError('图数据不能为空')
          .withGraphId(context.graphId)
          .build()
      );
      return errors;
    }

    // 检查节点集合是否存在
    if (!nodes) {
      errors.push(
        ValidationUtils.createStructureError('节点集合不能为空')
          .withGraphId(context.graphId)
          .build()
      );
      return errors;
    }

    // 检查边集合是否存在
    if (!edges) {
      errors.push(
        ValidationUtils.createStructureError('边集合不能为空')
          .withGraphId(context.graphId)
          .build()
      );
      return errors;
    }

    // 检查是否有节点
    if (nodes.size === 0) {
      errors.push(
        ValidationUtils.createStructureError('图必须包含至少一个节点')
          .withGraphId(context.graphId)
          .build()
      );
    }

    return errors;
  }
}

/**
 * 节点引用验证规则
 */
export class NodeReferenceRule implements ValidationRule {
  readonly id = 'node_reference';
  readonly name = '节点引用验证';
  readonly description = '验证边引用的节点是否存在';
  readonly type = ValidationErrorType.REFERENCE;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {};

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;

    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      const targetId = edgeData.target;

      // 检查源节点是否存在
      if (!nodes.has(sourceId)) {
        errors.push(
          ValidationUtils.createReferenceError(`边 ${edgeId} 引用的源节点 ${sourceId} 不存在`)
            .withGraphId(context.graphId)
            .withEdgeId(edgeId)
            .withContext({ sourceId, targetId })
            .build()
        );
      }

      // 检查目标节点是否存在
      if (!nodes.has(targetId)) {
        errors.push(
          ValidationUtils.createReferenceError(`边 ${edgeId} 引用的目标节点 ${targetId} 不存在`)
            .withGraphId(context.graphId)
            .withEdgeId(edgeId)
            .withContext({ sourceId, targetId })
            .build()
        );
      }
    }

    return errors;
  }
}

/**
 * 循环依赖验证规则
 */
export class CycleDetectionRule implements ValidationRule {
  readonly id = 'cycle_detection';
  readonly name = '循环依赖检测';
  readonly description = '检测图中是否存在循环依赖';
  readonly type = ValidationErrorType.CYCLE;
  readonly defaultSeverity = ValidationSeverity.WARNING;
  readonly enabled = true;
  readonly config = {
    maxDepth: 100,
    allowSelfCycles: false
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;
    const { allowSelfCycles } = this.config;

    // 构建邻接表
    const adjacencyList = new Map<ID, ID[]>();
    
    // 初始化邻接表
    for (const nodeId of nodes.keys()) {
      adjacencyList.set(nodeId, []);
    }

    // 填充邻接表
    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      const targetId = edgeData.target;
      
      if (adjacencyList.has(sourceId)) {
        adjacencyList.get(sourceId)!.push(targetId);
      }
    }

    // 检测循环
    const visited = new Set<ID>();
    const recursionStack = new Set<ID>();
    const cycles: ID[][] = [];

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        const path: ID[] = [];
        this.detectCycles(
          nodeId,
          adjacencyList,
          visited,
          recursionStack,
          path,
          cycles,
          allowSelfCycles
        );
      }
    }

    // 创建错误报告
    for (const cycle of cycles) {
      const cycleStr = cycle.join(' -> ');
      errors.push(
        ValidationUtils.createCycleError(`检测到循环依赖: ${cycleStr}`)
          .withGraphId(context.graphId)
          .withContext({ cycle })
          .withSuggestions(['考虑重构图结构以消除循环', '使用条件节点打破循环'])
          .build()
      );
    }

    return errors;
  }

  private detectCycles(
    nodeId: ID,
    adjacencyList: Map<ID, ID[]>,
    visited: Set<ID>,
    recursionStack: Set<ID>,
    path: ID[],
    cycles: ID[][],
    allowSelfCycles: boolean
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    
    for (const neighborId of neighbors) {
      // 检查自循环
      if (neighborId === nodeId && !allowSelfCycles) {
        cycles.push([nodeId]);
        continue;
      }

      if (!visited.has(neighborId)) {
        this.detectCycles(
          neighborId,
          adjacencyList,
          visited,
          recursionStack,
          path,
          cycles,
          allowSelfCycles
        );
      } else if (recursionStack.has(neighborId)) {
        // 找到循环
        const cycleStart = path.indexOf(neighborId);
        const cycle = path.slice(cycleStart).concat(neighborId);
        cycles.push(cycle);
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
  }
}

/**
 * 节点类型验证规则
 */
export class NodeTypeRule implements ValidationRule {
  readonly id = 'node_type';
  readonly name = '节点类型验证';
  readonly description = '验证节点类型是否有效';
  readonly type = ValidationErrorType.TYPE;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {
    allowedTypes: ['condition', 'llm', 'tool', 'wait', 'start', 'end']
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes } = context;
    const { allowedTypes } = this.config;

    for (const [nodeId, nodeData] of nodes) {
      const nodeType = nodeData.type;

      if (!nodeType) {
        errors.push(
          ValidationUtils.createTypeError(`节点 ${nodeId} 缺少类型定义`)
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .build()
        );
        continue;
      }

      if (!allowedTypes.includes(nodeType)) {
        errors.push(
          ValidationUtils.createTypeError(`节点 ${nodeId} 的类型 ${nodeType} 无效`)
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ nodeType, allowedTypes })
            .withSuggestions([`使用允许的类型之一: ${allowedTypes.join(', ')}`])
            .build()
        );
      }
    }

    return errors;
  }
}

/**
 * 边类型验证规则
 */
export class EdgeTypeRule implements ValidationRule {
  readonly id = 'edge_type';
  readonly name = '边类型验证';
  readonly description = '验证边类型是否有效';
  readonly type = ValidationErrorType.TYPE;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {
    allowedTypes: ['default', 'conditional', 'flexible_conditional']
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { edges } = context;
    const { allowedTypes } = this.config;

    for (const [edgeId, edgeData] of edges) {
      const edgeType = edgeData.type;

      if (!edgeType) {
        // 边类型是可选的，默认为 'default'
        continue;
      }

      if (!allowedTypes.includes(edgeType)) {
        errors.push(
          ValidationUtils.createTypeError(`边 ${edgeId} 的类型 ${edgeType} 无效`)
            .withGraphId(context.graphId)
            .withEdgeId(edgeId)
            .withContext({ edgeType, allowedTypes })
            .withSuggestions([`使用允许的类型之一: ${allowedTypes.join(', ')}`])
            .build()
        );
      }
    }

    return errors;
  }
}

/**
 * 孤立节点验证规则
 */
export class IsolatedNodeRule implements ValidationRule {
  readonly id = 'isolated_node';
  readonly name = '孤立节点检测';
  readonly description = '检测图中是否存在孤立节点';
  readonly type = ValidationErrorType.STRUCTURE;
  readonly defaultSeverity = ValidationSeverity.WARNING;
  readonly enabled = true;
  readonly config = {
    allowStartEndNodes: true
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;
    const { allowStartEndNodes } = this.config;

    // 计算每个节点的入度和出度
    const inDegree = new Map<ID, number>();
    const outDegree = new Map<ID, number>();

    // 初始化度数
    for (const nodeId of nodes.keys()) {
      inDegree.set(nodeId, 0);
      outDegree.set(nodeId, 0);
    }

    // 计算度数
    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      const targetId = edgeData.target;

      outDegree.set(sourceId, (outDegree.get(sourceId) || 0) + 1);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }

    // 检查孤立节点
    for (const [nodeId, nodeData] of nodes) {
      const nodeInDegree = inDegree.get(nodeId) || 0;
      const nodeOutDegree = outDegree.get(nodeId) || 0;

      // 检查是否为孤立节点（入度和出度都为0）
      if (nodeInDegree === 0 && nodeOutDegree === 0) {
        // 允许开始和结束节点孤立
        if (allowStartEndNodes && (nodeData.type === 'start' || nodeData.type === 'end')) {
          continue;
        }

        errors.push(
          ValidationUtils.createStructureError(`节点 ${nodeId} 是孤立节点，没有连接的边`)
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ inDegree: nodeInDegree, outDegree: nodeOutDegree })
            .withSuggestions(['添加连接到此节点的边', '如果不需要此节点，请删除它'])
            .build()
        );
      }
    }

    return errors;
  }
}

/**
 * 入度出度验证规则
 */
export class DegreeValidationRule implements ValidationRule {
  readonly id = 'degree_validation';
  readonly name = '入度出度验证';
  readonly description = '验证节点的入度和出度是否符合类型要求';
  readonly type = ValidationErrorType.SEMANTIC;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {
    degreeConstraints: {
      start: { maxInDegree: 0, minOutDegree: 1 },
      end: { minInDegree: 1, maxOutDegree: 0 },
      condition: { minInDegree: 1, minOutDegree: 1 },
      llm: { minInDegree: 1, minOutDegree: 1 },
      tool: { minInDegree: 1, minOutDegree: 1 },
      wait: { minInDegree: 1, minOutDegree: 1 }
    }
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;
    const { degreeConstraints } = this.config;

    // 计算每个节点的入度和出度
    const inDegree = new Map<ID, number>();
    const outDegree = new Map<ID, number>();

    // 初始化度数
    for (const nodeId of nodes.keys()) {
      inDegree.set(nodeId, 0);
      outDegree.set(nodeId, 0);
    }

    // 计算度数
    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      const targetId = edgeData.target;

      outDegree.set(sourceId, (outDegree.get(sourceId) || 0) + 1);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }

    // 验证度数约束
    for (const [nodeId, nodeData] of nodes) {
      const nodeType = nodeData.type;
      const nodeInDegree = inDegree.get(nodeId) || 0;
      const nodeOutDegree = outDegree.get(nodeId) || 0;

      const constraints = degreeConstraints[nodeType.toString() as keyof typeof degreeConstraints];
      if (!constraints) {
        continue; // 没有约束的节点类型跳过检查
      }

      // 检查入度约束
      if ('maxInDegree' in constraints && constraints.maxInDegree !== undefined && nodeInDegree > constraints.maxInDegree) {
        errors.push(
          ValidationUtils.createSemanticError(
            `节点 ${nodeId} 的入度 ${nodeInDegree} 超过了最大值 ${constraints.maxInDegree}`
          )
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ nodeType, inDegree: nodeInDegree, maxInDegree: constraints.maxInDegree })
            .build()
        );
      }

      if ('minInDegree' in constraints && constraints.minInDegree !== undefined && nodeInDegree < constraints.minInDegree) {
        errors.push(
          ValidationUtils.createSemanticError(
            `节点 ${nodeId} 的入度 ${nodeInDegree} 小于最小值 ${constraints.minInDegree}`
          )
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ nodeType, inDegree: nodeInDegree, minInDegree: constraints.minInDegree })
            .build()
        );
      }

      // 检查出度约束
      if ('maxOutDegree' in constraints && constraints.maxOutDegree !== undefined && nodeOutDegree > constraints.maxOutDegree) {
        errors.push(
          ValidationUtils.createSemanticError(
            `节点 ${nodeId} 的出度 ${nodeOutDegree} 超过了最大值 ${constraints.maxOutDegree}`
          )
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ nodeType, outDegree: nodeOutDegree, maxOutDegree: constraints.maxOutDegree })
            .build()
        );
      }

      if ('minOutDegree' in constraints && constraints.minOutDegree !== undefined && nodeOutDegree < constraints.minOutDegree) {
        errors.push(
          ValidationUtils.createSemanticError(
            `节点 ${nodeId} 的出度 ${nodeOutDegree} 小于最小值 ${constraints.minOutDegree}`
          )
            .withGraphId(context.graphId)
            .withNodeId(nodeId)
            .withContext({ nodeType, outDegree: nodeOutDegree, minOutDegree: constraints.minOutDegree })
            .build()
        );
      }
    }

    return errors;
  }
}

/**
 * 配置完整性验证规则
 */
export class ConfigurationCompletenessRule implements ValidationRule {
  readonly id = 'configuration_completeness';
  readonly name = '配置完整性验证';
  readonly description = '验证节点和边的配置是否完整';
  readonly type = ValidationErrorType.CONFIGURATION;
  readonly defaultSeverity = ValidationSeverity.ERROR;
  readonly enabled = true;
  readonly config = {
    requiredNodeFields: {
      condition: ['condition'],
      llm: ['model', 'prompt'],
      tool: ['tool_name'],
      wait: ['wait_time']
    },
    requiredEdgeFields: {
      conditional: ['condition'],
      flexible_conditional: ['condition']
    }
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;
    const { requiredNodeFields, requiredEdgeFields } = this.config;

    // 验证节点配置
    for (const [nodeId, nodeData] of nodes) {
      const nodeType = nodeData.type;
      const requiredFields = requiredNodeFields[nodeType.toString() as keyof typeof requiredNodeFields];

      if (!requiredFields) {
        continue; // 没有必需字段的节点类型跳过检查
      }

      for (const field of requiredFields) {
        if (!(field in nodeData) || nodeData[field] === undefined || nodeData[field] === null) {
          errors.push(
            ValidationUtils.createConfigurationError(
              `节点 ${nodeId} 缺少必需的配置字段: ${field}`
            )
              .withGraphId(context.graphId)
              .withNodeId(nodeId)
              .withContext({ nodeType, field })
              .build()
          );
        }
      }
    }

    // 验证边配置
    for (const [edgeId, edgeData] of edges) {
      const edgeType = edgeData.type;
      const requiredFields = requiredEdgeFields[edgeType.toString() as keyof typeof requiredEdgeFields];

      if (!requiredFields) {
        continue; // 没有必需字段的边类型跳过检查
      }

      for (const field of requiredFields) {
        if (!(field in edgeData) || edgeData[field] === undefined || edgeData[field] === null) {
          errors.push(
            ValidationUtils.createConfigurationError(
              `边 ${edgeId} 缺少必需的配置字段: ${field}`
            )
              .withGraphId(context.graphId)
              .withEdgeId(edgeId)
              .withContext({ edgeType, field })
              .build()
          );
        }
      }
    }

    return errors;
  }
}

/**
 * 性能验证规则
 */
export class PerformanceRule implements ValidationRule {
  readonly id = 'performance';
  readonly name = '性能验证';
  readonly description = '验证图的性能特征';
  readonly type = ValidationErrorType.PERFORMANCE;
  readonly defaultSeverity = ValidationSeverity.WARNING;
  readonly enabled = true;
  readonly config = {
    maxNodes: 1000,
    maxEdges: 5000,
    maxDepth: 50,
    maxBranchingFactor: 10
  };

  validate(context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges } = context;
    const { maxNodes, maxEdges, maxDepth, maxBranchingFactor } = this.config;

    // 检查节点数量
    if (nodes.size > maxNodes) {
      errors.push(
        ValidationUtils.createPerformanceIssue(
          `节点数量 ${nodes.size} 超过了建议的最大值 ${maxNodes}`
        )
          .withGraphId(context.graphId)
          .withContext({ nodeCount: nodes.size, maxNodes })
          .withSuggestions(['考虑拆分图为多个子图', '优化图结构减少节点数量'])
          .build()
      );
    }

    // 检查边数量
    if (edges.size > maxEdges) {
      errors.push(
        ValidationUtils.createPerformanceIssue(
          `边数量 ${edges.size} 超过了建议的最大值 ${maxEdges}`
        )
          .withGraphId(context.graphId)
          .withContext({ edgeCount: edges.size, maxEdges })
          .withSuggestions(['考虑简化图结构', '移除不必要的边'])
          .build()
      );
    }

    // 检查图深度
    const depth = this.calculateGraphDepth(nodes, edges);
    if (depth > maxDepth) {
      errors.push(
        ValidationUtils.createPerformanceIssue(
          `图深度 ${depth} 超过了建议的最大值 ${maxDepth}`
        )
          .withGraphId(context.graphId)
          .withContext({ depth, maxDepth })
          .withSuggestions(['考虑重构图结构减少深度', '使用并行处理'])
          .build()
      );
    }

    // 检查分支因子
    const maxBranching = this.calculateMaxBranchingFactor(nodes, edges);
    if (maxBranching > maxBranchingFactor) {
      errors.push(
        ValidationUtils.createPerformanceIssue(
          `最大分支因子 ${maxBranching} 超过了建议的最大值 ${maxBranchingFactor}`
        )
          .withGraphId(context.graphId)
          .withContext({ maxBranching, maxBranchingFactor })
          .withSuggestions(['考虑使用条件节点减少分支', '优化图结构'])
          .build()
      );
    }

    return errors;
  }

  private calculateGraphDepth(
    nodes: Map<ID, any>,
    edges: Map<ID, any>
  ): number {
    // 构建邻接表
    const adjacencyList = new Map<ID, ID[]>();
    
    // 初始化邻接表
    for (const nodeId of nodes.keys()) {
      adjacencyList.set(nodeId, []);
    }

    // 填充邻接表
    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      const targetId = edgeData.target;
      
      if (adjacencyList.has(sourceId)) {
        adjacencyList.get(sourceId)!.push(targetId);
      }
    }

    // 找到所有起始节点（入度为0的节点）
    const inDegree = new Map<ID, number>();
    for (const nodeId of nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const [edgeId, edgeData] of edges) {
      const targetId = edgeData.target;
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }

    const startNodes = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([nodeId, _]) => nodeId);

    if (startNodes.length === 0) {
      // 没有起始节点，可能是循环图，返回节点数量作为深度上限
      return nodes.size;
    }

    // BFS计算最大深度
    let maxDepth = 0;
    const visited = new Set<ID>();
    const queue: Array<{ nodeId: ID; depth: number }> = startNodes.map(nodeId => ({ nodeId, depth: 1 }));

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ nodeId: neighborId, depth: depth + 1 });
        }
      }
    }

    return maxDepth;
  }

  private calculateMaxBranchingFactor(
    nodes: Map<ID, any>,
    edges: Map<ID, any>
  ): number {
    // 计算每个节点的出度
    const outDegree = new Map<ID, number>();
    
    for (const nodeId of nodes.keys()) {
      outDegree.set(nodeId, 0);
    }

    for (const [edgeId, edgeData] of edges) {
      const sourceId = edgeData.source;
      outDegree.set(sourceId, (outDegree.get(sourceId) || 0) + 1);
    }

    // 返回最大出度
    let maxBranching = 0;
    for (const degree of outDegree.values()) {
      maxBranching = Math.max(maxBranching, degree);
    }

    return maxBranching;
  }
}

/**
 * 获取所有预定义验证规则
 */
export function getPredefinedValidationRules(): ValidationRule[] {
  return [
    new GraphStructureRule(),
    new NodeReferenceRule(),
    new CycleDetectionRule(),
    new NodeTypeRule(),
    new EdgeTypeRule(),
    new IsolatedNodeRule(),
    new DegreeValidationRule(),
    new ConfigurationCompletenessRule(),
    new PerformanceRule()
  ];
}

/**
 * 根据类型获取预定义验证规则
 */
export function getPredefinedValidationRulesByType(type: ValidationErrorType): ValidationRule[] {
  const allRules = getPredefinedValidationRules();
  return allRules.filter(rule => rule.type === type);
}

/**
 * 根据严重程度获取预定义验证规则
 */
export function getPredefinedValidationRulesBySeverity(severity: ValidationSeverity): ValidationRule[] {
  const allRules = getPredefinedValidationRules();
  return allRules.filter(rule => rule.defaultSeverity === severity);
}