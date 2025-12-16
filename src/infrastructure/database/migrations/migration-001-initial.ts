import { QueryRunner } from 'typeorm';
import { Migration } from './migration-runner';

export const migration001: Migration = {
  id: '001-initial',
  name: 'Initial database schema',

  async up(queryRunner: QueryRunner): Promise<void> {
    // 创建扩展
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 创建枚举类型
    await queryRunner.query(`
      CREATE TYPE session_state AS ENUM ('active', 'paused', 'closed')
    `);

    await queryRunner.query(`
      CREATE TYPE thread_state AS ENUM ('active', 'paused', 'completed', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE thread_priority AS ENUM ('low', 'medium', 'high', 'urgent')
    `);

    await queryRunner.query(`
      CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool')
    `);

    await queryRunner.query(`
      CREATE TYPE workflow_state AS ENUM ('draft', 'active', 'inactive', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE execution_mode AS ENUM ('sequential', 'parallel', 'conditional')
    `);

    await queryRunner.query(`
      CREATE TYPE workflow_state AS ENUM ('draft', 'validated', 'active', 'inactive')
    `);

    await queryRunner.query(`
      CREATE TYPE node_type AS ENUM ('llm', 'tool', 'condition', 'wait', 'start', 'end')
    `);

    await queryRunner.query(`
      CREATE TYPE node_state AS ENUM ('active', 'inactive', 'error')
    `);

    await queryRunner.query(`
      CREATE TYPE edge_type AS ENUM ('default', 'conditional', 'flexible_conditional')
    `);

    await queryRunner.query(`
      CREATE TYPE edge_state AS ENUM ('active', 'inactive', 'error')
    `);

    await queryRunner.query(`
      CREATE TYPE history_action AS ENUM ('created', 'updated', 'deleted', 'executed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE checkpoint_type AS ENUM (
        'node_start', 'node_complete', 'node_error', 
        'edge_evaluated', 'workflow_start', 'workflow_complete', 'workflow_error'
      )
    `);
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    // 删除枚举类型
    await queryRunner.query('DROP TYPE IF EXISTS checkpoint_type');
    await queryRunner.query('DROP TYPE IF EXISTS history_action');
    await queryRunner.query('DROP TYPE IF EXISTS edge_state');
    await queryRunner.query('DROP TYPE IF EXISTS edge_type');
    await queryRunner.query('DROP TYPE IF EXISTS node_state');
    await queryRunner.query('DROP TYPE IF EXISTS node_type');
    await queryRunner.query('DROP TYPE IF EXISTS workflow_state');
    await queryRunner.query('DROP TYPE IF EXISTS execution_mode');
    await queryRunner.query('DROP TYPE IF EXISTS workflow_state');
    await queryRunner.query('DROP TYPE IF EXISTS message_role');
    await queryRunner.query('DROP TYPE IF EXISTS thread_priority');
    await queryRunner.query('DROP TYPE IF EXISTS thread_state');
    await queryRunner.query('DROP TYPE IF EXISTS session_state');

    // 删除扩展
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
};