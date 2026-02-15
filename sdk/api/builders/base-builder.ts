/**
 * BaseBuilder - 构建器抽象基类
 * 提供所有构建器的通用功能：时间戳管理、元数据管理、描述设置
 */

import type { Metadata } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';

/**
 * BaseBuilder - 构建器抽象基类
 */
export abstract class BaseBuilder<T> {
  protected _description?: string;
  protected _metadata: Metadata = {};
  protected _createdAt: number = now();
  protected _updatedAt: number = now();

  /**
   * 设置描述
   * @param description 描述
   * @returns this
   */
  description(description: string): this {
    this._description = description;
    this._updatedAt = now();
    return this;
  }

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns this
   */
  metadata(metadata: Metadata): this {
    this._metadata = metadata;
    this._updatedAt = now();
    return this;
  }

  /**
   * 设置分类
   * @param category 分类
   * @returns this
   */
  category(category: string): this {
    if (!this._metadata) {
      this._metadata = {};
    }
    this._metadata['category'] = category;
    this._updatedAt = now();
    return this;
  }

  /**
   * 添加标签
   * @param tags 标签数组
   * @returns this
   */
  tags(...tags: string[]): this {
    if (!this._metadata) {
      this._metadata = {};
    }
    if (!this._metadata['tags']) {
      this._metadata['tags'] = [];
    }
    this._metadata['tags'].push(...tags);
    this._updatedAt = now();
    return this;
  }

  /**
   * 添加或更新元数据项
   * @param key 元数据键
   * @param value 元数据值
   * @returns this
   */
  addMetadata(key: string, value: any): this {
    if (!this._metadata) {
      this._metadata = {};
    }
    this._metadata[key] = value;
    this._updatedAt = now();
    return this;
  }

  /**
   * 移除元数据项
   * @param key 元数据键
   * @returns this
   */
  removeMetadata(key: string): this {
    if (this._metadata) {
      delete this._metadata[key];
      this._updatedAt = now();
    }
    return this;
  }

  /**
   * 清空所有元数据
   * @returns this
   */
  clearMetadata(): this {
    this._metadata = {};
    this._updatedAt = now();
    return this;
  }

  /**
   * 获取创建时间
   * @returns 创建时间戳
   */
  getCreatedAt(): number {
    return this._createdAt;
  }

  /**
   * 获取更新时间
   * @returns 更新时间戳
   */
  getUpdatedAt(): number {
    return this._updatedAt;
  }

  /**
   * 更新时间戳
   */
  protected updateTimestamp(): void {
    this._updatedAt = now();
  }

  /**
   * 构建对象（抽象方法，子类必须实现）
   * @returns 构建结果
   */
  abstract build(): T;
}