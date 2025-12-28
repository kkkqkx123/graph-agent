/**
 * 应用容器入口
 *
 * 提供应用级别的容器初始化和服务访问
 */

import { ContainerBootstrap, initializeContainer, getService } from './bootstrap';
import { TYPES } from './service-keys';

/**
 * 应用容器类
 *
 * 提供统一的服务访问接口
 */
export class AppContainer {
  private static bootstrap: ContainerBootstrap | null = null;

  /**
   * 初始化应用容器
   */
  static initialize(config?: { enableLogging?: boolean }): void {
    if (this.bootstrap) {
      console.warn('[AppContainer] 容器已经初始化');
      return;
    }

    this.bootstrap = initializeContainer({
      enableLogging: config?.enableLogging ?? false,
      enableCache: true
    });

    console.log('[AppContainer] 应用容器初始化完成');
  }

  /**
   * 获取服务
   */
  static getService<T>(serviceIdentifier: symbol): T {
    if (!this.bootstrap) {
      throw new Error('[AppContainer] 容器未初始化，请先调用initialize()方法');
    }
    return getService<T>(serviceIdentifier);
  }

  /**
   * 获取工作流编排服务
   */
  static getWorkflowOrchestrationService() {
    return this.getService(TYPES.WorkflowOrchestrationService);
  }

  /**
   * 获取会话编排服务
   */
  static getSessionOrchestrationService() {
    return this.getService(TYPES.SessionOrchestrationService);
  }

  /**
   * 获取线程协调服务
   */
  static getThreadCoordinatorService() {
    return this.getService(TYPES.ThreadCoordinatorService);
  }

  /**
   * 获取图算法服务
   */
  static getGraphAlgorithmService() {
    return this.getService(TYPES.GraphAlgorithmService);
  }

  /**
   * 获取图验证服务
   */
  static getGraphValidationService() {
    return this.getService(TYPES.GraphValidationService);
  }

  /**
   * 获取工作流仓储
   */
  static getWorkflowRepository() {
    return this.getService(TYPES.WorkflowRepository);
  }

  /**
   * 获取会话仓储
   */
  static getSessionRepository() {
    return this.getService(TYPES.SessionRepository);
  }

  /**
   * 获取线程仓储
   */
  static getThreadRepository() {
    return this.getService(TYPES.ThreadRepository);
  }

  /**
   * 检查容器是否已初始化
   */
  static isInitialized(): boolean {
    return this.bootstrap !== null && this.bootstrap.isInitialized();
  }

  /**
   * 重置容器（主要用于测试）
   */
  static reset(): void {
    if (this.bootstrap) {
      this.bootstrap.reset();
      this.bootstrap = null;
    }
  }
}

/**
 * 默认导出AppContainer
 */
export default AppContainer;