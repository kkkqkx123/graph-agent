/**
 * 图结构验证器
 *
 * 职责范围：
 * - 验证图的拓扑结构和逻辑正确性
 * - 验证START/END节点的入出度约束（数量和存在性已在WorkflowValidator中验证）
 * - 检测循环依赖（环检测）
 * - 分析节点可达性（从START到END的路径）
 * - 验证FORK/JOIN节点的配对关系和业务逻辑
 * - 验证触发子工作流的特殊约束（节点组合已在WorkflowValidator中验证）
 * - 验证子工作流存在性和接口兼容性
 *
 * 与 WorkflowValidator 的区别：
 * - GraphValidator 在图预处理阶段验证，输入是 GraphData
 * - WorkflowValidator 在工作流注册阶段验证，输入是 WorkflowDefinition
 * - GraphValidator 验证需要图结构才能确定的规则（预处理阶段验证）
 * - WorkflowValidator 验证所有可以在定义阶段就确定的规则（注册前验证）
 *
 * 验证时机：
 * - 在 GraphBuilder 构建图之后调用
 * - 在子工作流递归处理时调用
 * - 在工作流预处理流程中调用
 *
 * 前置条件：
 * - 输入的图数据已经通过 WorkflowValidator 的基本验证
 * - 节点和边的基本数据完整性已得到保证
 * - 边引用的节点存在性已验证
 * - START/END节点的数量和存在性已验证
 * - 触发子工作流的节点组合已验证
 *
 * 不包含：
 * - 基本数据完整性验证（由WorkflowValidator处理）
 * - 节点配置的schema验证（由WorkflowValidator处理）
 * - ID唯一性验证（由WorkflowValidator处理）
 * - 边引用节点存在性验证（由WorkflowValidator处理）
 * - START/END节点数量和存在性验证（由WorkflowValidator处理）
 * - 触发子工作流节点组合验证（由WorkflowValidator处理）
 */

