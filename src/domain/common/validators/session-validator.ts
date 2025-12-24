import { Session } from '../../sessions/entities/session';
import { SessionStatus } from '../../sessions/value-objects/session-status';
import { DomainValidator, ValidationResultBuilder, ValidationResult } from './domain-validator';

/**
 * 会话验证器
 * 
 * 专门处理会话相关的验证逻辑
 */
export class SessionValidator extends DomainValidator<Session> {
  validate(session: Session): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 验证基本字段
    this.validateRequired(session.sessionId, '会话ID', builder);
    this.validateRequired(session.status, '会话状态', builder);

    // 验证会话状态转换
    this.validateStatusTransition(session, builder);

    // 验证会话配置
    this.validateSessionConfig(session, builder);

    // 验证会话时间
    this.validateSessionTiming(session, builder);

    return builder.build();
  }

  /**
   * 验证会话状态转换
   */
  private validateStatusTransition(session: Session, builder: ValidationResultBuilder): void {
    const currentStatus = session.status;
    
    // 检查状态转换是否合法
    if (currentStatus.isTerminated() && session.lastActivityAt) {
      const terminationTime = session.lastActivityAt.getMilliseconds();
      const now = Date.now();
      
      // 如果会话已终止超过24小时，不应该有任何活动
      if (now - terminationTime > 24 * 60 * 60 * 1000) {
        builder.addWarning('会话已终止超过24小时，建议清理');
      }
    }

    // 检查活跃会话的持续时间
    if (currentStatus.isActive() && session.createdAt) {
      const activeDuration = Date.now() - session.createdAt.getMilliseconds();
      const maxActiveDuration = session.config?.getMaxDuration() || 24 * 60 * 60 * 1000; // 默认24小时
      
      if (activeDuration > maxActiveDuration) {
        builder.addWarning(`会话活跃时间超过限制 (${maxActiveDuration / (60 * 60 * 1000)} 小时)`);
      }
    }
  }

  /**
   * 验证会话配置
   */
  private validateSessionConfig(session: Session, builder: ValidationResultBuilder): void {
    if (!session.config) {
      builder.addWarning('会话缺少配置信息');
      return;
    }

    // 验证最大消息数量
    const maxMessages = session.config.getMaxMessages();
    if (maxMessages <= 0) {
      builder.addError('最大消息数量必须大于0');
    }

    // 验证最大持续时间
    const maxDuration = session.config.getMaxDuration();
    if (maxDuration <= 0) {
      builder.addError('最大持续时间必须大于0');
    }

    // 验证会话超时时间
    const timeout = session.config.getTimeoutMinutes();
    if (timeout <= 0) {
      builder.addError('会话超时时间必须大于0');
    }
  }

  /**
   * 验证会话时间
   */
  private validateSessionTiming(session: Session, builder: ValidationResultBuilder): void {
    if (!session.createdAt) {
      builder.addError('会话缺少创建时间');
      return;
    }

    const now = Date.now();
    const createdTime = session.createdAt.getMilliseconds();

    // 检查创建时间是否在未来
    if (createdTime > now) {
      builder.addError('会话创建时间不能在未来');
    }

    // 检查最后活动时间
    if (session.lastActivityAt) {
      const lastActivityTime = session.lastActivityAt.getMilliseconds();
      
      // 最后活动时间不能早于创建时间
      if (lastActivityTime < createdTime) {
        builder.addError('最后活动时间不能早于创建时间');
      }

      // 最后活动时间不能在未来
      if (lastActivityTime > now) {
        builder.addError('最后活动时间不能在未来');
      }
    }
  }

  /**
   * 验证会话是否可以进行新操作
   */
  validateForOperation(session: Session): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 基本验证
    const basicResult = this.validate(session);
    builder.merge(basicResult);

    // 检查会话状态是否允许操作
    if (!session.status.canOperate()) {
      builder.addError(`会话状态 ${session.status} 不允许进行操作`);
    }

    // 检查会话是否超时
    if (session.isTimeout()) {
      builder.addError('会话已超时，无法进行操作');
    }

    // 检查会话是否过期
    if (session.isExpired()) {
      builder.addError('会话已过期，无法进行操作');
    }

    return builder.build();
  }

  /**
   * 验证会话是否可以激活
   */
  validateForActivation(session: Session, hasOtherActiveSession: boolean): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 基本验证
    const basicResult = this.validate(session);
    builder.merge(basicResult);

    // 检查是否已经是活跃状态
    if (session.status.isActive()) {
      builder.addWarning('会话已经是活跃状态');
      return builder.build();
    }

    // 检查是否已终止
    if (session.status.isTerminated()) {
      builder.addError('无法激活已终止的会话');
    }

    // 检查是否有其他活跃会话
    if (hasOtherActiveSession) {
      builder.addError('用户已有其他活跃会话，无法激活此会话');
    }

    return builder.build();
  }
}