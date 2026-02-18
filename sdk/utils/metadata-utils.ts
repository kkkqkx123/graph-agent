/**
 * 元数据工具函数
 * 提供元数据的查询和合并功能
 */

import type { Metadata } from '@modular-agent/types';

/**
 * 获取元数据值
 */
export function getMetadata(metadata: Metadata, key: string): any {
  return metadata[key];
}

/**
 * 检查是否存在
 */
export function hasMetadata(metadata: Metadata, key: string): boolean {
  return key in metadata;
}

/**
 * 合并元数据
 * 后面的元数据会覆盖前面的同名键
 */
export function mergeMetadata(...metadatas: Metadata[]): Metadata {
  return Object.assign({}, ...metadatas);
}