import { EventEmitter } from 'events';
import { HealthCheckResult, GlobalHealthStatus } from './health-checker';
import { ILogger } from '@shared/types/logger';

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 告警类型枚举
 */
export enum AlertType {
  COMPONENT_UNHEALTHY = 'component_unhealthy',
  HIGH_ERROR_RATE = 'high_error_rate',
  SLOW_RESPONSE = 'slow_response',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  CONFIGURATION_ERROR = 'configuration_error',
  SYSTEM_DEGRADED = 'system_degraded'
}

/**
 * 告警规则接口
 */
export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  level: AlertLevel;
  enabled: boolean;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown: number; // 冷却时间（毫秒）
  lastTriggered?: Date;
}

/**
 * 告警条件接口
 */
export interface AlertCondition {
  metric?: string;
  threshold?: number;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow?: number; // 时间窗口（毫秒）
  evaluationPeriods?: number; // 评估周期数
}

/**
 * 告警动作接口
 */
export interface AlertAction {
  type: 'log' | 'webhook' | 'email' | 'slack';
  config: Record<string, any>;
}

/**
 * 告警接口
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  component?: string;
  timestamp: Date;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * 告警服务配置接口
 */
export interface AlertingServiceConfig {
  enabled: boolean;
  maxActiveAlerts: number;
  alertRetentionPeriod: number; // 告警保留时间（毫秒）
  defaultActions: AlertAction[];
}

/**
 * 告警服务
 * 
 * 负责监控系统状态并发送告警
 */
export class AlertingService extends EventEmitter {
  private readonly config: AlertingServiceConfig;
  private readonly logger: ILogger;
  private readonly rules: Map<string, AlertRule> = new Map();
  private readonly activeAlerts: Map<string, Alert> = new Map();
  private readonly alertHistory: Alert[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: AlertingServiceConfig, logger: ILogger) {
    super();
    this.config = config;
    this.logger = logger.child({ service: 'AlertingService' });
    
    this.initializeDefaultRules();
    this.startCleanup();
  }

