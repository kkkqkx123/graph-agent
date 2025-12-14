import { v4 as uuidv4 } from 'uuid';

/**
 * ID值对象
 * 
 * 表示实体的唯一标识符
 */
export class ID {
  /**
   * ID值
   */
  readonly value: string;

  /**
   * 构造函数
   * 
   * @param value ID值
   */
  constructor(value: string) {
    if (!ID.isValid(value)) {
      throw new Error(`Invalid ID: ${value}`);
    }
    
    this.value = value;
  }

  /**
   * 检查ID值是否有效
   * 
   * @param value ID值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    // 检查是否为有效的UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * 生成新的ID
   * 
   * @returns 新ID
   */
  static generate(): ID {
    return new ID(uuidv4());
  }

  /**
   * 从字符串创建ID
   * 
   * @param value 字符串值
   * @returns ID
   */
  static fromString(value: string): ID {
    return new ID(value);
  }

  /**
   * 检查是否为空ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value === '00000000-0000-0000-0000-000000000000';
  }

  /**
   * 获取ID的短表示（前8位）
   * 
   * @returns 短表示
   */
  toShort(): string {
    return this.value.substring(0, 8);
  }

  /**
   * 转换为字符串
   * 
   * @returns 字符串表示
   */
  toString(): string {
    return this.value;
  }

  /**
   * 转换为JSON
   * 
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * 检查是否相等
   * 
   * @param other 另一个ID
   * @returns 是否相等
   */
  equals(other: ID): boolean {
    return this.value === other.value;
  }

  /**
   * 哈希值
   * 
   * @returns 哈希值
   */
  hashCode(): number {
    return this.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  /**
   * 比较两个ID
   * 
   * @param other 另一个ID
   * @returns 比较结果
   */
  compareTo(other: ID): number {
    if (this.value < other.value) {
      return -1;
    } else if (this.value > other.value) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * 获取ID的版本
   * 
   * @returns 版本号
   */
  getVersion(): number {
    return parseInt(this.value.substring(14, 15), 16);
  }

  /**
   * 获取ID的变体
   * 
   * @returns 变体号
   */
  getVariant(): number {
    return parseInt(this.value.substring(19, 20), 16);
  }

  /**
   * 获取ID的时间戳（仅适用于v1 UUID）
   * 
   * @returns 时间戳
   */
  getTimestamp(): number | null {
    if (this.getVersion() !== 1) {
      return null;
    }

    const timeLow = parseInt(this.value.substring(0, 8), 16);
    const timeMid = parseInt(this.value.substring(9, 13), 16);
    const timeHi = parseInt(this.value.substring(15, 19), 16);
    
    const time = ((timeHi & 0x0fff) << 48) + (timeMid << 32) + timeLow;
    
    // UUID时间戳从1582-10-15开始
    return time - 122192928000000000;
  }

  /**
   * 获取ID的节点ID（仅适用于v1 UUID）
   * 
   * @returns 节点ID
   */
  getNodeId(): string | null {
    if (this.getVersion() !== 1) {
      return null;
    }

    return this.value.substring(24);
  }

  /**
   * 获取ID的时钟序列（仅适用于v1 UUID）
   * 
   * @returns 时钟序列
   */
  getClockSequence(): number | null {
    if (this.getVersion() !== 1) {
      return null;
    }

    const clockSeqHi = parseInt(this.value.substring(19, 21), 16);
    const clockSeqLow = parseInt(this.value.substring(21, 23), 16);
    
    return ((clockSeqHi & 0x3f) << 8) | clockSeqLow;
  }

  /**
   * 创建空ID
   * 
   * @returns 空ID
   */
  static empty(): ID {
    return new ID('00000000-0000-0000-0000-000000000000');
  }

  /**
   * 检查是否为空ID
   * 
   * @param id ID
   * @returns 是否为空
   */
  static isEmpty(id: ID): boolean {
    return id.isEmpty();
  }

  /**
   * 从字节数组创建ID
   * 
   * @param bytes 字节数组
   * @returns ID
   */
  static fromBytes(bytes: Uint8Array): ID {
    if (bytes.length !== 16) {
      throw new Error('Byte array must be 16 bytes long');
    }

    const hex = Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    const uuid = [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');

    return new ID(uuid);
  }

  /**
   * 转换为字节数组
   * 
   * @returns 字节数组
   */
  toBytes(): Uint8Array {
    const hex = this.value.replace(/-/g, '');
    const bytes = new Uint8Array(16);

    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }

    return bytes;
  }

  /**
   * 从Base64字符串创建ID
   * 
   * @param base64 Base64字符串
   * @returns ID
   */
  static fromBase64(base64: string): ID {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return ID.fromBytes(bytes);
  }

  /**
   * 转换为Base64字符串
   * 
   * @returns Base64字符串
   */
  toBase64(): string {
    const bytes = this.toBytes();
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * 克隆ID
   * 
   * @returns 新ID
   */
  clone(): ID {
    return new ID(this.value);
  }

  /**
   * 获取ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `ID(${this.value})`;
  }
}