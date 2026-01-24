import { ValueObject } from '../../common/value-objects';
import { ValidationError } from '../../../common/exceptions';
/**
 * 模型配置接口
 */
export interface ModelConfigProps {
  model: string;
  provider: string;
  maxTokens: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  costPer1KTokens: {
    prompt: number;
    completion: number;
  };
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  metadata: Record<string, unknown>;
}

/**
 * 模型配置值对象
 *
 * 用于表示LLM模型的配置信息
 */
export class ModelConfig extends ValueObject<ModelConfigProps> {
  /**
   * 创建OpenAI GPT-4配置
   * @returns OpenAI GPT-4配置实例
   */
  public static openaiGPT4(): ModelConfig {
    return new ModelConfig({
      model: 'gpt-4',
      provider: 'openai',
      maxTokens: 8192,
      contextWindow: 32768,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      costPer1KTokens: {
        prompt: 0.03,
        completion: 0.06,
      },
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsAudio: false,
      supportsVideo: false,
      metadata: {},
    });
  }

  /**
   * 创建OpenAI GPT-3.5配置
   * @returns OpenAI GPT-3.5配置实例
   */
  public static openaiGPT35(): ModelConfig {
    return new ModelConfig({
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      maxTokens: 4096,
      contextWindow: 16384,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      costPer1KTokens: {
        prompt: 0.001,
        completion: 0.002,
      },
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: false,
      supportsAudio: false,
      supportsVideo: false,
      metadata: {},
    });
  }

  /**
   * 创建Anthropic Claude配置
   * @returns Anthropic Claude配置实例
   */
  public static anthropicClaude(): ModelConfig {
    return new ModelConfig({
      model: 'claude-3-sonnet-20240229',
      provider: 'anthropic',
      maxTokens: 4096,
      contextWindow: 200000,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      costPer1KTokens: {
        prompt: 0.003,
        completion: 0.015,
      },
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsAudio: false,
      supportsVideo: false,
      metadata: {},
    });
  }

  /**
   * 创建Google Gemini配置
   * @returns Google Gemini配置实例
   */
  public static googleGemini(): ModelConfig {
    return new ModelConfig({
      model: 'gemini-pro',
      provider: 'google',
      maxTokens: 8192,
      contextWindow: 32768,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      costPer1KTokens: {
        prompt: 0.0005,
        completion: 0.0015,
      },
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsAudio: false,
      supportsVideo: false,
      metadata: {},
    });
  }

  /**
   * 创建自定义模型配置
   * @param config 配置参数
   * @returns 模型配置实例
   */
  public static create(config: Partial<ModelConfigProps>): ModelConfig {
    const defaultConfig = this.openaiGPT35();
    return new ModelConfig({
      ...defaultConfig.value,
      ...config,
    });
  }

  /**
   * 获取模型名称
   * @returns 模型名称
   */
  public getModel(): string {
    return this.props.model;
  }

  /**
   * 获取提供商
   * @returns 提供商
   */
  public getProvider(): string {
    return this.props.provider;
  }

  /**
   * 获取最大Token数
   * @returns 最大Token数
   */
  public getMaxTokens(): number {
    return this.props.maxTokens;
  }

  /**
   * 获取上下文窗口大小
   * @returns 上下文窗口大小
   */
  public getContextWindow(): number {
    return this.props.contextWindow;
  }

  /**
   * 获取温度参数
   * @returns 温度参数
   */
  public getTemperature(): number {
    return this.props.temperature;
  }

  /**
   * 获取top_p参数
   * @returns top_p参数
   */
  public getTopP(): number {
    return this.props.topP;
  }

  /**
   * 获取频率惩罚参数
   * @returns 频率惩罚参数
   */
  public getFrequencyPenalty(): number {
    return this.props.frequencyPenalty;
  }

  /**
   * 获取存在惩罚参数
   * @returns 存在惩罚参数
   */
  public getPresencePenalty(): number {
    return this.props.presencePenalty;
  }

  /**
   * 获取每1K Token的成本
   * @returns 每1K Token的成本
   */
  public getCostPer1KTokens(): { prompt: number; completion: number } {
    return { ...this.props.costPer1KTokens };
  }

  /**
   * 获取提示Token成本
   * @returns 提示Token成本
   */
  public getPromptCostPer1KTokens(): number {
    return this.props.costPer1KTokens.prompt;
  }

  /**
   * 获取完成Token成本
   * @returns 完成Token成本
   */
  public getCompletionCostPer1KTokens(): number {
    return this.props.costPer1KTokens.completion;
  }

  /**
   * 检查是否支持流式传输
   * @returns 是否支持流式传输
   */
  public supportsStreaming(): boolean {
    return this.props.supportsStreaming;
  }

  /**
   * 检查是否支持工具调用
   * @returns 是否支持工具调用
   */
  public supportsTools(): boolean {
    return this.props.supportsTools;
  }

  /**
   * 检查是否支持图像输入
   * @returns 是否支持图像输入
   */
  public supportsImages(): boolean {
    return this.props.supportsImages;
  }

  /**
   * 检查是否支持音频输入
   * @returns 是否支持音频输入
   */
  public supportsAudio(): boolean {
    return this.props.supportsAudio;
  }

