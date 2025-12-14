import { injectable, inject } from 'inversify';
import { GraphRepository as IGraphRepository } from '../../../../domain/workflow/submodules/graph/repositories/graph-repository';
import { Graph } from '../../../../domain/workflow/submodules/graph/entities/graph';
import { GraphId } from '../../../../domain/workflow/submodules/graph/value-objects/graph-id';
import { NodeId } from '../../../../domain/workflow/submodules/graph/value-objects/node-id';
import { EdgeId } from '../../../../domain/workflow/submodules/graph/value-objects/edge-id';
import { ConnectionManager } from '../../connections/connection-manager';
import { GraphMapper } from './graph-mapper';
import { GraphModel } from '../../models/graph.model';
import { NodeModel } from '../../models/node.model';
import { EdgeModel } from '../../models/edge.model';

@injectable()
export class GraphRepository implements IGraphRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('GraphMapper') private mapper: GraphMapper
  ) {}

  async save(graph: Graph): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    
    await connection.transaction(async manager => {
      // Save graph
      const graphModel = this.mapper.toModel(graph);
      await manager.save(graphModel);
      
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
  }

  async findById(id: GraphId): Promise<Graph | null> {
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

  async delete(id: GraphId): Promise<void> {
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

  async exists(id: GraphId): Promise<boolean> {
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

  async findNodeById(nodeId: NodeId): Promise<any> {
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

  async findEdgeById(edgeId: EdgeId): Promise<any> {
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

  async findNodesByGraphId(graphId: GraphId): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const nodeModels = await connection.getRepository(NodeModel).find({
      where: { graphId: graphId.value }
    });
    
    return nodeModels.map(model => this.mapper.nodeToEntity(model));
  }

  async findEdgesByGraphId(graphId: GraphId): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { graphId: graphId.value }
    });
    
    return edgeModels.map(model => this.mapper.edgeToEntity(model));
  }

  async findEdgesBySourceNodeId(sourceNodeId: NodeId): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();
    
    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { sourceNodeId: sourceNodeId.value }
    });
    
    return edgeModels.map(model => this.mapper.edgeToEntity(model));
  }

  async findEdgesByTargetNodeId(targetNodeId: NodeId): Promise<any[]> {
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

  async findWithPagination(offset: number, limit: number): Promise<Graph[]> {
    const connection = await this.connectionManager.getConnection();
    
    const graphModels = await connection.getRepository(GraphModel).find({
      relations: ['nodes', 'edges'],
      skip: offset,
      take: limit
    });
    
    return graphModels.map(model => this.mapper.toEntity(model));
  }
}