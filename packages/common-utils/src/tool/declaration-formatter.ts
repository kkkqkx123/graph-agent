/**
 * 工具声明格式转换器
 *
 * 提供将工具定义转换为不同格式（XML、JSON、原生）的功能
 * 用于支持不同工具调用模式（function_call、xml、json）
 */

import type { ToolSchema, ToolProperty } from '@modular-agent/types';

/**
 * XML 格式选项
 */
export interface XMLFormatOptions {
  /** 缩进级别 */
  indent?: number;
  /** 是否包含参数类型 */
  includeTypes?: boolean;
}

/**
 * JSON 格式选项
 */
export interface JSONFormatOptions {
  /** 缩进空格数 */
  space?: number;
  /** 是否使用边界标记 */
  useBoundaryMarkers?: boolean;
}

/**
 * 工具声明格式转换器类
 *
 * 提供静态方法用于将工具定义转换为不同格式
 */
export class ToolDeclarationFormatter {
  /**
   * 将工具声明转换为 XML 格式
   *
   * @param tools 工具定义数组
   * @param options XML 格式选项
   * @returns XML 格式的工具声明字符串
   *
   * @example
   * ```typescript
   * const xml = ToolDeclarationFormatter.toXML([{
   *   id: 'calculator',
   *   description: 'Performs calculations',
   *   parameters: {
   *     properties: {
   *       a: { type: 'number', description: 'First number' },
   *       b: { type: 'number', description: 'Second number' }
   *     },
   *     required: ['a', 'b']
   *   }
   * }]);
   * ```
   */
  static toXML(tools: ToolSchema[], options: XMLFormatOptions = {}): string {
    if (!tools || tools.length === 0) {
      return '';
    }

    const { indent = 0, includeTypes = true } = options;
    const baseIndent = '  '.repeat(indent);

    const toolDeclarations = tools.map(tool =>
      this.formatToolToXML(tool, { indent: indent + 1, includeTypes })
    );

    return toolDeclarations.join('\n\n');
  }

  /**
   * 将单个工具格式化为 XML
   */
  private static formatToolToXML(tool: ToolSchema, options: XMLFormatOptions): string {
    const { indent = 0, includeTypes = true } = options;
    const baseIndent = '  '.repeat(indent);

    const lines: string[] = [];
    lines.push(`${baseIndent}<tool name="${this.escapeXML(tool.id)}">`);

    // 描述
    if (tool.description) {
      lines.push(`${baseIndent}  <description>`);
      lines.push(`${baseIndent}    ${this.escapeXML(tool.description)}`);
      lines.push(`${baseIndent}  </description>`);
    }

    // 参数
    if (tool.parameters && tool.parameters.properties) {
      lines.push(`${baseIndent}  <parameters>`);
      const paramsDesc = this.formatParametersToXML(
        tool.parameters.properties,
        tool.parameters.required || [],
        { indent: indent + 2, includeTypes }
      );
      lines.push(paramsDesc);
      lines.push(`${baseIndent}  </parameters>`);
    }

    lines.push(`${baseIndent}</tool>`);

    return lines.join('\n');
  }

