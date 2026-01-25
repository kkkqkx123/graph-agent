import { ValueObject } from '../../common/value-objects/value-object';
import { ValidationError } from '../../common/exceptions';

/**
 * 工具配置值对象
 */
export interface ToolConfigProps {
  toolId: string;
  parameters: Record<string, any>;
  timeout?: number;
}

export class ToolConfig extends ValueObject<ToolConfigProps> {
  constructor(props: ToolConfigProps) {
    super(props);
  }

  get toolId(): string { return this.props.toolId; }
  get parameters(): Record<string, any> { return { ...this.props.parameters }; }
  get timeout(): number | undefined { return this.props.timeout; }

  validate(): void {
    if (!this.props.toolId) {
      throw new ValidationError('ToolConfig toolId is required');
    }
  }
}