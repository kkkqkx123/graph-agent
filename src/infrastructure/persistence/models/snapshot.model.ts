import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Snapshot数据模型
 *
 * 用于TypeORM数据库映射
 */
@Entity('snapshots')
@Index(['scope', 'targetId'])
@Index(['type'])
@Index(['createdAt'])
export class SnapshotModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['automatic', 'manual', 'scheduled', 'error'],
    default: 'manual',
  })
  @Index()
  type!: string;

  @Column({
    type: 'enum',
    enum: ['session', 'thread', 'global'],
    default: 'thread',
  })
  @Index()
  scope!: string;

  @Column({ nullable: true })
  @Index()
  targetId?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  stateData!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'int', default: 0 })
  restoreCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestoredAt?: Date;
}
