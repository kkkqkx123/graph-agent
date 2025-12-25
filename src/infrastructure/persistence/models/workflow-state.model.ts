import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ExecutionStateModel } from './execution-state.model';

/**
 * 工作流状态数据库模型
 */
@Entity('workflow_states')
@Index(['executionStateId'])
@Index(['status'])
export class WorkflowStateModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_state_id' })
  executionStateId!: string;

  @Column({ name: 'workflow_id' })
  workflowId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending'
  })
  status!: string;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress!: number;

  @Column({ name: 'current_node_id', nullable: true })
  currentNodeId?: string;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ name: 'duration', type: 'bigint', nullable: true })
  duration?: number;

  @Column({ name: 'completed_nodes', type: 'int', default: 0 })
  completedNodes!: number;

  @Column({ name: 'total_nodes', type: 'int', default: 0 })
  totalNodes!: number;

  @Column({ name: 'failed_nodes', type: 'int', default: 0 })
  failedNodes!: number;

  @Column({ name: 'skipped_nodes', type: 'int', default: 0 })
  skippedNodes!: number;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'version', default: 1 })
  version!: number;

  @ManyToOne(() => ExecutionStateModel)
  @JoinColumn({ name: 'execution_state_id' })
  executionState?: ExecutionStateModel;
}