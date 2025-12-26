import { SelectQueryBuilder, ObjectLiteral, Repository } from 'typeorm';

/**
 * 软删除配置接口
 */
export interface SoftDeleteConfig {
  enabled: boolean;
  fieldName: string;
  deletedAtField: string;
  stateField: string;
  deletedValue: string;
  activeValue: string;
}

/**
 * 软删除管理器
 */
export class SoftDeleteManager<TModel extends ObjectLiteral> {
  constructor(private config: SoftDeleteConfig) { }

  /**
   * 配置软删除设置
   */
  configure(config: Partial<SoftDeleteConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 检查是否支持软删除
   */
  supportsSoftDelete(): boolean {
    return this.config.enabled;
  }

  /**
   * 应用软删除过滤条件到查询构建器
   */
  applySoftDeleteFilter(qb: SelectQueryBuilder<TModel>, alias: string): void {
    if (this.supportsSoftDelete() && this.config.fieldName) {
      qb.andWhere(`${alias}.${this.config.fieldName} = :isDeleted`, { isDeleted: false });
    }
  }

  /**
   * 软删除实体
   */
  async softDelete(
    repository: Repository<TModel>,
    idWhere: any
  ): Promise<void> {
    if (!this.supportsSoftDelete()) {
      throw new Error('软删除功能未启用');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    // 设置删除标记
    if (this.config.fieldName) {
      updateData[this.config.fieldName] = true;
    }

    // 设置删除时间
    if (this.config.deletedAtField) {
      updateData[this.config.deletedAtField] = new Date();
    }

    // 设置状态字段
    if (this.config.stateField && this.config.deletedValue) {
      updateData[this.config.stateField] = this.config.deletedValue;
    }

    await repository.update(idWhere, updateData);
  }

  /**
   * 批量软删除实体
   */
  async batchSoftDelete(
    repository: Repository<TModel>,
    idValues: any[]
  ): Promise<number> {
    if (!this.supportsSoftDelete()) {
      throw new Error('软删除功能未启用');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    // 设置删除标记
    if (this.config.fieldName) {
      updateData[this.config.fieldName] = true;
    }

    // 设置删除时间
    if (this.config.deletedAtField) {
      updateData[this.config.deletedAtField] = new Date();
    }

    // 设置状态字段
    if (this.config.stateField && this.config.deletedValue) {
      updateData[this.config.stateField] = this.config.deletedValue;
    }

    const result = await repository.createQueryBuilder()
      .update()
      .set(updateData)
      .where(`id IN (:...ids)`, { ids: idValues })
      .execute();
    
    return result.affected || 0;
  }

  /**
   * 恢复软删除的实体
   */
  async restoreSoftDeleted(
    repository: Repository<TModel>,
    idWhere: any
  ): Promise<void> {
    if (!this.supportsSoftDelete()) {
      throw new Error('软删除功能未启用');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    // 清除删除标记
    if (this.config.fieldName) {
      updateData[this.config.fieldName] = false;
    }

    // 清除删除时间
    if (this.config.deletedAtField) {
      updateData[this.config.deletedAtField] = null;
    }

    // 设置状态字段
    if (this.config.stateField && this.config.activeValue) {
      updateData[this.config.stateField] = this.config.activeValue;
    }

    await repository.update(idWhere, updateData);
  }

  /**
   * 查找软删除的实体
   */
  async findSoftDeleted(
    repository: Repository<TModel>,
    alias: string
  ): Promise<TModel[]> {
    if (!this.supportsSoftDelete()) {
      return [];
    }

    const qb = repository.createQueryBuilder(alias);
    
    // 添加软删除条件
    if (this.config.fieldName) {
      qb.andWhere(`${alias}.${this.config.fieldName} = :isDeleted`, { isDeleted: true });
    }
    
    return qb.getMany();
  }
}