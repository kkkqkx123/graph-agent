import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

export enum ExecutionStrategyType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

export interface ExecutionStrategyProps {
  type: ExecutionStrategyType;
  maxConcurrency?: number;
  condition?: string;
}

export class ExecutionStrategy extends ValueObject<ExecutionStrategyProps> {
  constructor(props: ExecutionStrategyProps) {
    super(props);
    this.validate();
  }

  public validate(): void {
    if (!Object.values(ExecutionStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的执行策略: ${this.props.type}`);
    }
    
    if (this.props.type === ExecutionStrategyType.PARALLEL) {
      if (this.props.maxConcurrency && this.props.maxConcurrency <= 0) {
        throw new DomainError('并行策略的最大并发数必须大于0');
      }
    }
    
    if (this.props.type === ExecutionStrategyType.CONDITIONAL) {
      if (!this.props.condition) {
        throw new DomainError('条件策略必须指定条件表达式');
      }
    }
  }

  // 业务方法
  public isSequential(): boolean {
    return this.props.type === ExecutionStrategyType.SEQUENTIAL;
  }

  public isParallel(): boolean {
    return this.props.type === ExecutionStrategyType.PARALLEL;
  }

  public isConditional(): boolean {
    return this.props.type === ExecutionStrategyType.CONDITIONAL;
  }

  public getMaxConcurrency(): number {
    return this.props.maxConcurrency || 1;
  }

  public getCondition(): string | undefined {
    return this.props.condition;
  }

  // 静态工厂方法
  public static sequential(): ExecutionStrategy {
    return new ExecutionStrategy({ type: ExecutionStrategyType.SEQUENTIAL });
  }

  public static parallel(maxConcurrency: number = 4): ExecutionStrategy {
    return new ExecutionStrategy({ 
      type: ExecutionStrategyType.PARALLEL,
      maxConcurrency
    });
  }

  public static conditional(condition: string): ExecutionStrategy {
    return new ExecutionStrategy({
      type: ExecutionStrategyType.CONDITIONAL,
      condition
    });
  }

  public override equals(vo?: ValueObject<ExecutionStrategyProps>): boolean {
    if (!vo) return false;
    return this.props.type === (vo as ExecutionStrategy).props.type &&
           this.props.maxConcurrency === (vo as ExecutionStrategy).props.maxConcurrency &&
           this.props.condition === (vo as ExecutionStrategy).props.condition;
  }

  public override toString(): string {
    return `ExecutionStrategy(${this.props.type})`;
  }
}