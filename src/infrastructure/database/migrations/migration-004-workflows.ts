import { QueryRunner, Table, TableIndex } from 'typeorm';
import { Migration } from './migration-runner';

export const migration004: Migration = {
  id: '004-workflows',
  name: 'Create workflows table',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workflows',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'graphId',
            type: 'uuid',
          },
          {
            name: 'state',
            type: 'workflow_state',
            default: "'draft'",
          },
          {
            name: 'executionMode',
            type: 'execution_mode',
            default: "'sequential'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'configuration',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'revision',
            type: 'int',
            default: 1,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
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
    await queryRunner.createIndex('workflows', new TableIndex({
      name: 'IDX_workflows_graphId',
      columnNames: ['graphId'],
    }));

    await queryRunner.createIndex('workflows', new TableIndex({
      name: 'IDX_workflows_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('workflows', new TableIndex({
      name: 'IDX_workflows_executionMode',
      columnNames: ['executionMode'],
    }));

    await queryRunner.createIndex('workflows', new TableIndex({
      name: 'IDX_workflows_version',
      columnNames: ['version'],
    }));

    await queryRunner.createIndex('workflows', new TableIndex({
      name: 'IDX_workflows_createdAt',
      columnNames: ['createdAt'],
    }));
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workflows');
  }
};