import type {
  ID,
  NodeType,
  GraphValidationOptions,
  GraphAnalysisResult,
} from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';
import { GraphData } from '../entities/graph-data';
import { SUBGRAPH_METADATA_KEYS } from '@modular-agent/types/subgraph';
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
  ): Result<GraphData, ConfigurationValidationError[]> {
    const errorList: ConfigurationValidationError[] = [];

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

    // 检查是否为触发子工作流
    const isTriggeredSubgraph = this.isTriggeredSubgraph(graph);

    // 检查START/END节点
    if (opts.checkStartEnd) {
      const startEndErrors = isTriggeredSubgraph
        ? this.validateTriggeredSubgraphNodes(graph)
        : this.validateStartEndNodes(graph);
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
          new ConfigurationValidationError('工作流中存在循环依赖', {
            configType: 'workflow',
            context: {
              code: 'CYCLE_DETECTED',
              cycleNodes: cycleResult.cycleNodes,
              cycleEdges: cycleResult.cycleEdges,
            }
          })
        );
      }
    }

    // 可达性分析
    if (opts.checkReachability) {
      if (isTriggeredSubgraph) {
        // 触发子工作流只验证内部连通性
        const connectivityErrors = this.validateTriggeredSubgraphConnectivity(graph);
        errorList.push(...connectivityErrors);
      } else {
        // 普通工作流验证从START到END的可达性
        const reachabilityResult = analyzeReachability(graph);

        // 不可达节点
        for (const nodeId of reachabilityResult.unreachableNodes) {
          errorList.push(
            new ConfigurationValidationError(`节点(${nodeId})从START节点不可达`, {
              configType: 'workflow',
              context: {
                code: 'UNREACHABLE_NODE',
                nodeId,
              }
            })
          );
        }

        // 死节点
        for (const nodeId of reachabilityResult.deadEndNodes) {
          errorList.push(
            new ConfigurationValidationError(`节点(${nodeId})无法到达END节点`, {
              configType: 'workflow',
              context: {
                code: 'DEAD_END_NODE',
                nodeId,
              }
            })
          );
        }
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

    if (errorList.length === 0) {
      return ok(graph);
    }
    return err(errorList);
  }

  /**
   * 验证START和END节点的入出度约束
   *
   * 注意：START/END节点的数量和存在性已在 WorkflowValidator 中验证
   * 此方法仅验证拓扑约束：
   * - START节点不能有入边
   * - END节点不能有出边
   * - START节点唯一性（排除子工作流边界节点）
   */
  private static validateStartEndNodes(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    // 检查START节点
    if (!graph.startNodeId) {
      errors.push(
        new ConfigurationValidationError('工作流必须包含一个START节点', {
          configType: 'workflow',
          context: {
            code: 'MISSING_START_NODE',
          }
        })
      );
    } else {
      // 检查START节点的入度
      const incomingEdges = graph.getIncomingEdges(graph.startNodeId);
      if (incomingEdges.length > 0) {
        errors.push(
          new ConfigurationValidationError('START节点不能有入边', {
            configType: 'workflow',
            context: {
              code: 'START_NODE_HAS_INCOMING_EDGES',
              nodeId: graph.startNodeId,
            }
          })
        );
      }
    }

    // 检查END节点
    if (graph.endNodeIds.size === 0) {
      errors.push(
        new ConfigurationValidationError('工作流必须包含至少一个END节点', {
          configType: 'workflow',
          context: {
            code: 'MISSING_END_NODE',
          }
        })
      );
    } else {
      // 检查END节点的出度
      for (const endNodeId of graph.endNodeIds) {
        const outgoingEdges = graph.getOutgoingEdges(endNodeId);
        if (outgoingEdges.length > 0) {
          errors.push(
            new ConfigurationValidationError(`END节点(${endNodeId})不能有出边`, {
              configType: 'workflow',
              context: {
                code: 'END_NODE_HAS_OUTGOING_EDGES',
                nodeId: endNodeId,
              }
            })
          );
        }
      }
    }

    // 检查START节点是否唯一
    // 排除子工作流边界节点（标记为entry的START节点）
    let startNodeCount = 0;
    for (const node of graph.nodes.values()) {
      if (node.type === 'START' as NodeType) {
        // 检查是否是子工作流边界节点
        const isSubgraphBoundary = node.internalMetadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] === 'entry';
        if (!isSubgraphBoundary) {
          startNodeCount++;
        }
      }
    }
    if (startNodeCount > 1) {
      errors.push(
        new ConfigurationValidationError('工作流只能包含一个START节点', {
          configType: 'workflow',
          context: {
            code: 'MULTIPLE_START_NODES',
          }
        })
      );
    }

    return errors;
  }

  /**
   * 验证孤立节点
   */
  private static validateIsolatedNodes(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.id);
      const outgoingEdges = graph.getOutgoingEdges(node.id);

      // START、END、START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER节点不算孤立节点
      if (
        node.type === 'START' as NodeType ||
        node.type === 'END' as NodeType ||
        node.type === 'START_FROM_TRIGGER' as NodeType ||
        node.type === 'CONTINUE_FROM_TRIGGER' as NodeType
      ) {
        continue;
      }

      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        errors.push(
          new ConfigurationValidationError(`节点(${node.id})是孤立节点，既没有入边也没有出边`, {
            configType: 'workflow',
            context: {
              code: 'ISOLATED_NODE',
              nodeId: node.id,
            }
          })
        );
      }
    }

    return errors;
  }

  /**
   * FORK/JOIN配对验证和业务逻辑验证
   *
   * 验证内容包括：
   * - FORK节点的forkPaths配置有效性
   * - JOIN节点的forkPathIds和mainPathId配置有效性
   * - FORK和JOIN节点的配对关系
   * - forkPathIds的全局唯一性
   * - FORK到JOIN的可达性
   *
   * 注意：节点配置的schema验证已在 WorkflowValidator 中完成
   * 此方法专注于验证 FORK/JOIN 的业务逻辑和配对关系
   *
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateForkJoinPairs(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];
    // 使用forkPathIds数组的第一个元素作为配对标识符
    const forkNodes = new Map<ID, { nodeId: ID; forkPathIds: ID[] }>(); // forkPathIds[0] -> {nodeId, forkPathIds}
    const joinNodes = new Map<ID, { nodeId: ID; forkPathIds: ID[]; mainPathId?: ID }>(); // forkPathIds[0] -> {nodeId, forkPathIds, mainPathId}
    const pairs = new Map<ID, ID>();
    const allForkPathIds = new Set<ID>(); // 用于检查forkPathId的全局唯一性

    // 收集所有FORK和JOIN节点
    for (const node of graph.nodes.values()) {
      if (node.type === 'FORK' as NodeType) {
        const config = node.originalNode?.config as any;
        const forkPaths = config?.forkPaths;

        // 验证Fork节点配置
        if (!forkPaths || !Array.isArray(forkPaths) || forkPaths.length === 0) {
          errors.push(
            new ConfigurationValidationError(`FORK节点(${node.id})的forkPaths必须是非空数组`, {
              configType: 'workflow',
              context: {
                code: 'INVALID_FORK_PATHS',
                nodeId: node.id,
              }
            })
          );
          continue;
        }

        // 从forkPaths中提取pathId和childNodeId
        const forkPathIds: ID[] = [];
        const childNodeIds: string[] = [];
        for (const forkPath of forkPaths) {
          if (!forkPath.pathId || !forkPath.childNodeId) {
            errors.push(
              new ConfigurationValidationError(`FORK节点(${node.id})的forkPaths中的每个元素必须包含pathId和childNodeId`, {
                configType: 'workflow',
                context: {
                  code: 'INVALID_FORK_PATH_ITEM',
                  nodeId: node.id,
                }
              })
            );
            continue;
          }
          forkPathIds.push(forkPath.pathId);
          childNodeIds.push(forkPath.childNodeId);
        }

        // 检查pathId在工作流定义内部是否唯一
        for (const forkPathId of forkPathIds) {
          if (allForkPathIds.has(forkPathId)) {
            errors.push(
              new ConfigurationValidationError(`FORK节点(${node.id})的pathId(${forkPathId})在工作流定义内部不唯一`, {
                configType: 'workflow',
                context: {
                  code: 'DUPLICATE_FORK_PATH_ID',
                  nodeId: node.id,
                  forkPathId,
                }
              })
            );
          } else {
            allForkPathIds.add(forkPathId);
          }
        }

        // 使用forkPaths的第一个元素的pathId作为配对标识符
        if (forkPathIds.length === 0) {
          continue;
        }
        const pairId = forkPathIds[0]!;
        if (forkNodes.has(pairId)) {
          errors.push(
            new ConfigurationValidationError(`FORK节点(${node.id})的forkPaths第一个元素的pathId(${pairId})已被其他FORK节点使用`, {
              configType: 'workflow',
              context: {
                code: 'DUPLICATE_FORK_PAIR_ID',
                nodeId: node.id,
                pairId,
              }
            })
          );
        } else {
          forkNodes.set(pairId, { nodeId: node.id, forkPathIds });
        }
      } else if (node.type === 'JOIN' as NodeType) {
        const config = node.originalNode?.config as any;
        const forkPathIds = config?.forkPathIds;
        const mainPathId = config?.mainPathId;

        // 验证Join节点配置
        if (!forkPathIds || !Array.isArray(forkPathIds) || forkPathIds.length === 0) {
          errors.push(
            new ConfigurationValidationError(`JOIN节点(${node.id})的forkPathIds必须是非空数组`, {
              configType: 'workflow',
              context: {
                code: 'INVALID_FORK_PATH_IDS',
                nodeId: node.id,
              }
            })
          );
          continue;
        }

        // 验证mainPathId
        if (mainPathId && !forkPathIds.includes(mainPathId)) {
          errors.push(
            new ConfigurationValidationError(`JOIN节点(${node.id})的mainPathId(${mainPathId})必须在forkPathIds中`, {
              configType: 'workflow',
              context: {
                code: 'MAIN_PATH_ID_NOT_FOUND',
                nodeId: node.id,
                mainPathId,
              }
            })
          );
          continue;
        }

        // 使用forkPathIds的第一个元素作为配对标识符
        const pairId = forkPathIds[0];
        if (joinNodes.has(pairId)) {
          errors.push(
            new ConfigurationValidationError(`JOIN节点(${node.id})的forkPathIds第一个元素(${pairId})已被其他JOIN节点使用`, {
              configType: 'workflow',
              context: {
                code: 'DUPLICATE_JOIN_PAIR_ID',
                nodeId: node.id,
                pairId,
              }
            })
          );
        } else {
          joinNodes.set(pairId, { nodeId: node.id, forkPathIds, mainPathId });
        }
      }
    }

    // 检查配对
    const unpairedForks: ID[] = [];
    const unpairedJoins: ID[] = [];

    for (const [pairId, forkInfo] of forkNodes) {
      if (joinNodes.has(pairId)) {
        const joinInfo = joinNodes.get(pairId)!;
        // 验证Fork和Join的forkPathIds数组完全一致（包括顺序）
        if (JSON.stringify(forkInfo.forkPathIds) !== JSON.stringify(joinInfo.forkPathIds)) {
          errors.push(
            new ConfigurationValidationError(`FORK节点(${forkInfo.nodeId})和JOIN节点(${joinInfo.nodeId})的forkPathIds不一致`, {
              configType: 'workflow',
              context: {
                code: 'FORK_JOIN_MISMATCH',
                forkNodeId: forkInfo.nodeId,
                joinNodeId: joinInfo.nodeId,
              }
            })
          );
        } else {
          pairs.set(forkInfo.nodeId, joinInfo.nodeId);
        }
      } else {
        unpairedForks.push(forkInfo.nodeId);
      }
    }

    for (const [pairId, joinInfo] of joinNodes) {
      if (!forkNodes.has(pairId)) {
        unpairedJoins.push(joinInfo.nodeId);
      }
    }

    // 报告未配对的FORK节点
    for (const forkNodeId of unpairedForks) {
      errors.push(
        new ConfigurationValidationError(`FORK节点(${forkNodeId})没有配对的JOIN节点`, {
          configType: 'workflow',
          context: {
            code: 'UNPAIRED_FORK',
            nodeId: forkNodeId,
          }
        })
      );
    }

    // 报告未配对的JOIN节点
    for (const joinNodeId of unpairedJoins) {
      errors.push(
        new ConfigurationValidationError(`JOIN节点(${joinNodeId})没有配对的FORK节点`, {
          configType: 'workflow',
          context: {
            code: 'UNPAIRED_JOIN',
            nodeId: joinNodeId,
          }
        })
      );
    }

    // 检查FORK到JOIN的可达性
    for (const [forkNodeId, joinNodeId] of pairs) {
      const reachableNodes = getReachableNodes(graph, forkNodeId);
      if (!reachableNodes.has(joinNodeId)) {
        errors.push(
          new ConfigurationValidationError(
            `FORK节点(${forkNodeId})无法到达配对的JOIN节点(${joinNodeId})`,
            {
              configType: 'workflow',
              context: {
                code: 'FORK_JOIN_NOT_REACHABLE',
                nodeId: forkNodeId,
                relatedNodeId: joinNodeId,
              }
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
  private static validateSubgraphExistence(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    for (const node of graph.nodes.values()) {
      if (node.type === 'SUBGRAPH' as NodeType) {
        const subgraphConfig = node.originalNode?.config as any;
        if (!subgraphConfig || !subgraphConfig.subgraphId) {
          errors.push(
            new ConfigurationValidationError(
              `SUBGRAPH节点(${node.id})缺少subgraphId配置`,
              {
                configType: 'workflow',
                context: {
                  code: 'MISSING_SUBGRAPH_ID',
                  nodeId: node.id,
                }
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
  private static validateSubgraphCompatibility(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    for (const node of graph.nodes.values()) {
      if (node.type === 'SUBGRAPH' as NodeType) {
        const subgraphConfig = node.originalNode?.config as any;

      }
    }

    return errors;
  }

  /**
   * 检查是否为触发子工作流
   * @param graph 图数据
   * @returns 是否为触发子工作流
   */
  private static isTriggeredSubgraph(graph: GraphData): boolean {
    for (const node of graph.nodes.values()) {
      if (node.type === 'START_FROM_TRIGGER' as NodeType) {
        return true;
      }
    }
    return false;
  }

  /**
   * 验证触发子工作流的拓扑约束
   *
   * 注意：节点组合（数量和存在性）已在 WorkflowValidator 中验证
   * 此方法仅验证拓扑约束：
   * - START_FROM_TRIGGER 节点不能有入边
   * - CONTINUE_FROM_TRIGGER 节点不能有出边
   * - 不能包含普通 START 节点
   * - 不能包含普通 END 节点
   *
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateTriggeredSubgraphNodes(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    // 检查START_FROM_TRIGGER节点
    const startFromTriggerNodes: ID[] = [];
    for (const node of graph.nodes.values()) {
      if (node.type === 'START_FROM_TRIGGER' as NodeType) {
        startFromTriggerNodes.push(node.id);
      }
    }

    if (startFromTriggerNodes.length === 0) {
      errors.push(
        new ConfigurationValidationError('触发子工作流必须包含一个START_FROM_TRIGGER节点', {
          configType: 'workflow',
          context: {
            code: 'MISSING_START_FROM_TRIGGER_NODE',
          }
        })
      );
    } else if (startFromTriggerNodes.length > 1) {
      errors.push(
        new ConfigurationValidationError('触发子工作流只能包含一个START_FROM_TRIGGER节点', {
          configType: 'workflow',
          context: {
            code: 'MULTIPLE_START_FROM_TRIGGER_NODES',
          }
        })
      );
    } else {
      // 检查START_FROM_TRIGGER节点的入度
      const startNodeId = startFromTriggerNodes[0]!;
      const incomingEdges = graph.getIncomingEdges(startNodeId);
      if (incomingEdges.length > 0) {
        errors.push(
          new ConfigurationValidationError('START_FROM_TRIGGER节点不能有入边', {
            configType: 'workflow',
            context: {
              code: 'START_FROM_TRIGGER_NODE_HAS_INCOMING_EDGES',
              nodeId: startNodeId,
            }
          })
        );
      }
    }

    // 检查CONTINUE_FROM_TRIGGER节点
    const continueFromTriggerNodes: ID[] = [];
    for (const node of graph.nodes.values()) {
      if (node.type === 'CONTINUE_FROM_TRIGGER' as NodeType) {
        continueFromTriggerNodes.push(node.id);
      }
    }

    if (continueFromTriggerNodes.length === 0) {
      errors.push(
        new ConfigurationValidationError('触发子工作流必须包含一个CONTINUE_FROM_TRIGGER节点', {
          configType: 'workflow',
          context: {
            code: 'MISSING_CONTINUE_FROM_TRIGGER_NODE',
          }
        })
      );
    } else if (continueFromTriggerNodes.length > 1) {
      errors.push(
        new ConfigurationValidationError('触发子工作流只能包含一个CONTINUE_FROM_TRIGGER节点', {
          configType: 'workflow',
          context: {
            code: 'MULTIPLE_CONTINUE_FROM_TRIGGER_NODES',
          }
        })
      );
    } else {
      // 检查CONTINUE_FROM_TRIGGER节点的出度
      const endNodeId = continueFromTriggerNodes[0]!;
      const outgoingEdges = graph.getOutgoingEdges(endNodeId);
      if (outgoingEdges.length > 0) {
        errors.push(
          new ConfigurationValidationError('CONTINUE_FROM_TRIGGER节点不能有出边', {
            configType: 'workflow',
            context: {
              code: 'CONTINUE_FROM_TRIGGER_NODE_HAS_OUTGOING_EDGES',
              nodeId: endNodeId,
            }
          })
        );
      }
    }

    // 检查是否包含普通START或END节点
    for (const node of graph.nodes.values()) {
      if (node.type === 'START' as NodeType) {
        errors.push(
          new ConfigurationValidationError('触发子工作流不能包含START节点', {
            configType: 'workflow',
            context: {
              code: 'TRIGGERED_SUBGRAPH_CONTAINS_START_NODE',
              nodeId: node.id,
            }
          })
        );
      }
      if (node.type === 'END' as NodeType) {
        errors.push(
          new ConfigurationValidationError('触发子工作流不能包含END节点', {
            configType: 'workflow',
            context: {
              code: 'TRIGGERED_SUBGRAPH_CONTAINS_END_NODE',
              nodeId: node.id,
            }
          })
        );
      }
    }

    return errors;
  }

  /**
   * 验证触发子工作流的内部连通性
   * 确保所有节点都能从START_FROM_TRIGGER到达，并且能到达CONTINUE_FROM_TRIGGER
   * @param graph 图数据
   * @returns 验证错误列表
   */
  private static validateTriggeredSubgraphConnectivity(graph: GraphData): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    // 查找START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER节点
    let startNodeId: ID | null = null;
    let endNodeId: ID | null = null;

    for (const node of graph.nodes.values()) {
      if (node.type === 'START_FROM_TRIGGER' as NodeType) {
        startNodeId = node.id;
      } else if (node.type === 'CONTINUE_FROM_TRIGGER' as NodeType) {
        endNodeId = node.id;
      }
    }

    if (!startNodeId || !endNodeId) {
      // 如果缺少必需节点，错误已经在validateTriggeredSubgraphNodes中报告
      return errors;
    }

    // 检查从START_FROM_TRIGGER到所有节点的可达性
    const reachableFromStart = getReachableNodes(graph, startNodeId);
    for (const node of graph.nodes.values()) {
      if (node.type === 'START_FROM_TRIGGER' as NodeType) {
        continue; // 跳过起始节点
      }
      if (!reachableFromStart.has(node.id)) {
        errors.push(
          new ConfigurationValidationError(
            `节点(${node.id})从START_FROM_TRIGGER节点不可达`,
            {
              configType: 'workflow',
              context: {
                code: 'UNREACHABLE_FROM_START_FROM_TRIGGER',
                nodeId: node.id,
              }
            }
          )
        );
      }
    }

    // 检查从所有节点到CONTINUE_FROM_TRIGGER的可达性
    for (const node of graph.nodes.values()) {
      if (node.type === 'CONTINUE_FROM_TRIGGER' as NodeType) {
        continue; // 跳过结束节点
      }
      const reachableFromNode = getReachableNodes(graph, node.id);
      if (!reachableFromNode.has(endNodeId)) {
        errors.push(
          new ConfigurationValidationError(
            `节点(${node.id})无法到达CONTINUE_FROM_TRIGGER节点`,
            {
              configType: 'workflow',
              context: {
                code: 'CANNOT_REACH_CONTINUE_FROM_TRIGGER',
                nodeId: node.id,
              }
            }
          )
        );
      }
    }

    return errors;
  }

}
