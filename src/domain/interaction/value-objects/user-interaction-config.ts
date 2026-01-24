import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 用户交互配置值对象
 */
export interface UserInteractionConfigProps {
  interactionType: 'input' | 'confirmation' | 'selection';
  prompt: string;
  options?: string[];
  timeout?: number;
}

export class UserInteractionConfig extends ValueObject<UserInteractionConfigProps> {
  constructor(props: UserInteractionConfigProps) {
    super(props);
  }

  get interactionType(): 'input' | 'confirmation' | 'selection' { return this.props.interactionType; }
  get prompt(): string { return this.props.prompt; }
  get options(): string[] | undefined { return this.props.options; }
  get timeout(): number | undefined { return this.props.timeout; }

  validate(): void {
    if (!this.props.prompt) {
      throw new Error('UserInteractionConfig prompt is required');
    }
  }
}