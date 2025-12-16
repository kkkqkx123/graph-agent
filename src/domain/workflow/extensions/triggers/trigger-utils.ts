import { BaseTrigger, TriggerConfig } from './base-trigger';
import { TriggerType, TriggerTypeUtils } from './trigger-type';
import { TriggerState, TriggerStateUtils } from './trigger-state';
import { TriggerContext, TriggerContextUtils } from './trigger-context';
import { TriggerExecutionResult, TriggerExecutionResultUtils } from './trigger-execution-result';
import { DefaultTriggerFactory } from './trigger-manager';
import { ID } from '../../../../common/value-objects/id';

/**
 * 触发器工具类
 */
export class TriggerUtils {
  /**
   * 创建触发器配置
   */
  static createConfig(
    id: string,
    name: string,
    type: TriggerType,
    workflowId: ID,
    config: Record<string, any> = {},
    enabled: boolean = true,
    description?: string,
    metadata: Record<string, any> = {}
  ): TriggerConfig {
    return {
      id,
      name,
      description,
      type,
      workflowId,
      enabled,
      config,
      metadata
    };
  }

  /**
   * 创建触发器
   */
  static createTrigger(config: TriggerConfig): BaseTrigger {
    const factory = new DefaultTriggerFactory();
    return factory.createTrigger(config);
  }

