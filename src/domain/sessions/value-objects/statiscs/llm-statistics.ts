import { ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 模型统计信息接口
 */
export interface ModelStatistics {
  readonly modelName: string;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly callCount: number;
  readonly averageTokensPerCall: number;
}

/**
 * 时间序列统计接口
 */
export interface TimeSeriesStatistics {
  readonly timestamp: Date;
  readonly tokens: number;
  readonly cost: number;
  readonly callCount: number;
}

/**
 * 成本分析接口
 */
export interface CostAnalysis {
  readonly totalCost: number;
  readonly currency: string;
  readonly costByModel: Map<string, number>;
  readonly costTrend: TimeSeriesStatistics[];
  readonly averageCostPerCall: number;
}

/**
 * LLM统计信息属性接口
 */
export interface LLMStatisticsProps {
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly byModel: Map<string, ModelStatistics>;
  readonly byTime: TimeSeriesStatistics[];
  readonly costAnalysis: CostAnalysis;
}

/**
 * LLM统计信息值对象
 *
 * 职责：表示LLM使用统计信息
 */
export class LLMStatistics extends ValueObject<LLMStatisticsProps> {
  /**
   * 创建LLM统计信息
   * @returns LLM统计信息实例
   */
  public static create(): LLMStatistics {
    return new LLMStatistics({
      totalTokens: 0,
      totalCost: 0,
      byModel: new Map(),
      byTime: [],
      costAnalysis: {
        totalCost: 0,
        currency: 'USD',
        costByModel: new Map(),
        costTrend: [],
        averageCostPerCall: 0,
      },
    });
  }

  /**
   * 获取总Token数
   * @returns 总Token数
   */
  public get totalTokens(): number {
    return this.props.totalTokens;
  }

  /**
   * 获取总成本
   * @returns 总成本
   */
  public get totalCost(): number {
    return this.props.totalCost;
  }

  /**
   * 获取按模型统计
   * @returns 按模型统计
   */
  public get byModel(): Map<string, ModelStatistics> {
    return new Map(this.props.byModel);
  }

  /**
   * 获取按时间统计
   * @returns 按时间统计
   */
  public get byTime(): TimeSeriesStatistics[] {
    return [...this.props.byTime];
  }

  /**
   * 获取成本分析
   * @returns 成本分析
   */
  public get costAnalysis(): CostAnalysis {
    return this.props.costAnalysis;
  }

  /**
   * 添加LLM调用记录
   * @param modelName 模型名称
   * @param tokens Token数
   * @param cost 成本
   * @returns 新的LLM统计信息实例
   */
  public addLLMCall(modelName: string, tokens: number, cost: number): LLMStatistics {
    const newByModel = new Map(this.props.byModel);
    const existingModel = newByModel.get(modelName);

    if (existingModel) {
      newByModel.set(modelName, {
        modelName,
        totalTokens: existingModel.totalTokens + tokens,
        totalCost: existingModel.totalCost + cost,
        callCount: existingModel.callCount + 1,
        averageTokensPerCall: (existingModel.totalTokens + tokens) / (existingModel.callCount + 1),
      });
    } else {
      newByModel.set(modelName, {
        modelName,
        totalTokens: tokens,
        totalCost: cost,
        callCount: 1,
        averageTokensPerCall: tokens,
      });
    }

    const newByTime = [
      ...this.props.byTime,
      {
        timestamp: new Date(),
        tokens,
        cost,
        callCount: 1,
      },
    ];

    const newCostByModel = new Map(this.props.costAnalysis.costByModel);
    const existingCost = newCostByModel.get(modelName) || 0;
    newCostByModel.set(modelName, existingCost + cost);

    const totalCalls = Array.from(newByModel.values()).reduce(
      (sum, model) => sum + model.callCount,
      0
    );
    const newCostAnalysis: CostAnalysis = {
      totalCost: this.props.totalCost + cost,
      currency: 'USD',
      costByModel: newCostByModel,
      costTrend: newByTime,
      averageCostPerCall: (this.props.totalCost + cost) / totalCalls,
    };

    return new LLMStatistics({
      totalTokens: this.props.totalTokens + tokens,
      totalCost: this.props.totalCost + cost,
      byModel: newByModel,
      byTime: newByTime,
      costAnalysis: newCostAnalysis,
    });
  }

  /**
   * 验证LLM统计信息的有效性
   */
  public validate(): void {
    if (this.props.totalTokens < 0) {
      throw new ValidationError('总Token数不能为负数');
    }

    if (this.props.totalCost < 0) {
      throw new ValidationError('总成本不能为负数');
    }

    // 验证模型统计
    for (const [modelName, modelStats] of this.props.byModel.entries()) {
      if (modelStats.totalTokens < 0) {
        throw new ValidationError(`模型 ${modelName} 的Token数不能为负数`);
      }
      if (modelStats.totalCost < 0) {
        throw new ValidationError(`模型 ${modelName} 的成本不能为负数`);
      }
      if (modelStats.callCount < 0) {
        throw new ValidationError(`模型 ${modelName} 的调用次数不能为负数`);
      }
    }
  }
}
