/**
 * LLM请求选项值对象
 */

import { ValueObject } from '../../common/value-objects';

/**
 * LLM请求选项属性接口
 */
export interface LLMRequestOptionsProps {
  /**
   * 模型名称
   */
  model?: string;

  /**
   * 温度参数（0-2）
   */
  temperature?: number;

  /**
   * 最大令牌数
   */
  maxTokens?: number;

  /**
   * 顶部概率采样
   */
  topP?: number;

  /**
   * 频率惩罚
   */
  frequencyPenalty?: number;

  /**
   * 存在惩罚
   */
  presencePenalty?: number;

  /**
   * 停止词
   */
  stop?: string[];

  /**
   * 流式响应
   */
  stream?: boolean;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * LLM请求选项值对象
 */
export class LLMRequestOptions extends ValueObject<LLMRequestOptionsProps> {
  /**
   * 创建默认请求选项
   * @param model 模型名称
   * @returns 默认请求选项实例
   */
  public static createDefault(model?: string): LLMRequestOptions {
    return new LLMRequestOptions({
      model,
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      stream: false,
      timeout: 30000,
      metadata: {},
    });
  }

  /**
   * 创建快速响应选项
   * @param model 模型名称
   * @returns 快速响应选项实例
   */
  public static createFast(model?: string): LLMRequestOptions {
    return new LLMRequestOptions({
      model,
      temperature: 0.3,
      maxTokens: 500,
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      stream: false,
      timeout: 15000,
      metadata: { mode: 'fast' },
    });
  }

  /**
   * 创建创意响应选项
   * @param model 模型名称
   * @returns 创意响应选项实例
   */
  public static createCreative(model?: string): LLMRequestOptions {
    return new LLMRequestOptions({
      model,
      temperature: 1.2,
      maxTokens: 2000,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      stream: false,
      timeout: 60000,
      metadata: { mode: 'creative' },
    });
  }

  /**
   * 创建精确响应选项
   * @param model 模型名称
   * @returns 精确响应选项实例
   */
  public static createPrecise(model?: string): LLMRequestOptions {
    return new LLMRequestOptions({
      model,
      temperature: 0.1,
      maxTokens: 1500,
      topP: 0.5,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      stream: false,
      timeout: 45000,
      metadata: { mode: 'precise' },
    });
  }

  /**
   * 从接口创建请求选项
   * @param options 请求选项接口
   * @returns 请求选项实例
   */
  public static fromInterface(options: LLMRequestOptionsProps): LLMRequestOptions {
    return new LLMRequestOptions({
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
      stream: options.stream,
      timeout: options.timeout,
      metadata: options.metadata,
    });
  }

  /**
   * 获取模型名称
   * @returns 模型名称
   */
  public getModel(): string | undefined {
    return this.props.model;
  }

  /**
   * 获取温度参数
   * @returns 温度参数
   */
  public getTemperature(): number | undefined {
    return this.props.temperature;
  }

  /**
   * 获取最大令牌数
   * @returns 最大令牌数
   */
  public getMaxTokens(): number | undefined {
    return this.props.maxTokens;
  }

  /**
   * 获取顶部概率采样
   * @returns 顶部概率采样
   */
  public getTopP(): number | undefined {
    return this.props.topP;
  }

  /**
   * 获取频率惩罚
   * @returns 频率惩罚
   */
  public getFrequencyPenalty(): number | undefined {
    return this.props.frequencyPenalty;
  }

  /**
   * 获取存在惩罚
   * @returns 存在惩罚
   */
  public getPresencePenalty(): number | undefined {
    return this.props.presencePenalty;
  }

  /**
   * 获取停止词
   * @returns 停止词
   */
  public getStop(): string[] | undefined {
    return this.props.stop;
  }

  /**
   * 获取是否流式响应
   * @returns 是否流式响应
   */
  public getStream(): boolean | undefined {
    return this.props.stream;
  }

