/**
 * 速率限制器接口
 * 
 * 定义了LLM请求速率限制的核心功能
 */

export interface RateLimiter {
  /**
   * 检查是否超过速率限制
   * @throws {Error} 如果超过速率限制
   */
  checkLimit(): Promise<void>;

  /**
   * 等待直到可以发送请求
   */
  waitForToken(): Promise<void>;

  /**
   * 获取可用令牌数
   */
  getAvailableTokens(): number;

  /**
   * 重置速率限制器
   */
  reset(): void;
}