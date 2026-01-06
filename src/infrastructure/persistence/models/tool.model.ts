import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tool Model
 *
 * 对应 Domain 层的 Tool 实体
 */
@Entity('tools')
export class ToolModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: ['builtin', 'native', 'rest', 'mcp', 'custom'],
    default: 'builtin',
  })
  type!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'deprecated', 'archived'],
    default: 'draft',
  })
  status!: string;

  @Column('jsonb')
  config!: Record<string, unknown>;

  @Column('jsonb')
  parameters!: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
        items?: any;
        properties?: Record<string, any>;
        required?: string[];
      }
    >;
    required: string[];
  };

  @Column('jsonb', { nullable: true })
  returns?: {
    type: string;
    description?: string;
    properties?: Record<string, any>;
    items?: any;
  };

  @Column('jsonb')
  metadata!: Record<string, unknown>;

  @Column({ default: '1.0.0' })
  version!: string;

  @Column({ nullable: true })
  createdBy?: string;

  @Column('simple-array')
  tags!: string[];

  @Column()
  category!: string;

  @Column({ default: false })
  isBuiltin!: boolean;

  @Column({ default: true })
  isEnabled!: boolean;

  @Column({ type: 'int', default: 30000 })
  timeout!: number;

  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  @Column('simple-array')
  permissions!: string[];

  @Column('simple-array')
  dependencies!: string[];

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}