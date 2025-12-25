import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ExecutionStateModel } from './execution-state.model';

/**
 * 提示词上下文数据库模型
 */
@Entity('prompt_contexts')
@Index(['executionStateId'])
export class PromptContextModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_state_id' })
  executionStateId!: string;

  @Column({ name: 'template', type: 'text' })
  template!: string;

  @Column('jsonb', { name: 'variables', nullable: true })
  variables?: Record<string, unknown>;

  @Column('jsonb', { name: 'history', nullable: true })
  history?: Array<{
    nodeId: string;
    prompt: string;
    response?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => ExecutionStateModel)
  @JoinColumn({ name: 'execution_state_id' })
  executionState?: ExecutionStateModel;
}