/**
 * 预处理后的图数据类
 * 继承GraphData，实现PreprocessedGraph接口
 */

import type {
  PreprocessedGraph,
  IdMapping,
  SubgraphRelationship,
  GraphAnalysisResult,
  PreprocessValidationResult,
  SubgraphMergeLog,
  ID,
  Timestamp,
  Version,
  WorkflowTrigger,
  WorkflowVariable,
  NodeType,
  EdgeType
} from '@modular-agent/types';
import { GraphData } from './graph-data';

/**
 * 预处理后的图数据类
 * 继承GraphData，实现PreprocessedGraph接口
 */
export class PreprocessedGraphData extends GraphData implements PreprocessedGraph {
  // ========== ID映射相关 ==========
  /** ID映射表（构建阶段临时数据） */
  public idMapping: IdMapping;
  
  /** 预处理后的节点配置（已更新ID引用） */
  public nodeConfigs: Map<ID, any>;
  
  /** 预处理后的触发器配置（已更新ID引用） */
  public triggerConfigs: Map<ID, any>;
  
  /** 子工作流关系 */
  public subgraphRelationships: SubgraphRelationship[];
  
  // ========== 预处理元数据 ==========
  /** 图分析结果 */
  public graphAnalysis: GraphAnalysisResult;
  
  /** 预处理验证结果 */
  public validationResult: PreprocessValidationResult;
  
  /** 拓扑排序后的节点ID列表 */
  public topologicalOrder: ID[];
  
  /** 子工作流合并日志 */
  public subgraphMergeLogs: SubgraphMergeLog[];
  
  /** 预处理时间戳 */
  public processedAt: Timestamp;
  
  // ========== 工作流元数据 ==========
  /** 工作流ID */
  public workflowId: ID;
  
  /** 工作流版本 */
  public workflowVersion: Version;
  
  /** 触发器（已展开，不包含引用） */
  public triggers?: WorkflowTrigger[];
  
  /** 工作流变量定义 */
  public variables?: WorkflowVariable[];
  
  /** 是否包含子工作流 */
  public hasSubgraphs: boolean;
  
  /** 子工作流ID集合 */
  public subworkflowIds: Set<ID>;
  
  constructor() {
    super();
    
    // 初始化ID映射相关字段
    this.idMapping = {
      nodeIds: new Map(),
      edgeIds: new Map(),
      reverseNodeIds: new Map(),
      reverseEdgeIds: new Map(),
      subgraphNamespaces: new Map()
    };
    this.nodeConfigs = new Map();
    this.triggerConfigs = new Map();
    this.subgraphRelationships = [];
    
    // 初始化预处理元数据
    this.graphAnalysis = {
      cycleDetection: {
        hasCycle: false,
        cycleNodes: [],
        cycleEdges: []
      },
      reachability: {
        reachableFromStart: new Set(),
        reachableToEnd: new Set(),
        unreachableNodes: new Set(),
        deadEndNodes: new Set()
      },
      topologicalSort: {
        success: true,
        sortedNodes: [],
        cycleNodes: []
      },
      forkJoinValidation: {
        isValid: true,
        unpairedForks: [],
        unpairedJoins: [],
        pairs: new Map()
      },
      nodeStats: {
        total: 0,
        byType: new Map<NodeType, number>()
      },
      edgeStats: {
        total: 0,
        byType: new Map<EdgeType, number>()
      }
    };
    this.validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: 0
    };
    this.topologicalOrder = [];
    this.subgraphMergeLogs = [];
    this.processedAt = 0;
    
    // 初始化工作流元数据
    this.workflowId = '';
    this.workflowVersion = '1.0.0';
    this.hasSubgraphs = false;
    this.subworkflowIds = new Set();
  }
}