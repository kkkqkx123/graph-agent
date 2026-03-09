/**
 * 通用 Checkpoint 配置解析器
 *
 * 提供检查点配置的优先级解析逻辑。
 * 支持多层级配置，具体层级由子类定义。
 */

import type {
  CheckpointConfigResult,
  CheckpointConfigSourceType
} from './types.js';

/**
 * 配置层级定义
 */
export interface ConfigLayer {
  /** 层级名称 */
  name: string;
  /** 层级优先级（数字越大优先级越高） */
  priority: number;
  /** 是否启用检查点 */
  enabled?: boolean;
  /** 检查点描述 */
  description?: string;
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 配置解析器选项
 */
export interface ConfigResolverOptions {
  /** 默认是否启用 */
  defaultEnabled?: boolean;
  /** 默认描述 */
  defaultDescription?: string;
}

/**
 * 通用配置解析器基类
 *
 * 提供配置优先级解析的通用逻辑。
 * 子类可以扩展以添加特定场景的配置层级。
 */
export abstract class CheckpointConfigResolver {
  protected defaultEnabled: boolean;
  protected defaultDescription: string;

  constructor(options: ConfigResolverOptions = {}) {
    this.defaultEnabled = options.defaultEnabled ?? false;
    this.defaultDescription = options.defaultDescription ?? 'Checkpoint';
  }

  /**
   * 解析配置
   *
   * 按优先级从高到低检查各层配置，返回第一个明确配置的结果。
   *
   * @param layers 配置层级列表（已按优先级排序）
   * @returns 解析结果
   */
  resolve(layers: ConfigLayer[]): CheckpointConfigResult {
    // 按优先级排序（高到低）
    const sortedLayers = [...layers].sort((a, b) => b.priority - a.priority);

    // 遍历各层级，找到第一个明确配置的
    for (const layer of sortedLayers) {
      if (layer.enabled !== undefined) {
        return {
          shouldCreate: layer.enabled,
          description: layer.description || this.defaultDescription,
          source: layer.name as CheckpointConfigSourceType,
          metadata: layer.metadata
        };
      }
    }

    // 没有明确配置，使用默认值
    return {
      shouldCreate: this.defaultEnabled,
      description: this.defaultDescription,
      source: 'disabled'
    };
  }

  /**
   * 创建配置层级
   *
   * 工厂方法，用于创建配置层级对象。
   *
   * @param name 层级名称
   * @param priority 优先级
   * @param config 配置内容
   * @returns 配置层级
   */
  protected createLayer(
    name: string,
    priority: number,
    config?: {
      enabled?: boolean;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): ConfigLayer {
    return {
      name,
      priority,
      ...config
    };
  }
}

/**
 * 简单配置解析器
 *
 * 提供基本的配置解析功能，适用于简单场景。
 */
export class SimpleCheckpointConfigResolver extends CheckpointConfigResolver {
  /**
   * 解析简单配置
   *
   * @param explicitConfig 显式配置（最高优先级）
   * @param globalConfig 全局配置
   * @returns 解析结果
   */
  resolveSimple(
    explicitConfig?: { enabled?: boolean; description?: string },
    globalConfig?: { enabled?: boolean; description?: string }
  ): CheckpointConfigResult {
    const layers: ConfigLayer[] = [
      this.createLayer('explicit', 100, explicitConfig),
      this.createLayer('global', 10, globalConfig)
    ];

    return this.resolve(layers);
  }
}

/**
 * 检查是否应该创建检查点
 *
 * 便捷函数，用于快速判断。
 *
 * @param resolver 配置解析器
 * @param layers 配置层级
 * @returns 是否创建
 */
export function shouldCreateCheckpoint(
  resolver: CheckpointConfigResolver,
  layers: ConfigLayer[]
): boolean {
  return resolver.resolve(layers).shouldCreate;
}

/**
 * 获取检查点描述
 *
 * 便捷函数，用于获取描述。
 *
 * @param resolver 配置解析器
 * @param layers 配置层级
 * @returns 描述
 */
export function getCheckpointDescription(
  resolver: CheckpointConfigResolver,
  layers: ConfigLayer[]
): string | undefined {
  return resolver.resolve(layers).description;
}
