import { QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { Migration } from './migration-runner';

export const migration002: Migration = {
  id: '002-sessions',
  name: 'Create sessions table',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'threadIds',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'state',
            type: 'session_state',
            default: "'active'",
          },
          {
            name: 'context',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      })
    );

    // 创建索引
    await queryRunner.createIndex('sessions', new TableIndex({
      name: 'IDX_sessions_userId',
      columnNames: ['userId'],
    }));

    await queryRunner.createIndex('sessions', new TableIndex({
      name: 'IDX_sessions_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('sessions', new TableIndex({
      name: 'IDX_sessions_createdAt',
      columnNames: ['createdAt'],
    }));
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sessions');
  }
};