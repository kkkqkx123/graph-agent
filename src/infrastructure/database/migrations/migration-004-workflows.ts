import { QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { Migration } from './migration-runner';

export const migration004: Migration = {
  id: '004-workflows',
  name: 'Create workflows and execution_stats tables',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    // 创建workflows表
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
            name: 'nodes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'edges',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'definition',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'layout',
            type: 'jsonb',
            isNullable: true,
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

    // 创建execution_stats表
    await queryRunner.createTable(
      new Table({
        name: 'execution_stats',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'workflowId',
            type: 'uuid',
            isUnique: true
          },
          {
            name: 'executionCount',
            type: 'integer',
            default: 0
          },
          {
            name: 'successCount',
            type: 'integer',
            default: 0
          },
          {
            name: 'failureCount',
            type: 'integer',
            default: 0
          },
          {
            name: 'averageExecutionTime',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'lastExecutedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      })
    );

    // 创建workflows表索引
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

    // 创建execution_stats表索引
    await queryRunner.createIndex(
      'execution_stats',
      new TableIndex({
        name: 'IDX_execution_stats_workflowId',
        columnNames: ['workflowId'],
        isUnique: true
      })
    );

    // 创建外键约束
    await queryRunner.createForeignKey(
      'execution_stats',
      new TableForeignKey({
        columnNames: ['workflowId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'workflows',
        onDelete: 'CASCADE'
      })
    );
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('execution_stats');
    await queryRunner.dropTable('workflows');
  }
};