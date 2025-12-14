import { QueryRunner, Table, TableIndex } from 'typeorm';
import { Migration } from './migration-runner';

export const migration006: Migration = {
  id: '006-history',
  name: 'Create history and checkpoints tables',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    // 创建history表
    await queryRunner.createTable(
      new Table({
        name: 'history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'entityId',
            type: 'uuid',
          },
          {
            name: 'action',
            type: 'history_action',
            default: "'created'",
          },
          {
            name: 'data',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'previousData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'threadId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'workflowId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'graphId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'nodeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'edgeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'bigint',
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
    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_entityType',
      columnNames: ['entityType'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_entityId',
      columnNames: ['entityId'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_action',
      columnNames: ['action'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_sessionId',
      columnNames: ['sessionId'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_threadId',
      columnNames: ['threadId'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_workflowId',
      columnNames: ['workflowId'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_graphId',
      columnNames: ['graphId'],
    }));

    await queryRunner.createIndex('history', new TableIndex({
      name: 'IDX_history_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建checkpoints表
    await queryRunner.createTable(
      new Table({
        name: 'checkpoints',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'executionId',
            type: 'uuid',
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'entityId',
            type: 'uuid',
          },
          {
            name: 'checkpointType',
            type: 'checkpoint_type',
            default: "'node_start'",
          },
          {
            name: 'state',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'nodeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'edgeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'workflowId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'graphId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'threadId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'int',
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
    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_executionId',
      columnNames: ['executionId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_entityType',
      columnNames: ['entityType'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_entityId',
      columnNames: ['entityId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_checkpointType',
      columnNames: ['checkpointType'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_nodeId',
      columnNames: ['nodeId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_edgeId',
      columnNames: ['edgeId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_workflowId',
      columnNames: ['workflowId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_graphId',
      columnNames: ['graphId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_sessionId',
      columnNames: ['sessionId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_threadId',
      columnNames: ['threadId'],
    }));

    await queryRunner.createIndex('checkpoints', new TableIndex({
      name: 'IDX_checkpoints_createdAt',
      columnNames: ['createdAt'],
    }));
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('checkpoints');
    await queryRunner.dropTable('history');
  }
};