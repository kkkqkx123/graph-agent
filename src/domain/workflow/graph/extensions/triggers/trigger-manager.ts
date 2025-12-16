import { BaseTrigger, TriggerConfig } from './base-trigger';
import { TriggerType } from './trigger-type';
import { TriggerState } from './trigger-state';
import { TriggerContext } from './trigger-context';
import { TriggerExecutionResult } from './trigger-execution-result';
import { 
  TimeTrigger, 
  EventTrigger, 
  ConditionTrigger, 
  ManualTrigger 
} from './predefined-triggers';

/**
 * 触发器管理器接口
 */
export interface ITriggerManager {
  /**
   * 注册触发器
   */
  registerTrigger(trigger: BaseTrigger): Promise<void>;

  /**
   * 注销触发器
   */
  unregisterTrigger(triggerId: string): Promise<void>;

  /**
   * 获取触发器
   */
  getTrigger(triggerId: string): BaseTrigger | undefined;

  /**
   * 获取所有触发器
   */
  getAllTriggers(): BaseTrigger[];

  /**
   * 获取指定图的所有触发器
   */
  getTriggersByGraph(graphId: string): BaseTrigger[];

  /**
   * 获取指定类型的所有触发器
   */
  getTriggersByType(type: TriggerType): BaseTrigger[];

  /**
   * 获取指定状态的所有触发器
   */
  getTriggersByState(state: TriggerState): BaseTrigger[];

  /**
   * 激活触发器
   */
  activateTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 停用触发器
   */
  deactivateTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 暂停触发器
   */
  pauseTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 恢复触发器
   */
  resumeTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 禁用触发器
   */
  disableTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 启用触发器
   */
  enableTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 触发执行
   */
  triggerExecution(triggerId: string, context: TriggerContext): Promise<TriggerExecutionResult>;

  /**
   * 重置触发器
   */
  resetTrigger(triggerId: string): Promise<TriggerExecutionResult>;

  /**
   * 更新触发器配置
   */
  updateTriggerConfig(triggerId: string, newConfig: Partial<TriggerConfig>): Promise<TriggerExecutionResult>;

  /**
   * 批量激活触发器
   */
  activateTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 批量停用触发器
   */
  deactivateTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 批量暂停触发器
   */
  pauseTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 批量恢复触发器
   */
  resumeTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 批量禁用触发器
   */
  disableTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 批量启用触发器
   */
  enableTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]>;

  /**
   * 清除所有触发器
   */
  clearAllTriggers(): Promise<void>;

  /**
   * 获取触发器统计信息
   */
  getTriggerStatistics(): TriggerStatistics;
}

/**
 * 触发器统计信息
 */
export interface TriggerStatistics {
  /** 总触发器数量 */
  totalTriggers: number;
  /** 按类型分组的触发器数量 */
  triggersByType: Record<TriggerType, number>;
  /** 按状态分组的触发器数量 */
  triggersByState: Record<TriggerState, number>;
  /** 总触发次数 */
  totalTriggerCount: number;
  /** 平均触发次数 */
  averageTriggerCount: number;
  /** 最活跃的触发器 */
  mostActiveTrigger?: {
    triggerId: string;
    triggerName: string;
    triggerCount: number;
  };
}

/**
 * 触发器工厂接口
 */
export interface ITriggerFactory {
  /**
   * 创建触发器
   */
  createTrigger(config: TriggerConfig): BaseTrigger;

  /**
   * 支持的触发器类型
   */
  getSupportedTypes(): TriggerType[];
}

/**
 * 默认触发器工厂实现
 */
export class DefaultTriggerFactory implements ITriggerFactory {
  /**
   * 创建触发器
   */
  createTrigger(config: TriggerConfig): BaseTrigger {
    switch (config.type) {
      case TriggerType.TIME:
        return new TimeTrigger(config as TriggerConfig & { config: any });
      case TriggerType.EVENT:
        return new EventTrigger(config as TriggerConfig & { config: any });
      case TriggerType.CONDITION:
        return new ConditionTrigger(config as TriggerConfig & { config: any });
      case TriggerType.MANUAL:
        return new ManualTrigger(config as TriggerConfig & { config: any });
      default:
        throw new Error(`不支持的触发器类型: ${config.type}`);
    }
  }

  /**
   * 支持的触发器类型
   */
  getSupportedTypes(): TriggerType[] {
    return [
      TriggerType.TIME,
      TriggerType.EVENT,
      TriggerType.CONDITION,
      TriggerType.MANUAL
    ];
  }
}

/**
 * 默认触发器管理器实现
 */
export class DefaultTriggerManager implements ITriggerManager {
  private triggers: Map<string, BaseTrigger> = new Map();
  private factory: ITriggerFactory;

  constructor(factory: ITriggerFactory = new DefaultTriggerFactory()) {
    this.factory = factory;
  }

