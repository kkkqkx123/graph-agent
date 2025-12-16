import { injectable, inject } from 'inversify';
import { Graph } from '../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../domain/workflow/graph/entities/edges';
import { GraphRepository, NodeRepository, EdgeRepository } from '../../../domain/workflow/graph/repositories/graph-repository';
import { GraphDomainService } from '../../../domain/workflow/graph/services/graph-domain-service';
import { IGraphExecutionService } from '../../../domain/workflow/graph/services/graph-execution-service';
import { ID } from '../../../domain/common/value-objects/id';
import { NodeType } from '../../../domain/workflow/graph/value-objects/node-type';
import { EdgeType } from '../../../domain/workflow/graph/value-objects/edge-type';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
import {
  GraphDto,
  NodeDto,
  EdgeDto,
  GraphSummaryDto
} from '../dtos/graph.dto';

// Commands - Note: These may not be fully implemented yet
import {
  CreateGraphCommand,
  UpdateGraphCommand,
  DeleteGraphCommand,
  AddNodeCommand,
  UpdateNodeCommand,
  RemoveNodeCommand,
  AddEdgeCommand,
  UpdateEdgeCommand,
  RemoveEdgeCommand,
  ExecuteGraphCommand,
  ValidateGraphCommand,
  CreateExecutionPlanCommand,
  BatchOperationCommand,
  ImportGraphCommand,
  ExportGraphCommand
} from '../commands/graph.command';

// Queries - Note: These may not be fully implemented yet
import {
  GetGraphQuery,
  ListGraphsQuery,
  GetExecutionPathQuery,
  GetGraphStatisticsQuery,
  GetNodeQuery,
  ListNodesQuery,
  GetEdgeQuery,
  ListEdgesQuery,
  GetGraphExecutionStatusQuery,
  GetExecutionPlanQuery,
  SearchGraphsQuery,
  GetGraphDependenciesQuery,
  GetGraphPerformanceMetricsQuery,
  GetGraphVersionHistoryQuery
} from '../queries';

/**
 * 图应用服务
 * 
 * 负责图相关的业务逻辑编排和协调
 */
@injectable()
export class GraphService {
  constructor(
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('NodeRepository') private readonly nodeRepository: NodeRepository,
    @inject('EdgeRepository') private readonly edgeRepository: EdgeRepository,
    @inject('GraphDomainService') private readonly graphDomainService: GraphDomainService,
    @inject('IGraphExecutionService') private readonly graphExecutionService: IGraphExecutionService,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 创建图
   * @param command 创建图命令
   * @returns 创建的图DTO
   */
  async createGraph(command: CreateGraphCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在创建图', {
        name: command.name,
        description: command.description
      });

      const createdBy = command.createdBy ? ID.fromString(command.createdBy) : undefined;

      const graph = await this.graphDomainService.createGraph(
        command.name,
        command.description,
        command.metadata,
        createdBy
      );

