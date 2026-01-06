/**
 * 提示词ID值对象
 */

import { ID } from '../../common/value-objects';

export class PromptId extends ID {
  constructor(value: string) {
    super(value);
  }

  /**
   * 从类别和名称创建提示词ID
   */
  static create(category: string, name: string): PromptId {
    return new PromptId(`${category}.${name}`);
  }

  /**
   * 获取原始值
   */
  getValue(): string {
    return this.value;
  }

  /**
   * 解析ID为类别和名称
   */
  parse(): { category: string; name: string } {
    const parts = this.value.split('.');
    if (parts.length < 2) {
      throw new Error(`Invalid prompt ID format: ${this.value}`);
    }
    const category = parts[0]!;
    const name = parts.slice(1).join('.');
    return { category, name };
  }

  /**
   * 比较两个ID是否相等
   */
  override equals(other: PromptId): boolean {
    return this.value === other.value;
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    return this.value;
  }
}
