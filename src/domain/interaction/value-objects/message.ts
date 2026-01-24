import { ValueObject } from '../../common/value-objects/value-object';
import { MessageRole } from './message-role';
import { InteractionToolCall } from '../entities/interaction-tool-call';
import { ValidationError } from '../../common/exceptions';

/**
 * 消息值对象
 */
export interface MessageProps {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: InteractionToolCall[];
  timestamp?: string;
}

export class Message extends ValueObject<MessageProps> {
  constructor(props: MessageProps) {
    super({
      ...props,
      timestamp: props.timestamp || new Date().toISOString(),
    });
  }

  get role(): MessageRole { return this.props.role; }
  get content(): string { return this.props.content; }
  get toolCallId(): string | undefined { return this.props.toolCallId; }
  get toolCalls(): InteractionToolCall[] | undefined { return this.props.toolCalls; }
  get timestamp(): string { return this.props.timestamp!; }

  validate(): void {
    if (!this.props.content) {
      throw new ValidationError('Message content is required');
    }
  }
}