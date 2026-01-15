import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('thread_checkpoints')
@Index(['threadId'])  // 线程查询
@Index(['threadId', 'createdAt'])  // 复合索引（按时间排序）
@Index(['scope', 'targetId'])  // 范围和目标ID查询
@Index(['expiresAt'])  // 过期清理
@Index(['status'])  // 状态查询
@Index(['type'])  // 类型查询
export class ThreadCheckpointModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'thread_id' })
  threadId!: string;

  @Column({ type: 'varchar', length: 20, name: 'scope' })
  scope!: string;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId?: string;

  @Column({ type: 'varchar', length: 50, name: 'checkpoint_type' })
  type!: string;

  @Column({ type: 'varchar', length: 50, name: 'checkpoint_status' })
  status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', name: 'state_data' })
  stateData!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '[]' })
  tags!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'integer', name: 'size_bytes', default: 0 })
  sizeBytes!: number;

  @Column({ type: 'integer', name: 'restore_count', default: 0 })
  restoreCount!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_restored_at' })
  lastRestoredAt?: Date;

  @Column({ type: 'varchar', length: 10, name: 'version' })
  version!: string;

  @Column({ type: 'boolean', name: 'is_deleted', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
