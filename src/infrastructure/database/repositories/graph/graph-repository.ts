import { injectable, inject } from 'inversify';
import { GraphRepository as IGraphRepository, GraphQueryOptions } from '../../../../domain/graph/repositories/graph-repository';
import { Graph } from '../../../../domain/graph/entities/graph';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../../connections/connection-manager';
import { GraphMapper } from './graph-mapper';
import { GraphModel } from '../../models/graph.model';
import { NodeModel } from '../../models/node.model';
import { EdgeModel } from '../../models/edge.model';
import { Like, Not } from 'typeorm';

@injectable()
export class GraphRepository implements IGraphRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('GraphMapper') private mapper: GraphMapper
  ) {}

  async save(graph: Graph): Promise<Graph> {
    const connection = await this.connectionManager.getConnection();
    
    await connection.transaction(async manager => {
      // Save graph
      const graphModel = this.mapper.toModel(graph);
      await manager.save(graphModel);
      
      // Delete existing nodes and edges
      await manager.delete(NodeModel, { graphId: graph.id.value });
      await manager.delete(EdgeModel, { graphId: graph.id.value });
      
      // Save nodes
      for (const node of graph.nodes.values()) {
        const nodeModel = this.mapper.nodeToModel(node, graph.id.value);
        await manager.save(nodeModel);
      }
      
      // Save edges
      for (const edge of graph.edges.values()) {
        const edgeModel = this.mapper.edgeToModel(edge, graph.id.value);
        await manager.save(edgeModel);
      }
    });
    
    return graph;
  }

  async findById(id: ID): Promise<Graph | null> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModel = await connection.getRepository(GraphModel).findOne({
      where: { id: id.value },
      relations: ['nodes', 'edges']
    });
    
    if (!graphModel) {
      return null;
    }
    
    return this.mapper.toEntity(graphModel);
  }

  async findAll(): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges']
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async delete(entity: Graph): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    
    await connection.transaction(async manager => {
      // Delete edges first (due to foreign key constraints)
      await manager.delete(EdgeModel, { graphId: entity.id.value });
      
      // Delete nodes
      await manager.delete(NodeModel, { graphId: entity.id.value });
      
      // Delete graph
      await manager.delete(GraphModel, { id: entity.id.value });
    });
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    
    const count = await connection.getRepository(GraphModel).count({
      where: { id: id.value }
    });
    
    return count > 0;
  }

  async findByWorkflowId(workflowId: string): Promise<Graph | null> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModel = await connection.getRepository(GraphModel).findOne({
      where: { workflowId },
      relations: ['nodes', 'edges']
    });
    
    if (!graphModel) {
      return null;
    }
    
    return this.mapper.toEntity(graphModel);
  }

  async findNodeById(nodeId: ID): Promise<any> {
    const connection = await this.connectionManager.getConnection();
    
    const nodeModel = await connection.getRepository(NodeModel).findOne({
      where: { id: nodeId.value },
      relations: ['graph']
    });
    
    if (!nodeModel) {
      return null;
    }
    
    return this.mapper.nodeToEntity(nodeModel);
  }

  async findEdgeById(edgeId: ID): Promise<any> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModel = await connection.getRepository(EdgeModel).findOne({
      where: { id: edgeId.value },
      relations: ['graph']
    });
    
    if (!edgeModel) {
      return null;
    }
    
    return this.mapper.edgeToEntity(edgeModel);
  }

  async findNodesByGraphId(graphId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const nodeModels = await connection.getRepository(NodeModel).find({
      where: { graphId: graphId.value }
    });
    
    return nodeModels.map(model => this.mapper.nodeToEntity(model));
  }

  async findEdgesByGraphId(graphId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { graphId: graphId.value }
    });
    
    return edgeModels.map(model => this.mapper.edgeToEntity(model));
  }

  async findEdgesBySourceNodeId(sourceNodeId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { sourceNodeId: sourceNodeId.value }
    });
    
    return edgeModels.map(model => this.mapper.edgeToEntity(model));
  }

  async findEdgesByTargetNodeId(targetNodeId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { targetNodeId: targetNodeId.value }
    });
    
    return edgeModels.map(model => this.mapper.edgeToEntity(model));
  }

  async update(graph: Graph): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    
    await connection.transaction(async manager => {
      // Update graph
      const graphModel = this.mapper.toModel(graph);
      await manager.save(graphModel);
      
      // Delete existing nodes and edges
      await manager.delete(NodeModel, { graphId: graph.id.value });
      await manager.delete(EdgeModel, { graphId: graph.id.value });
      
      // Save updated nodes
      for (const node of graph.nodes.values()) {
        const nodeModel = this.mapper.nodeToModel(node, graph.id.value);
        await manager.save(nodeModel);
      }
      
      // Save updated edges
      for (const edge of graph.edges.values()) {
        const edgeModel = this.mapper.edgeToModel(edge, graph.id.value);
        await manager.save(edgeModel);
      }
    });
  }

  async count(): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    
    return connection.getRepository(GraphModel).count();
  }

  // 实现基础 Repository 接口的方法
  async find(options: any): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      where: options.filters || {},
      skip: options.offset,
      take: options.limit,
      order: options.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async findOne(options: any): Promise<Graph | null> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModel = await connection.getRepository(GraphModel).findOne({
      relations: ['nodes', 'edges'],
      where: options.filters || {}
    });
    
    if (!graphModel) {
      return null;
    }
    
    return this.mapper.toEntity(graphModel);
  }

  async findByIdOrFail(id: ID): Promise<Graph> {
    const graph = await this.findById(id);
    if (!graph) {
      throw new Error(`Graph with id ${id.value} not found`);
    }
    return graph;
  }

  async findOneOrFail(options: any): Promise<Graph> {
    const graph = await this.findOne(options);
    if (!graph) {
      throw new Error(`Graph not found`);
    }
    return graph;
  }

  async saveBatch(entities: Graph[]): Promise<Graph[]> {
    const results: Graph[] = [];
    for (const entity of entities) {
      const result = await this.save(entity);
      results.push(result);
    }
    return results;
  }

  async deleteById(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    
    await connection.transaction(async manager => {
      // Delete edges first (due to foreign key constraints)
      await manager.delete(EdgeModel, { graphId: id.value });
      
      // Delete nodes
      await manager.delete(NodeModel, { graphId: id.value });
      
      // Delete graph
      await manager.delete(GraphModel, { id: id.value });
    });
  }

  async deleteBatch(entities: Graph[]): Promise<void> {
    for (const entity of entities) {
      await this.delete(entity);
    }
  }

  async deleteWhere(options: any): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    
    const result = await connection.getRepository(GraphModel).delete(options.filters || {});
    return result.affected || 0;
  }

  // 实现 GraphRepository 特有的方法
  async findByName(name: string, options?: GraphQueryOptions): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      where: { name },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async findByCreatedBy(createdBy: ID, options?: GraphQueryOptions): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      where: { metadata: { createdBy: createdBy.value } },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async searchByName(name: string, options?: GraphQueryOptions): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      where: { name: Like(`%${name}%`) },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async countByCreatedBy(createdBy: ID, options?: GraphQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    
    return connection.getRepository(GraphModel).count({
      where: { metadata: { createdBy: createdBy.value } }
    });
  }

  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    
    const where: any = { name };
    if (excludeId) {
      where.id = Not(excludeId.value);
    }
    
    const count = await connection.getRepository(GraphModel).count({ where });
    return count > 0;
  }

  async getRecentlyCreatedGraphs(limit: number, options?: GraphQueryOptions): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      order: { createdAt: 'DESC' },
      take: limit
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async getMostComplexGraphs(limit: number, options?: GraphQueryOptions): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    // This is a simplified implementation - in a real scenario, you might need a more complex query
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      order: { updatedAt: 'DESC' },
      take: limit
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }

  async batchDelete(graphIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    let deletedCount = 0;
    
    await connection.transaction(async manager => {
      for (const id of graphIds) {
        // Delete edges first
        const edgeResult = await manager.delete(EdgeModel, { graphId: id.value });
        // Delete nodes
        const nodeResult = await manager.delete(NodeModel, { graphId: id.value });
        // Delete graph
        const graphResult = await manager.delete(GraphModel, { id: id.value });
        
        if (graphResult.affected) {
          deletedCount += graphResult.affected;
        }
      }
    });
    
    return deletedCount;
  }

  async softDelete(graphId: ID): Promise<void> {
    // This would require adding an isDeleted field to the GraphModel
    // For now, we'll use regular delete
    await this.deleteById(graphId);
  }

  async batchSoftDelete(graphIds: ID[]): Promise<number> {
    // This would require adding an isDeleted field to the GraphModel
    // For now, we'll use regular delete
    return this.batchDelete(graphIds);
  }

  async restoreSoftDeleted(graphId: ID): Promise<void> {
    // This would require adding an isDeleted field to the GraphModel
    throw new Error('Soft delete not implemented');
  }

  async findSoftDeleted(options?: GraphQueryOptions): Promise<Graph[]> {
    // This would require adding an isDeleted field to the GraphModel
    return [];
  }

  async findWithPagination(options: GraphQueryOptions): Promise<{ items: Graph[], total: number, page: number, pageSize: number, totalPages: number }> {
    const connection = await this.connectionManager.getConnection();
    
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    
    const [graphModels, total] = await connection.getRepository(GraphModel).findAndCount({
      relations: ['nodes', 'edges'],
      skip: offset,
      take: limit,
      order: { [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC' }
    });
    
    const items = graphModels.map(model => this.mapper.toEntity(model));
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages
    };
  }
}