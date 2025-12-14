import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { GraphModel } from './graph.model';

@Entity('workflows')
export class WorkflowModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  graphId!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  })
  state!: string;

  @Column({
    type: 'enum',
    enum: ['sequential', 'parallel', 'conditional'],
    default: 'sequential'
  })
  executionMode!: string;

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

  @OneToOne(() => GraphModel, graph => graph.workflow)
  @JoinColumn()
  graph?: GraphModel;
}