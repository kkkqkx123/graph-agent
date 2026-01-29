/**
 * 图验证器
 * 提供图的各种验证功能
 * 支持子工作流验证
 * 使用图分析工具函数进行分析
 */

import type {
  ID,
  NodeType,
  GraphValidationOptions,
  GraphAnalysisResult,
} from '../../types';
import { ValidationError } from '../../types';
import type { ValidationResult } from '../../types';
import { GraphData } from '../entities/graph-data';
import { analyzeGraph } from '../graph/utils/graph-analyzer';
import { detectCycles } from '../graph/utils/graph-cycle-detector';
import { analyzeReachability } from '../graph/utils/graph-reachability-analyzer';
import { getReachableNodes } from '../graph/utils/graph-traversal';

/**
 * 图验证器类
 */
export class GraphValidator {
  /**
   * 验证图结构
   */
  static validate(
    graph: GraphData,
    options: GraphValidationOptions = {}
  ): ValidationResult {
    const errorList: ValidationError[] = [];
    const warningList: ValidationError[] = [];

    const opts = {
      checkCycles: true,
      checkReachability: true,
      checkForkJoin: true,
      checkStartEnd: true,
      checkIsolatedNodes: true,
      checkSubgraphExistence: false,
      checkSubgraphCompatibility: false,
      ...options,
    };

    // 检查START/END节点
    if (opts.checkStartEnd) {
      const startEndErrors = this.validateStartEndNodes(graph);
      errorList.push(...startEndErrors);
    }

    // 检查孤立节点
    if (opts.checkIsolatedNodes) {
      const isolatedErrors = this.validateIsolatedNodes(graph);
      errorList.push(...isolatedErrors);
    }

    // 检测环
    if (opts.checkCycles) {
      const cycleResult = detectCycles(graph);
      if (cycleResult.hasCycle) {
        errorList.push(
          new ValidationError('工作流中存在循环依赖', undefined, undefined, {
            code: 'CYCLE_DETECTED',
            cycleNodes: cycleResult.cycleNodes,
            cycleEdges: cycleResult.cycleEdges,
          })
        );
      }
    }

    // 可达性分析
    if (opts.checkReachability) {
      const reachabilityResult = analyzeReachability(graph);

      // 不可达节点
      for (const nodeId of reachabilityResult.unreachableNodes) {
        errorList.push(
          new ValidationError(`节点(${nodeId})从START节点不可达`, undefined, undefined, {
            code: 'UNREACHABLE_NODE',
            nodeId,
          })
        );
      }

      // 死节点
      for (const nodeId of reachabilityResult.deadEndNodes) {
        errorList.push(
          new ValidationError(`节点(${nodeId})无法到达END节点`, undefined, undefined, {
            code: 'DEAD_END_NODE',
            nodeId,
          })
        );
      }
    }

    // FORK/JOIN配对验证
    if (opts.checkForkJoin) {
      const forkJoinErrors = this.validateForkJoinPairs(graph);
      errorList.push(...forkJoinErrors);
    }

    // 检查子工作流存在性
    if (opts.checkSubgraphExistence) {
      const subgraphErrors = this.validateSubgraphExistence(graph);
      errorList.push(...subgraphErrors);
    }

    // 检查子工作流接口兼容性
    if (opts.checkSubgraphCompatibility) {
      const compatibilityErrors = this.validateSubgraphCompatibility(graph);
      errorList.push(...compatibilityErrors);
    }

    return {
      valid: errorList.length === 0,
      errors: errorList,
      warnings: warningList,
    };
  }

  /**
   * 验证START和END节点
   */
  private static validateStartEndNodes(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    // 检查START节点
    if (!graph.startNodeId) {
      errors.push(
        new ValidationError('工作流必须包含一个START节点', undefined, undefined, {
          code: 'MISSING_START_NODE',
        })
      );
    } else {
      // 检查START节点的入度
      const incomingEdges = graph.getIncomingEdges(graph.startNodeId);
      if (incomingEdges.length > 0) {
        errors.push(
          new ValidationError('START节点不能有入边', undefined, undefined, {
            code: 'START_NODE_HAS_INCOMING_EDGES',
            nodeId: graph.startNodeId,
          })
        );
      }
    }

    // 检查END节点
    if (graph.endNodeIds.size === 0) {
      errors.push(
        new ValidationError('工作流必须包含至少一个END节点', undefined, undefined, {
          code: 'MISSING_END_NODE',
        })
      );
    } else {
      // 检查END节点的出度
      for (const endNodeId of graph.endNodeIds) {
        const outgoingEdges = graph.getOutgoingEdges(endNodeId);
        if (outgoingEdges.length > 0) {
          errors.push(
            new ValidationError(`END节点(${endNodeId})不能有出边`, undefined, undefined, {
              code: 'END_NODE_HAS_OUTGOING_EDGES',
              nodeId: endNodeId,
            })
          );
        }
      }
    }

    // 检查START节点是否唯一
    let startNodeCount = 0;
    for (const node of graph.nodes.values()) {
      if (node.type === 'START' as NodeType) {
        startNodeCount++;
      }
    }
    if (startNodeCount > 1) {
      errors.push(
        new ValidationError('工作流只能包含一个START节点', undefined, undefined, {
          code: 'MULTIPLE_START_NODES',
        })
      );
    }

    return errors;
  }

