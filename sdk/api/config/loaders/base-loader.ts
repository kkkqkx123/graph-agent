/**
 * 基础配置加载器抽象类
 * 定义所有配置加载器的通用接口
 *
 * 设计原则：
 * - 无状态设计，不持有任何配置数据
 * - 不直接操作注册表
 * - 仅提供配置解析功能
 * - 不涉及文件 I/O，由应用层负责
 */

import { ConfigFormat, ConfigType } from '../types';
import type { ParsedConfig } from '../types';
import { ConfigParser } from '../config-parser';

/**
 * 基础配置加载器抽象类
 */
export abstract class BaseConfigLoader<T extends ConfigType> {
  protected configType: T;
  protected parser: ConfigParser;

  constructor(configType: T) {
    this.configType = configType;
    this.parser = new ConfigParser();
  }

  /**
   * 从内容解析配置
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  parseFromContent(content: string, format: ConfigFormat): ParsedConfig<T> {
    return this.parser.parse(content, format, this.configType);
  }

  /**
   * 批量解析配置
   * @param contents 配置内容数组
   * @param formats 配置格式数组
   * @returns 解析后的配置对象数组
   */
  parseBatch(contents: string[], formats: ConfigFormat[]): ParsedConfig<T>[] {
    if (contents.length !== formats.length) {
      throw new Error('contents 和 formats 数组长度必须一致');
    }
    return contents.map((content, index) =>
      this.parseFromContent(content, formats[index]!)
    );
  }
}