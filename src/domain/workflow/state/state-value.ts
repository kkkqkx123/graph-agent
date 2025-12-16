/**
 * 状态值类型枚举
 */
export enum StateValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  NULL = 'null',
  UNDEFINED = 'undefined'
}

/**
 * 状态值接口
 */
export interface StateValue {
  /** 值 */
  readonly value: any;
  /** 类型 */
  readonly type: StateValueType;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 最后更新时间 */
  readonly updatedAt: Date;
  /** 版本号 */
  readonly version: number;
  /** 元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 状态值构建器
 */
export class StateValueBuilder {
  private value: any;
  private type: StateValueType;
  private createdAt: Date;
  private updatedAt: Date;
  private version: number;
  private metadata: Record<string, any>;

  constructor(value: any) {
    this.value = value;
    this.type = this.detectType(value);
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.version = 1;
    this.metadata = {};
  }

  withType(type: StateValueType): StateValueBuilder {
    this.type = type;
    return this;
  }

  withCreatedAt(createdAt: Date): StateValueBuilder {
    this.createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): StateValueBuilder {
    this.updatedAt = updatedAt;
    return this;
  }

  withVersion(version: number): StateValueBuilder {
    this.version = version;
    return this;
  }

  withMetadata(metadata: Record<string, any>): StateValueBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): StateValue {
    return {
      value: this.value,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      metadata: this.metadata
    };
  }

  /**
   * 检测值的类型
   */
  private detectType(value: any): StateValueType {
    if (value === null) return StateValueType.NULL;
    if (value === undefined) return StateValueType.UNDEFINED;
    if (typeof value === 'string') return StateValueType.STRING;
    if (typeof value === 'number') return StateValueType.NUMBER;
    if (typeof value === 'boolean') return StateValueType.BOOLEAN;
    if (Array.isArray(value)) return StateValueType.ARRAY;
    if (typeof value === 'object') return StateValueType.OBJECT;
    return StateValueType.UNDEFINED;
  }
}

/**
 * 状态值工具类
 */
export class StateValueUtils {
  /**
   * 创建状态值
   */
  static create(value: any): StateValueBuilder {
    return new StateValueBuilder(value);
  }

  /**
   * 克隆状态值
   */
  static clone(stateValue: StateValue): StateValue {
    return StateValueUtils.create(stateValue.value)
      .withType(stateValue.type)
      .withCreatedAt(stateValue.createdAt)
      .withUpdatedAt(new Date())
      .withVersion(stateValue.version + 1)
      .withMetadata(stateValue.metadata)
      .build();
  }

  /**
   * 更新状态值
   */
  static update(stateValue: StateValue, newValue: any): StateValue {
    return StateValueUtils.create(newValue)
      .withType(this.detectType(newValue))
      .withCreatedAt(stateValue.createdAt)
      .withUpdatedAt(new Date())
      .withVersion(stateValue.version + 1)
      .withMetadata(stateValue.metadata)
      .build();
  }

  /**
   * 检测值的类型
   */
  static detectType(value: any): StateValueType {
    if (value === null) return StateValueType.NULL;
    if (value === undefined) return StateValueType.UNDEFINED;
    if (typeof value === 'string') return StateValueType.STRING;
    if (typeof value === 'number') return StateValueType.NUMBER;
    if (typeof value === 'boolean') return StateValueType.BOOLEAN;
    if (Array.isArray(value)) return StateValueType.ARRAY;
    if (typeof value === 'object') return StateValueType.OBJECT;
    return StateValueType.UNDEFINED;
  }

  /**
   * 检查类型是否匹配
   */
  static isTypeMatch(value: any, expectedType: StateValueType): boolean {
    return this.detectType(value) === expectedType;
  }

  /**
   * 类型转换
   */
  static convertType(value: any, targetType: StateValueType): any {
    const currentType = this.detectType(value);
    
    if (currentType === targetType) {
      return value;
    }

    switch (targetType) {
      case StateValueType.STRING:
        return String(value);
      case StateValueType.NUMBER:
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case StateValueType.BOOLEAN:
        return Boolean(value);
      case StateValueType.OBJECT:
        if (currentType === StateValueType.ARRAY) {
          return { items: value };
        }
        return { value };
      case StateValueType.ARRAY:
        if (currentType === StateValueType.OBJECT) {
          return Object.values(value);
        }
        return [value];
      case StateValueType.NULL:
        return null;
      case StateValueType.UNDEFINED:
        return undefined;
      default:
        return value;
    }
  }

  /**
   * 比较两个状态值
   */
  static equals(value1: StateValue, value2: StateValue): boolean {
    if (value1.type !== value2.type) {
      return false;
    }
    
    // 深度比较
    return this.deepEquals(value1.value, value2.value);
  }

  /**
   * 深度比较两个值
   */
  private static deepEquals(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    
    if (value1 == null || value2 == null) return false;
    
    if (typeof value1 !== typeof value2) return false;
    
    if (typeof value1 !== 'object') return value1 === value2;
    
    if (Array.isArray(value1) !== Array.isArray(value2)) return false;
    
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEquals(value1[key], value2[key])) return false;
    }
    
    return true;
  }

  /**
   * 序列化状态值
   */
  static serialize(stateValue: StateValue): string {
    return JSON.stringify({
      value: stateValue.value,
      type: stateValue.type,
      createdAt: stateValue.createdAt.toISOString(),
      updatedAt: stateValue.updatedAt.toISOString(),
      version: stateValue.version,
      metadata: stateValue.metadata
    });
  }

  /**
   * 反序列化状态值
   */
  static deserialize(data: string): StateValue {
    const parsed = JSON.parse(data);
    return {
      value: parsed.value,
      type: parsed.type,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      version: parsed.version,
      metadata: parsed.metadata
    };
  }

  /**
   * 获取状态值的摘要
   */
  static getSummary(stateValue: StateValue): string {
    const valuePreview = this.getValuePreview(stateValue.value);
    return `${stateValue.type}: ${valuePreview} (v${stateValue.version})`;
  }

  /**
   * 获取值的预览
   */
  private static getValuePreview(value: any, maxLength: number = 50): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      return value.length > maxLength ? `"${value.substring(0, maxLength)}..."` : `"${value}"`;
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
    }
    return String(value);
  }

  /**
   * 检查状态值是否过期
   */
  static isExpired(stateValue: StateValue, maxAge: number): boolean {
    const now = new Date();
    const age = now.getTime() - stateValue.updatedAt.getTime();
    return age > maxAge;
  }

  /**
   * 获取状态值的年龄（毫秒）
   */
  static getAge(stateValue: StateValue): number {
    const now = new Date();
    return now.getTime() - stateValue.createdAt.getTime();
  }

  /**
   * 获取状态值的最后更新时间（毫秒）
   */
  static getTimeSinceLastUpdate(stateValue: StateValue): number {
    const now = new Date();
    return now.getTime() - stateValue.updatedAt.getTime();
  }
}