  /**
   * 添加告警规则
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('添加告警规则', { 
      ruleId: rule.id, 
      ruleName: rule.name, 
      type: rule.type 
    });
  }

  /**
   * 移除告警规则
   */
  public removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.logger.info('移除告警规则', { ruleId });
    }
    return removed;
  }

  /**
   * 获取所有告警规则
   */
  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取启用的告警规则
   */
  public getEnabledRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * 处理健康检查结果
   */
  public async processHealthCheck(healthStatus: GlobalHealthStatus): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // 检查系统级告警
    await this.checkSystemAlerts(healthStatus);

    // 检查组件级告警
    for (const [component, result] of Object.entries(healthStatus.components)) {
      await this.checkComponentAlerts(component, result);
    }
  }

  /**
   * 手动触发告警
   */
  public async triggerAlert(
    type: AlertType,
    level: AlertLevel,
    message: string,
    component?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: 'manual',
      ruleName: 'Manual Alert',
      type,
      level,
      message,
      component,
      timestamp: new Date(),
      details,
      resolved: false
    };

    await this.processAlert(alert);
  }

  /**
   * 解决告警
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    // 移动到历史记录
    this.activeAlerts.delete(alertId);
    this.alertHistory.push(alert);

    this.logger.info('告警已解决', { 
      alertId, 
      type: alert.type, 
      level: alert.level 
    });

    // 发出告警解决事件
    this.emit('alertResolved', alert);

    return true;
  }

  /**
   * 获取活跃告警
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  public getAlertHistory(limit?: number): Alert[] {
    if (limit) {
      return this.alertHistory.slice(-limit);
    }
    return [...this.alertHistory];
  }

  /**
   * 获取组件告警
   */
  public getComponentAlerts(component: string): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.component === component);
  }

  /**
   * 清除已解决的告警
   */
  public clearResolvedAlerts(): void {
    const beforeCount = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => !alert.resolved);
    const clearedCount = beforeCount - this.alertHistory.length;
    
    this.logger.info('清除已解决的告警', { clearedCount });
  }

  /**
   * 关闭告警服务
   */
  public shutdown(): void {
    this.logger.info('关闭告警服务');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.removeAllListeners();
    this.rules.clear();
    this.activeAlerts.clear();
    this.alertHistory.length = 0;

    this.logger.info('告警服务已关闭');
  }

  private initializeDefaultRules(): void {
    // 组件不健康告警
    this.addRule({
      id: 'component-unhealthy',
      name: 'Component Unhealthy',
      type: AlertType.COMPONENT_UNHEALTHY,
      level: AlertLevel.ERROR,
      enabled: true,
      condition: {},
      actions: this.config.defaultActions,
      cooldown: 300000 // 5分钟
    });

    // 系统降级告警
    this.addRule({
      id: 'system-degraded',
      name: 'System Degraded',
      type: AlertType.SYSTEM_DEGRADED,
      level: AlertLevel.WARNING,
      enabled: true,
      condition: {},
      actions: this.config.defaultActions,
      cooldown: 600000 // 10分钟
    });

    // 高错误率告警
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      type: AlertType.HIGH_ERROR_RATE,
      level: AlertLevel.WARNING,
      enabled: true,
      condition: {
        metric: 'error_rate',
        threshold: 0.1, // 10%
        operator: 'gt',
        timeWindow: 300000, // 5分钟
        evaluationPeriods: 3
      },
      actions: this.config.defaultActions,
      cooldown: 600000 // 10分钟
    });

    // 响应时间慢告警
    this.addRule({
      id: 'slow-response',
      name: 'Slow Response',
      type: AlertType.SLOW_RESPONSE,
      level: AlertLevel.WARNING,
      enabled: true,
      condition: {
        metric: 'average_response_time',
        threshold: 5000, // 5秒
        operator: 'gt',
        timeWindow: 300000, // 5分钟
        evaluationPeriods: 3
      },
      actions: this.config.defaultActions,
      cooldown: 600000 // 10分钟
    });
  }

  private async checkSystemAlerts(healthStatus: GlobalHealthStatus): Promise<void> {
    // 系统降级告警
    if (healthStatus.status === 'degraded' || healthStatus.status === 'unhealthy') {
      const rule = this.rules.get('system-degraded');
      if (rule && this.shouldTriggerRule(rule)) {
        await this.triggerRule(rule, {
          status: healthStatus.status,
          summary: healthStatus.summary
        });
      }
    }

    // 检查全局指标告警
    await this.checkMetricAlerts();
  }

  private async checkComponentAlerts(component: string, result: HealthCheckResult): Promise<void> {
    // 组件不健康告警
    if (result.status === 'unhealthy' || result.status === 'degraded') {
      const rule = this.rules.get('component-unhealthy');
      if (rule && this.shouldTriggerRule(rule)) {
        await this.triggerRule(rule, {
          component,
          status: result.status,
          message: result.message,
          responseTime: result.responseTime,
          details: result.details
        }, component);
      }
    }

    // 响应时间慢告警
    if (result.responseTime && result.responseTime > 5000) {
      const rule = this.rules.get('slow-response');
      if (rule && this.shouldTriggerRule(rule)) {
        await this.triggerRule(rule, {
          component,
          responseTime: result.responseTime,
          status: result.status
        }, component);
      }
    }
  }

  private async checkMetricAlerts(): Promise<void> {
    // 这里应该从指标收集器获取数据
    // 暂时跳过具体实现
  }

  private shouldTriggerRule(rule: AlertRule): boolean {
    // 检查冷却时间
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < rule.cooldown) {
        return false;
      }
    }

    // 检查活跃告警数量限制
    if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
      this.logger.warn('活跃告警数量已达上限', { 
        max: this.config.maxActiveAlerts 
      });
      return false;
    }

    return true;
  }

  private async triggerRule(
    rule: AlertRule,
    details: Record<string, any>,
    component?: string
  ): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      level: rule.level,
      message: this.generateAlertMessage(rule, details),
      component,
      timestamp: new Date(),
      details,
      resolved: false
    };

    await this.processAlert(alert);
    
    // 更新规则最后触发时间
    rule.lastTriggered = new Date();
  }

  private async processAlert(alert: Alert): Promise<void> {
    // 检查是否已存在相同的活跃告警
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(a => a.ruleId === alert.ruleId && a.component === alert.component);
    
    if (existingAlert) {
      this.logger.debug('告警已存在，跳过', { 
        alertId: alert.id, 
        ruleId: alert.ruleId 
      });
      return;
    }

    // 添加到活跃告警
    this.activeAlerts.set(alert.id, alert);

    this.logger.warn('触发告警', {
      alertId: alert.id,
      ruleId: alert.ruleId,
      type: alert.type,
      level: alert.level,
      component: alert.component,
      message: alert.message
    });

    // 执行告警动作
    await this.executeAlertActions(alert);

    // 发出告警事件
    this.emit('alert', alert);
  }

  private async executeAlertActions(alert: Alert): Promise<void> {
    const rule = this.rules.get(alert.ruleId);
    if (!rule) {
      return;
    }

    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        this.logger.error('执行告警动作失败', error, {
          alertId: alert.id,
          actionType: action.type
        });
      }
    }
  }

  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'log':
        this.executeLogAction(action, alert);
        break;
      case 'webhook':
        await this.executeWebhookAction(action, alert);
        break;
      case 'email':
        await this.executeEmailAction(action, alert);
        break;
      case 'slack':
        await this.executeSlackAction(action, alert);
        break;
      default:
        this.logger.warn('未知的告警动作类型', { type: action.type });
    }
  }

  private executeLogAction(action: AlertAction, alert: Alert): void {
    const logLevel = action.config.level || alert.level;
    const message = `[ALERT] ${alert.level.toUpperCase()}: ${alert.message}`;
    
    switch (logLevel) {
      case 'info':
        this.logger.info(message, { alertId: alert.id, details: alert.details });
        break;
      case 'warning':
        this.logger.warn(message, { alertId: alert.id, details: alert.details });
        break;
      case 'error':
        this.logger.error(message, { alertId: alert.id, details: alert.details });
        break;
      case 'critical':
        this.logger.error(`[CRITICAL] ${message}`, { alertId: alert.id, details: alert.details });
        break;
    }
  }

  private async executeWebhookAction(action: AlertAction, alert: Alert): Promise<void> {
    const url = action.config.url;
    if (!url) {
      this.logger.warn('Webhook动作缺少URL配置');
      return;
    }

    const payload = {
      alert,
      timestamp: new Date().toISOString()
    };

    // 这里应该实现实际的HTTP请求
    this.logger.info('发送Webhook告警', { url, alertId: alert.id });
  }

  private async executeEmailAction(action: AlertAction, alert: Alert): Promise<void> {
    const recipients = action.config.recipients;
    if (!recipients || !Array.isArray(recipients)) {
      this.logger.warn('邮件动作缺少收件人配置');
      return;
    }

    // 这里应该实现实际的邮件发送
    this.logger.info('发送邮件告警', { 
      recipients, 
      alertId: alert.id,
      subject: `Alert: ${alert.level.toUpperCase()} - ${alert.message}`
    });
  }

  private async executeSlackAction(action: AlertAction, alert: Alert): Promise<void> {
    const webhookUrl = action.config.webhookUrl;
    if (!webhookUrl) {
      this.logger.warn('Slack动作缺少Webhook URL配置');
      return;
    }

    // 这里应该实现实际的Slack消息发送
    this.logger.info('发送Slack告警', { 
      webhookUrl, 
      alertId: alert.id,
      message: alert.message
    });
  }

  private generateAlertMessage(rule: AlertRule, details: Record<string, any>): string {
    switch (rule.type) {
      case AlertType.COMPONENT_UNHEALTHY:
        return `Component ${details.component} is ${details.status}`;
      case AlertType.SYSTEM_DEGRADED:
        return `System is ${details.status}`;
      case AlertType.HIGH_ERROR_RATE:
        return `High error rate detected: ${details.error_rate * 100}%`;
      case AlertType.SLOW_RESPONSE:
        return `Slow response detected: ${details.responseTime}ms`;
      default:
        return `Alert triggered: ${rule.name}`;
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.alertRetentionPeriod / 10); // 每个保留期的1/10时间清理一次
  }

  private performCleanup(): void {
    const cutoffTime = new Date(Date.now() - this.config.alertRetentionPeriod);
    const beforeCount = this.alertHistory.length;

    // 清理过期的历史告警
    this.alertHistory = this.alertHistory.filter(alert => 
      alert.timestamp > cutoffTime || !alert.resolved
    );

    const cleanedCount = beforeCount - this.alertHistory.length;
    if (cleanedCount > 0) {
      this.logger.debug('清理过期告警', { cleanedCount });
    }
  }
}