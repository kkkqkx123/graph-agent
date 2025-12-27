import { ValueObject } from '../../../common/value-objects/value-object';

/**
 * Fork操作统计接口
 */
export interface ForkOperationStatistics {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly byStrategy: Map<string, number>;
}

/**
 * Copy操作统计接口
 */
export interface CopyOperationStatistics {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
}

/**
 * 操作统计信息属性接口
 */
export interface OperationStatisticsProps {
  readonly forkOperations: ForkOperationStatistics;
  readonly copyOperations: CopyOperationStatistics;
  readonly otherOperations: Map<string, number>;
}

/**
 * 操作统计信息值对象
 * 
 * 职责：表示操作统计信息
 */
export class OperationStatistics extends ValueObject<OperationStatisticsProps> {
  /**
   * 创建操作统计信息
   * @returns 操作统计信息实例
   */
  public static create(): OperationStatistics {
    return new OperationStatistics({
      forkOperations: {
        total: 0,
        successful: 0,
        failed: 0,
        byStrategy: new Map()
      },
      copyOperations: {
        total: 0,
        successful: 0,
        failed: 0
      },
      otherOperations: new Map()
    });
  }

  /**
   * 获取Fork操作统计
   * @returns Fork操作统计
   */
  public get forkOperations(): ForkOperationStatistics {
    return this.props.forkOperations;
  }

  /**
   * 获取Copy操作统计
   * @returns Copy操作统计
   */
  public get copyOperations(): CopyOperationStatistics {
    return this.props.copyOperations;
  }

  /**
   * 获取其他操作统计
   * @returns 其他操作统计
   */
  public get otherOperations(): Map<string, number> {
    return new Map(this.props.otherOperations);
  }

  /**
   * 记录Fork操作
   * @param strategy Fork策略
   * @param success 是否成功
   * @returns 新的操作统计信息实例
   */
  public recordForkOperation(strategy: string, success: boolean): OperationStatistics {
    const newByStrategy = new Map(this.props.forkOperations.byStrategy);
    const strategyCount = newByStrategy.get(strategy) || 0;
    newByStrategy.set(strategy, strategyCount + 1);

    const newForkOperations: ForkOperationStatistics = {
      total: this.props.forkOperations.total + 1,
      successful: success ? this.props.forkOperations.successful + 1 : this.props.forkOperations.successful,
      failed: success ? this.props.forkOperations.failed : this.props.forkOperations.failed + 1,
      byStrategy: newByStrategy
    };

    return new OperationStatistics({
      ...this.props,
      forkOperations: newForkOperations
    });
  }

  /**
   * 记录Copy操作
   * @param success 是否成功
   * @returns 新的操作统计信息实例
   */
  public recordCopyOperation(success: boolean): OperationStatistics {
    const newCopyOperations: CopyOperationStatistics = {
      total: this.props.copyOperations.total + 1,
      successful: success ? this.props.copyOperations.successful + 1 : this.props.copyOperations.successful,
      failed: success ? this.props.copyOperations.failed : this.props.copyOperations.failed + 1
    };

    return new OperationStatistics({
      ...this.props,
      copyOperations: newCopyOperations
    });
  }

  /**
   * 记录其他操作
   * @param operationType 操作类型
   * @returns 新的操作统计信息实例
   */
  public recordOtherOperation(operationType: string): OperationStatistics {
    const newOtherOperations = new Map(this.props.otherOperations);
    const count = newOtherOperations.get(operationType) || 0;
    newOtherOperations.set(operationType, count + 1);

    return new OperationStatistics({
      ...this.props,
      otherOperations: newOtherOperations
    });
  }

  /**
   * 验证操作统计信息的有效性
   */
  public validate(): void {
    // 验证Fork操作统计
    if (this.props.forkOperations.total < 0) {
      throw new Error('Fork操作总数不能为负数');
    }
    if (this.props.forkOperations.successful < 0) {
      throw new Error('Fork操作成功数不能为负数');
    }
    if (this.props.forkOperations.failed < 0) {
      throw new Error('Fork操作失败数不能为负数');
    }
    if (this.props.forkOperations.successful + this.props.forkOperations.failed > this.props.forkOperations.total) {
      throw new Error('Fork操作成功数和失败数之和不能大于总数');
    }

    // 验证Copy操作统计
    if (this.props.copyOperations.total < 0) {
      throw new Error('Copy操作总数不能为负数');
    }
    if (this.props.copyOperations.successful < 0) {
      throw new Error('Copy操作成功数不能为负数');
    }
    if (this.props.copyOperations.failed < 0) {
      throw new Error('Copy操作失败数不能为负数');
    }
    if (this.props.copyOperations.successful + this.props.copyOperations.failed > this.props.copyOperations.total) {
      throw new Error('Copy操作成功数和失败数之和不能大于总数');
    }

    // 验证其他操作统计
    for (const [operationType, count] of this.props.otherOperations.entries()) {
      if (count < 0) {
        throw new Error(`操作 ${operationType} 的计数不能为负数`);
      }
    }
  }
}