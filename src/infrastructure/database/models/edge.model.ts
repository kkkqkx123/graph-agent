import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { GraphModel } from './graph.model';
import { NodeModel } from './node.model';

@Entity('edges')
export class EdgeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  graphId!: string;

  @Column()
  sourceNodeId!: string;

  @Column()
  targetNodeId!: string;

  @Column({
    type: 'enum',
    enum: ['default', 'conditional', 'flexible_conditional'],
    default: 'default'
  })
  type!: string;

  @Column({ nullable: true })
  label?: string;

  @Column('jsonb', { nullable: true })
  condition?: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  })
  state!: string;

  @Column({ default: 1 })
  version!: number;

  @Column('jsonb', { nullable: true })
  style?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => GraphModel, graph => graph.edges)
  graph?: GraphModel;

  @ManyToOne(() => NodeModel, node => node.outgoingEdges)
  sourceNode?: NodeModel;

  @ManyToOne(() => NodeModel, node => node.incomingEdges)
  targetNode?: NodeModel;
}