/**
 * 类型转换器基础模块
 * 
 * 提供编译时类型安全的类型转换功能
 * 消除传统mapper，直接在repository中使用
 */

import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';

/**
 * 类型转换器接口
 * 定义从存储类型到领域类型的转换规则
 */
export interface TypeConverter<TStorage, TDomain> {
  readonly fromStorage: (value: TStorage) => TDomain;
  readonly toStorage: (value: TDomain) => TStorage;
  readonly validateStorage: (value: TStorage) => boolean;
  readonly validateDomain: (value: TDomain) => boolean;
}

/**
 * ID类型转换器
 * 将字符串ID转换为ID值对象
 */
export const IdConverter: TypeConverter<string, ID> = {
  fromStorage: (value: string) => ID.fromString(value),
  toStorage: (value: ID) => value.value,
  validateStorage: (value: string) => typeof value === 'string' && value.length > 0,
  validateDomain: (value: ID) => value instanceof ID && value.value.length > 0
};

/**
 * 可选ID类型转换器
 */
export const OptionalIdConverter: TypeConverter<string | undefined, ID | undefined> = {
  fromStorage: (value: string | undefined) => {
    if (!value) return undefined;
    return IdConverter.fromStorage(value);
  },
  toStorage: (value: ID | undefined) => {
    if (!value) return undefined;
    return IdConverter.toStorage(value);
  },
  validateStorage: (value: string | undefined) => {
    if (!value) return true;
    return IdConverter.validateStorage(value);
  },
  validateDomain: (value: ID | undefined) => {
    if (!value) return true;
    return IdConverter.validateDomain(value);
  }
};

/**
 * 时间戳类型转换器
 * 将Date转换为Timestamp值对象
 */
export const TimestampConverter: TypeConverter<Date, Timestamp> = {
  fromStorage: (value: Date) => Timestamp.create(value),
  toStorage: (value: Timestamp) => value.getDate(),
  validateStorage: (value: Date) => value instanceof Date && !isNaN(value.getTime()),
  validateDomain: (value: Timestamp) => value instanceof Timestamp && value.getDate() instanceof Date
};

/**
 * 版本类型转换器
 * 将数字版本转换为Version值对象
 */
export const VersionConverter: TypeConverter<number, Version> = {
  fromStorage: (value: number) => Version.fromString(value.toString()),
  toStorage: (value: Version) => parseInt(value.getValue()),
  validateStorage: (value: number) => typeof value === 'number' && value >= 1,
  validateDomain: (value: Version) => value instanceof Version && parseInt(value.getValue()) >= 1
};


/**
 * 字符串类型转换器（用于标题等简单字符串字段）
 */
export const StringConverter: TypeConverter<string, string> = {
  fromStorage: (value: string) => value,
  toStorage: (value: string) => value,
  validateStorage: (value: string) => typeof value === 'string',
  validateDomain: (value: string) => typeof value === 'string'
};

/**
 * 可选字符串类型转换器
 */
export const OptionalStringConverter: TypeConverter<string | undefined, string | undefined> = {
  fromStorage: (value: string | undefined) => value,
  toStorage: (value: string | undefined) => value,
  validateStorage: (value: string | undefined) => {
    if (!value) return true;
    return typeof value === 'string';
  },
  validateDomain: (value: string | undefined) => {
    if (!value) return true;
    return typeof value === 'string';
  }
};

/**
 * 数字类型转换器（用于消息数量等数字字段）
 */
export const NumberConverter: TypeConverter<number, number> = {
  fromStorage: (value: number) => value,
  toStorage: (value: number) => value,
  validateStorage: (value: number) => typeof value === 'number' && value >= 0,
  validateDomain: (value: number) => typeof value === 'number' && value >= 0
};

/**
 * 布尔类型转换器（用于删除标记等布尔字段）
 */
export const BooleanConverter: TypeConverter<boolean, boolean> = {
  fromStorage: (value: boolean) => value,
  toStorage: (value: boolean) => value,
  validateStorage: (value: boolean) => typeof value === 'boolean',
  validateDomain: (value: boolean) => typeof value === 'boolean'
};

/**
 * 元数据类型转换器（用于复杂的元数据对象）
 */
export const MetadataConverter: TypeConverter<Record<string, unknown>, Record<string, unknown>> = {
  fromStorage: (value: Record<string, unknown>) => value || {},
  toStorage: (value: Record<string, unknown>) => value || {},
  validateStorage: (value: Record<string, unknown>) => {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).every(key => typeof key === 'string');
  },
  validateDomain: (value: Record<string, unknown>) => {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).every(key => typeof key === 'string');
  }
};
