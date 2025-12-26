import { DataSource } from 'typeorm';

/**
 * 事务管理器
 */
export class TransactionManager {
  constructor(private dataSource: DataSource) { }

  /**
   * 在事务中执行操作
   */
  async executeInTransaction<R>(operation: () => Promise<R>): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 在事务中执行批量操作
   */
  async executeBatchInTransaction<R>(operations: Array<() => Promise<R>>): Promise<R[]> {
    return this.executeInTransaction(async () => {
      const results: R[] = [];
      for (const operation of operations) {
        results.push(await operation());
      }
      return results;
    });
  }

  /**
   * 创建嵌套事务
   */
  async createNestedTransaction<R>(operation: () => Promise<R>): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}