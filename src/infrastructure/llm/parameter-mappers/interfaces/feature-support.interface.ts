/**
 * 功能支持接口
 *
 * 定义提供商支持的功能特性
 */
export interface FeatureSupport {
  /**
   * 是否支持流式响应
   */
  supportsStreaming: boolean;

  /**
   * 是否支持工具调用
   */
  supportsTools: boolean;

  /**
   * 是否支持图像输入
   */
  supportsImages: boolean;

  /**
   * 是否支持音频输入
   */
  supportsAudio: boolean;

  /**
   * 是否支持视频输入
   */
  supportsVideo: boolean;

  /**
   * 是否支持系统消息
   */
  supportsSystemMessages: boolean;

  /**
   * 是否支持函数调用
   */
  supportsFunctionCalling: boolean;

  /**
   * 是否支持并行工具调用
   */
  supportsParallelToolCalling: boolean;

  /**
   * 是否支持 JSON 模式
   */
  supportsJsonMode: boolean;

  /**
   * 是否支持种子参数
   */
  supportsSeed: boolean;

  /**
   * 是否支持温度参数
   */
  supportsTemperature: boolean;

  /**
   * 是否支持 top_p 参数
   */
  supportsTopP: boolean;

  /**
   * 是否支持 top_k 参数
   */
  supportsTopK: boolean;

  /**
   * 是否支持频率惩罚
   */
  supportsFrequencyPenalty: boolean;

  /**
   * 是否支持存在惩罚
   */
  supportsPresencePenalty: boolean;

  /**
   * 是否支持停止序列
   */
  supportsStopSequences: boolean;

  /**
   * 是否支持最大 token 数
   */
  supportsMaxTokens: boolean;

  /**
   * 是否支持 logprobs
   */
  supportsLogProbs: boolean;

  /**
   * 是否支持 logit bias
   */
  supportsLogitBias: boolean;

  /**
   * 提供商特有功能
   */
  providerSpecificFeatures: Record<string, boolean>;

  /**
   * 获取所有支持的功能
   */
  getAllSupportedFeatures(): Record<string, boolean>;

  /**
   * 检查是否支持特定功能
   */
  isFeatureSupported(feature: string): boolean;
}

/**
 * 基础功能支持实现
 */
export class BaseFeatureSupport implements FeatureSupport {
  public supportsStreaming: boolean = true;
  public supportsTools: boolean = false;
  public supportsImages: boolean = false;
  public supportsAudio: boolean = false;
  public supportsVideo: boolean = false;
  public supportsSystemMessages: boolean = true;
  public supportsFunctionCalling: boolean = false;
  public supportsParallelToolCalling: boolean = false;
  public supportsJsonMode: boolean = false;
  public supportsSeed: boolean = false;
  public supportsTemperature: boolean = true;
  public supportsTopP: boolean = true;
  public supportsTopK: boolean = false;
  public supportsFrequencyPenalty: boolean = false;
  public supportsPresencePenalty: boolean = false;
  public supportsStopSequences: boolean = true;
  public supportsMaxTokens: boolean = true;
  public supportsLogProbs: boolean = false;
  public supportsLogitBias: boolean = false;
  public providerSpecificFeatures: Record<string, boolean> = {};

  getAllSupportedFeatures(): Record<string, boolean> {
    return {
      supportsStreaming: this.supportsStreaming,
      supportsTools: this.supportsTools,
      supportsImages: this.supportsImages,
      supportsAudio: this.supportsAudio,
      supportsVideo: this.supportsVideo,
      supportsSystemMessages: this.supportsSystemMessages,
      supportsFunctionCalling: this.supportsFunctionCalling,
      supportsParallelToolCalling: this.supportsParallelToolCalling,
      supportsJsonMode: this.supportsJsonMode,
      supportsSeed: this.supportsSeed,
      supportsTemperature: this.supportsTemperature,
      supportsTopP: this.supportsTopP,
      supportsTopK: this.supportsTopK,
      supportsFrequencyPenalty: this.supportsFrequencyPenalty,
      supportsPresencePenalty: this.supportsPresencePenalty,
      supportsStopSequences: this.supportsStopSequences,
      supportsMaxTokens: this.supportsMaxTokens,
      supportsLogProbs: this.supportsLogProbs,
      supportsLogitBias: this.supportsLogitBias,
      ...this.providerSpecificFeatures
    };
  }

  isFeatureSupported(feature: string): boolean {
    const allFeatures = this.getAllSupportedFeatures();
    return allFeatures[feature] || false;
  }

  /**
   * 设置提供商特有功能
   */
  setProviderSpecificFeature(feature: string, supported: boolean): void {
    this.providerSpecificFeatures[feature] = supported;
  }

  /**
   * 批量设置提供商特有功能
   */
  setProviderSpecificFeatures(features: Record<string, boolean>): void {
    this.providerSpecificFeatures = { ...this.providerSpecificFeatures, ...features };
  }
}