import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ExecutionStateModel } from './execution-state.model';

/**
 * 节点执行状态数据库模型
 */
@Entity('node_execution_states')
@Index(['executionStateId'])
@Index(['nodeId'])
@Index(['status'])
export class NodeExecutionStateModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_state_id' })
  executionStateId!: string;

  @Column({ name: 'node_id' })
  nodeId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'cancelled'],
    default: 'pending'
  })
  status!: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column('jsonb', { name: 'result', nullable: true })
  result?: unknown;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column('text', { name: 'error_stack', nullable: true })
  errorStack?: string;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ name: 'duration', type: 'bigint', nullable: true })
  duration?: number;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'version', default: 1 })
  version!: number;

  @ManyToOne(() => ExecutionStateModel, executionState => executionState.nodeStates)
  @JoinColumn({ name: 'execution_state_id' })
  executionState?: ExecutionStateModel;
}