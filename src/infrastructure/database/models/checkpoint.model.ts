import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('checkpoints')
export class CheckpointModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  executionId!: string;

  @Column()
  entityType!: string;

  @Column()
  entityId!: string;

  @Column({
    type: 'enum',
    enum: ['node_start', 'node_complete', 'node_error', 'edge_evaluated', 'workflow_start', 'workflow_complete', 'workflow_error'],
    default: 'node_start'
  })
  checkpointType!: string;

  @Column('jsonb')
  state!: any;

  @Column('jsonb', { nullable: true })
  context?: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ nullable: true })
  nodeId?: string;

  @Column({ nullable: true })
  edgeId?: string;

  @Column({ nullable: true })
  workflowId?: string;

  @Column({ nullable: true })
  graphId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  threadId?: string;

  @Column({ type: 'bigint', nullable: true })
  timestamp?: number;

  @Column({ type: 'int', nullable: true })
  order?: number;

  @Column({ default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}