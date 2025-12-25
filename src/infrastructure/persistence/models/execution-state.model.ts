import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { NodeExecutionStateModel } from './node-execution-state.model';

/**
 * 执行状态数据库模型
 */
@Entity('execution_states')
@Index(['workflowId'])
@Index(['threadId'])
@Index(['status'])
export class ExecutionStateModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id' })
  executionId!: string;

  @Column({ name: 'workflow_id' })
  workflowId!: string;

  @Column({ name: 'thread_id' })
  threadId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending'
  })
  status!: string;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ name: 'duration', type: 'bigint', nullable: true })
  duration?: number;

  @Column('jsonb', { name: 'variables', nullable: true })
  variables?: Record<string, unknown>;

  @Column('jsonb', { name: 'execution_history', nullable: true })
  executionHistory?: Array<{
    stepId: string;
    nodeId: string;
    name: string;
    startTime: Date;
    endTime?: Date;
    status: string;
    input?: unknown;
    output?: unknown;
    error?: Error;
    metadata?: Record<string, unknown>;
  }>;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'version', default: 1 })
  version!: number;

  @OneToMany(() => NodeExecutionStateModel, nodeState => nodeState.executionState)
  nodeStates?: NodeExecutionStateModel[];
}