import { ValueObject } from '../../common/value-objects/value-object';
import { ValidationError } from '../../common/exceptions';

/**
 * Token 使用情况值对象
 */
export interface InteractionTokenUsageProps {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class InteractionTokenUsage extends ValueObject<InteractionTokenUsageProps> {
  constructor(props: InteractionTokenUsageProps) {
    super(props);
  }

  get promptTokens(): number { return this.props.promptTokens; }
  get completionTokens(): number { return this.props.completionTokens; }
  get totalTokens(): number { return this.props.totalTokens; }

  /**
   * 累加 Token 使用量
   */
  add(other: InteractionTokenUsage): InteractionTokenUsage {
    return new InteractionTokenUsage({
      promptTokens: this.props.promptTokens + other.props.promptTokens,
      completionTokens: this.props.completionTokens + other.props.completionTokens,
      totalTokens: this.props.totalTokens + other.props.totalTokens,
    });
  }

  validate(): void {
    if (this.props.promptTokens < 0) {
      throw new ValidationError('promptTokens cannot be negative');
    }
    if (this.props.completionTokens < 0) {
      throw new ValidationError('completionTokens cannot be negative');
    }
    if (this.props.totalTokens < 0) {
      throw new ValidationError('totalTokens cannot be negative');
    }
  }
}