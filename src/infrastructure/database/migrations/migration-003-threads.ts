import { QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { Migration } from './migration-runner';

export const migration003: Migration = {
  id: '003-threads',
  name: 'Create threads and messages tables',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    // 创建threads表
    await queryRunner.createTable(
      new Table({
        name: 'threads',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sessionId',
            type: 'uuid',
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
            name: 'state',
            type: 'thread_state',
            default: "'active'",
          },
          {
            name: 'priority',
            type: 'thread_priority',
            default: "'medium'",
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
    await queryRunner.createIndex('threads', new TableIndex({
      name: 'IDX_threads_sessionId',
      columnNames: ['sessionId'],
    }));

    await queryRunner.createIndex('threads', new TableIndex({
      name: 'IDX_threads_state',
      columnNames: ['state'],
    }));

    await queryRunner.createIndex('threads', new TableIndex({
      name: 'IDX_threads_priority',
      columnNames: ['priority'],
    }));

    await queryRunner.createIndex('threads', new TableIndex({
      name: 'IDX_threads_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建外键
    await queryRunner.createForeignKey('threads', new TableForeignKey({
      name: 'FK_threads_sessionId',
      columnNames: ['sessionId'],
      referencedTableName: 'sessions',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    // 创建messages表
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'threadId',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'message_role',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'toolCalls',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'toolResults',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tokenCount',
            type: 'int',
            default: 0,
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
    await queryRunner.createIndex('messages', new TableIndex({
      name: 'IDX_messages_threadId',
      columnNames: ['threadId'],
    }));

    await queryRunner.createIndex('messages', new TableIndex({
      name: 'IDX_messages_role',
      columnNames: ['role'],
    }));

    await queryRunner.createIndex('messages', new TableIndex({
      name: 'IDX_messages_createdAt',
      columnNames: ['createdAt'],
    }));

    // 创建外键
    await queryRunner.createForeignKey('messages', new TableForeignKey({
      name: 'FK_messages_threadId',
      columnNames: ['threadId'],
      referencedTableName: 'threads',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages');
    await queryRunner.dropTable('threads');
  }
};