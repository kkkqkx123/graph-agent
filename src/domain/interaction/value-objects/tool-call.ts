import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 工具调用值对象
 */
export interface ToolCallProps {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  executionTime?: number;
  timestamp?: string;
}

export class ToolCall extends ValueObject<ToolCallProps> {
  constructor(props: ToolCallProps) {
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
      throw new Error('ToolCall id is required');
    }
    if (!this.props.name) {
      throw new Error('ToolCall name is required');
    }
  }
}