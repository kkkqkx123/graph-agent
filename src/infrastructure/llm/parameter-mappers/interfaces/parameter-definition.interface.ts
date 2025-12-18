/**
 * 参数定义接口
 */
export interface ParameterDefinition {
  /**
   * 参数名称
   */
  name: string;

  /**
   * 参数类型
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';

  /**
   * 是否必需
   */
  required: boolean;

  /**
   * 默认值
   */
  defaultValue?: any;

  /**
   * 参数描述
   */
  description?: string;

  /**
   * 验证函数
   */
  validation?: (value: any) => boolean;

  /**
   * 最小值（适用于数字）
   */
  min?: number;

  /**
   * 最大值（适用于数字）
   */
  max?: number;

  /**
   * 可选值列表
   */
  options?: any[];

  /**
   * 是否为提供商特有参数
   */
  isProviderSpecific?: boolean;

  /**
   * 参数分组
   */
  group?: 'basic' | 'advanced' | 'provider-specific';

  /**
   * 参数别名
   */
  aliases?: string[];

  /**
   * 是否已弃用
   */
  deprecated?: boolean;

  /**
   * 弃用消息
   */
  deprecationMessage?: string;

  /**
   * 参数示例
   */
  examples?: any[];
}

/**
 * 参数定义构建器
 */
export class ParameterDefinitionBuilder {
  private definition: Partial<ParameterDefinition> = {};

  /**
   * 设置参数名称
   */
  name(name: string): ParameterDefinitionBuilder {
    this.definition.name = name;
    return this;
  }

  /**
   * 设置参数类型
   */
  type(type: 'string' | 'number' | 'boolean' | 'object' | 'array'): ParameterDefinitionBuilder {
    this.definition.type = type;
    return this;
  }

  /**
   * 设置是否必需
   */
  required(required: boolean): ParameterDefinitionBuilder {
    this.definition.required = required;
    return this;
  }

  /**
   * 设置默认值
   */
  defaultValue(defaultValue: any): ParameterDefinitionBuilder {
    this.definition.defaultValue = defaultValue;
    return this;
  }

  /**
   * 设置参数描述
   */
  description(description: string): ParameterDefinitionBuilder {
    this.definition.description = description;
    return this;
  }

  /**
   * 设置验证函数
   */
  validation(validation: (value: any) => boolean): ParameterDefinitionBuilder {
    this.definition.validation = validation;
    return this;
  }

  /**
   * 设置最小值
   */
  min(min: number): ParameterDefinitionBuilder {
    this.definition.min = min;
    return this;
  }

  /**
   * 设置最大值
   */
  max(max: number): ParameterDefinitionBuilder {
    this.definition.max = max;
    return this;
  }

  /**
   * 设置可选值列表
   */
  options(options: any[]): ParameterDefinitionBuilder {
    this.definition.options = options;
    return this;
  }

  /**
   * 设置是否为提供商特有参数
   */
  isProviderSpecific(isProviderSpecific: boolean): ParameterDefinitionBuilder {
    this.definition.isProviderSpecific = isProviderSpecific;
    return this;
  }

  /**
   * 设置参数分组
   */
  group(group: 'basic' | 'advanced' | 'provider-specific'): ParameterDefinitionBuilder {
    this.definition.group = group;
    return this;
  }

  /**
   * 设置参数别名
   */
  aliases(aliases: string[]): ParameterDefinitionBuilder {
    this.definition.aliases = aliases;
    return this;
  }

  /**
   * 设置是否已弃用
   */
  deprecated(deprecated: boolean): ParameterDefinitionBuilder {
    this.definition.deprecated = deprecated;
    return this;
  }

  /**
   * 设置弃用消息
   */
  deprecationMessage(deprecationMessage: string): ParameterDefinitionBuilder {
    this.definition.deprecationMessage = deprecationMessage;
    return this;
  }

  /**
   * 设置参数示例
   */
  examples(examples: any[]): ParameterDefinitionBuilder {
    this.definition.examples = examples;
    return this;
  }

  /**
   * 构建参数定义
   */
  build(): ParameterDefinition {
    if (!this.definition.name) {
      throw new Error('Parameter name is required');
    }
    if (!this.definition.type) {
      throw new Error('Parameter type is required');
    }
    if (this.definition.required === undefined) {
      throw new Error('Parameter required flag is required');
    }

    return this.definition as ParameterDefinition;
  }
}

/**
 * 常用参数定义
 */
export class CommonParameterDefinitions {
  /**
   * 模型参数
   */
  static model(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('model')
      .type('string')
      .required(true)
      .description('模型名称')
      .build();
  }

  /**
   * 消息参数
   */
  static messages(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('messages')
      .type('array')
      .required(true)
      .description('消息列表')
      .build();
  }

  /**
   * 温度参数
   */
  static temperature(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('temperature')
      .type('number')
      .required(false)
      .defaultValue(0.7)
      .description('控制输出的随机性，值越高越随机')
      .min(0)
      .max(2)
      .group('basic')
      .build();
  }

  /**
   * 最大 token 数参数
   */
  static maxTokens(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('maxTokens')
      .type('number')
      .required(false)
      .defaultValue(1000)
      .description('生成的最大 token 数')
      .min(1)
      .group('basic')
      .build();
  }

  /**
   * Top P 参数
   */
  static topP(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('topP')
      .type('number')
      .required(false)
      .defaultValue(1.0)
      .description('核采样参数，控制考虑的 token 范围')
      .min(0)
      .max(1)
      .group('advanced')
      .build();
  }

  /**
   * 频率惩罚参数
   */
  static frequencyPenalty(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('frequencyPenalty')
      .type('number')
      .required(false)
      .defaultValue(0.0)
      .description('频率惩罚，降低重复内容的概率')
      .min(-2)
      .max(2)
      .group('advanced')
      .build();
  }

  /**
   * 存在惩罚参数
   */
  static presencePenalty(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('presencePenalty')
      .type('number')
      .required(false)
      .defaultValue(0.0)
      .description('存在惩罚，鼓励谈论新话题')
      .min(-2)
      .max(2)
      .group('advanced')
      .build();
  }

  /**
   * 停止序列参数
   */
  static stop(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('stop')
      .type('array')
      .required(false)
      .description('停止序列，遇到这些内容时停止生成')
      .group('advanced')
      .build();
  }

  /**
   * 流式参数
   */
  static stream(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('stream')
      .type('boolean')
      .required(false)
      .defaultValue(false)
      .description('是否启用流式响应')
      .group('basic')
      .build();
  }

  /**
   * 推理努力参数
   */
  static reasoningEffort(): ParameterDefinition {
    return new ParameterDefinitionBuilder()
      .name('reasoningEffort')
      .type('string')
      .required(false)
      .options(['low', 'medium', 'high'])
      .description('推理努力程度')
      .group('provider-specific')
      .build();
  }
}