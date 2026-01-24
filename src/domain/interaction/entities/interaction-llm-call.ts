import { ValueObject } from '../../common/value-objects/value-object';
import { InteractionMessage } from './interaction-message';
import { InteractionToolCall } from './interaction-tool-call';
import { InteractionTokenUsage } from '../value-objects/token-usage';
import { ValidationError } from '../../../common/exceptions';

/**
 * 交互LLM调用实体
 *
 * 表示交互过程中的一次LLM调用
 */
export interface InteractionLLMCallProps {
  id: string;
  provider: string;
  model: string;
  messages: InteractionMessage[];
  response: string;
  toolCalls?: InteractionToolCall[];
  usage?: InteractionTokenUsage;
  timestamp: string;
  executionTime?: number;
}

export class InteractionLLMCall extends ValueObject<InteractionLLMCallProps> {
  constructor(props: InteractionLLMCallProps) {
    super(props);
  }

  get id(): string { return this.props.id; }
  get provider(): string { return this.props.provider; }
  get model(): string { return this.props.model; }
  get messages(): InteractionMessage[] { return [...this.props.messages]; }
  get response(): string { return this.props.response; }
  get toolCalls(): InteractionToolCall[] | undefined { return this.props.toolCalls; }
  get usage(): InteractionTokenUsage | undefined { return this.props.usage; }
  get timestamp(): string { return this.props.timestamp; }
  get executionTime(): number | undefined { return this.props.executionTime; }

  validate(): void {
    if (!this.props.id) {
      throw new ValidationError('InteractionLLMCall id is required');
    }
    if (!this.props.provider) {
      throw new ValidationError('InteractionLLMCall provider is required');
    }
    if (!this.props.model) {
      throw new ValidationError('InteractionLLMCall model is required');
    }
  }
}