import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowModel } from './workflow.model';

@Entity('execution_stats')
@Index(['workflowId'], { unique: true })
export class ExecutionStatsModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column({ default: 0 })
  executionCount!: number;

  @Column({ default: 0 })
  successCount!: number;

  @Column({ default: 0 })
  failureCount!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  averageExecutionTime?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => WorkflowModel, workflow => workflow.executionStats)
  @JoinColumn({ name: 'workflowId' })
  workflow?: WorkflowModel;
}
