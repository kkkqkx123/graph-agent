/**
 * 通用序列化工具
 */

/**
 * 序列化配置
 */
export interface SerializationConfig {
  dateFormat?: string;
  dateTimeFormat?: string;
  timeZone?: string;
  prettyPrint?: boolean;
  ignoreUndefined?: boolean;
  customSerializers?: Record<string, (value: any) => any>;
}

/**
 * 序列化结果
 */
export interface SerializationResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * 通用序列化工具
 */
export class SerializationUtils {
  private static defaultConfig: SerializationConfig = {
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeZone: 'UTC',
    prettyPrint: false,
    ignoreUndefined: true,
    customSerializers: {}
  };

  /**
   * 序列化为JSON字符串
   */
  static toJSON(obj: any, config: Partial<SerializationConfig> = {}): SerializationResult {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const serializedObj = this.prepareForSerialization(obj, finalConfig);
      
      const jsonString = JSON.stringify(
        serializedObj,
        this.createReplacer(finalConfig),
        finalConfig.prettyPrint ? 2 : 0
      );

      return {
        success: true,
        data: jsonString
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 从JSON字符串反序列化
   */
  static fromJSON(jsonString: string, config: Partial<SerializationConfig> = {}): SerializationResult {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      const parsed = JSON.parse(jsonString, this.createReviver(finalConfig));
      const restoredObj = this.restoreFromSerialization(parsed, finalConfig);

      return {
        success: true,
        data: restoredObj
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 序列化为URL查询字符串
   */
  static toQueryString(obj: any, config: Partial<SerializationConfig> = {}): string {
    const finalConfig = { ...this.defaultConfig, ...config };
    const serializedObj = this.prepareForSerialization(obj, finalConfig);
    
    const params = new URLSearchParams();
    
    this.flattenObject(serializedObj).forEach((value, key) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }

  /**
   * 从URL查询字符串反序列化
   */
  static fromQueryString(queryString: string): Record<string, any> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, any> = {};

    params.forEach((value, key) => {
      // 尝试解析为JSON，如果失败则作为字符串
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    });

    return this.unflattenObject(result);
  }

  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * 准备对象进行序列化
   */
  private static prepareForSerialization(obj: any, config: SerializationConfig): any {
    if (obj === null || obj === undefined) {
      return config.ignoreUndefined ? undefined : obj;
    }

    if (obj instanceof Date) {
      return {
        __type: 'Date',
        __value: obj.toISOString()
      };
    }

    if (obj instanceof RegExp) {
      return {
        __type: 'RegExp',
        __value: {
          source: obj.source,
          flags: obj.flags
        }
      };
    }

    if (obj instanceof Map) {
      return {
        __type: 'Map',
        __value: Array.from(obj.entries())
      };
    }

    if (obj instanceof Set) {
      return {
        __type: 'Set',
        __value: Array.from(obj.values())
      };
    }

    if (typeof obj === 'object') {
      const result: any = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          
          if (value === undefined && config.ignoreUndefined) {
            continue;
          }

          // 应用自定义序列化器
          if (config.customSerializers && config.customSerializers[key]) {
            result[key] = config.customSerializers[key](value);
          } else {
            result[key] = this.prepareForSerialization(value, config);
          }
        }
      }
      
      return result;
    }

    return obj;
  }

  /**
   * 从序列化恢复对象
   */
  private static restoreFromSerialization(obj: any, config: SerializationConfig): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'object' && obj.__type) {
      switch (obj.__type) {
        case 'Date':
          return new Date(obj.__value);
        
        case 'RegExp':
          return new RegExp(obj.__value.source, obj.__value.flags);
        
        case 'Map':
          return new Map(obj.__value);
        
        case 'Set':
          return new Set(obj.__value);
        
        default:
          return obj;
      }
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.restoreFromSerialization(item, config));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.restoreFromSerialization(obj[key], config);
        }
      }
      
      return result;
    }

    return obj;
  }

  /**
   * 创建JSON替换函数
   */
  private static createReplacer(config: SerializationConfig): (key: string, value: any) => any {
    return (key: string, value: any) => {
      if (value === undefined && config.ignoreUndefined) {
        return undefined;
      }
      return value;
    };
  }

  /**
   * 创建JSON恢复函数
   */
  private static createReviver(config: SerializationConfig): (key: string, value: any) => any {
    return (key: string, value: any) => {
      return this.restoreFromSerialization(value, config);
    };
  }

  /**
   * 扁平化对象
   */
  private static flattenObject(obj: any, prefix: string = ''): Map<string, any> {
    const result = new Map<string, any>();

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          const nested = this.flattenObject(value, newKey);
          nested.forEach((v, k) => result.set(k, v));
        } else {
          result.set(newKey, value);
        }
      }
    }

    return result;
  }

  /**
    * 反扁平化对象
    */
   private static unflattenObject(flatObj: Record<string, any>): any {
     const result: any = {};

     for (const key in flatObj) {
       if (flatObj.hasOwnProperty(key)) {
         const value = flatObj[key];
         const keys = key.split('.');
         
         let current = result;
         for (let i = 0; i < keys.length - 1; i++) {
           const k = keys[i] as string;
           if (!(k in current) || typeof current[k] !== 'object') {
             current[k] = {};
           }
           current = current[k];
         }
         
         const lastKey = keys[keys.length - 1] as string;
         current[lastKey] = value;
       }
     }

     return result;
   }

  /**
   * 安全的JSON解析
   */
  static safeJSONParse<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 安全的JSON字符串化
   */
  static safeJSONStringify(obj: any, defaultValue: string = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }
}