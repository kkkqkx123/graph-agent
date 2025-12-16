import { injectable, inject } from 'inversify';
import { Graph } from '@domain/workflow/entities/graph';
import { Node } from '@domain/workflow/entities/nodes/base/node';
import { Edge } from '@domain/workflow/entities/edges/base/edge';
import { ID } from '@domain/common/value-objects/id';
import { DomainError } from '@domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
import {
  GraphDto,
  GraphSummaryDto,
  NodeDto,
  EdgeDto
} from '../../dtos/graph.dto';

/**
 * 图服务基类
 * 
 * 提供通用的异常处理、ID转换、DTO转换等功能
 */
@injectable()
export abstract class BaseGraphService {
  constructor(
    @inject('Logger') protected readonly logger: ILogger
  ) {}

  /**
   * 执行服务操作
   *
   * 提供统一的异常处理和日志记录
   */
  public async executeServiceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      this.logger.info(`正在${operationName}`, context || {});
      
      const result = await operation();
      
      this.logger.info(`${operationName}成功`, context || {});
      
      return result;
    } catch (error) {
      this.logger.error(`${operationName}失败`, error as Error);
      throw error;
    }
  }

  /**
   * 解析ID
   */
  public parseId(id: string): ID {
    return ID.fromString(id);
  }

  /**
   * 解析可选ID
   */
  public parseOptionalId(id?: string): ID | undefined {
    return id ? ID.fromString(id) : undefined;
  }

  /**
   * 转换为图DTO
   */
  public toGraphDto(graph: Graph): GraphDto {
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
   */
  public toGraphSummaryDto(graph: Graph): GraphSummaryDto {
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
   */
  public toNodeDto(node: Node): NodeDto {
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
   */
  public toEdgeDto(edge: Edge): EdgeDto {
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
   * 验证图是否存在
   */
  public async validateGraphExists(
    graphRepository: any,
    graphId: ID
  ): Promise<Graph> {
    const graph = await graphRepository.findById(graphId);
    if (!graph) {
      throw new DomainError(`图不存在: ${graphId.toString()}`);
    }
    return graph;
  }

  /**
   * 验证节点是否存在
   */
  public validateNodeExists(graph: Graph, nodeId: ID): Node {
    const node = graph.getNode(nodeId);
    if (!node) {
      throw new DomainError(`节点不存在: ${nodeId.toString()}`);
    }
    return node;
  }

  /**
   * 验证边是否存在
   */
  public validateEdgeExists(graph: Graph, edgeId: ID): Edge {
    const edge = graph.getEdge(edgeId);
    if (!edge) {
      throw new DomainError(`边不存在: ${edgeId.toString()}`);
    }
    return edge;
  }

  /**
   * 验证图未被删除
   */
  public validateGraphNotDeleted(graph: Graph): void {
    if (graph.isDeleted()) {
      throw new DomainError('无法操作已删除的图');
    }
  }
}