import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

export enum ErrorHandlingStrategyType {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY = 'retry',
  SKIP = 'skip'
}

export interface ErrorHandlingStrategyProps {
  type: ErrorHandlingStrategyType;
  retryCount?: number;
  retryDelay?: number;
}

export class ErrorHandlingStrategy extends ValueObject<ErrorHandlingStrategyProps> {
  constructor(props: ErrorHandlingStrategyProps) {
    super(props);
    this.validate();
  }

  public validate(): void {
    if (!Object.values(ErrorHandlingStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的错误处理策略: ${this.props.type}`);
    }
    
    if (this.props.type === ErrorHandlingStrategyType.RETRY) {
      if (!this.props.retryCount || this.props.retryCount <= 0) {
        throw new DomainError('重试策略必须指定有效的重试次数');
      }
    }
  }

  // 业务方法
  public isStopOnError(): boolean {
    return this.props.type === ErrorHandlingStrategyType.STOP_ON_ERROR;
  }

  public isContinueOnError(): boolean {
    return this.props.type === ErrorHandlingStrategyType.CONTINUE_ON_ERROR;
  }

  public isRetry(): boolean {
    return this.props.type === ErrorHandlingStrategyType.RETRY;
  }

  public isSkip(): boolean {
    return this.props.type === ErrorHandlingStrategyType.SKIP;
  }

  public getRetryCount(): number {
    return this.props.retryCount || 0;
  }

  public getRetryDelay(): number {
    return this.props.retryDelay || 1000;
  }

  // 静态工厂方法
  public static stopOnError(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.STOP_ON_ERROR });
  }

  public static continueOnError(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.CONTINUE_ON_ERROR });
  }

  public static retry(count: number, delay: number = 1000): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ 
      type: ErrorHandlingStrategyType.RETRY,
      retryCount: count,
      retryDelay: delay
    });
  }

  public static skip(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.SKIP });
  }

  public override equals(vo?: ValueObject<ErrorHandlingStrategyProps>): boolean {
    if (!vo) return false;
    return this.props.type === (vo as ErrorHandlingStrategy).props.type &&
           this.props.retryCount === (vo as ErrorHandlingStrategy).props.retryCount &&
           this.props.retryDelay === (vo as ErrorHandlingStrategy).props.retryDelay;
  }

  public override toString(): string {
    return `ErrorHandlingStrategy(${this.props.type})`;
  }
}