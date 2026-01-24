import { ValueObject } from '../../common/value-objects/value-object';
import { MessageRole } from '../value-objects/message-role';
import { InteractionToolCall } from './interaction-tool-call';
import { ValidationError } from '../../common/exceptions';

/**
 * 交互消息实体
 *
 * 表示交互过程中的一条消息
 */
export interface InteractionMessageProps {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: InteractionToolCall[];
  timestamp?: string;
}

export class InteractionMessage extends ValueObject<InteractionMessageProps> {
  constructor(props: InteractionMessageProps) {
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
      throw new ValidationError('InteractionMessage content is required');
    }
  }
}