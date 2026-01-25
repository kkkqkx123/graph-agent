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
 * LLM Response Model
 *
 * 对应 Domain 层的 LLMResponse 实体
 */
@Entity('llm_responses')
export class LLMResponseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  requestId!: string;

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
  choices!: Array<{
    index: number;
    message: {
      role: LLMMessageRole;
      content: string;
      name?: string;
      functionCall?: LLMFunctionCall;
      toolCalls?: LLMToolCall[];
      toolCallId?: string;
      timestamp?: Date;
      metadata?: Record<string, unknown>;
    };
    finish_reason: string;
  }>;

  @Column('jsonb')
  usage!: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    promptTokensCost?: number;
    completionTokensCost?: number;
    totalCost?: number;
    reasoningTokens?: number;
    metadata?: Record<string, unknown>;
  };

  @Column()
  finishReason!: string;

  @Column({ type: 'int' })
  duration!: number;

  @Column('jsonb')
  metadata!: Record<string, unknown>;

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}