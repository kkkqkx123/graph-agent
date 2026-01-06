import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ThreadModel } from './thread.model';
import { SessionStatusValue } from '../../../domain/sessions/value-objects/session-status';

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
    enum: Object.values(SessionStatusValue),
    default: SessionStatusValue.ACTIVE,
  })
  state!: SessionStatusValue;

  @Column('jsonb')
  context!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ThreadModel, thread => thread.session)
  threads?: ThreadModel[];
}
