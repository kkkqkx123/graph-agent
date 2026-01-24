import { ValueObject } from '../../common/value-objects/value-object';
import { ValidationError } from '../../../common/exceptions';

/**
 * 交互工具调用实体
 *
 * 表示交互过程中的一次工具调用
 */
export interface InteractionToolCallProps {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  executionTime?: number;
  timestamp?: string;
}

export class InteractionToolCall extends ValueObject<InteractionToolCallProps> {
  constructor(props: InteractionToolCallProps) {
    super({
      ...props,
      timestamp: props.timestamp || new Date().toISOString(),
    });
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get arguments(): Record<string, any> { return { ...this.props.arguments }; }
  get result(): any { return this.props.result; }
  get executionTime(): number | undefined { return this.props.executionTime; }
  get timestamp(): string { return this.props.timestamp!; }

  validate(): void {
    if (!this.props.id) {
      throw new ValidationError('InteractionToolCall id is required');
    }
    if (!this.props.name) {
      throw new ValidationError('InteractionToolCall name is required');
    }
  }
}