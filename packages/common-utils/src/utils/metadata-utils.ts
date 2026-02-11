/**
 * 元数据工具函数
 * 提供元数据的创建、查询、修改和合并功能
 */

import type { Metadata } from '@modular-agent/types/common';

/**
 * 创建空元数据
 */
export function emptyMetadata(): Metadata {
  return {};
}

/**
 * 获取元数据值
 */
export function getMetadata(metadata: Metadata, key: string): any {
  return metadata[key];
}

/**
 * 设置元数据值（返回新对象，保持不可变性）
 */
export function setMetadata(metadata: Metadata, key: string, value: any): Metadata {
  return { ...metadata, [key]: value };
}

/**
 * 删除元数据值（返回新对象，保持不可变性）
 */
export function deleteMetadata(metadata: Metadata, key: string): Metadata {
  const { [key]: _, ...rest } = metadata;
  return rest;
}

/**
 * 检查是否存在
 */
export function hasMetadata(metadata: Metadata, key: string): boolean {
  return key in metadata;
}

/**
 * 合并元数据
 */
export function mergeMetadata(...metadatas: Metadata[]): Metadata {
  return Object.assign({}, ...metadatas);
}