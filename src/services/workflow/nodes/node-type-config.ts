/**
 * 节点类型配置
 *
 * 定义节点类型别名和映射关系，支持配置驱动的节点创建
 */

import { NodeTypeValue } from '../../../domain/workflow/value-objects/node/node-type';

/**
 * 节点类型映射配置
 */
export interface NodeTypeMapping {
  /** 类型别名（小写） */
  alias: string;
  /** 节点类型枚举值 */
  type: NodeTypeValue;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** 是否支持配置 */
  configurable: boolean;
}

/**
 * 节点类型配置
 */
export class NodeTypeConfig {
  private static readonly mappings: Map<string, NodeTypeMapping> = new Map([
    {
      alias: 'start',
      type: NodeTypeValue.START,
      displayName: '开始节点',
      description: '工作流的入口节点，负责初始化上下文和状态',
      configurable: true,
    },
    {
      alias: 'end',
      type: NodeTypeValue.END,
      displayName: '结束节点',
      description: '工作流的出口节点，负责收集结果和清理资源',
      configurable: true,
    },
    {
      alias: 'llm',
      type: NodeTypeValue.LLM,
      displayName: 'LLM节点',
      description: '调用大语言模型进行文本生成和处理',
      configurable: true,
    },
    {
      alias: 'tool',
      type: NodeTypeValue.TOOL,
      displayName: '工具调用节点',
      description: '调用外部工具或API执行特定任务',
      configurable: true,
    },
    {
      alias: 'tool-call',
      type: NodeTypeValue.TOOL,
      displayName: '工具调用节点（别名）',
      description: '调用外部工具或API执行特定任务',
      configurable: true,
    },
    {
      alias: 'condition',
      type: NodeTypeValue.CONDITION,
      displayName: '条件节点',
      description: '根据条件判断执行路径',
      configurable: true,
    },
    {
      alias: 'data-transform',
      type: NodeTypeValue.DATA_TRANSFORM,
      displayName: '数据转换节点',
      description: '对数据进行转换、过滤、聚合等操作',
      configurable: true,
    },
    {
      alias: 'context-processor',
      type: NodeTypeValue.CONTEXT_PROCESSOR,
      displayName: '上下文处理器节点',
      description: '处理和转换执行上下文',
      configurable: true,
    },
  ].map(mapping => [mapping.alias, mapping]));

  /**
   * 根据别名获取节点类型
   * @param alias 类型别名
   * @returns 节点类型枚举值
   * @throws 如果别名不存在
   */
  static getTypeByAlias(alias: string): NodeTypeValue {
    const normalizedAlias = alias.toLowerCase();
    const mapping = this.mappings.get(normalizedAlias);
    if (!mapping) {
      throw new Error(`未知的节点类型别名: ${alias}`);
    }
    return mapping.type;
  }

  /**
   * 根据节点类型获取别名
   * @param type 节点类型枚举值
   * @returns 类型别名
   * @throws 如果类型不存在
   */
  static getAliasByType(type: NodeTypeValue): string {
    for (const mapping of this.mappings.values()) {
      if (mapping.type === type) {
        return mapping.alias;
      }
    }
    throw new Error(`未知的节点类型: ${type}`);
  }

  /**
   * 获取节点类型映射
   * @param alias 类型别名
   * @returns 节点类型映射
   * @throws 如果别名不存在
   */
  static getMapping(alias: string): NodeTypeMapping {
    const normalizedAlias = alias.toLowerCase();
    const mapping = this.mappings.get(normalizedAlias);
    if (!mapping) {
      throw new Error(`未知的节点类型别名: ${alias}`);
    }
    return mapping;
  }

  /**
   * 检查别名是否存在
   * @param alias 类型别名
   * @returns 是否存在
   */
  static hasAlias(alias: string): boolean {
    return this.mappings.has(alias.toLowerCase());
  }

  /**
   * 获取所有支持的类型别名
   * @returns 类型别名列表
   */
  static getAllAliases(): string[] {
    return Array.from(this.mappings.keys());
  }

  /**
   * 获取所有支持的节点类型
   * @returns 节点类型列表
   */
  static getAllTypes(): NodeTypeValue[] {
    return Array.from(new Set(Array.from(this.mappings.values()).map(m => m.type)));
  }

  /**
   * 获取所有节点类型映射
   * @returns 节点类型映射列表
   */
  static getAllMappings(): NodeTypeMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * 注册新的节点类型映射
   * @param mapping 节点类型映射
   * @throws 如果别名已存在
   */
  static registerMapping(mapping: NodeTypeMapping): void {
    const normalizedAlias = mapping.alias.toLowerCase();
    if (this.mappings.has(normalizedAlias)) {
      throw new Error(`节点类型别名 ${mapping.alias} 已存在`);
    }
    this.mappings.set(normalizedAlias, mapping);
  }

  /**
   * 注销节点类型映射
   * @param alias 类型别名
   * @returns 是否成功
   */
  static unregisterMapping(alias: string): boolean {
    const normalizedAlias = alias.toLowerCase();
    return this.mappings.delete(normalizedAlias);
  }

  /**
   * 清空所有映射（主要用于测试）
   */
  static clear(): void {
    this.mappings.clear();
  }

  /**
   * 重置为默认映射（主要用于测试）
   */
  static reset(): void {
    this.clear();
    // 重新初始化默认映射
    const defaultMappings: NodeTypeMapping[] = [
      {
        alias: 'start',
        type: NodeTypeValue.START,
        displayName: '开始节点',
        description: '工作流的入口节点，负责初始化上下文和状态',
        configurable: true,
      },
      {
        alias: 'end',
        type: NodeTypeValue.END,
        displayName: '结束节点',
        description: '工作流的出口节点，负责收集结果和清理资源',
        configurable: true,
      },
      {
        alias: 'llm',
        type: NodeTypeValue.LLM,
        displayName: 'LLM节点',
        description: '调用大语言模型进行文本生成和处理',
        configurable: true,
      },
      {
        alias: 'tool',
        type: NodeTypeValue.TOOL,
        displayName: '工具调用节点',
        description: '调用外部工具或API执行特定任务',
        configurable: true,
      },
      {
        alias: 'tool-call',
        type: NodeTypeValue.TOOL,
        displayName: '工具调用节点（别名）',
        description: '调用外部工具或API执行特定任务',
        configurable: true,
      },
      {
        alias: 'condition',
        type: NodeTypeValue.CONDITION,
        displayName: '条件节点',
        description: '根据条件判断执行路径',
        configurable: true,
      },
      {
        alias: 'data-transform',
        type: NodeTypeValue.DATA_TRANSFORM,
        displayName: '数据转换节点',
        description: '对数据进行转换、过滤、聚合等操作',
        configurable: true,
      },
      {
        alias: 'context-processor',
        type: NodeTypeValue.CONTEXT_PROCESSOR,
        displayName: '上下文处理器节点',
        description: '处理和转换执行上下文',
        configurable: true,
      },
    ];
    defaultMappings.forEach(mapping => this.mappings.set(mapping.alias, mapping));
  }
}