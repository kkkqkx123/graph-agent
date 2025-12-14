import { ValueObject } from './value-object';
import { DomainError } from '../errors/domain-error';

/**
 * ID值对象接口
 */
export interface IdProps {
  value: string;
}

/**
 * ID值对象
 * 
 * 用于表示系统中各种实体的唯一标识符
 */
export class ID extends ValueObject<IdProps> {
  /**
   * 创建ID实例
   * @param value ID值
   * @returns ID实例
   */
  public static create(value: string): ID {
    return new ID({ value });
  }

  /**
   * 生成新的唯一ID
   * @returns 新的ID实例
   */
  public static generate(): ID {
    // 使用UUID v4生成唯一ID
    const value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return new ID({ value });
  }

  /**
   * 从字符串创建ID
   * @param str 字符串
   * @returns ID实例
   */
  public static fromString(str: string): ID {
    return new ID({ value: str });
  }

  /**
   * 获取ID值
   * @returns ID值
   */
  public getValue(): string {
    return this.props.value;
  }

  /**
   * 验证ID的有效性
   */
  public validate(): void {
    if (!this.props.value || this.props.value.trim().length === 0) {
      throw new DomainError('ID不能为空');
    }
  }

  /**
   * 比较两个ID是否相等
   * @param id 另一个ID
   * @returns 是否相等
   */
  public override equals(id?: ID): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    return this.props.value === id.getValue();
  }

  /**
   * 获取ID的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }
}