  /**
   * 格式化参数为 XML 格式
   */
  private static formatParametersToXML(
    properties: Record<string, ToolProperty>,
    required: string[],
    options: XMLFormatOptions
  ): string {
    const { indent = 0, includeTypes = true } = options;
    const baseIndent = '  '.repeat(indent);
    const lines: string[] = [];

    for (const [name, prop] of Object.entries(properties)) {
      const isRequired = required.includes(name);
      const type = includeTypes ? ` [${prop.type}]` : '';
      const requiredMark = isRequired ? ' (required)' : ' (optional)';
      const description = prop.description || 'No description';

      lines.push(`${baseIndent}- ${name}${type}${requiredMark}: ${description}`);

      // 处理嵌套对象
      if (prop.type === 'object' && prop.properties) {
        const nested = this.formatParametersToXML(
          prop.properties,
          prop.required || [],
          { indent: indent + 1, includeTypes }
        );
        lines.push(nested);
      }

      // 处理数组类型
      if (prop.type === 'array' && prop.items) {
        const items = prop.items;
        if (items.type === 'object' && items.properties) {
          lines.push(`${baseIndent}  Array items:`);
          const nested = this.formatParametersToXML(
            items.properties,
            items.required || [],
            { indent: indent + 2, includeTypes }
          );
          lines.push(nested);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 将工具声明转换为 JSON 格式
   *
   * @param tools 工具定义数组
   * @param options JSON 格式选项
   * @returns JSON 格式的工具声明字符串
   *
   * @example
   * ```typescript
   * const json = ToolDeclarationFormatter.toJSON([{
   *   id: 'calculator',
   *   description: 'Performs calculations',
   *   parameters: { ... }
   * }]);
   * ```
   */
  static toJSON(tools: ToolSchema[], options: JSONFormatOptions = {}): string {
    if (!tools || tools.length === 0) {
      return '';
    }

    const { space = 2, useBoundaryMarkers = true } = options;

    const toolDeclarations = tools.map(tool => ({
      tool: tool.id,
      description: tool.description,
      parameters: tool.parameters
    }));

    const jsonStr = JSON.stringify(toolDeclarations, null, space);

    if (useBoundaryMarkers) {
      return `<<<TOOL_CALL>>>\n${jsonStr}\n<<<END_TOOL_CALL>>>`;
    }

    return jsonStr;
  }

  /**
   * 将工具调用转换为 XML 格式
   *
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns XML 格式的工具调用字符串
   */
  static toolCallToXML(toolName: string, args: Record<string, any>): string {
    const lines: string[] = [];
    lines.push('<tool_use>');
    lines.push(`  <tool_name>${this.escapeXML(toolName)}</tool_name>`);

    if (args && Object.keys(args).length > 0) {
      lines.push('  <parameters>');
      lines.push(this.formatArgumentsToXML(args, 2));
      lines.push('  </parameters>');
    }

    lines.push('</tool_use>');

    return lines.join('\n');
  }

  /**
   * 格式化参数值为 XML
   */
  private static formatArgumentsToXML(args: any, indent: number): string {
    const baseIndent = '  '.repeat(indent);
    const lines: string[] = [];

    if (Array.isArray(args)) {
      // 数组类型
      for (const item of args) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${baseIndent}<item>`);
          lines.push(this.formatArgumentsToXML(item, indent + 1));
          lines.push(`${baseIndent}</item>`);
        } else {
          lines.push(`${baseIndent}<item>${this.escapeXML(String(item))}</item>`);
        }
      }
    } else if (typeof args === 'object' && args !== null) {
      // 对象类型
      for (const [key, value] of Object.entries(args)) {
        if (value === null || value === undefined) {
          lines.push(`${baseIndent}<${key}>null</${key}>`);
        } else if (typeof value === 'object') {
          lines.push(`${baseIndent}<${key}>`);
          lines.push(this.formatArgumentsToXML(value, indent + 1));
          lines.push(`${baseIndent}</${key}>`);
        } else {
          lines.push(`${baseIndent}<${key}>${this.escapeXML(String(value))}</${key}>`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 将工具调用转换为 JSON 格式
   *
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns JSON 格式的工具调用字符串
   */
  static toolCallToJSON(toolName: string, args: Record<string, any>): string {
    const toolCall = {
      tool: toolName,
      parameters: args
    };
    return `<<<TOOL_CALL>>>\n${JSON.stringify(toolCall, null, 2)}\n<<<END_TOOL_CALL>>>`;
  }

  /**
   * 将工具结果转换为 XML 格式
   *
   * @param toolName 工具名称
   * @param result 工具执行结果
   * @returns XML 格式的工具结果字符串
   */
  static toolResultToXML(toolName: string, result: any): string {
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return `<tool_result tool="${this.escapeXML(toolName)}">\n${resultStr}\n</tool_result>`;
  }

  /**
   * 将工具结果转换为 JSON 格式
   *
   * @param toolName 工具名称
   * @param result 工具执行结果
   * @returns JSON 格式的工具结果字符串
   */
  static toolResultToJSON(toolName: string, result: any): string {
    const resultObj = {
      tool: toolName,
      result: typeof result === 'string' ? JSON.parse(result) : result
    };
    return JSON.stringify(resultObj, null, 2);
  }

  /**
   * 转义 XML 特殊字符
   */
  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 根据格式类型转换工具声明
   *
   * @param tools 工具定义数组
   * @param format 格式类型
   * @returns 转换后的工具声明
   */
  static convert(tools: ToolSchema[], format: 'xml' | 'json' | 'native'): string {
    switch (format) {
      case 'xml':
        return this.toXML(tools);
      case 'json':
        return this.toJSON(tools);
      case 'native':
        // 原生格式返回空字符串，由 Formatter 自行处理
        return '';
      default:
        return '';
    }
  }
}

/**
 * 工具声明格式转换器（函数式 API）
 */

/**
 * 将工具声明转换为 XML 格式
 */
export function toolsToXML(tools: ToolSchema[], options?: XMLFormatOptions): string {
  return ToolDeclarationFormatter.toXML(tools, options);
}

/**
 * 将工具声明转换为 JSON 格式
 */
export function toolsToJSON(tools: ToolSchema[], options?: JSONFormatOptions): string {
  return ToolDeclarationFormatter.toJSON(tools, options);
}

/**
 * 将工具调用转换为 XML 格式
 */
export function toolCallToXML(toolName: string, args: Record<string, any>): string {
  return ToolDeclarationFormatter.toolCallToXML(toolName, args);
}

/**
 * 将工具调用转换为 JSON 格式
 */
export function toolCallToJSON(toolName: string, args: Record<string, any>): string {
  return ToolDeclarationFormatter.toolCallToJSON(toolName, args);
}

/**
 * 将工具结果转换为 XML 格式
 */
export function toolResultToXML(toolName: string, result: any): string {
  return ToolDeclarationFormatter.toolResultToXML(toolName, result);
}

/**
 * 将工具结果转换为 JSON 格式
 */
export function toolResultToJSON(toolName: string, result: any): string {
  return ToolDeclarationFormatter.toolResultToJSON(toolName, result);
}