  /**
   * 注册触发器
   */
  async registerTrigger(trigger: BaseTrigger): Promise<void> {
    if (this.triggers.has(trigger.getId())) {
      throw new Error(`触发器已存在: ${trigger.getId()}`);
    }
    this.triggers.set(trigger.getId(), trigger);
  }

  /**
   * 注销触发器
   */
  async unregisterTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      await trigger.deactivate();
      this.triggers.delete(triggerId);
    }
  }

  /**
   * 获取触发器
   */
  getTrigger(triggerId: string): BaseTrigger | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * 获取所有触发器
   */
  getAllTriggers(): BaseTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * 获取指定图的所有触发器
   */
  getTriggersByGraph(graphId: string): BaseTrigger[] {
    return Array.from(this.triggers.values()).filter(
      trigger => trigger.getGraphId().toString() === graphId
    );
  }

  /**
   * 获取指定类型的所有触发器
   */
  getTriggersByType(type: TriggerType): BaseTrigger[] {
    return Array.from(this.triggers.values()).filter(
      trigger => trigger.getType() === type
    );
  }

  /**
   * 获取指定状态的所有触发器
   */
  getTriggersByState(state: TriggerState): BaseTrigger[] {
    return Array.from(this.triggers.values()).filter(
      trigger => trigger.getState() === state
    );
  }

  /**
   * 激活触发器
   */
  async activateTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.activate();
  }

  /**
   * 停用触发器
   */
  async deactivateTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.deactivate();
  }

  /**
   * 暂停触发器
   */
  async pauseTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.pause();
  }

  /**
   * 恢复触发器
   */
  async resumeTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.resume();
  }

  /**
   * 禁用触发器
   */
  async disableTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.disable();
  }

  /**
   * 启用触发器
   */
  async enableTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.enable();
  }

  /**
   * 触发执行
   */
  async triggerExecution(triggerId: string, context: TriggerContext): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.trigger(context);
  }

  /**
   * 重置触发器
   */
  async resetTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.reset();
  }

  /**
   * 更新触发器配置
   */
  async updateTriggerConfig(triggerId: string, newConfig: Partial<TriggerConfig>): Promise<TriggerExecutionResult> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`);
    }
    return await trigger.updateConfig(newConfig);
  }

  /**
   * 批量激活触发器
   */
  async activateTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.activateTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `激活触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 批量停用触发器
   */
  async deactivateTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.deactivateTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `停用触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 批量暂停触发器
   */
  async pauseTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.pauseTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `暂停触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 批量恢复触发器
   */
  async resumeTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.resumeTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `恢复触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 批量禁用触发器
   */
  async disableTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.disableTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `禁用触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 批量启用触发器
   */
  async enableTriggers(triggerIds: string[]): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];
    for (const triggerId of triggerIds) {
      try {
        const result = await this.enableTrigger(triggerId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          state: TriggerState.ERROR,
          message: `启用触发器失败: ${error}`,
          data: {},
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          metadata: { triggerId }
        });
      }
    }
    return results;
  }

  /**
   * 清除所有触发器
   */
  async clearAllTriggers(): Promise<void> {
    for (const trigger of this.triggers.values()) {
      await trigger.deactivate();
    }
    this.triggers.clear();
  }

  /**
   * 获取触发器统计信息
   */
  getTriggerStatistics(): TriggerStatistics {
    const triggers = Array.from(this.triggers.values());
    const totalTriggers = triggers.length;
    
    // 按类型分组
    const triggersByType: Record<TriggerType, number> = Object.fromEntries(
      Object.values(TriggerType).map(type => [type, 0])
    ) as Record<TriggerType, number>;
    
    for (const trigger of triggers) {
      triggersByType[trigger.getType()]++;
    }
    
    // 按状态分组
    const triggersByState: Record<TriggerState, number> = Object.fromEntries(
      Object.values(TriggerState).map(state => [state, 0])
    ) as Record<TriggerState, number>;
    
    for (const trigger of triggers) {
      triggersByState[trigger.getState()]++;
    }
    
    // 计算总触发次数和平均触发次数
    const totalTriggerCount = triggers.reduce((sum, trigger) => sum + trigger.getTriggerCount(), 0);
    const averageTriggerCount = totalTriggers > 0 ? totalTriggerCount / totalTriggers : 0;
    
    // 找出最活跃的触发器
    let mostActiveTrigger: TriggerStatistics['mostActiveTrigger'] = undefined;
    if (triggers.length > 0) {
      const activeTrigger = triggers.reduce((max, trigger) => 
        trigger.getTriggerCount() > max.getTriggerCount() ? trigger : max
      );
      mostActiveTrigger = {
        triggerId: activeTrigger.getId(),
        triggerName: activeTrigger.getName(),
        triggerCount: activeTrigger.getTriggerCount()
      };
    }
    
    return {
      totalTriggers,
      triggersByType,
      triggersByState,
      totalTriggerCount,
      averageTriggerCount,
      mostActiveTrigger
    };
  }
}