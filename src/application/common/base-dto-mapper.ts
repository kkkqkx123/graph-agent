/**
 * DTO映射器基类
 * 
 * 提供领域对象到DTO的通用映射功能
 */

import { ID } from '../../domain/common/value-objects/id';

/**
 * DTO映射器基类
 */
export abstract class BaseDtoMapper {
  /**
   * 将ID转换为字符串
   * @param id ID对象
   * @returns 字符串ID或undefined
   */
  protected mapIdToString(id?: ID): string | undefined {
    return id?.toString();
  }

  /**
   * 将日期转换为ISO字符串
   * @param date 日期对象
   * @returns ISO字符串或undefined
   */
  protected mapDateToIsoString(date?: Date): string | undefined {
    return date?.toISOString();
  }

  /**
   * 将日期转换为ISO字符串（必需）
   * @param date 日期对象
   * @returns ISO字符串
   */
  protected mapDateToIsoStringRequired(date: Date): string {
    return date.toISOString();
  }

  /**
   * 安全地获取对象的数值
   * @param value 可能的数值对象
   * @returns 数值
   */
  protected mapToNumber(value: { getNumericValue(): number }): number {
    return value.getNumericValue();
  }

  /**
   * 安全地获取对象的字符串值
   * @param value 可能的字符串对象
   * @returns 字符串值
   */
  protected mapToString(value: { getValue(): string }): string {
    return value.getValue();
  }

  /**
   * 安全地获取对象的字符串值（可选）
   * @param value 可能的字符串对象
   * @returns 字符串值或undefined
   */
  protected mapToStringOptional(value?: { getValue(): string }): string | undefined {
    return value?.getValue();
  }

  /**
   * 映射记录对象
   * @param record 记录对象
   * @returns 记录副本
   */
  protected mapRecord<T extends Record<string, unknown>>(record: T): T {
    return { ...record };
  }

  /**
   * 映射可选记录对象
   * @param record 记录对象
   * @returns 记录副本或undefined
   */
  protected mapRecordOptional<T extends Record<string, unknown>>(record?: T): T | undefined {
    return record ? { ...record } : undefined;
  }

  /**
   * 映射数组
   * @param array 数组
   * @param mapper 映射函数
   * @returns 映射后的数组
   */
  protected mapArray<T, R>(array: T[], mapper: (item: T) => R): R[] {
    return array.map(mapper);
  }

  /**
   * 映射可选数组
   * @param array 数组
   * @param mapper 映射函数
   * @returns 映射后的数组或undefined
   */
  protected mapArrayOptional<T, R>(mapper: (item: T) => R, array?: T[]): R[] | undefined {
    return array?.map(mapper);
  }

  /**
   * 映射字符串数组
   * @param array 字符串数组
   * @returns 字符串数组副本
   */
  protected mapStringArray(array: string[]): string[] {
    return [...array];
  }

  /**
   * 映射可选字符串数组
   * @param array 字符串数组
   * @returns 字符串数组副本或undefined
   */
  protected mapStringArrayOptional(array?: string[]): string[] | undefined {
    return array ? [...array] : undefined;
  }

  /**
   * 安全地映射枚举值
   * @param value 枚举值
   * @param defaultValue 默认值
   * @returns 枚举值或默认值
   */
  protected mapEnumValue<T>(value: T | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  /**
   * 映射统计信息对象
   * @param stats 统计信息对象
   * @param mapper 映射函数
   * @returns 映射后的统计信息
   */
  protected mapStatistics<T, R>(stats: T, mapper: (stats: T) => R): R {
    return mapper(stats);
  }
}