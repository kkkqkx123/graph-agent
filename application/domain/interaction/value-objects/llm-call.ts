import { ValueObject } from '../../common/value-objects/value-object';
import { Message } from './message';
import { ToolCall } from './tool-call';
import { InteractionTokenUsage } from './token-usage';
import { ValidationError } from '../../common/exceptions';

/**
 * LLM 调用值对象
 */
export interface LLMCallProps {
  id: string;
  provider: string;
  model: string;
  messages: Message[];
  response: string;
  toolCalls?: ToolCall[];
  usage?: InteractionTokenUsage;
  timestamp: string;
  executionTime?: number;
}

export class LLMCall extends ValueObject<LLMCallProps> {
  constructor(props: LLMCallProps) {
    super(props);
  }

  get id(): string { return this.props.id; }
  get provider(): string { return this.props.provider; }
  get model(): string { return this.props.model; }
  get messages(): Message[] { return [...this.props.messages]; }
  get response(): string { return this.props.response; }
  get toolCalls(): ToolCall[] | undefined { return this.props.toolCalls; }
  get usage(): InteractionTokenUsage | undefined { return this.props.usage; }
  get timestamp(): string { return this.props.timestamp; }
  get executionTime(): number | undefined { return this.props.executionTime; }

  validate(): void {
    if (!this.props.id) {
      throw new ValidationError('LLMCall id is required');
    }
    if (!this.props.provider) {
      throw new ValidationError('LLMCall provider is required');
    }
    if (!this.props.model) {
      throw new ValidationError('LLMCall model is required');
    }
  }
}