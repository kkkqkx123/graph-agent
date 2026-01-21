/**
 * EdgeBuilder 类
 *
 * 提供流式 API 用于构建边配置
 * 支持链式调用，提供流畅的开发体验
 */

import type {
  EdgeConfig,
  EdgeConditionConfig,
} from '../types';

/**
 * EdgeBuilder 类
 * 用于构建边配置的流式 API
 */
export class EdgeBuilder {
  private config: Partial<EdgeConfig>;

  private constructor() {
    this.config = {};
  }

  /**
   * 创建边构建器实例
   * @returns EdgeBuilder 实例
   */
  public static create(): EdgeBuilder {
    return new EdgeBuilder();
  }

  /**
   * 设置源节点
   * @param from 源节点 ID
   * @returns this
   */
  public from(from: string): EdgeBuilder {
    this.config.from = from;
    return this;
  }

  /**
   * 设置目标节点
   * @param to 目标节点 ID
   * @returns this
   */
  public to(to: string): EdgeBuilder {
    this.config.to = to;
    return this;
  }

  /**
   * 设置边类型
   * @param type 边类型
   * @returns this
   */
  public type(type: string): EdgeBuilder {
    this.config.type = type;
    return this;
  }

  /**
   * 设置边条件
   * @param condition 条件配置对象
   * @returns this
   */
  public condition(condition: EdgeConditionConfig): EdgeBuilder {
    this.config.condition = condition;
    return this;
  }

  /**
   * 设置函数类型条件
   * @param functionId 函数 ID
   * @param config 函数配置
   * @returns this
   */
  public functionCondition(functionId: string, config?: Record<string, unknown>): EdgeBuilder {
    this.config.condition = {
      type: 'function',
      value: functionId,
      parameters: config,
    };
    return this;
  }

  /**
   * 设置表达式类型条件
   * @param expression 表达式字符串
   * @returns this
   */
  public expressionCondition(expression: string): EdgeBuilder {
    this.config.condition = {
      type: 'expression',
      value: expression,
    };
    return this;
  }

  /**
   * 设置脚本类型条件
   * @param script 脚本字符串
   * @param language 脚本语言
   * @returns this
   */
  public scriptCondition(script: string, language?: string): EdgeBuilder {
    this.config.condition = {
      type: 'script',
      value: script,
      language,
    };
    return this;
  }

  /**
   * 设置边权重
   * @param weight 权重值
   * @returns this
   */
  public weight(weight: number): EdgeBuilder {
    this.config.weight = weight;
    return this;
  }

  /**
   * 设置边属性
   * @param properties 属性对象
   * @returns this
   */
  public properties(properties: Record<string, unknown>): EdgeBuilder {
    this.config.properties = properties;
    return this;
  }

  /**
   * 合并边属性
   * @param properties 要合并的属性对象
   * @returns this
   */
  public mergeProperties(properties: Record<string, unknown>): EdgeBuilder {
    this.config.properties = {
      ...this.config.properties,
      ...properties,
    };
    return this;
  }

  /**
   * 添加单个属性
   * @param key 属性键
   * @param value 属性值
   * @returns this
   */
  public addProperty(key: string, value: unknown): EdgeBuilder {
    if (!this.config.properties) {
      this.config.properties = {};
    }
    this.config.properties[key] = value;
    return this;
  }

  /**
   * 构建最终的边配置对象
   * @returns EdgeConfig 对象
   * @throws Error 如果配置无效
   */
  public build(): EdgeConfig {
    this.validate();
    return this.config as EdgeConfig;
  }

  /**
   * 验证边配置
   * @throws Error 如果配置无效
   */
  private validate(): void {
    if (!this.config.from || this.config.from.trim() === '') {
      throw new Error('边必须包含源节点 ID (from)');
    }

    if (!this.config.to || this.config.to.trim() === '') {
      throw new Error('边必须包含目标节点 ID (to)');
    }

    if (this.config.from === this.config.to) {
      throw new Error('边的源节点和目标节点不能相同');
    }

    // 验证权重
    if (this.config.weight !== undefined) {
      if (typeof this.config.weight !== 'number') {
        throw new Error('边权重必须是数字');
      }
      if (this.config.weight < 0) {
        throw new Error('边权重不能为负数');
      }
    }

    // 验证条件配置
    if (this.config.condition) {
      const validTypes = ['function', 'expression', 'script'];
      if (!validTypes.includes(this.config.condition.type)) {
        throw new Error(`无效的条件类型: ${this.config.condition.type}`);
      }
      if (!this.config.condition.value || this.config.condition.value.trim() === '') {
        throw new Error('条件配置必须包含 value 字段');
      }
    }
  }

  /**
   * 创建简单边（无条件和权重）
   * @param from 源节点 ID
   * @param to 目标节点 ID
   * @returns EdgeConfig 对象
   */
  public static simple(from: string, to: string): EdgeConfig {
    return EdgeBuilder.create()
      .from(from)
      .to(to)
      .build();
  }

  /**
   * 创建条件边
   * @param from 源节点 ID
   * @param to 目标节点 ID
   * @param condition 条件配置
   * @returns EdgeConfig 对象
   */
  public static conditional(
    from: string,
    to: string,
    condition: EdgeConditionConfig
  ): EdgeConfig {
    return EdgeBuilder.create()
      .from(from)
      .to(to)
      .condition(condition)
      .build();
  }

  /**
   * 创建带权重的边
   * @param from 源节点 ID
   * @param to 目标节点 ID
   * @param weight 权重值
   * @returns EdgeConfig 对象
   */
  public static weighted(from: string, to: string, weight: number): EdgeConfig {
    return EdgeBuilder.create()
      .from(from)
      .to(to)
      .weight(weight)
      .build();
  }
}