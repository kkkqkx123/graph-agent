import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('history')
export class HistoryModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  entityType!: string;

  @Column()
  entityId!: string;

  @Column({
    type: 'enum',
    enum: ['created', 'updated', 'deleted', 'executed', 'failed'],
    default: 'created'
  })
  action!: string;

  @Column('jsonb')
  data!: any;

  @Column('jsonb', { nullable: true })
  previousData?: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  threadId?: string;

  @Column({ nullable: true })
  workflowId?: string;

  @Column({ nullable: true })
  nodeId?: string;

  @Column({ nullable: true })
  edgeId?: string;

  @Column({ type: 'bigint', nullable: true })
  timestamp?: number;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}