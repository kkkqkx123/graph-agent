/**
 * 参数替换器
 * 用于替换配置中的参数引用 {{parameters.xxx}}
 */

export class ParameterReplacer {
  /**
   * 替换配置中的参数引用
   * @param config 原始配置
   * @param parameters 参数值
   * @returns 替换后的配置
   */
  static replace(config: any, parameters: Record<string, any>): any {
    if (typeof config === 'string') {
      return this.replaceString(config, parameters);
    }
    if (Array.isArray(config)) {
      return config.map(item => this.replace(item, parameters));
    }
    if (typeof config === 'object' && config !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.replace(value, parameters);
      }
      return result;
    }
    return config;
  }

  /**
   * 替换字符串中的参数引用
   * @param str 字符串
   * @param parameters 参数值
   * @returns 替换后的值（可能是原始类型）
   */
  private static replaceString(str: string, parameters: Record<string, any>): any {
    const pattern = /\{\{parameters\.(\w+)\}\}/g;
    const matches = Array.from(str.matchAll(pattern));
    
    // 如果没有匹配，返回原字符串
    if (matches.length === 0) {
      return str;
    }

    // 如果整个字符串就是一个参数引用，直接返回参数值
    if (matches.length === 1 && str.trim() === matches[0]?.[0]) {
      const paramName = matches[0][1];
      if (paramName && parameters[paramName] !== undefined) {
        return parameters[paramName];
      }
    }

    // 否则替换所有引用
    let result = str;
    for (const match of matches) {
      const paramName = match[1];
      if (paramName && parameters[paramName] !== undefined) {
        result = result.replace(match[0], String(parameters[paramName]));
      }
    }

    return result;
  }

  /**
   * 验证参数是否已定义
   * @param config 配置
   * @param definedParameters 已定义的参数
   * @returns 未定义的参数列表
   */
  static validateParameters(config: any, definedParameters: Set<string>): string[] {
    const undefinedParams: string[] = [];
    
    const extractParams = (obj: any): void => {
      if (typeof obj === 'string') {
        const pattern = /\{\{parameters\.(\w+)\}\}/g;
        const matches = obj.matchAll(pattern);
        for (const match of matches) {
          const paramName = match[1];
          if (paramName && !definedParameters.has(paramName)) {
            undefinedParams.push(paramName);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractParams(item));
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(value => extractParams(value));
      }
    };

    extractParams(config);
    return [...new Set(undefinedParams)]; // 去重
  }
}