  /**
   * 验证孤立节点
   */
  private static validateIsolatedNodes(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.id);
      const outgoingEdges = graph.getOutgoingEdges(node.id);

      // START和END节点不算孤立节点
      if (node.type === 'START' as NodeType || node.type === 'END' as NodeType) {
        continue;
      }

      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        errors.push(
          new ValidationError(`节点(${node.id})是孤立节点，既没有入边也没有出边`, undefined, undefined, {
            code: 'ISOLATED_NODE',
            nodeId: node.id,
          })
        );
      }
    }

    return errors;
  }

  /**
   * FORK/JOIN配对验证
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateForkJoinPairs(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];
    const forkNodes = new Map<ID, ID>(); // forkId -> nodeId
    const joinNodes = new Map<ID, ID>(); // joinId -> nodeId
    const pairs = new Map<ID, ID>();

    // 收集所有FORK和JOIN节点
    for (const node of graph.nodes.values()) {
      if (node.type === 'FORK' as NodeType) {
        const forkId = (node.originalNode?.config as any)?.forkId;
        if (forkId) {
          forkNodes.set(forkId, node.id);
        }
      } else if (node.type === 'JOIN' as NodeType) {
        const joinId = (node.originalNode?.config as any)?.joinId;
        if (joinId) {
          joinNodes.set(joinId, node.id);
        }
      }
    }

    // 检查配对
    const unpairedForks: ID[] = [];
    const unpairedJoins: ID[] = [];

    for (const [forkId, forkNodeId] of forkNodes) {
      if (joinNodes.has(forkId)) {
        pairs.set(forkNodeId, joinNodes.get(forkId)!);
      } else {
        unpairedForks.push(forkNodeId);
      }
    }

    for (const [joinId, joinNodeId] of joinNodes) {
      if (!forkNodes.has(joinId)) {
        unpairedJoins.push(joinNodeId);
      }
    }

    // 报告未配对的FORK节点
    for (const forkNodeId of unpairedForks) {
      errors.push(
        new ValidationError(`FORK节点(${forkNodeId})没有配对的JOIN节点`, undefined, undefined, {
          code: 'UNPAIRED_FORK',
          nodeId: forkNodeId,
        })
      );
    }

    // 报告未配对的JOIN节点
    for (const joinNodeId of unpairedJoins) {
      errors.push(
        new ValidationError(`JOIN节点(${joinNodeId})没有配对的FORK节点`, undefined, undefined, {
          code: 'UNPAIRED_JOIN',
          nodeId: joinNodeId,
        })
      );
    }

    // 检查FORK到JOIN的可达性
    for (const [forkNodeId, joinNodeId] of pairs) {
      const reachableNodes = getReachableNodes(graph, forkNodeId);
      if (!reachableNodes.has(joinNodeId)) {
        errors.push(
          new ValidationError(
            `FORK节点(${forkNodeId})无法到达配对的JOIN节点(${joinNodeId})`,
            undefined,
            undefined,
            {
              code: 'FORK_JOIN_NOT_REACHABLE',
              nodeId: forkNodeId,
              relatedNodeId: joinNodeId,
            }
          )
        );
      }
    }

    return errors;
  }

  /**
   * 完整的图分析
   */
  static analyze(graph: GraphData): GraphAnalysisResult {
    return analyzeGraph(graph);
  }

  /**
   * 验证子工作流存在性
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateSubgraphExistence(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of graph.nodes.values()) {
      if (node.type === 'SUBGRAPH' as NodeType) {
        const subgraphConfig = node.originalNode?.config as any;
        if (!subgraphConfig || !subgraphConfig.subgraphId) {
          errors.push(
            new ValidationError(
              `SUBGRAPH节点(${node.id})缺少subgraphId配置`,
              undefined,
              undefined,
              {
                code: 'MISSING_SUBGRAPH_ID',
                nodeId: node.id,
              }
            )
          );
        }
      }
    }

    return errors;
  }

  /**
   * 验证子工作流接口兼容性
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateSubgraphCompatibility(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of graph.nodes.values()) {
      if (node.type === 'SUBGRAPH' as NodeType) {
        const subgraphConfig = node.originalNode?.config as any;

        // 检查输入映射
        if (subgraphConfig.inputMapping) {
          for (const [parentVar, subgraphInput] of Object.entries(subgraphConfig.inputMapping)) {
            if (!parentVar || !subgraphInput) {
              errors.push(
                new ValidationError(
                  `SUBGRAPH节点(${node.id})的输入映射无效: ${parentVar} -> ${subgraphInput}`,
                  undefined,
                  undefined,
                  {
                    code: 'INVALID_INPUT_MAPPING',
                    nodeId: node.id,
                  }
                )
              );
            }
          }
        }

        // 检查输出映射
        if (subgraphConfig.outputMapping) {
          for (const [subgraphOutput, parentVar] of Object.entries(subgraphConfig.outputMapping)) {
            if (!subgraphOutput || !parentVar) {
              errors.push(
                new ValidationError(
                  `SUBGRAPH节点(${node.id})的输出映射无效: ${subgraphOutput} -> ${parentVar}`,
                  undefined,
                  undefined,
                  {
                    code: 'INVALID_OUTPUT_MAPPING',
                    nodeId: node.id,
                  }
                )
              );
            }
          }
        }
      }
    }

    return errors;
  }
}