import { Repository, ObjectLiteral } from 'typeorm';

/**
 * 批量操作管理器
 */
export class BatchOperationManager<TModel extends ObjectLiteral> {
  constructor(private repository: Repository<TModel>) { }

  /**
   * 批量保存实体
   */
  async saveBatch(models: TModel[]): Promise<TModel[]> {
    return this.repository.save(models);
  }

  /**
   * 批量删除实体
   */
  async deleteBatch(models: TModel[]): Promise<void> {
    await this.repository.remove(models);
  }

  /**
   * 批量删除实体（根据ID列表）
   */
  async batchDeleteByIds(idValues: any[]): Promise<number> {
    const result = await this.repository.createQueryBuilder()
      .delete()
      .where(`id IN (:...ids)`, { ids: idValues })
      .execute();
    
    return result.affected || 0;
  }

  /**
   * 批量更新实体字段
   */
  async batchUpdate(idValues: any[], updateData: Partial<TModel>): Promise<number> {
    const result = await this.repository.createQueryBuilder()
      .update()
      .set({
        ...updateData,
        updatedAt: new Date()
      } as any)
      .where(`id IN (:...ids)`, { ids: idValues })
      .execute();
    
    return result.affected || 0;
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(filters: Record<string, any>, alias: string): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder().delete();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const result = await queryBuilder.execute();
    return result.affected || 0;
  }

  /**
   * 批量插入实体（忽略重复）
   */
  async batchInsertIgnore(models: TModel[]): Promise<number> {
    // 这里需要根据具体的数据库实现
    // PostgreSQL 使用 ON CONFLICT DO NOTHING
    // MySQL 使用 INSERT IGNORE
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .values(models)
      .orIgnore()
      .execute();
    
    return result.raw?.length || 0;
  }

  /**
   * 批量更新或插入实体
   */
  async batchUpsert(models: TModel[], conflictColumns: string[]): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .values(models)
      .orUpdate(conflictColumns)
      .execute();
    
    return result.raw?.length || 0;
  }
}