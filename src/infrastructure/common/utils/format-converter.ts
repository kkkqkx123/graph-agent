import * as yaml from 'yaml';
import { create } from 'xmlbuilder2';
import { XMLParser } from 'fast-xml-parser';

/**
 * 支持的数据格式
 */
export type DataFormat = 'json' | 'yaml' | 'xml';

/**
 * 格式转换工具类
 *
 * 提供不同数据格式之间的转换功能
 */
export class FormatConverter {
  private static xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  /**
   * 将数据转换为指定格式
   *
   * @param data - 要转换的数据对象
   * @param format - 目标格式
   * @returns 格式化后的字符串
   */
  static convertToFormat(data: Record<string, unknown>, format: DataFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        return yaml.stringify(data, { indent: 2 });
      case 'xml':
        const xmlObj = this.jsonToXmlObject(data);
        const xmlDoc = create({ version: '1.0' }).ele('checkpoint', xmlObj);
        return xmlDoc.end({ prettyPrint: true });
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 从指定格式解析数据
   *
   * @param data - 格式化的字符串数据
   * @param format - 数据格式
   * @returns 解析后的数据对象
   */
  static parseFromFormat(data: string, format: DataFormat): Record<string, unknown> {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(data);
        case 'yaml':
          return yaml.parse(data) as Record<string, unknown>;
        case 'xml':
          return this.xmlParser.parse(data) as Record<string, unknown>;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }
    } catch (error) {
      throw new Error(`数据解析失败: ${error}`);
    }
  }

  /**
   * 将 JSON 对象转换为 XML 对象结构
   *
   * @param data - JSON 对象
   * @returns XML 对象结构
   */
  private static jsonToXmlObject(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === 'object') {
        result[key] = this.jsonToXmlObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}