      this.logger.info('图创建成功', { graphId: graph.graphId.toString() });

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('创建图失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新图
   * @param command 更新图命令
   * @returns 更新后的图DTO
   */
  async updateGraph(command: UpdateGraphCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在更新图', { graphId: command.graphId });

      const graphId = ID.fromString(command.graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      // 更新名称
      if (command.name !== undefined) {
        graph.updateName(command.name, userId);
      }

      // 更新描述
      if (command.description !== undefined) {
        graph.updateDescription(command.description, userId);
      }

      // 更新元数据
      if (command.metadata !== undefined) {
        graph.updateMetadata(command.metadata, userId);
      }

      // 保存图
      const updatedGraph = await this.graphRepository.save(graph);

      this.logger.info('图更新成功', { graphId: command.graphId });

      return this.toGraphDto(updatedGraph);
    } catch (error) {
      this.logger.error('更新图失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除图
   * @param command 删除图命令
   * @returns 删除是否成功
   */
  async deleteGraph(command: DeleteGraphCommand): Promise<boolean> {
    try {
      this.logger.info('正在删除图', { graphId: command.graphId });

      const graphId = ID.fromString(command.graphId);
      const graph = await this.graphRepository.findById(graphId);

      if (!graph) {
        return false;
      }

      // 标记图为已删除
      graph.markAsDeleted();
      await this.graphRepository.save(graph);

      this.logger.info('图删除成功', { graphId: command.graphId });

      return true;
    } catch (error) {
      this.logger.error('删除图失败', error as Error);
      throw error;
    }
  }

  /**
   * 添加节点到图
   * @param command 添加节点命令
   * @returns 更新后的图DTO
   */
  async addNodeToGraph(command: AddNodeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在向图添加节点', {
        graphId: command.graphId,
        nodeType: command.nodeType,
        nodeName: command.nodeName
      });

      const graphId = ID.fromString(command.graphId);
      const nodeType = NodeType.fromString(command.nodeType);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const graph = await this.graphDomainService.addNodeToGraph(
        graphId,
        nodeType,
        command.nodeName,
        command.nodeDescription,
        command.position,
        command.properties,
        userId
      );

      this.logger.info('节点添加成功', {
        graphId: command.graphId,
        nodeType: command.nodeType
      });

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('添加节点失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新节点
   * @param command 更新节点命令
   * @returns 更新后的图DTO
   */
  async updateNode(command: UpdateNodeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在更新节点', {
        graphId: command.graphId,
        nodeId: command.nodeId
      });

      const graphId = ID.fromString(command.graphId);
      const nodeId = ID.fromString(command.nodeId);
      const graph = await this.graphRepository.findByIdOrFail(graphId);
      const node = graph.getNode(nodeId);

      if (!node) {
        throw new DomainError(`节点不存在: ${command.nodeId}`);
      }

      // 更新节点属性
      if (command.nodeName !== undefined) {
        node.updateName(command.nodeName);
      }

      if (command.nodeDescription !== undefined) {
        node.updateDescription(command.nodeDescription);
      }

      if (command.position !== undefined) {
        node.updatePosition(command.position);
      }

      if (command.properties !== undefined) {
        node.updateProperties(command.properties);
      }

      // 保存节点和图
      await this.nodeRepository.save(node);
      const updatedGraph = await this.graphRepository.save(graph);

      this.logger.info('节点更新成功', {
        graphId: command.graphId,
        nodeId: command.nodeId
      });

      return this.toGraphDto(updatedGraph);
    } catch (error) {
      this.logger.error('更新节点失败', error as Error);
      throw error;
    }
  }

  /**
   * 从图移除节点
   * @param command 移除节点命令
   * @returns 更新后的图DTO
   */
  async removeNodeFromGraph(command: RemoveNodeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在从图移除节点', {
        graphId: command.graphId,
        nodeId: command.nodeId
      });

