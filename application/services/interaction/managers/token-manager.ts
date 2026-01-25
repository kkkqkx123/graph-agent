/**
 * Token Manager
 *
 * 负责管理 token 使用情况
 */

import { injectable, inject } from 'inversify';
import { InteractionTokenUsage } from '../../../domain/interaction/value-objects/token-usage';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * Token Manager 接口
 */
export interface ITokenManager {
  /**
   * 更新 Token 使用情况
   */
  updateTokenUsage(tokenUsage: InteractionTokenUsage): void;

  /**
   * 获取 Token 使用情况
   */
  getTokenUsage(): InteractionTokenUsage;

  /**
   * 重置 Token 使用情况
   */
  resetTokenUsage(): void;

  /**
   * 获取 Token 限制
   */
  getTokenLimit(): number;

  /**
   * 设置 Token 限制
   */
  setTokenLimit(limit: number): void;

  /**
   * 检查是否超过 Token 限制
   */
  isTokenLimitExceeded(): boolean;
}

/**
 * Token Manager 实现
 */
@injectable()
export class TokenManager implements ITokenManager {
  private tokenUsage: InteractionTokenUsage;
  private tokenLimit: number;

  constructor(@inject('Logger') private readonly logger: ILogger) {
    this.tokenUsage = new InteractionTokenUsage({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    this.tokenLimit = 80000;
  }

  updateTokenUsage(tokenUsage: InteractionTokenUsage): void {
    this.tokenUsage = this.tokenUsage.add(tokenUsage);
    this.logger.debug('更新 Token 使用情况', {
      totalTokens: this.tokenUsage.totalTokens,
    });
  }

  getTokenUsage(): InteractionTokenUsage {
    return this.tokenUsage;
  }

  resetTokenUsage(): void {
    this.tokenUsage = new InteractionTokenUsage({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    this.logger.debug('重置 Token 使用情况');
  }

  getTokenLimit(): number {
    return this.tokenLimit;
  }

  setTokenLimit(limit: number): void {
    this.tokenLimit = limit;
    this.logger.debug('设置 Token 限制', { limit });
  }

  isTokenLimitExceeded(): boolean {
    return this.tokenUsage.totalTokens > this.tokenLimit;
  }
}