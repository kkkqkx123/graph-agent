import { injectable, inject } from 'inversify';
import { Graph } from '@domain/workflow/graph/entities/graph';
import { GraphRepository, NodeRepository, EdgeRepository } from '@/domain/workflow/repositories/graph-repository';
import { GraphDomainService } from '@/domain/workflow/services/graph-domain-service';
import { IGraphExecutionService } from '@/domain/workflow/services/graph-execution-service';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { EdgeType } from '@/domain/workflow/value-objects/edge-type';
import { DomainError } from '@domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';
import { BaseGraphService } from './common/base-graph-service';
import { ExecutionModeMapper } from './common/execution-mode-mapper';

// DTOs
import {
  GraphDto,
  GraphSummaryDto,
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
export class GraphService extends BaseGraphService {
  constructor(
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('NodeRepository') private readonly nodeRepository: NodeRepository,
    @inject('EdgeRepository') private readonly edgeRepository: EdgeRepository,
    @inject('GraphDomainService') private readonly graphDomainService: GraphDomainService,
    @inject('IGraphExecutionService') private readonly graphExecutionService: IGraphExecutionService,
    @inject('Logger') logger: ILogger,
    @inject('ExecutionModeMapper') private readonly executionModeMapper: ExecutionModeMapper
  ) {
    super(logger);
  }

  /**
   * 创建图
   * @param command 创建图命令
   * @returns 创建的图DTO
   */
  async createGraph(command: CreateGraphCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '创建图',
      async () => {
        const createdBy = this.parseOptionalId(command.createdBy);

        const graph = await this.graphDomainService.createGraph(
          command.name,
          command.description,
          command.metadata,
          createdBy
        );

        return this.toGraphDto(graph);
      },
      {
        name: command.name,
        description: command.description
      }
    );
  }

  /**
   * 更新图
   * @param command 更新图命令
   * @returns 更新后的图DTO
   */
  async updateGraph(command: UpdateGraphCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '更新图',
      async () => {
        const graphId = this.parseId(command.graphId);
        const graph = await this.graphRepository.findByIdOrFail(graphId);
        const userId = this.parseOptionalId(command.userId);

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

        return this.toGraphDto(updatedGraph);
      },
      { graphId: command.graphId }
    );
  }

  /**
   * 删除图
   * @param command 删除图命令
   * @returns 删除是否成功
   */
  async deleteGraph(command: DeleteGraphCommand): Promise<boolean> {
    return this.executeServiceOperation(
      '删除图',
      async () => {
        const graphId = this.parseId(command.graphId);
        const graph = await this.graphRepository.findById(graphId);

        if (!graph) {
          return false;
        }

        // 标记图为已删除
        graph.markAsDeleted();
        await this.graphRepository.save(graph);

        return true;
      },
      { graphId: command.graphId }
    );
  }

  /**
   * 添加节点到图
   * @param command 添加节点命令
   * @returns 更新后的图DTO
   */
  async addNodeToGraph(command: AddNodeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '向图添加节点',
      async () => {
        const graphId = this.parseId(command.graphId);
        const nodeType = NodeType.fromString(command.nodeType);
        const userId = this.parseOptionalId(command.userId);

        const graph = await this.graphDomainService.addNodeToGraph(
          graphId,
          nodeType,
          command.nodeName,
          command.nodeDescription,
          command.position,
          command.properties,
          userId
        );

        return this.toGraphDto(graph);
      },
      {
        graphId: command.graphId,
        nodeType: command.nodeType,
        nodeName: command.nodeName
      }
    );
  }

  /**
   * 更新节点
   * @param command 更新节点命令
   * @returns 更新后的图DTO
   */
  async updateNode(command: UpdateNodeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '更新节点',
      async () => {
        const graphId = this.parseId(command.graphId);
        const nodeId = this.parseId(command.nodeId);
        const graph = await this.validateGraphExists(this.graphRepository, graphId);
        const node = this.validateNodeExists(graph, nodeId);

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

        return this.toGraphDto(updatedGraph);
      },
      {
        graphId: command.graphId,
        nodeId: command.nodeId
      }
    );
  }

  /**
   * 从图移除节点
   * @param command 移除节点命令
   * @returns 更新后的图DTO
   */
  async removeNodeFromGraph(command: RemoveNodeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '从图移除节点',
      async () => {
        const graphId = this.parseId(command.graphId);
        const nodeId = this.parseId(command.nodeId);
        const userId = this.parseOptionalId(command.userId);

        const graph = await this.graphDomainService.removeNodeFromGraph(graphId, nodeId, userId);

        return this.toGraphDto(graph);
      },
      {
        graphId: command.graphId,
        nodeId: command.nodeId
      }
    );
  }

  /**
   * 添加边到图
   * @param command 添加边命令
   * @returns 更新后的图DTO
   */
  async addEdgeToGraph(command: AddEdgeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '向图添加边',
      async () => {
        const graphId = this.parseId(command.graphId);
        const edgeType = EdgeType.fromString(command.edgeType);
        const fromNodeId = this.parseId(command.fromNodeId);
        const toNodeId = this.parseId(command.toNodeId);
        const userId = this.parseOptionalId(command.userId);

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

        return this.toGraphDto(graph);
      },
      {
        graphId: command.graphId,
        edgeType: command.edgeType,
        fromNodeId: command.fromNodeId,
        toNodeId: command.toNodeId
      }
    );
  }

  /**
   * 更新边
   * @param command 更新边命令
   * @returns 更新后的图DTO
   */
  async updateEdge(command: UpdateEdgeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '更新边',
      async () => {
        const graphId = this.parseId(command.graphId);
        const edgeId = this.parseId(command.edgeId);
        const graph = await this.validateGraphExists(this.graphRepository, graphId);
        const edge = this.validateEdgeExists(graph, edgeId);

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

        return this.toGraphDto(updatedGraph);
      },
      {
        graphId: command.graphId,
        edgeId: command.edgeId
      }
    );
  }

  /**
   * 从图移除边
   * @param command 移除边命令
   * @returns 更新后的图DTO
   */
  async removeEdgeFromGraph(command: RemoveEdgeCommand): Promise<GraphDto> {
    return this.executeServiceOperation(
      '从图移除边',
      async () => {
        const graphId = this.parseId(command.graphId);
        const edgeId = this.parseId(command.edgeId);
        const userId = this.parseOptionalId(command.userId);

        const graph = await this.graphDomainService.removeEdgeFromGraph(graphId, edgeId, userId);

        return this.toGraphDto(graph);
      },
      {
        graphId: command.graphId,
        edgeId: command.edgeId
      }
    );
  }

  /**
   * 执行图
   * @param command 执行图命令
   * @returns 执行状态DTO
   */
  async executeGraph(command: ExecuteGraphCommand): Promise<any> {
    return this.executeServiceOperation(
      '执行图',
      async () => {
        const graphId = this.parseId(command.graphId);
        const graph = await this.graphRepository.findByIdOrFail(graphId);

        // 验证图结构
        const validationResult = await this.graphDomainService.validateGraphStructure(graphId);
        if (!validationResult.isValid) {
          throw new DomainError(`图结构验证失败: ${validationResult.errors.join(', ')}`);
        }

        // 生成执行ID
        const executionId = `exec_${graphId.toString()}_${Date.now()}`;

        // 构建执行请求
        const executionRequest = this.executionModeMapper.buildExecutionRequest(
          executionId,
          graphId.toString(),
          command.executionMode,
          command.priority,
          command.timeout,
          command.retryConfig,
          command.inputData,
          command.parameters
        );

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
        const executionStatus = this.executionModeMapper.buildExecutionStatus(
          executionResult,
          command.graphId,
          executionId
        );

        return executionStatus;
      },
      {
        graphId: command.graphId,
        executionMode: command.executionMode,
        async: command.async
      }
    );
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
    return this.executeServiceOperation(
      '验证图',
      async () => {
        const graphId = this.parseId(command.graphId);
        const validationResult = await this.graphDomainService.validateGraphStructure(graphId);

        return {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: []
        };
      },
      {
        graphId: command.graphId,
        validationLevel: command.validationLevel
      }
    );
  }

  /**
   * 创建执行计划
   * @param command 创建执行计划命令
   * @returns 执行计划DTO
   */
  async createExecutionPlan(command: CreateExecutionPlanCommand): Promise<any> {
    return this.executeServiceOperation(
      '创建执行计划',
      async () => {
        const graphId = this.parseId(command.graphId);
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
            if (!nodeId) continue;
            const node = graph.getNode(this.parseId(nodeId));

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

        return executionPlan;
      },
      {
        graphId: command.graphId,
        executionMode: command.executionMode
      }
    );
  }

  /**
   * 获取图
   * @param query 获取图查询
   * @returns 图DTO或null
   */
  async getGraph(query: GetGraphQuery): Promise<GraphDto | null> {
    return this.executeServiceOperation(
      '获取图',
      async () => {
        const graphId = this.parseId(query.graphId);
        const graph = await this.graphRepository.findById(graphId);

        if (!graph) {
          return null;
        }

        return this.toGraphDto(graph);
      },
      { graphId: query.graphId }
    );
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
    return this.executeServiceOperation(
      '列出图',
      async () => {
        // 构建查询选项
        const pagination = query.pagination || { page: 1, size: 20 };
        const options: any = {
          filters: query.filters || {},
          sortBy: query.sortBy || 'createdAt',
          sortOrder: query.sortOrder || 'desc',
          offset: (pagination.page - 1) * pagination.size,
          limit: pagination.size
        };

        const result = await this.graphRepository.findWithPagination(options);

        const graphs = query.includeSummary
          ? result.items.map((gf: any) => this.toGraphSummaryDto(gf))
          : result.items.map((gf: any) => this.toGraphDto(gf));

        return {
          graphs,
          total: result.total,
          page: result.page,
          size: result.pageSize
        };
      },
      { filters: query.filters }
    );
  }

  /**
   * 获取图统计信息
   * @param query 获取图统计信息查询
   * @returns 图统计信息DTO
   */
  async getGraphStatistics(query: GetGraphStatisticsQuery): Promise<any> {
    return this.executeServiceOperation(
      '获取图统计信息',
      async () => {
        const graphId = this.parseId(query.graphId);
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
      },
      { graphId: query.graphId }
    );
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
    return this.executeServiceOperation(
      '搜索图',
      async () => {
        // 根据搜索范围构建查询
        let graphs: Graph[] = [];

        if (query.searchIn === 'name' || query.searchIn === 'all') {
          const pagination = query.pagination;
          const nameResults = await this.graphRepository.searchByName(query.keyword, {
            filters: query.filters,
            sortBy: query.sortBy || 'relevance',
            sortOrder: query.sortOrder || 'desc',
            offset: pagination ? (pagination.page - 1) * pagination.size : undefined,
            limit: pagination?.size
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
      },
      { keyword: query.keyword, searchIn: query.searchIn }
    );
  }


}