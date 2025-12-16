import { injectable, inject } from 'inversify';
import { WorkflowRepository as IWorkflowRepository, WorkflowQueryOptions } from '../../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../../domain/workflow/workflow/entities/workflow';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../../connections/connection-manager';
import { WorkflowMapper } from './workflow-mapper';
import { WorkflowModel } from '../../models/workflow.model';
import { NodeModel } from '../../models/node.model';
import { EdgeModel } from '../../models/edge.model';
import { Like, Not } from 'typeorm';

@injectable()
export class WorkflowRepository implements IWorkflowRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('WorkflowMapper') private mapper: WorkflowMapper
  ) { }

  async save(workflow: Workflow): Promise<Workflow> {
    const connection = await this.connectionManager.getConnection();

    await connection.transaction(async manager => {
      // Save workflow
      const workflowModel = this.mapper.toModel(workflow);
      await manager.save(workflowModel);

      // Delete existing nodes and edges
      await manager.delete(NodeModel, { workflowId: workflow.id.value });
      await manager.delete(EdgeModel, { workflowId: workflow.id.value });

      // Save nodes
      for (const node of workflow.nodes.values()) {
        const nodeModel = this.mapper.nodeToModel(node, workflow.id.value);
        await manager.save(nodeModel);
      }

      // Save edges
      for (const edge of workflow.edges.values()) {
        const edgeModel = this.mapper.edgeToModel(edge, workflow.id.value);
        await manager.save(edgeModel);
      }
    });

    return workflow;
  }

  async findById(id: ID): Promise<Workflow | null> {
    const connection = await this.connectionManager.getConnection();

    const workflowModel = await connection.getRepository(WorkflowModel).findOne({
      where: { id: id.value },
      relations: ['nodes', 'edges']
    });

    if (!workflowModel) {
      return null;
    }

    return this.mapper.toEntity(workflowModel);
  }

  async findAll(): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges']
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async delete(entity: Workflow): Promise<void> {
    const connection = await this.connectionManager.getConnection();

    await connection.transaction(async manager => {
      // Delete edges first (due to foreign key constraints)
      await manager.delete(EdgeModel, { workflowId: entity.id.value });

      // Delete nodes
      await manager.delete(NodeModel, { workflowId: entity.id.value });

      // Delete workflow
      await manager.delete(WorkflowModel, { id: entity.id.value });
    });
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();

    const count = await connection.getRepository(WorkflowModel).count({
      where: { id: id.value }
    });

    return count > 0;
  }

  async findByWorkflowId(workflowId: string): Promise<Workflow | null> {
    const connection = await this.connectionManager.getConnection();

    const workflowModel = await connection.getRepository(WorkflowModel).findOne({
      where: { workflowId },
      relations: ['nodes', 'edges']
    });

    if (!workflowModel) {
      return null;
    }

    return this.mapper.toEntity(workflowModel);
  }

  async findNodeById(nodeId: ID): Promise<any> {
    const connection = await this.connectionManager.getConnection();

    const nodeModel = await connection.getRepository(NodeModel).findOne({
      where: { id: nodeId.value },
      relations: ['workflow']
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
      relations: ['workflow']
    });

    if (!edgeModel) {
      return null;
    }

    return this.mapper.edgeToEntity(edgeModel);
  }

  async findNodesByWorkflowId(workflowId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();

    const nodeModels = await connection.getRepository(NodeModel).find({
      where: { workflowId: workflowId.value }
    });

    return nodeModels.map(model => this.mapper.nodeToEntity(model));
  }

  async findEdgesByWorkflowId(workflowId: ID): Promise<any[]> {
    const connection = await this.connectionManager.getConnection();

    const edgeModels = await connection.getRepository(EdgeModel).find({
      where: { workflowId: workflowId.value }
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

  async update(workflow: Workflow): Promise<void> {
    const connection = await this.connectionManager.getConnection();

    await connection.transaction(async manager => {
      // Update workflow
      const workflowModel = this.mapper.toModel(workflow);
      await manager.save(workflowModel);

      // Delete existing nodes and edges
      await manager.delete(NodeModel, { workflowId: workflow.id.value });
      await manager.delete(EdgeModel, { workflowId: workflow.id.value });

      // Save updated nodes
      for (const node of workflow.nodes.values()) {
        const nodeModel = this.mapper.nodeToModel(node, workflow.id.value);
        await manager.save(nodeModel);
      }

      // Save updated edges
      for (const edge of workflow.edges.values()) {
        const edgeModel = this.mapper.edgeToModel(edge, workflow.id.value);
        await manager.save(edgeModel);
      }
    });
  }

  async count(): Promise<number> {
    const connection = await this.connectionManager.getConnection();

    return connection.getRepository(WorkflowModel).count();
  }

  // 实现基础 Repository 接口的方法
  async find(options: any): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      where: options.filters || {},
      skip: options.offset,
      take: options.limit,
      order: options.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async findOne(options: any): Promise<Workflow | null> {
    const connection = await this.connectionManager.getConnection();

    const workflowModel = await connection.getRepository(WorkflowModel).findOne({
      relations: ['nodes', 'edges'],
      where: options.filters || {}
    });

    if (!workflowModel) {
      return null;
    }

    return this.mapper.toEntity(workflowModel);
  }

  async findByIdOrFail(id: ID): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error(`Workflow with id ${id.value} not found`);
    }
    return workflow;
  }

  async findOneOrFail(options: any): Promise<Workflow> {
    const workflow = await this.findOne(options);
    if (!workflow) {
      throw new Error(`Workflow not found`);
    }
    return workflow;
  }

  async saveBatch(entities: Workflow[]): Promise<Workflow[]> {
    const results: Workflow[] = [];
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
      await manager.delete(EdgeModel, { workflowId: id.value });

      // Delete nodes
      await manager.delete(NodeModel, { workflowId: id.value });

      // Delete workflow
      await manager.delete(WorkflowModel, { id: id.value });
    });
  }

  async deleteBatch(entities: Workflow[]): Promise<void> {
    for (const entity of entities) {
      await this.delete(entity);
    }
  }

  async deleteWhere(options: any): Promise<number> {
    const connection = await this.connectionManager.getConnection();

    const result = await connection.getRepository(WorkflowModel).delete(options.filters || {});
    return result.affected || 0;
  }

  // 实现 WorkflowRepository 特有的方法
  async findByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      where: { name },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async findByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      where: { metadata: { createdBy: createdBy.value } },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async searchByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      where: { name: Like(`%${name}%`) },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async countByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();

    return connection.getRepository(WorkflowModel).count({
      where: { metadata: { createdBy: createdBy.value } }
    });
  }

  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();

    const where: any = { name };
    if (excludeId) {
      where.id = Not(excludeId.value);
    }

    const count = await connection.getRepository(WorkflowModel).count({ where });
    return count > 0;
  }

  async getRecentlyCreatedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      order: { createdAt: 'DESC' },
      take: limit
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async getMostComplexWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();

    // This is a simplified implementation - in a real scenario, you might need a more complex query
    const workflowModels = await connection.getRepository(WorkflowModel).find({
      relations: ['nodes', 'edges'],
      order: { updatedAt: 'DESC' },
      take: limit
    });

    return workflowModels.map(model => this.mapper.toEntity(model));
  }

  async batchDelete(workflowIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    let deletedCount = 0;

    await connection.transaction(async manager => {
      for (const id of workflowIds) {
        // Delete edges first
        const edgeResult = await manager.delete(EdgeModel, { workflowId: id.value });
        // Delete nodes
        const nodeResult = await manager.delete(NodeModel, { workflowId: id.value });
        // Delete workflow
        const workflowResult = await manager.delete(WorkflowModel, { id: id.value });

        if (workflowResult.affected) {
          deletedCount += workflowResult.affected;
        }
      }
    });

    return deletedCount;
  }

  async softDelete(workflowId: ID): Promise<void> {
    // This would require adding an isDeleted field to the WorkflowModel
    // For now, we'll use regular delete
    await this.deleteById(workflowId);
  }

  async batchSoftDelete(workflowIds: ID[]): Promise<number> {
    // This would require adding an isDeleted field to the WorkflowModel
    // For now, we'll use regular delete
    return this.batchDelete(workflowIds);
  }

  async restoreSoftDeleted(workflowId: ID): Promise<void> {
    // This would require adding an isDeleted field to the WorkflowModel
    throw new Error('Soft delete not implemented');
  }

  async findSoftDeleted(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    // This would require adding an isDeleted field to the WorkflowModel
    return [];
  }

  async findWithPagination(options: WorkflowQueryOptions): Promise<{ items: Workflow[], total: number, page: number, pageSize: number, totalPages: number }> {
    const connection = await this.connectionManager.getConnection();

    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const [workflowModels, total] = await connection.getRepository(WorkflowModel).findAndCount({
      relations: ['nodes', 'edges'],
      skip: offset,
      take: limit,
      order: { [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC' }
    });

    const items = workflowModels.map(model => this.mapper.toEntity(model));
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