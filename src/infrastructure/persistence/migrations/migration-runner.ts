import { injectable, inject } from 'inversify';
import { Connection, QueryRunner, Table } from 'typeorm';
import { ConfigManager } from '../../config/config-manager';

export interface Migration {
  id: string;
  name: string;
  up: (queryRunner: QueryRunner) => Promise<void>;
  down: (queryRunner: QueryRunner) => Promise<void>;
}

@injectable()
export class MigrationRunner {
  private migrations: Migration[] = [];

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {}

  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
  }

  async runMigrations(connection: Connection): Promise<void> {
    const queryRunner = connection.createQueryRunner();
    
    try {
      // 创建迁移表
      await this.createMigrationTable(queryRunner);
      
      // 获取已执行的迁移
      const executedMigrations = await this.getExecutedMigrations(queryRunner);
      
      // 执行未执行的迁移
      for (const migration of this.migrations) {
        if (!executedMigrations.includes(migration.id)) {
          console.log(`Running migration: ${migration.name}`);
          await migration.up(queryRunner);
          await this.recordMigration(queryRunner, migration.id);
          console.log(`Migration completed: ${migration.name}`);
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  async rollbackMigration(connection: Connection, migrationId: string): Promise<void> {
    const queryRunner = connection.createQueryRunner();
    
    try {
      const migration = this.migrations.find(m => m.id === migrationId);
      if (!migration) {
        throw new Error(`Migration ${migrationId} not found`);
      }

      const executedMigrations = await this.getExecutedMigrations(queryRunner);
      if (!executedMigrations.includes(migrationId)) {
        throw new Error(`Migration ${migrationId} has not been executed`);
      }

      console.log(`Rolling back migration: ${migration.name}`);
      await migration.down(queryRunner);
      await this.removeMigrationRecord(queryRunner, migrationId);
      console.log(`Migration rolled back: ${migration.name}`);
    } finally {
      await queryRunner.release();
    }
  }

  private async createMigrationTable(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('migrations');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'migrations',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '255',
              isPrimary: true,
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'executed_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        })
      );
    }
  }

  private async getExecutedMigrations(queryRunner: QueryRunner): Promise<string[]> {
    const result = await queryRunner.query('SELECT id FROM migrations ORDER BY executed_at');
    return result.map((row: any) => row.id);
  }

  private async recordMigration(queryRunner: QueryRunner, migrationId: string): Promise<void> {
    const migration = this.migrations.find(m => m.id === migrationId);
    if (migration) {
      await queryRunner.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migrationId, migration.name]
      );
    }
  }

  private async removeMigrationRecord(queryRunner: QueryRunner, migrationId: string): Promise<void> {
    await queryRunner.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
  }

  async getMigrationStatus(connection: Connection): Promise<{ executed: string[], pending: string[] }> {
    const queryRunner = connection.createQueryRunner();
    
    try {
      await this.createMigrationTable(queryRunner);
      const executedMigrations = await this.getExecutedMigrations(queryRunner);
      const pendingMigrations = this.migrations
        .filter(m => !executedMigrations.includes(m.id))
        .map(m => m.id);

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
      };
    } finally {
      await queryRunner.release();
    }
  }
}