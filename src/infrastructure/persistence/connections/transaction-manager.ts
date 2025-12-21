import { injectable, inject } from 'inversify';
import { ConnectionManager } from './connection-manager';
import { QueryRunner, DataSource } from 'typeorm';

@injectable()
export class TransactionManager {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager
  ) {}

  async withTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = await this.connectionManager.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withReadOnlyTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = await this.connectionManager.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } finally {
      await queryRunner.release();
    }
  }

  async createSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`SAVEPOINT ${name}`);
  }

  async rollbackToSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  async releaseSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`RELEASE SAVEPOINT ${name}`);
  }
}