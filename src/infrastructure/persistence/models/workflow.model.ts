import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowStatusValue } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';

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
    enum: Object.values(WorkflowStatusValue),
    default: WorkflowStatusValue.DRAFT,
  })
  state!: WorkflowStatusValue;

  @Column({
    type: 'enum',
    enum: Object.values(WorkflowType),
    default: WorkflowType.SEQUENTIAL,
  })
  executionMode!: WorkflowType;

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
}
