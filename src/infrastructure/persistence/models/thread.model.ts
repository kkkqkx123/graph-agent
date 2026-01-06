import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SessionModel } from './session.model';
import { MessageModel } from './message.model';
import { ThreadStatusValue } from '../../../domain/threads/value-objects/thread-status';
import { ThreadPriorityValue } from '../../../domain/threads/value-objects/thread-priority';

@Entity('threads')
export class ThreadModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column({ nullable: true })
  workflowId?: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: Object.values(ThreadStatusValue),
    default: ThreadStatusValue.PENDING,
  })
  state!: ThreadStatusValue;

  @Column({
    type: 'enum',
    enum: Object.values(ThreadPriorityValue),
    default: ThreadPriorityValue.NORMAL,
  })
  priority!: ThreadPriorityValue;

  // 执行状态字段
  @Column({
    type: 'enum',
    enum: Object.values(ThreadStatusValue),
    default: ThreadStatusValue.PENDING,
  })
  executionStatus!: ThreadStatusValue;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ nullable: true })
  currentStep?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  @Column('jsonb')
  executionContext!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  nodeExecutions?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  workflowState?: Record<string, unknown>;

  @Column('jsonb')
  context!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => SessionModel, session => session.threads)
  session?: SessionModel;

  @OneToMany(() => MessageModel, message => message.thread)
  messages?: MessageModel[];
}