  /**
   * 检查是否支持视频输入
   * @returns 是否支持视频输入
   */
  public supportsVideo(): boolean {
    return this.props.supportsVideo;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 计算Token成本
   * @param promptTokens 提示Token数
   * @param completionTokens 完成Token数
   * @returns 总成本
   */
  public calculateCost(promptTokens: number, completionTokens: number): number {
    const promptCost = (promptTokens / 1000) * this.props.costPer1KTokens.prompt;
    const completionCost = (completionTokens / 1000) * this.props.costPer1KTokens.completion;
    return promptCost + completionCost;
  }

  /**
   * 计算提示Token成本
   * @param promptTokens 提示Token数
   * @returns 提示Token成本
   */
  public calculatePromptCost(promptTokens: number): number {
    return (promptTokens / 1000) * this.props.costPer1KTokens.prompt;
  }

  /**
   * 计算完成Token成本
   * @param completionTokens 完成Token数
   * @returns 完成Token成本
   */
  public calculateCompletionCost(completionTokens: number): number {
    return (completionTokens / 1000) * this.props.costPer1KTokens.completion;
  }

  /**
   * 更新配置
   * @param updates 更新的配置
   * @returns 新的配置实例
   */
  public update(updates: Partial<ModelConfigProps>): ModelConfig {
    return new ModelConfig({
      ...this.props,
      ...updates,
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新的配置实例
   */
  public updateMetadata(metadata: Record<string, unknown>): ModelConfig {
    return new ModelConfig({
      ...this.props,
      metadata: { ...metadata },
    });
  }

  /**
   * 添加元数据项
   * @param key 键
   * @param value 值
   * @returns 新的配置实例
   */
  public addMetadata(key: string, value: unknown): ModelConfig {
    return new ModelConfig({
      ...this.props,
      metadata: {
        ...this.props.metadata,
        [key]: value,
      },
    });
  }

  /**
   * 移除元数据项
   * @param key 键
   * @returns 新的配置实例
   */
  public removeMetadata(key: string): ModelConfig {
    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];

    return new ModelConfig({
      ...this.props,
      metadata: newMetadata,
    });
  }

  /**
   * 比较两个模型配置是否相等
   * @param config 另一个模型配置
   * @returns 是否相等
   */
  public override equals(config?: ModelConfig): boolean {
    if (config === null || config === undefined) {
      return false;
    }

    return (
      this.props.model === config.getModel() &&
      this.props.provider === config.getProvider() &&
      this.props.maxTokens === config.getMaxTokens() &&
      this.props.contextWindow === config.getContextWindow() &&
      this.props.temperature === config.getTemperature() &&
      this.props.topP === config.getTopP() &&
      this.props.frequencyPenalty === config.getFrequencyPenalty() &&
      this.props.presencePenalty === config.getPresencePenalty() &&
      this.props.supportsStreaming === config.supportsStreaming() &&
      this.props.supportsTools === config.supportsTools() &&
      this.props.supportsImages === config.supportsImages() &&
      this.props.supportsAudio === config.supportsAudio() &&
      this.props.supportsVideo === config.supportsVideo() &&
      JSON.stringify(this.props.costPer1KTokens) === JSON.stringify(config.getCostPer1KTokens()) &&
      JSON.stringify(this.props.metadata) === JSON.stringify(config.getMetadata())
    );
  }

  /**
   * 验证模型配置的有效性
   */
  public validate(): void {
    if (!this.props.model || this.props.model.trim().length === 0) {
      throw new ValidationError('模型名称不能为空');
    }

    if (!this.props.provider || this.props.provider.trim().length === 0) {
      throw new ValidationError('提供商不能为空');
    }

    if (this.props.maxTokens <= 0) {
      throw new ValidationError('最大Token数必须大于0');
    }

    if (this.props.contextWindow <= 0) {
      throw new ValidationError('上下文窗口大小必须大于0');
    }

    if (this.props.maxTokens > this.props.contextWindow) {
      throw new ValidationError('最大Token数不能超过上下文窗口大小');
    }

    if (this.props.temperature < 0 || this.props.temperature > 2) {
      throw new ValidationError('温度参数必须在0到2之间');
    }

    if (this.props.topP < 0 || this.props.topP > 1) {
      throw new ValidationError('top_p参数必须在0到1之间');
    }

    if (this.props.frequencyPenalty < -2 || this.props.frequencyPenalty > 2) {
      throw new ValidationError('频率惩罚参数必须在-2到2之间');
    }

    if (this.props.presencePenalty < -2 || this.props.presencePenalty > 2) {
      throw new ValidationError('存在惩罚参数必须在-2到2之间');
    }

    if (this.props.costPer1KTokens.prompt < 0) {
      throw new ValidationError('提示Token成本不能为负数');
    }

    if (this.props.costPer1KTokens.completion < 0) {
      throw new ValidationError('完成Token成本不能为负数');
    }
  }

  /**
   * 获取模型配置的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `${this.props.provider}:${this.props.model}`;
  }

  /**
   * 获取模型配置的摘要信息
   * @returns 摘要信息
   */
  public getSummary(): Record<string, unknown> {
    return {
      model: this.props.model,
      provider: this.props.provider,
      maxTokens: this.props.maxTokens,
      contextWindow: this.props.contextWindow,
      temperature: this.props.temperature,
      costPer1KTokens: this.props.costPer1KTokens,
      supportsStreaming: this.props.supportsStreaming,
      supportsTools: this.props.supportsTools,
      supportsImages: this.props.supportsImages,
      supportsAudio: this.props.supportsAudio,
      supportsVideo: this.props.supportsVideo,
      metadataKeys: Object.keys(this.props.metadata),
    };
  }
}
