import { BaseHookFunction, HookFunctionResult, createHookFunctionResult } from './base-hook-function';

/**
 * 数据转换Hook函数
 * 
 * 提供数据转换功能，可以在任何Hook点使用
 */
export class TransformationHookFunction extends BaseHookFunction {
  override readonly id = 'transformation-hook-function';
  override readonly name = '数据转换函数';
  override readonly description = '转换和修改数据格式';
  override readonly version = '1.0.0';

  async execute(context: any, config?: Record<string, any>): Promise<HookFunctionResult> {
    const startTime = Date.now();

    try {
      const transformations = config?.['transformations'] || [];
      const data = context?.data || {};
      let transformedData = { ...data };

      // 执行转换操作
      for (const transformation of transformations) {
        transformedData = this.applyTransformation(transformedData, transformation);
      }

      // 更新上下文中的数据
      if (context) {
        context.data = transformedData;
      }

      const executionTime = Date.now() - startTime;

      return createHookFunctionResult(
        true,
        { transformed: true, data: transformedData },
        undefined,
        executionTime,
        true
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return createHookFunctionResult(
        false,
        undefined,
        error instanceof Error ? error : String(error),
        executionTime,
        false
      );
    }
  }

  /**
   * 应用单个转换操作
   */
  private applyTransformation(data: any, transformation: any): any {
    const { type, field, value, sourceField, mapping, function: func } = transformation;

    switch (type) {
      case 'set':
        // 设置字段值
        if (field !== undefined) {
          data[field] = value;
        }
        break;

      case 'copy':
        // 复制字段值
        if (sourceField !== undefined && field !== undefined) {
          data[field] = data[sourceField];
        }
        break;

      case 'rename':
        // 重命名字段
        if (sourceField !== undefined && field !== undefined) {
          data[field] = data[sourceField];
          delete data[sourceField];
        }
        break;

      case 'delete':
        // 删除字段
        if (field !== undefined) {
          delete data[field];
        }
        break;

      case 'map':
        // 字段映射
        if (mapping && typeof mapping === 'object') {
           for (const [oldKey, newKey] of Object.entries(mapping)) {
             if (data[oldKey as string] !== undefined) {
               data[newKey as string] = data[oldKey as string];
               delete data[oldKey as string];
             }
           }
         }
        break;

      case 'transform':
        // 使用自定义函数转换
        if (func && typeof func === 'function') {
          return func(data);
        }
        break;

      case 'uppercase':
        // 转换为大写
        if (field !== undefined && typeof data[field] === 'string') {
          data[field] = data[field].toUpperCase();
        }
        break;

      case 'lowercase':
        // 转换为小写
        if (field !== undefined && typeof data[field] === 'string') {
          data[field] = data[field].toLowerCase();
        }
        break;

      case 'trim':
        // 去除空格
        if (field !== undefined && typeof data[field] === 'string') {
          data[field] = data[field].trim();
        }
        break;

      case 'parse':
        // 解析JSON字符串
        if (field !== undefined && typeof data[field] === 'string') {
          try {
            data[field] = JSON.parse(data[field]);
          } catch (e) {
            throw new Error(`无法解析字段 ${field} 的JSON: ${e}`);
          }
        }
        break;

      case 'stringify':
        // 转换为JSON字符串
        if (field !== undefined && typeof data[field] === 'object') {
          data[field] = JSON.stringify(data[field]);
        }
        break;

      default:
        throw new Error(`未知的转换类型: ${type}`);
    }

    return data;
  }

  override validateConfig(config: Record<string, any>): { valid: boolean; errors: string[] } {
     const errors: string[] = [];

     if (!config?.['transformations'] || !Array.isArray(config['transformations'])) {
       errors.push('transformations 必须是一个数组');
     } else {
       const validTypes = ['set', 'copy', 'rename', 'delete', 'map', 'transform', 'uppercase', 'lowercase', 'trim', 'parse', 'stringify'];

       config['transformations'].forEach((transformation: any, index: number) => {
        if (!transformation.type) {
          errors.push(`转换 ${index} 缺少 type 属性`);
        } else if (!validTypes.includes(transformation.type)) {
          errors.push(`转换 ${index} 的类型 ${transformation.type} 无效`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}