import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';

/**
 * LLM Function Call Interface
 */
interface LLMFunctionCall {
  name: string;
  arguments: string;
}

/**
 * LLM Tool Call Interface
 */
interface LLMToolCall {
  id: string;
  type: string;
  function: LLMFunctionCall;
}

/**
 * LLM Request Model
 *
 * 对应 Domain 层的 LLMRequest 实体
 */
@Entity('llm_requests')
export class LLMRequestModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  threadId?: string;

  @Column({ nullable: true })
  workflowId?: string;

  @Column({ nullable: true })
  nodeId?: string;

  @Column()
  model!: string;

  @Column('jsonb')
  messages!: Array<{
    role: LLMMessageRole;
    content: string;
    name?: string;
    functionCall?: LLMFunctionCall;
    toolCalls?: LLMToolCall[];
    toolCallId?: string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
  }>;

  @Column({ type: 'float', nullable: true })
  temperature?: number;

  @Column({ type: 'int', nullable: true })
  maxTokens?: number;

  @Column({ type: 'float', nullable: true })
  topP?: number;

  @Column({ type: 'float', nullable: true })
  frequencyPenalty?: number;

  @Column({ type: 'float', nullable: true })
  presencePenalty?: number;

  @Column('simple-array', { nullable: true })
  stop?: string[];

  @Column('jsonb', { nullable: true })
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;

  @Column({ type: 'enum', enum: ['none', 'auto', 'required'], nullable: true })
  toolChoice?: 'none' | 'auto' | 'required';

  @Column({ type: 'jsonb', nullable: true })
  toolChoiceFunction?: { type: string; function: { name: string } };

  @Column({ default: false })
  stream!: boolean;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], nullable: true })
  reasoningEffort?: 'low' | 'medium' | 'high';

  @Column({ type: 'enum', enum: ['concise', 'normal', 'detailed'], nullable: true })
  verbosity?: 'concise' | 'normal' | 'detailed';

  @Column({ nullable: true })
  previousResponseId?: string;

  @Column('jsonb')
  metadata!: Record<string, unknown>;

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}