      const graphId = ID.fromString(command.graphId);
      const nodeId = ID.fromString(command.nodeId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const graph = await this.graphDomainService.removeNodeFromGraph(graphId, nodeId, userId);

      this.logger.info('节点移除成功', {
        graphId: command.graphId,
        nodeId: command.nodeId
      });

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('移除节点失败', error as Error);
      throw error;
    }
  }

  /**
   * 添加边到图
   * @param command 添加边命令
   * @returns 更新后的图DTO
   */
  async addEdgeToGraph(command: AddEdgeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在向图添加边', {
        graphId: command.graphId,
        edgeType: command.edgeType,
        fromNodeId: command.fromNodeId,
        toNodeId: command.toNodeId
      });

      const graphId = ID.fromString(command.graphId);
      const edgeType = EdgeType.fromString(command.edgeType);
      const fromNodeId = ID.fromString(command.fromNodeId);
      const toNodeId = ID.fromString(command.toNodeId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const graph = await this.graphDomainService.addEdgeToGraph(
        graphId,
        edgeType,
        fromNodeId,
        toNodeId,
        command.condition,
        command.weight,
        command.properties,
        userId
      );

      this.logger.info('边添加成功', {
        graphId: command.graphId,
        edgeType: command.edgeType
      });

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('添加边失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新边
   * @param command 更新边命令
   * @returns 更新后的图DTO
   */
  async updateEdge(command: UpdateEdgeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在更新边', {
        graphId: command.graphId,
        edgeId: command.edgeId
      });

      const graphId = ID.fromString(command.graphId);
      const edgeId = ID.fromString(command.edgeId);
      const graph = await this.graphRepository.findByIdOrFail(graphId);
      const edge = graph.getEdge(edgeId);

      if (!edge) {
        throw new DomainError(`边不存在: ${command.edgeId}`);
      }

      // 更新边属性
      if (command.condition !== undefined) {
        edge.updateCondition(command.condition);
      }

      if (command.weight !== undefined) {
        edge.updateWeight(command.weight);
      }

      if (command.properties !== undefined) {
        edge.updateProperties(command.properties);
      }

      // 保存边和图
      await this.edgeRepository.save(edge);
      const updatedGraph = await this.graphRepository.save(graph);

      this.logger.info('边更新成功', {
        graphId: command.graphId,
        edgeId: command.edgeId
      });

      return this.toGraphDto(updatedGraph);
    } catch (error) {
      this.logger.error('更新边失败', error as Error);
      throw error;
    }
  }

  /**
   * 从图移除边
   * @param command 移除边命令
   * @returns 更新后的图DTO
   */
  async removeEdgeFromGraph(command: RemoveEdgeCommand): Promise<GraphDto> {
    try {
      this.logger.info('正在从图移除边', {
        graphId: command.graphId,
        edgeId: command.edgeId
      });

      const graphId = ID.fromString(command.graphId);
      const edgeId = ID.fromString(command.edgeId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const graph = await this.graphDomainService.removeEdgeFromGraph(graphId, edgeId, userId);

      this.logger.info('边移除成功', {
        graphId: command.graphId,
        edgeId: command.edgeId
      });

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('移除边失败', error as Error);
      throw error;
    }
  }

  /**
   * 执行图
   * @param command 执行图命令
   * @returns 执行状态DTO
   */
  async executeGraph(command: ExecuteGraphCommand): Promise<any> {
    try {
      this.logger.info('正在执行图', {
        graphId: command.graphId,
        executionMode: command.executionMode,
        async: command.async
      });

      const graphId = ID.fromString(command.graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphId);

      // 验证图结构
      const validationResult = await this.graphDomainService.validateGraphStructure(graphId);
      if (!validationResult.isValid) {
        throw new DomainError(`图结构验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 生成执行ID
      const executionId = `exec_${graphId.toString()}_${Date.now()}`;

      // 构建执行请求
      const executionRequest = {
        executionId,
        graphId,
        mode: this.mapExecutionMode(command.executionMode || 'sequential'),
        priority: this.mapExecutionPriority(command.priority || 'normal'),
        config: {
          timeout: command.timeout || 300,
          debug: false,
          retryConfig: command.retryConfig
        },
        inputData: command.inputData,
        parameters: command.parameters || {}
      };

      // 执行图
      let executionResult;
      if (command.async) {
        // 异步执行
        await this.graphExecutionService.executeAsync(executionRequest);
        
        // 返回异步执行状态
        executionResult = {
          executionId,
          graphId,
          status: 'running' as any,
          startTime: new Date(),
          output: {},
          logs: [],
          statistics: {
            executedNodes: 0,
            totalNodes: graph.getNodeCount(),
            executedEdges: 0,
            totalEdges: graph.getEdgeCount(),
            executionPath: []
          },
          metadata: {
            userId: command.userId,
            callbackUrl: command.callbackUrl
          }
        };
      } else {
        // 同步执行
        executionResult = await this.graphExecutionService.execute(executionRequest);
      }

      // 构建执行状态DTO
      const executionStatus: any = {
        graphId: command.graphId,
        executionId,
        status: this.mapExecutionStatus(executionResult.status),
        startTime: executionResult.startTime.toISOString(),
        endTime: executionResult.endTime?.toISOString(),
        duration: executionResult.duration,
        currentNodeId: executionResult.metadata?.currentNodeId?.toString(),
        executedNodes: executionResult.statistics.executedNodes,
        totalNodes: executionResult.statistics.totalNodes,
        executedEdges: executionResult.statistics.executedEdges,
        totalEdges: executionResult.statistics.totalEdges,
        executionPath: executionResult.statistics.executionPath.map((id: any) => id.toString()),
        nodeStatuses: {},
        output: executionResult.output,
        error: executionResult.error?.message,
        statistics: {
          averageNodeExecutionTime: 0,
          maxNodeExecutionTime: 0,
          minNodeExecutionTime: 0,
          successRate: 0
        }
      };

      this.logger.info('图执行完成', {
        graphId: command.graphId,
        executionId,
        status: executionStatus.status,
        duration: executionStatus.duration
      });

      return executionStatus;
    } catch (error) {
      this.logger.error('执行图失败', error as Error);
      throw error;
    }
  }

  /**
   * 验证图
   * @param command 验证图命令
   * @returns 验证结果
   */
  async validateGraph(command: ValidateGraphCommand): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      this.logger.info('正在验证图', {
        graphId: command.graphId,
        validationLevel: command.validationLevel
      });

      const graphId = ID.fromString(command.graphId);
      const validationResult = await this.graphDomainService.validateGraphStructure(graphId);

      this.logger.info('图验证完成', {
        graphId: command.graphId,
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length
      });

      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        suggestions: []
      };
    } catch (error) {
      this.logger.error('验证图失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建执行计划
   * @param command 创建执行计划命令
   * @returns 执行计划DTO
   */
  async createExecutionPlan(command: CreateExecutionPlanCommand): Promise<any> {
    try {
      this.logger.info('正在创建执行计划', {
        graphId: command.graphId,
        executionMode: command.executionMode
      });

      const graphId = ID.fromString(command.graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphId);

      // 获取执行路径
      const executionPaths = await this.graphDomainService.getExecutionPaths(graphId);
      
      // 构建执行步骤
      const steps: any[] = [];
      const dependencies: any[] = [];
      
      // 简化实现，实际应该根据图结构构建详细的执行计划
      let order = 0;
      for (const path of executionPaths) {
        for (let i = 0; i < path.length; i++) {
          const nodeId = path[i];
          const node = graph.getNode(ID.fromString(nodeId));
          
          if (node && !steps.find(step => step.nodeId === nodeId)) {
            steps.push({
              id: `step_${nodeId}`,
              nodeId,
              name: node.name,
              type: node.type.toString(),
              order: order++,
              prerequisites: i > 0 ? [path[i - 1]] : [],
              inputMapping: {},
              outputMapping: {}
            });
            
            if (i > 0) {
              dependencies.push({
                fromStepId: `step_${path[i - 1]}`,
                toStepId: `step_${nodeId}`,
                type: 'success'
              });
            }
          }
        }
      }

      const executionPlan: any = {
        id: `plan_${graphId.toString()}_${Date.now()}`,
        graphId: command.graphId,
        executionMode: command.executionMode || 'sequential',
        steps,
        dependencies,
        estimatedDuration: steps.length * 1000, // 简化估算
        createdAt: new Date().toISOString()
      };

      this.logger.info('执行计划创建成功', {
        graphId: command.graphId,
        planId: executionPlan.id,
        stepCount: steps.length
      });

      return executionPlan;
    } catch (error) {
      this.logger.error('创建执行计划失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取图
   * @param query 获取图查询
   * @returns 图DTO或null
   */
  async getGraph(query: GetGraphQuery): Promise<GraphDto | null> {
    try {
      const graphId = ID.fromString(query.graphId);
      const graph = await this.graphRepository.findById(graphId);

      if (!graph) {
        return null;
      }

      return this.toGraphDto(graph);
    } catch (error) {
      this.logger.error('获取图失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出图
   * @param query 列出图查询
   * @returns 图列表
   */
  async listGraphs(query: ListGraphsQuery): Promise<{
    graphs: GraphDto[] | GraphSummaryDto[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      // 构建查询选项
      const options: any = {
        filters: query.filters || {},
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
        pagination: query.pagination || { page: 1, size: 20 }
      };

      const result = await this.graphRepository.findWithPagination(options);

      const graphs = query.includeSummary
        ? result.items.map((gf: any) => this.toGraphSummaryDto(gf))
        : result.items.map((gf: any) => this.toGraphDto(gf));

      return {
        graphs,
        total: result.total,
        page: result.page,
        size: result.size
      };
    } catch (error) {
      this.logger.error('列出图失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取图统计信息
   * @param query 获取图统计信息查询
   * @returns 图统计信息DTO
   */
  async getGraphStatistics(query: GetGraphStatisticsQuery): Promise<any> {
    try {
      const graphId = ID.fromString(query.graphId);
      const statistics = await this.graphDomainService.getGraphStatistics(graphId);

      return {
        graphId: query.graphId,
        nodeStatistics: {
          total: statistics.nodeCount,
          byType: statistics.nodeTypeStats,
          byStatus: {}
        },
        edgeStatistics: {
          total: statistics.edgeCount,
          byType: statistics.edgeTypeStats,
          byCondition: {}
        },
        executionStatistics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          maxExecutionTime: 0,
          minExecutionTime: 0
        },
        pathStatistics: {
          totalPaths: statistics.pathCount,
          shortestPathLength: 0,
          longestPathLength: 0,
          averagePathLength: 0
        },
        complexityMetrics: {
          cyclomaticComplexity: statistics.cycleCount,
          nodeConnectivity: 0,
          graphDensity: 0
        }
      };
    } catch (error) {
      this.logger.error('获取图统计信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 搜索图
   * @param query 搜索图查询
   * @returns 搜索结果
   */
  async searchGraphs(query: SearchGraphsQuery): Promise<{
    graphs: GraphDto[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      // 根据搜索范围构建查询
      let graphs: Graph[] = [];

      if (query.searchIn === 'name' || query.searchIn === 'all') {
        const nameResults = await this.graphRepository.searchByName(query.keyword, {
          filters: query.filters,
          sortBy: query.sortBy || 'relevance',
          sortOrder: query.sortOrder || 'desc',
          pagination: query.pagination
        });
        graphs = graphs.concat(nameResults);
      }

      // 去重
      const uniqueGraphs = graphs.filter((graph, index, self) =>
        index === self.findIndex(g => g.graphId.equals(graph.graphId))
      );

      return {
        graphs: uniqueGraphs.map((gf: any) => this.toGraphDto(gf)),
        total: uniqueGraphs.length,
        page: query.pagination?.page || 1,
        size: query.pagination?.size || 20
      };
    } catch (error) {
      this.logger.error('搜索图失败', error as Error);
      throw error;
    }
  }

  /**
   * 转换为图DTO
   * @param graph 图实体
   * @returns 图DTO
   */
  private toGraphDto(graph: Graph): GraphDto {
    return {
      id: graph.graphId.toString(),
      name: graph.name,
      description: graph.description,
      nodes: Array.from(graph.nodes.values()).map(node => this.toNodeDto(node)),
      edges: Array.from(graph.edges.values()).map(edge => this.toEdgeDto(edge)),
      version: graph.version.toString(),
      metadata: graph.metadata,
      createdAt: graph.createdAt.toISOString(),
      updatedAt: graph.updatedAt.toISOString(),
      createdBy: graph.createdBy?.toString(),
      updatedBy: graph.updatedBy?.toString()
    };
  }

  /**
   * 转换为图摘要DTO
   * @param graph 图实体
   * @returns 图摘要DTO
   */
  private toGraphSummaryDto(graph: Graph): GraphSummaryDto {
    return {
      id: graph.graphId.toString(),
      name: graph.name,
      nodeCount: graph.getNodeCount(),
      edgeCount: graph.getEdgeCount(),
      createdAt: graph.createdAt.toISOString(),
      updatedAt: graph.updatedAt.toISOString()
    };
  }

  /**
   * 转换为节点DTO
   * @param node 节点实体
   * @returns 节点DTO
   */
  private toNodeDto(node: Node): NodeDto {
    return {
      id: node.nodeId.toString(),
      graphId: node.graphId.toString(),
      type: node.type.toString(),
      name: node.name,
      description: node.description,
      position: node.position,
      properties: node.properties,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString()
    };
  }

  /**
   * 转换为边DTO
   * @param edge 边实体
   * @returns 边DTO
   */
  private toEdgeDto(edge: Edge): EdgeDto {
    return {
      id: edge.edgeId.toString(),
      graphId: edge.graphId.toString(),
      type: edge.type.toString(),
      fromNodeId: edge.fromNodeId.toString(),
      toNodeId: edge.toNodeId.toString(),
      condition: edge.condition,
      weight: edge.weight,
      properties: edge.properties,
      createdAt: edge.createdAt.toISOString(),
      updatedAt: edge.updatedAt.toISOString()
    };
  }

  /**
   * 映射执行模式
   * @param mode 执行模式字符串
   * @returns 执行模式枚举
   */
  private mapExecutionMode(mode: string): any {
    switch (mode) {
      case 'sequential':
        return 'sequential';
      case 'parallel':
        return 'parallel';
      case 'conditional':
        return 'conditional';
      default:
        return 'sequential';
    }
  }

  /**
   * 映射执行优先级
   * @param priority 执行优先级字符串
   * @returns 执行优先级枚举
   */
  private mapExecutionPriority(priority: string): any {
    switch (priority) {
      case 'low':
        return 'low';
      case 'normal':
        return 'normal';
      case 'high':
        return 'high';
      case 'urgent':
        return 'urgent';
      default:
        return 'normal';
    }
  }

  /**
   * 映射执行状态
   * @param status 执行状态枚举
   * @returns 执行状态字符串
   */
  private mapExecutionStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'RUNNING':
        return 'running';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'CANCELLED':
        return 'cancelled';
      case 'PAUSED':
        return 'paused';
      default:
        return 'pending';
    }
  }
}