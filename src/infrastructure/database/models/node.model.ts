import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { GraphModel } from './graph.model';
import { EdgeModel } from './edge.model';

@Entity('nodes')
export class NodeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  graphId!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: ['llm', 'tool', 'condition', 'wait', 'start', 'end'],
    default: 'llm'
  })
  type!: string;

  @Column('jsonb')
  configuration!: any;

  @Column('jsonb')
  position!: {
    x: number;
    y: number;
  };

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => GraphModel, graph => graph.nodes)
  graph?: GraphModel;

  @OneToMany(() => EdgeModel, edge => edge.sourceNode)
  outgoingEdges?: EdgeModel[];

  @OneToMany(() => EdgeModel, edge => edge.targetNode)
  incomingEdges?: EdgeModel[];
}