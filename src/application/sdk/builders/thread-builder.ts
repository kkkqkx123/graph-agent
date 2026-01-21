/**
 * ThreadBuilder 类
 *
 * 提供流式 API 用于构建线程配置
 * 支持链式调用，提供流畅的开发体验
 */

import type {
  ThreadConfig,
  WorkflowConfigData,
  ThreadExecutionOptions,
} from '../types';

/**
 * ThreadBuilder 类
 * 用于构建线程配置的流式 API
 */
export class ThreadBuilder {
  private config: Partial<ThreadConfig>;

  private constructor(id: string) {
    this.config = {
      id,
      inputData: {},
    };
  }

  /**
   * 创建线程构建器实例
   * @param id 线程 ID
   * @returns ThreadBuilder 实例
   */
  public static create(id: string): ThreadBuilder {
    return new ThreadBuilder(id);
  }

  /**
   * 设置工作流配置
   * @param workflow 工作流配置对象
   * @returns this
   */
  public workflow(workflow: WorkflowConfigData): ThreadBuilder {
    this.config.workflow = workflow;
    return this;
  }

  /**
   * 设置输入数据
   * @param data 输入数据对象
   * @returns this
   */
  public inputData(data: Record<string, unknown>): ThreadBuilder {
    this.config.inputData = data;
    return this;
  }

  /**
   * 合并输入数据
   * @param data 要合并的输入数据对象
   * @returns this
   */
  public mergeInputData(data: Record<string, unknown>): ThreadBuilder {
    this.config.inputData = {
      ...this.config.inputData,
      ...data,
    };
    return this;
  }

  /**
   * 添加单个输入数据项
   * @param key 数据键
   * @param value 数据值
   * @returns this
   */
  public addInput(key: string, value: unknown): ThreadBuilder {
    if (!this.config.inputData) {
      this.config.inputData = {};
    }
    this.config.inputData[key] = value;
    return this;
  }

  /**
   * 设置执行选项
   * @param options 执行选项对象
   * @returns this
   */
  public options(options: ThreadExecutionOptions): ThreadBuilder {
    this.config.options = options;
    return this;
  }

  /**
   * 合并执行选项
   * @param options 要合并的执行选项对象
   * @returns this
   */
  public mergeOptions(options: Partial<ThreadExecutionOptions>): ThreadBuilder {
    this.config.options = {
      ...this.config.options,
      ...options,
    };
    return this;
  }

  // ============================================================================
  // 执行选项配置方法
  // ============================================================================

  /**
   * 设置是否启用检查点
   * @param enable 是否启用检查点
   * @returns this
   */
  public enableCheckpoints(enable: boolean): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.enableCheckpoints = enable;
    return this;
  }

  /**
   * 设置检查点间隔
   * @param interval 检查点间隔（毫秒）
   * @returns this
   */
  public checkpointInterval(interval: number): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.checkpointInterval = interval;
    return this;
  }

  /**
   * 设置执行超时时间
   * @param timeout 超时时间（毫秒）
   * @returns this
   */
  public timeout(timeout: number): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.timeout = timeout;
    return this;
  }

  /**
   * 设置最大执行步数
   * @param maxSteps 最大执行步数
   * @returns this
   */
  public maxSteps(maxSteps: number): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.maxSteps = maxSteps;
    return this;
  }

  /**
   * 设置是否启用流式输出
   * @param enable 是否启用流式输出
   * @returns this
   */
  public enableStream(enable: boolean): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.enableStream = enable;
    return this;
  }

  /**
   * 设置是否启用错误恢复
   * @param enable 是否启用错误恢复
   * @returns this
   */
  public enableErrorRecovery(enable: boolean): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.enableErrorRecovery = enable;
    return this;
  }

  /**
   * 添加自定义执行参数
   * @param key 参数键
   * @param value 参数值
   * @returns this
   */
  public addCustomParameter(key: string, value: unknown): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    if (!this.config.options.customParameters) {
      this.config.options.customParameters = {};
    }
    this.config.options.customParameters[key] = value;
    return this;
  }

  /**
   * 设置自定义执行参数
   * @param parameters 自定义参数对象
   * @returns this
   */
  public customParameters(parameters: Record<string, unknown>): ThreadBuilder {
    if (!this.config.options) {
      this.config.options = {};
    }
    this.config.options.customParameters = parameters;
    return this;
  }

  // ============================================================================
  // 构建方法
  // ============================================================================

  /**
   * 构建最终的线程配置对象
   * @returns ThreadConfig 对象
   * @throws Error 如果配置无效
   */
  public build(): ThreadConfig {
    this.validate();
    return this.config as ThreadConfig;
  }

  /**
   * 验证线程配置
   * @throws Error 如果配置无效
   */
  private validate(): void {
    if (!this.config.id || this.config.id.trim() === '') {
      throw new Error('线程 ID 不能为空');
    }

    if (!this.config.workflow) {
      throw new Error('线程必须包含工作流配置');
    }

    // 验证工作流配置
    if (!this.config.workflow.workflow) {
      throw new Error('工作流配置无效');
    }

    if (!this.config.workflow.workflow.id) {
      throw new Error('工作流必须包含 ID');
    }

    // 验证执行选项
    if (this.config.options) {
      const options = this.config.options;

      // 验证检查点间隔
      if (options.checkpointInterval !== undefined) {
        if (typeof options.checkpointInterval !== 'number') {
          throw new Error('检查点间隔必须是数字');
        }
        if (options.checkpointInterval <= 0) {
          throw new Error('检查点间隔必须大于 0');
        }
      }

      // 验证超时时间
      if (options.timeout !== undefined) {
        if (typeof options.timeout !== 'number') {
          throw new Error('超时时间必须是数字');
        }
        if (options.timeout <= 0) {
          throw new Error('超时时间必须大于 0');
        }
      }

      // 验证最大执行步数
      if (options.maxSteps !== undefined) {
        if (typeof options.maxSteps !== 'number') {
          throw new Error('最大执行步数必须是数字');
        }
        if (options.maxSteps <= 0) {
          throw new Error('最大执行步数必须大于 0');
        }
      }
    }
  }

  /**
   * 获取线程 ID
   * @returns 线程 ID
   */
  public getId(): string {
    return this.config.id || '';
  }

  /**
   * 获取工作流 ID
   * @returns 工作流 ID
   */
  public getWorkflowId(): string {
    return this.config.workflow?.workflow?.id || '';
  }

  /**
   * 检查是否启用了检查点
   * @returns 是否启用检查点
   */
  public isCheckpointsEnabled(): boolean {
    return this.config.options?.enableCheckpoints || false;
  }

  /**
   * 检查是否启用了流式输出
   * @returns 是否启用流式输出
   */
  public isStreamEnabled(): boolean {
    return this.config.options?.enableStream || false;
  }

  /**
   * 检查是否启用了错误恢复
   * @returns 是否启用错误恢复
   */
  public isErrorRecoveryEnabled(): boolean {
    return this.config.options?.enableErrorRecovery !== false; // 默认为 true
  }
}