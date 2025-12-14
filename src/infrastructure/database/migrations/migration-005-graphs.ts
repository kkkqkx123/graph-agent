import { QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { Migration } from './migration-runner';

export const migration005: Migration = {
  id: '005-graphs',
  name: 'Create graphs, nodes, and edges tables',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    // 创建graphs表
    await queryRunner.createTable(
      new Table({
        name: 'graphs',
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
            name: 'definition',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'layout',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'graph_state',
            default: "'draft'",
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'workflowId',
            type: 'uuid',
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
    await queryRunner.createIndex('graphs', new TableIndex({
      name: 'IDX_graphs_workflowId',
      columnNames: ['workflowId'],
    }));

    await queryRunner.createIndex('graphs', new TableIndex({
      name: 'IDX_graphs_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('graphs', new TableIndex({
      name: 'IDX_graphs_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建nodes表
    await queryRunner.createTable(
      new Table({
        name: 'nodes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'graphId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'node_type',
            default: "'llm'",
          },
          {
            name: 'configuration',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'position',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'node_state',
            default: "'active'",
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
    await queryRunner.createIndex('nodes', new TableIndex({
      name: 'IDX_nodes_graphId',
      columnNames: ['graphId'],
    }));

    await queryRunner.createIndex('nodes', new TableIndex({
      name: 'IDX_nodes_type',
      columnNames: ['type'],
    }));

    await queryRunner.createIndex('nodes', new TableIndex({
      name: 'IDX_nodes_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('nodes', new TableIndex({
      name: 'IDX_nodes_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建外键
    await queryRunner.createForeignKey('nodes', new TableForeignKey({
      name: 'FK_nodes_graphId',
      columnNames: ['graphId'],
      referencedTableName: 'graphs',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    // 创建edges表
    await queryRunner.createTable(
      new Table({
        name: 'edges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'graphId',
            type: 'uuid',
          },
          {
            name: 'sourceNodeId',
            type: 'uuid',
          },
          {
            name: 'targetNodeId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'edge_type',
            default: "'default'",
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'condition',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'edge_state',
            default: "'active'",
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'style',
            type: 'jsonb',
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
    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_graphId',
      columnNames: ['graphId'],
    }));

    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_sourceNodeId',
      columnNames: ['sourceNodeId'],
    }));

    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_targetNodeId',
      columnNames: ['targetNodeId'],
    }));

    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_type',
      columnNames: ['type'],
    }));

    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('edges', new TableIndex({
      name: 'IDX_edges_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建外键
    await queryRunner.createForeignKey('edges', new TableForeignKey({
      name: 'FK_edges_graphId',
      columnNames: ['graphId'],
      referencedTableName: 'graphs',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('edges', new TableForeignKey({
      name: 'FK_edges_sourceNodeId',
      columnNames: ['sourceNodeId'],
      referencedTableName: 'nodes',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('edges', new TableForeignKey({
      name: 'FK_edges_targetNodeId',
      columnNames: ['targetNodeId'],
      referencedTableName: 'nodes',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('edges');
    await queryRunner.dropTable('nodes');
    await queryRunner.dropTable('graphs');
  }
};