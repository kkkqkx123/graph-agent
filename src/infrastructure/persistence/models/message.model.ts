import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ThreadModel } from './thread.model';

@Entity('messages')
export class MessageModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  threadId!: string;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system', 'tool'],
  })
  role!: string;

  @Column('text')
  content!: string;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column('jsonb', { nullable: true })
  toolCalls?: any;

  @Column('jsonb', { nullable: true })
  toolResults?: any;

  @Column({ type: 'int', default: 0 })
  tokenCount!: number;

  @Column({ default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ThreadModel, thread => thread.messages)
  thread?: ThreadModel;
}
