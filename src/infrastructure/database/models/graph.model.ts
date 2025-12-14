import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { WorkflowModel } from './workflow.model';
import { NodeModel } from './node.model';
import { EdgeModel } from './edge.model';

@Entity('graphs')
export class GraphModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  definition!: any;

  @Column('jsonb')
  layout!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({
    type: 'enum',
    enum: ['draft', 'validated', 'active', 'inactive'],
    default: 'draft'
  })
  state!: string;

  @Column({ default: 1 })
  version!: number;

  @Column({ nullable: true })
  workflowId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => WorkflowModel, workflow => workflow.graph)
  workflow?: WorkflowModel;

  @OneToMany(() => NodeModel, node => node.graph)
  nodes?: NodeModel[];

  @OneToMany(() => EdgeModel, edge => edge.graph)
  edges?: EdgeModel[];
}