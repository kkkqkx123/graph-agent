import { IParameterMapper } from '../interfaces/parameter-mapper.interface';
import { GeminiParameterMapper } from '../providers/gemini-parameter-mapper';
import { OpenAIParameterMapper } from '../providers/openai-parameter-mapper';
import { AnthropicParameterMapper } from '../providers/anthropic-parameter-mapper';

/**
 * 参数映射器工厂
 * 
 * 负责创建和管理参数映射器实例
 */
export class ParameterMapperFactory {
  private static mappers = new Map<string, IParameterMapper>();
  private static initialized = false;

  /**
   * 初始化默认映射器
   */
  private static initialize(): void {
    if (ParameterMapperFactory.initialized) {
      return;
    }

    // 注册默认映射器
    ParameterMapperFactory.mappers.set('gemini', new GeminiParameterMapper());
    ParameterMapperFactory.mappers.set('gemini-openai', new GeminiParameterMapper());
    ParameterMapperFactory.mappers.set('openai', new OpenAIParameterMapper());
    ParameterMapperFactory.mappers.set('anthropic', new AnthropicParameterMapper());

    ParameterMapperFactory.initialized = true;
  }

  /**
   * 获取参数映射器
   * @param providerName 提供商名称
   * @returns 参数映射器实例
   */
  static getMapper(providerName: string): IParameterMapper {
    ParameterMapperFactory.initialize();

    const mapper = ParameterMapperFactory.mappers.get(providerName);
    if (!mapper) {
      throw new Error(`No parameter mapper found for provider: ${providerName}`);
    }

    return mapper;
  }

  /**
   * 注册参数映射器
   * @param providerName 提供商名称
   * @param mapper 参数映射器实例
   */
  static registerMapper(providerName: string, mapper: IParameterMapper): void {
    ParameterMapperFactory.initialize();
    ParameterMapperFactory.mappers.set(providerName, mapper);
  }

  /**
   * 注销参数映射器
   * @param providerName 提供商名称
   */
  static unregisterMapper(providerName: string): void {
    ParameterMapperFactory.initialize();
    ParameterMapperFactory.mappers.delete(providerName);
  }

  /**
   * 获取所有已注册的映射器名称
   * @returns 映射器名称列表
   */
  static getRegisteredMappers(): string[] {
    ParameterMapperFactory.initialize();
    return Array.from(ParameterMapperFactory.mappers.keys());
  }

  /**
   * 检查映射器是否已注册
   * @param providerName 提供商名称
   * @returns 是否已注册
   */
  static hasMapper(providerName: string): boolean {
    ParameterMapperFactory.initialize();
    return ParameterMapperFactory.mappers.has(providerName);
  }

  /**
   * 清除所有映射器
   */
  static clear(): void {
    ParameterMapperFactory.mappers.clear();
    ParameterMapperFactory.initialized = false;
  }

  /**
   * 重新初始化工厂
   */
  static reinitialize(): void {
    ParameterMapperFactory.clear();
    ParameterMapperFactory.initialize();
  }
}