  /**
   * 获取超时时间
   * @returns 超时时间
   */
  public getTimeout(): number | undefined {
    return this.props.timeout;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  /**
   * 设置模型名称
   * @param model 模型名称
   * @returns 新请求选项实例
   */
  public setModel(model: string): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      model,
    });
  }

  /**
   * 设置温度参数
   * @param temperature 温度参数
   * @returns 新请求选项实例
   */
  public setTemperature(temperature: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      temperature,
    });
  }

  /**
   * 设置最大令牌数
   * @param maxTokens 最大令牌数
   * @returns 新请求选项实例
   */
  public setMaxTokens(maxTokens: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      maxTokens,
    });
  }

  /**
   * 设置顶部概率采样
   * @param topP 顶部概率采样
   * @returns 新请求选项实例
   */
  public setTopP(topP: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      topP,
    });
  }

  /**
   * 设置频率惩罚
   * @param frequencyPenalty 频率惩罚
   * @returns 新请求选项实例
   */
  public setFrequencyPenalty(frequencyPenalty: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      frequencyPenalty,
    });
  }

  /**
   * 设置存在惩罚
   * @param presencePenalty 存在惩罚
   * @returns 新请求选项实例
   */
  public setPresencePenalty(presencePenalty: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      presencePenalty,
    });
  }

  /**
   * 设置停止词
   * @param stop 停止词
   * @returns 新请求选项实例
   */
  public setStop(stop: string[]): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      stop,
    });
  }

  /**
   * 设置是否流式响应
   * @param stream 是否流式响应
   * @returns 新请求选项实例
   */
  public setStream(stream: boolean): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      stream,
    });
  }

  /**
   * 设置超时时间
   * @param timeout 超时时间
   * @returns 新请求选项实例
   */
  public setTimeout(timeout: number): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      timeout,
    });
  }

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 新请求选项实例
   */
  public setMetadata(metadata: Record<string, any>): LLMRequestOptions {
    return new LLMRequestOptions({
      ...this.props,
      metadata,
    });
  }

  /**
   * 添加元数据项
   * @param key 键
   * @param value 值
   * @returns 新请求选项实例
   */
  public addMetadata(key: string, value: any): LLMRequestOptions {
    const metadata = { ...this.props.metadata };
    metadata[key] = value;

    return new LLMRequestOptions({
      ...this.props,
      metadata,
    });
  }

  /**
   * 移除元数据项
   * @param key 键
   * @returns 新请求选项实例
   */
  public removeMetadata(key: string): LLMRequestOptions {
    const metadata = { ...this.props.metadata };
    delete metadata[key];

    return new LLMRequestOptions({
      ...this.props,
      metadata,
    });
  }

  /**
   * 转换为接口格式
   * @returns 接口格式
   */
  public toInterface(): LLMRequestOptionsProps {
    return {
      model: this.props.model,
      temperature: this.props.temperature,
      maxTokens: this.props.maxTokens,
      topP: this.props.topP,
      frequencyPenalty: this.props.frequencyPenalty,
      presencePenalty: this.props.presencePenalty,
      stop: this.props.stop,
      stream: this.props.stream,
      timeout: this.props.timeout,
      metadata: this.props.metadata,
    };
  }

  /**
   * 验证请求选项的有效性
   */
  public override validate(): void {
    if (
      this.props.temperature !== undefined &&
      (this.props.temperature < 0 || this.props.temperature > 2)
    ) {
      throw new Error('温度参数必须在0到2之间');
    }

    if (this.props.maxTokens !== undefined && this.props.maxTokens <= 0) {
      throw new Error('最大令牌数必须大于0');
    }

    if (this.props.topP !== undefined && (this.props.topP < 0 || this.props.topP > 1)) {
      throw new Error('顶部概率采样必须在0到1之间');
    }

    if (
      this.props.frequencyPenalty !== undefined &&
      (this.props.frequencyPenalty < -2 || this.props.frequencyPenalty > 2)
    ) {
      throw new Error('频率惩罚必须在-2到2之间');
    }

    if (
      this.props.presencePenalty !== undefined &&
      (this.props.presencePenalty < -2 || this.props.presencePenalty > 2)
    ) {
      throw new Error('存在惩罚必须在-2到2之间');
    }

    if (this.props.timeout !== undefined && this.props.timeout <= 0) {
      throw new Error('超时时间必须大于0');
    }
  }

  /**
   * 获取请求选项的摘要信息
   * @returns 摘要信息
   */
  public getSummary(): Record<string, any> {
    return {
      model: this.props.model,
      temperature: this.props.temperature,
      maxTokens: this.props.maxTokens,
      topP: this.props.topP,
      frequencyPenalty: this.props.frequencyPenalty,
      presencePenalty: this.props.presencePenalty,
      stopCount: this.props.stop ? this.props.stop.length : 0,
      stream: this.props.stream,
      timeout: this.props.timeout,
      metadataKeys: this.props.metadata ? Object.keys(this.props.metadata) : [],
    };
  }
}
