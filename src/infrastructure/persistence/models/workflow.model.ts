import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ExecutionStatsModel } from './execution-stats.model';

@Entity('workflows')
export class WorkflowModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft',
  })
  state!: string;

  @Column({
    type: 'enum',
    enum: ['sequential', 'parallel', 'conditional'],
    default: 'sequential',
  })
  executionMode!: string;

  @Column('jsonb', { nullable: true })
  nodes?: any;

  @Column('jsonb', { nullable: true })
  edges?: any;

  @Column('jsonb', { nullable: true })
  definition?: any;

  @Column('jsonb', { nullable: true })
  layout?: any;

  @Column('jsonb')
  metadata!: any;

  @Column('jsonb', { nullable: true })
  configuration?: any;

  @Column()
  version!: string;

  @Column({ default: 1 })
  revision!: number;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ExecutionStatsModel, stats => stats.workflow)
  executionStats?: ExecutionStatsModel[];
}
