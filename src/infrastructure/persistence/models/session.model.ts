import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ThreadModel } from './thread.model';

@Entity('sessions')
export class SessionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  userId?: string;

  @Column('simple-array')
  threadIds!: string[];

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'closed'],
    default: 'active'
  })
  state!: string;

  @Column('jsonb')
  context!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ThreadModel, thread => thread.session)
  threads?: ThreadModel[];
}