  /**
   * 创建时间触发器配置
   */
  static createTimeTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    cronExpression: string,
    timezone?: string,
    triggerImmediately?: boolean,
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.TIME,
      workflowId,
      {
        cronExpression,
        timezone,
        triggerImmediately
      },
      enabled,
      description
    );
  }

  /**
   * 创建事件触发器配置
   */
  static createEventTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    eventType: string,
    eventSource?: string,
    eventFilter?: Record<string, any>,
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.EVENT,
      workflowId,
      {
        eventType,
        eventSource,
        eventFilter
      },
      enabled,
      description
    );
  }

  /**
   * 创建条件触发器配置
   */
  static createConditionTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    condition: string,
    evaluationInterval?: number,
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.CONDITION,
      workflowId,
      {
        condition,
        evaluationInterval
      },
      enabled,
      description
    );
  }

  /**
   * 创建手动触发器配置
   */
  static createManualTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    requireConfirmation?: boolean,
    confirmationMessage?: string,
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.MANUAL,
      workflowId,
      {
        requireConfirmation,
        confirmationMessage
      },
      enabled,
      description
    );
  }

  /**
   * 创建外部触发器配置
   */
  static createExternalTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    externalSource: string,
    authentication?: Record<string, any>,
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.EXTERNAL,
      workflowId,
      {
        externalSource,
        authentication
      },
      enabled,
      description
    );
  }

  /**
   * 创建状态触发器配置
   */
  static createStateTriggerConfig(
    id: string,
    name: string,
    workflowId: ID,
    statePath: string,
    expectedValue: any,
    comparisonOperator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' = 'equals',
    enabled: boolean = true,
    description?: string
  ): TriggerConfig {
    return this.createConfig(
      id,
      name,
      TriggerType.STATE,
      workflowId,
      {
        statePath,
        expectedValue,
        comparisonOperator
      },
      enabled,
      description
    );
  }

  /**
   * 验证触发器配置
   */
  static validateConfig(config: TriggerConfig): boolean {
    // 基本验证
    if (!config.id || !config.name || !config.type || !config.workflowId) {
      return false;
    }

    // 验证触发器类型
    if (!Object.values(TriggerType).includes(config.type)) {
      return false;
    }

    // 根据类型验证特定配置
    switch (config.type) {
      case TriggerType.TIME:
        return this.validateTimeTriggerConfig(config.config);
      case TriggerType.EVENT:
        return this.validateEventTriggerConfig(config.config);
      case TriggerType.CONDITION:
        return this.validateConditionTriggerConfig(config.config);
      case TriggerType.MANUAL:
        return this.validateManualTriggerConfig(config.config);
      case TriggerType.EXTERNAL:
        return this.validateExternalTriggerConfig(config.config);
      case TriggerType.STATE:
        return this.validateStateTriggerConfig(config.config);
      default:
        return false;
    }
  }

  /**
   * 验证时间触发器配置
   */
  private static validateTimeTriggerConfig(config: Record<string, any>): boolean {
    return !!config['cronExpression'];
  }

  /**
   * 验证事件触发器配置
   */
  private static validateEventTriggerConfig(config: Record<string, any>): boolean {
    return !!config['eventType'];
  }

  /**
   * 验证条件触发器配置
   */
  private static validateConditionTriggerConfig(config: Record<string, any>): boolean {
    return !!config['condition'];
  }

  /**
   * 验证手动触发器配置
   */
  private static validateManualTriggerConfig(config: Record<string, any>): boolean {
    return true; // 手动触发器不需要特定配置
  }

  /**
   * 验证外部触发器配置
   */
  private static validateExternalTriggerConfig(config: Record<string, any>): boolean {
    return !!config['externalSource'];
  }

  /**
   * 验证状态触发器配置
   */
  private static validateStateTriggerConfig(config: Record<string, any>): boolean {
    return !!(config['statePath'] && config['expectedValue'] !== undefined);
  }

  /**
   * 克隆触发器配置
   */
  static cloneConfig(config: TriggerConfig): TriggerConfig {
    return {
      ...config,
      config: { ...config.config },
      metadata: { ...config.metadata }
    };
  }

  /**
   * 合并触发器配置
   */
  static mergeConfig(baseConfig: TriggerConfig, updates: Partial<TriggerConfig>): TriggerConfig {
    return {
      ...baseConfig,
      ...updates,
      config: { ...baseConfig.config, ...(updates.config || {}) },
      metadata: { ...baseConfig.metadata, ...(updates.metadata || {}) }
    };
  }

  /**
   * 比较触发器配置
   */
  static compareConfig(config1: TriggerConfig, config2: TriggerConfig): boolean {
    return (
      config1.id === config2.id &&
      config1.name === config2.name &&
      config1.type === config2.type &&
      config1.workflowId === config2.workflowId &&
      config1.enabled === config2.enabled &&
      JSON.stringify(config1.config) === JSON.stringify(config2.config) &&
      JSON.stringify(config1.metadata) === JSON.stringify(config2.metadata)
    );
  }

  /**
   * 获取触发器配置摘要
   */
  static getConfigSummary(config: TriggerConfig): string {
    return `Trigger[${config.id}] ${config.name} (${config.type}) for workflow ${config.workflowId} - ${config.enabled ? 'Enabled' : 'Disabled'}`;
  }

  /**
   * 格式化触发器配置
   */
  static formatConfig(config: TriggerConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * 从JSON字符串解析触发器配置
   */
  static parseConfig(json: string): TriggerConfig {
    try {
      return JSON.parse(json) as TriggerConfig;
    } catch (error) {
      throw new Error(`无效的触发器配置JSON: ${error}`);
    }
  }

  /**
   * 检查触发器是否可以转换为指定类型
   */
  static canConvertToType(config: TriggerConfig, targetType: TriggerType): boolean {
    // 某些类型之间可能可以转换，这里简化处理
    return config.type === targetType;
  }

  /**
   * 转换触发器类型
   */
  static convertType(config: TriggerConfig, targetType: TriggerType, newConfig: Record<string, any> = {}): TriggerConfig {
    if (!this.canConvertToType(config, targetType)) {
      throw new Error(`无法将触发器从 ${config.type} 转换为 ${targetType}`);
    }

    return this.mergeConfig(config, {
      type: targetType,
      config: { ...config.config, ...newConfig }
    });
  }

  /**
   * 创建触发器上下文
   */
  static createContext(
    triggerId: string,
    triggerType: TriggerType,
    workflowId: ID,
    triggerData: Record<string, any> = {},
    triggerSource: string = '',
    metadata: Record<string, any> = {},
    executionParams: Record<string, any> = {}
  ): TriggerContext {
    return TriggerContextUtils.create(triggerId, triggerType, workflowId)
      .withTriggerData(triggerData)
      .withTriggerSource(triggerSource)
      .withMetadata(metadata)
      .withExecutionParams(executionParams)
      .build();
  }

  /**
   * 创建成功执行结果
   */
  static createSuccessResult(
    message: string = '触发器执行成功',
    data: Record<string, any> = {}
  ): TriggerExecutionResult {
    return TriggerExecutionResultUtils.success(message, data).build();
  }

  /**
   * 创建失败执行结果
   */
  static createFailureResult(
    message: string = '触发器执行失败',
    error?: Error
  ): TriggerExecutionResult {
    return TriggerExecutionResultUtils.failure(message, error).build();
  }

  /**
   * 检查触发器是否处于可执行状态
   */
  static isExecutable(trigger: BaseTrigger): boolean {
    return trigger.isActive() && trigger.isEnabled();
  }

  /**
   * 检查触发器是否处于可管理状态
   */
  static isManageable(trigger: BaseTrigger): boolean {
    const state = trigger.getState();
    return state !== TriggerState.TRIGGERING;
  }

  /**
   * 获取触发器状态转换历史
   */
  static getStateTransitionHistory(trigger: BaseTrigger): Array<{
    from: TriggerState;
    to: TriggerState;
    timestamp: Date;
    reason: string;
  }> {
    // 这里应该实现状态转换历史记录
    // 简化实现，返回空数组
    return [];
  }

  /**
   * 计算触发器性能指标
   */
  static calculatePerformanceMetrics(trigger: BaseTrigger): {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
    lastExecutionTime: Date | undefined;
  } {
    // 这里应该实现性能指标计算
    // 简化实现，返回默认值
    return {
      averageExecutionTime: 0,
      successRate: 1.0,
      errorRate: 0.0,
      lastExecutionTime: trigger.getLastTriggeredAt()
    };
  }

  /**
   * 获取触发器健康状态
   */
  static getHealthStatus(trigger: BaseTrigger): 'healthy' | 'warning' | 'error' {
    const state = trigger.getState();
    if (state === TriggerState.ERROR) {
      return 'error';
    } else if (state === TriggerState.PAUSED || state === TriggerState.DISABLED) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * 生成触发器报告
   */
  static generateReport(triggers: BaseTrigger[]): {
    summary: {
      total: number;
      active: number;
      inactive: number;
      error: number;
      disabled: number;
    };
    byType: Record<TriggerType, number>;
    byWorkflow: Record<string, number>;
    performance: {
      averageTriggerCount: number;
      mostActiveTrigger: BaseTrigger | undefined;
      leastActiveTrigger: BaseTrigger | undefined;
    };
  } {
    const summary = {
      total: triggers.length,
      active: 0,
      inactive: 0,
      error: 0,
      disabled: 0
    };

    const byType: Record<TriggerType, number> = {} as any;
    const byWorkflow: Record<string, number> = {};

    let totalTriggerCount = 0;
    let mostActiveTrigger: BaseTrigger | undefined;
    let leastActiveTrigger: BaseTrigger | undefined;

    for (const trigger of triggers) {
      // 统计状态
      const state = trigger.getState();
      if (state === TriggerState.ACTIVE) summary.active++;
      else if (state === TriggerState.INACTIVE) summary.inactive++;
      else if (state === TriggerState.ERROR) summary.error++;
      else if (state === TriggerState.DISABLED) summary.disabled++;

      // 统计类型
      const type = trigger.getType();
      byType[type] = (byType[type] || 0) + 1;

      // 统计图
      const workflowId = trigger.getWorkflowId();
      const workflowIdStr = workflowId.toString();
      byWorkflow[workflowIdStr] = (byWorkflow[workflowIdStr] || 0) + 1;

      // 统计性能
      const triggerCount = trigger.getTriggerCount();
      totalTriggerCount += triggerCount;

      if (!mostActiveTrigger || triggerCount > mostActiveTrigger.getTriggerCount()) {
        mostActiveTrigger = trigger;
      }

      if (!leastActiveTrigger || triggerCount < leastActiveTrigger.getTriggerCount()) {
        leastActiveTrigger = trigger;
      }
    }

    return {
      summary,
      byType,
      byWorkflow,
      performance: {
        averageTriggerCount: triggers.length > 0 ? totalTriggerCount / triggers.length : 0,
        mostActiveTrigger,
        leastActiveTrigger
      }
    };
  }
}