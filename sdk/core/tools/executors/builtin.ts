/**
 * 内置工具执行器
 * 执行SDK提供的内置工具
 */

import type { Tool } from '../../../types/tool';
import { BaseToolExecutor } from '../executor-base';

/**
 * 内置工具执行器
 */
export class BuiltinToolExecutor extends BaseToolExecutor {
  /**
   * 执行内置工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<any> {
    switch (tool.name) {
      case 'calculator':
        return this.executeCalculator(parameters);
      case 'datetime':
        return this.executeDatetime(parameters);
      case 'string':
        return this.executeString(parameters);
      case 'array':
        return this.executeArray(parameters);
      case 'object':
        return this.executeObject(parameters);
      case 'hash_convert':
        return this.executeHashConvert(parameters);
      case 'time_tool':
        return this.executeTimeTool(parameters);
      default:
        throw new Error(`Unknown builtin tool: ${tool.name}`);
    }
  }

  /**
   * 执行计算器工具
   */
  private async executeCalculator(parameters: Record<string, any>): Promise<any> {
    const { expression, precision = 2 } = parameters;

    try {
      // 安全的数学表达式求值
      // 只允许数字、基本运算符和括号
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

      if (sanitized !== expression) {
        throw new Error('Invalid characters in expression');
      }

      // 使用Function构造器进行安全的求值
      const result = new Function(`return ${sanitized}`)();

      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid expression result');
      }

      // 四舍五入到指定精度
      const rounded = Number(result.toFixed(precision));

      return {
        expression,
        result: rounded,
        precision
      };
    } catch (error) {
      throw new Error(`Calculator error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 执行日期时间工具
   */
  private async executeDatetime(parameters: Record<string, any>): Promise<any> {
    const { operation, date, format, offset } = parameters;

    const now = date ? new Date(date) : new Date();

    switch (operation) {
      case 'now':
        return {
          timestamp: Date.now(),
          iso: now.toISOString(),
          locale: now.toLocaleString()
        };

      case 'format':
        if (!format) {
          throw new Error('Format is required for format operation');
        }
        return {
          timestamp: now.getTime(),
          formatted: this.formatDate(now, format)
        };

      case 'add':
        if (!offset) {
          throw new Error('Offset is required for add operation');
        }
        const addedDate = new Date(now.getTime() + offset);
        return {
          original: now.toISOString(),
          added: addedDate.toISOString(),
          offset
        };

      case 'diff':
        if (!date) {
          throw new Error('Date is required for diff operation');
        }
        const diff = now.getTime() - new Date(date).getTime();
        return {
          difference: diff,
          seconds: Math.floor(diff / 1000),
          minutes: Math.floor(diff / 60000),
          hours: Math.floor(diff / 3600000),
          days: Math.floor(diff / 86400000)
        };

      default:
        throw new Error(`Unknown datetime operation: ${operation}`);
    }
  }

  /**
   * 执行字符串工具
   */
  private async executeString(parameters: Record<string, any>): Promise<any> {
    const { operation, text, pattern, replacement, flags } = parameters;

    switch (operation) {
      case 'length':
        return {
          text,
          length: text.length
        };

      case 'uppercase':
        return {
          original: text,
          uppercase: text.toUpperCase()
        };

      case 'lowercase':
        return {
          original: text,
          lowercase: text.toLowerCase()
        };

      case 'trim':
        return {
          original: text,
          trimmed: text.trim()
        };

      case 'split':
        if (!pattern) {
          throw new Error('Pattern is required for split operation');
        }
        return {
          text,
          pattern,
          parts: text.split(pattern)
        };

      case 'replace':
        if (!pattern || replacement === undefined) {
          throw new Error('Pattern and replacement are required for replace operation');
        }
        const regex = new RegExp(pattern, flags || 'g');
        return {
          original: text,
          pattern,
          replacement,
          replaced: text.replace(regex, replacement)
        };

      case 'match':
        if (!pattern) {
          throw new Error('Pattern is required for match operation');
        }
        const matchRegex = new RegExp(pattern, flags || 'g');
        const matches = text.match(matchRegex);
        return {
          text,
          pattern,
          matches: matches || []
        };

      case 'contains':
        if (!pattern) {
          throw new Error('Pattern is required for contains operation');
        }
        return {
          text,
          pattern,
          contains: text.includes(pattern)
        };

      default:
        throw new Error(`Unknown string operation: ${operation}`);
    }
  }

  /**
   * 执行数组工具
   */
  private async executeArray(parameters: Record<string, any>): Promise<any> {
    const { operation, array, item, index, start, end } = parameters;

    if (!Array.isArray(array)) {
      throw new Error('Array parameter must be an array');
    }

    switch (operation) {
      case 'length':
        return {
          array,
          length: array.length
        };

      case 'push':
        if (item === undefined) {
          throw new Error('Item is required for push operation');
        }
        const pushedArray = [...array, item];
        return {
          original: array,
          item,
          result: pushedArray,
          length: pushedArray.length
        };

      case 'pop':
        if (array.length === 0) {
          throw new Error('Cannot pop from empty array');
        }
        const poppedArray = array.slice(0, -1);
        return {
          original: array,
          popped: array[array.length - 1],
          result: poppedArray,
          length: poppedArray.length
        };

      case 'slice':
        return {
          original: array,
          start,
          end,
          result: array.slice(start, end)
        };

      case 'join':
        return {
          array,
          separator: item || ',',
          result: array.join(item || ',')
        };

      case 'includes':
        if (item === undefined) {
          throw new Error('Item is required for includes operation');
        }
        return {
          array,
          item,
          includes: array.includes(item)
        };

      case 'index':
        if (item === undefined) {
          throw new Error('Item is required for index operation');
        }
        return {
          array,
          item,
          index: array.indexOf(item)
        };

      case 'filter':
        if (!item) {
          throw new Error('Filter function is required for filter operation');
        }
        // item should be a string representation of a filter function
        const filterFn = new Function('item', `return ${item}`) as (value: any) => boolean;
        return {
          original: array,
          filter: item,
          result: array.filter(filterFn)
        };

      case 'map':
        if (!item) {
          throw new Error('Map function is required for map operation');
        }
        const mapFn = new Function('item', `return ${item}`) as (value: any) => any;
        return {
          original: array,
          map: item,
          result: array.map(mapFn)
        };

      case 'reduce':
        if (!item) {
          throw new Error('Reduce function is required for reduce operation');
        }
        const reduceFn = new Function('acc', 'item', `return ${item}`) as (acc: any, item: any) => any;
        return {
          original: array,
          reduce: item,
          result: array.reduce(reduceFn)
        };

      default:
        throw new Error(`Unknown array operation: ${operation}`);
    }
  }

  /**
   * 执行对象工具
   */
  private async executeObject(parameters: Record<string, any>): Promise<any> {
    const { operation, object, key, value } = parameters;

    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
      throw new Error('Object parameter must be an object');
    }

    switch (operation) {
      case 'keys':
        return {
          object,
          keys: Object.keys(object)
        };

      case 'values':
        return {
          object,
          values: Object.values(object)
        };

      case 'entries':
        return {
          object,
          entries: Object.entries(object)
        };

      case 'get':
        if (!key) {
          throw new Error('Key is required for get operation');
        }
        return {
          object,
          key,
          value: object[key]
        };

      case 'set':
        if (!key || value === undefined) {
          throw new Error('Key and value are required for set operation');
        }
        const setObject = { ...object, [key]: value };
        return {
          original: object,
          key,
          value,
          result: setObject
        };

      case 'delete':
        if (!key) {
          throw new Error('Key is required for delete operation');
        }
        const { [key]: deleted, ...deletedObject } = object;
        return {
          original: object,
          key,
          deleted,
          result: deletedObject
        };

      case 'merge':
        if (!value || typeof value !== 'object') {
          throw new Error('Value must be an object for merge operation');
        }
        return {
          original: object,
          merge: value,
          result: { ...object, ...value }
        };

      default:
        throw new Error(`Unknown object operation: ${operation}`);
    }
  }

  /**
   * 执行哈希转换工具
   */
  private async executeHashConvert(parameters: Record<string, any>): Promise<any> {
    const { operation, input, algorithm } = parameters;

    switch (operation) {
      case 'encode':
        if (!input) {
          throw new Error('Input is required for encode operation');
        }
        return {
          input,
          encoded: Buffer.from(input).toString('base64')
        };

      case 'decode':
        if (!input) {
          throw new Error('Input is required for decode operation');
        }
        try {
          return {
            input,
            decoded: Buffer.from(input, 'base64').toString('utf-8')
          };
        } catch (error) {
          throw new Error('Invalid base64 input');
        }

      case 'hash':
        if (!input) {
          throw new Error('Input is required for hash operation');
        }
        const crypto = require('crypto');
        const hash = crypto.createHash(algorithm || 'md5').update(input).digest('hex');
        return {
          input,
          algorithm: algorithm || 'md5',
          hash
        };

      default:
        throw new Error(`Unknown hash operation: ${operation}`);
    }
  }

  /**
   * 执行时间工具
   */
  private async executeTimeTool(parameters: Record<string, any>): Promise<any> {
    const { operation, timezone } = parameters;

    const now = new Date();

    switch (operation) {
      case 'current':
        return {
          timestamp: now.getTime(),
          iso: now.toISOString(),
          timezone: timezone || 'UTC',
          locale: now.toLocaleString('en-US', {
            timeZone: timezone || 'UTC'
          })
        };

      case 'unix':
        return {
          timestamp: Math.floor(now.getTime() / 1000),
          milliseconds: now.getTime()
        };

      case 'iso':
        return {
          iso: now.toISOString()
        };

      default:
        throw new Error(`Unknown time operation: ${operation}`);
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
}