import { IEndpointStrategy } from '../interfaces/endpoint-strategy.interface';
import { OpenAICompatibleEndpointStrategy } from '../providers/openai-compatible-endpoint-strategy';
import { GeminiNativeEndpointStrategy } from '../providers/gemini-native-endpoint-strategy';
import { AnthropicEndpointStrategy } from '../providers/anthropic-endpoint-strategy';

/**
 * 端点策略工厂
 * 
 * 负责创建和管理端点策略实例
 */
export class EndpointStrategyFactory {
  private static strategies = new Map<string, IEndpointStrategy>();
  private static initialized = false;

  /**
   * 初始化默认策略
   */
  private static initialize(): void {
    if (EndpointStrategyFactory.initialized) {
      return;
    }

    // 注册默认策略
    EndpointStrategyFactory.strategies.set('openai-compatible', new OpenAICompatibleEndpointStrategy());
    EndpointStrategyFactory.strategies.set('gemini-native', new GeminiNativeEndpointStrategy());
    EndpointStrategyFactory.strategies.set('anthropic', new AnthropicEndpointStrategy());

    EndpointStrategyFactory.initialized = true;
  }

  /**
   * 获取端点策略
   * @param strategyName 策略名称
   * @returns 端点策略实例
   */
  static getStrategy(strategyName: string): IEndpointStrategy {
    EndpointStrategyFactory.initialize();

    const strategy = EndpointStrategyFactory.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`No endpoint strategy found for: ${strategyName}`);
    }

    return strategy;
  }

  /**
   * 注册端点策略
   * @param strategyName 策略名称
   * @param strategy 端点策略实例
   */
  static registerStrategy(strategyName: string, strategy: IEndpointStrategy): void {
    EndpointStrategyFactory.initialize();
    EndpointStrategyFactory.strategies.set(strategyName, strategy);
  }

  /**
   * 注销端点策略
   * @param strategyName 策略名称
   */
  static unregisterStrategy(strategyName: string): void {
    EndpointStrategyFactory.initialize();
    EndpointStrategyFactory.strategies.delete(strategyName);
  }

  /**
   * 获取所有已注册的策略名称
   * @returns 策略名称列表
   */
  static getRegisteredStrategies(): string[] {
    EndpointStrategyFactory.initialize();
    return Array.from(EndpointStrategyFactory.strategies.keys());
  }

  /**
   * 检查策略是否已注册
   * @param strategyName 策略名称
   * @returns 是否已注册
   */
  static hasStrategy(strategyName: string): boolean {
    EndpointStrategyFactory.initialize();
    return EndpointStrategyFactory.strategies.has(strategyName);
  }

  /**
   * 清除所有策略
   */
  static clear(): void {
    EndpointStrategyFactory.strategies.clear();
    EndpointStrategyFactory.initialized = false;
  }

  /**
   * 重新初始化工厂
   */
  static reinitialize(): void {
    EndpointStrategyFactory.clear();
    EndpointStrategyFactory.initialize();
  }
}