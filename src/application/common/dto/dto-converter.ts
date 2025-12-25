/**
 * DTO转换器
 * 提供领域对象和DTO之间的自动转换功能
 */

/**
 * DTO转换选项
 */
export interface DtoConverterOptions {
  /**
   * 排除的字段列表
   */
  excludeFields?: string[];

  /**
   * 包含的字段列表（如果指定，只有这些字段会被包含）
   */
  includeFields?: string[];

  /**
   * 字段转换函数映射
   */
  transformFields?: Record<string, (value: any) => any>;

  /**
   * 是否深度转换嵌套对象（默认true）
   */
  deep?: boolean;

  /**
   * 是否忽略undefined值（默认false）
   */
  ignoreUndefined?: boolean;

  /**
   * 字段重命名映射
   */
  renameFields?: Record<string, string>;
}

/**
 * 转换结果
 */
export interface ConversionResult<T> {
  /**
   * 转换后的数据
   */
  data: T;

  /**
   * 转换统计信息
   */
  stats: {
    /**
     * 转换的字段数量
     */
    fieldsConverted: number;

    /**
     * 排除的字段数量
     */
    fieldsExcluded: number;

    /**
     * 转换的字段列表
     */
    convertedFields: string[];

    /**
     * 排除的字段列表
     */
    excludedFields: string[];
  };
}

/**
 * DTO转换器抽象类
 * 定义领域对象和DTO之间的转换接口
 */
export abstract class DtoConverter<TEntity, TDto> {
  /**
   * 领域对象转换为DTO
   * @param entity 领域对象
   * @param options 转换选项
   * @returns DTO对象
   */
  abstract toDto(entity: TEntity, options?: DtoConverterOptions): TDto;

  /**
   * DTO转换为领域对象
   * @param dto DTO对象
   * @param options 转换选项
   * @returns 领域对象
   */
  abstract toEntity(dto: TDto, options?: DtoConverterOptions): TEntity;

  /**
   * 批量转换领域对象为DTO
   * @param entities 领域对象数组
   * @param options 转换选项
   * @returns DTO对象数组
   */
  toDtoList(entities: TEntity[], options?: DtoConverterOptions): TDto[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  /**
   * 批量转换DTO为领域对象
   * @param dtos DTO对象数组
   * @param options 转换选项
   * @returns 领域对象数组
   */
  toEntityList(dtos: TDto[], options?: DtoConverterOptions): TEntity[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }

  /**
   * 带统计信息的转换
   * @param entity 领域对象
   * @param options 转换选项
   * @returns 转换结果
   */
  toDtoWithStats(entity: TEntity, options?: DtoConverterOptions): ConversionResult<TDto> {
    const dto = this.toDto(entity, options);
    const stats = this.calculateConversionStats(entity, dto, options);
    
    return { data: dto, stats };
  }

  /**
   * 计算转换统计信息
   * @param source 源对象
   * @param target 目标对象
   * @param options 转换选项
   * @returns 统计信息
   */
  protected calculateConversionStats(
    source: any,
    target: any,
    options?: DtoConverterOptions
  ): ConversionResult<TDto>['stats'] {
    const sourceFields = Object.keys(source);
    const targetFields = Object.keys(target);
    
    const excludedFields = options?.excludeFields || [];
    const includedFields = options?.includeFields;
    
    let convertedFields = targetFields;
    let fieldsExcluded = 0;

    if (includedFields) {
      convertedFields = targetFields.filter(field => includedFields.includes(field));
    }

    if (excludedFields.length > 0) {
      fieldsExcluded = excludedFields.filter(field => sourceFields.includes(field)).length;
      convertedFields = convertedFields.filter(field => !excludedFields.includes(field));
    }

    return {
      fieldsConverted: convertedFields.length,
      fieldsExcluded,
      convertedFields,
      excludedFields
    };
  }
}

/**
 * 通用对象转换器
 * 基于配置的对象转换器，无需为每个DTO创建专门的转换器
 */
export class GenericDtoConverter<TSource, TTarget> extends DtoConverter<TSource, TTarget> {
  private fieldMappings: Record<string, string> = {};
  private transformers: Record<string, (value: any) => any> = {};

  /**
   * 添加字段映射
   * @param sourceField 源字段名
   * @param targetField 目标字段名
   */
  addFieldMapping(sourceField: string, targetField: string): this {
    this.fieldMappings[sourceField] = targetField;
    return this;
  }

  /**
   * 添加字段转换器
   * @param field 字段名
   * @param transformer 转换函数
   */
  addFieldTransformer(field: string, transformer: (value: any) => any): this {
    this.transformers[field] = transformer;
    return this;
  }

  /**
   * 批量添加字段映射
   * @param mappings 字段映射对象
   */
  addFieldMappings(mappings: Record<string, string>): this {
    Object.assign(this.fieldMappings, mappings);
    return this;
  }

  /**
   * 批量添加字段转换器
   * @param transformers 转换器对象
   */
  addFieldTransformers(transformers: Record<string, (value: any) => any>): this {
    Object.assign(this.transformers, transformers);
    return this;
  }

  toDto(entity: TSource, options?: DtoConverterOptions): TTarget {
    const result: any = {};
    const sourceObj = entity as any;

    // 获取所有源字段
    const sourceFields = Object.keys(sourceObj);
    
    // 应用包含字段过滤
    let fieldsToProcess = sourceFields;
    if (options?.includeFields) {
      fieldsToProcess = sourceFields.filter(field => 
        options.includeFields!.includes(field)
      );
    }

    // 处理每个字段
    for (const sourceField of fieldsToProcess) {
      // 检查是否应该排除此字段
      if (options?.excludeFields?.includes(sourceField)) {
        continue;
      }

      // 获取目标字段名
      const targetField = this.fieldMappings[sourceField] || sourceField;
      
      // 检查是否应该重命名
      if (options?.renameFields?.[sourceField]) {
        continue; // 重命名的字段在后面处理
      }

      // 获取字段值
      let value = sourceObj[sourceField];

      // 应用字段转换器
      if (this.transformers[sourceField]) {
        value = this.transformers[sourceField](value);
      } else if (options?.transformFields?.[sourceField]) {
        value = options.transformFields[sourceField](value);
      }

      // 检查是否应该忽略undefined值
      if (options?.ignoreUndefined && value === undefined) {
        continue;
      }

      // 深度转换嵌套对象
      if (options?.deep && value && typeof value === 'object' && !Array.isArray(value)) {
        // 这里可以递归处理嵌套对象，但为了简化暂时跳过
        result[targetField] = value;
      } else {
        result[targetField] = value;
      }
    }

    // 处理重命名字段
    if (options?.renameFields) {
      for (const [oldName, newName] of Object.entries(options.renameFields)) {
        if (sourceObj[oldName] !== undefined) {
          let value = sourceObj[oldName];
          
          if (this.transformers[oldName]) {
            value = this.transformers[oldName](value);
          } else if (options?.transformFields?.[oldName]) {
            value = options.transformFields[oldName](value);
          }

          result[newName] = value;
        }
      }
    }

    return result as TTarget;
  }

  toEntity(dto: TTarget, options?: DtoConverterOptions): TSource {
    // 反向转换，逻辑与toDto类似
    const result: any = {};
    const dtoObj = dto as any;

    // 获取所有DTO字段
    const dtoFields = Object.keys(dtoObj);
    
    // 应用包含字段过滤
    let fieldsToProcess = dtoFields;
    if (options?.includeFields) {
      fieldsToProcess = dtoFields.filter(field =>
        options.includeFields!.includes(field)
      );
    }

    // 反向查找字段映射
    const reverseMappings: Record<string, string> = {};
    for (const [sourceField, targetField] of Object.entries(this.fieldMappings)) {
      reverseMappings[targetField] = sourceField;
    }

    // 处理每个字段
    for (const dtoField of fieldsToProcess) {
      // 检查是否应该排除此字段
      if (options?.excludeFields?.includes(dtoField)) {
        continue;
      }

      // 获取源字段名
      const sourceField = reverseMappings[dtoField] || dtoField;
      
      // 获取字段值
      let value = dtoObj[dtoField];

      // 应用字段转换器
      if (this.transformers[sourceField]) {
        value = this.transformers[sourceField](value);
      } else if (options?.transformFields?.[dtoField]) {
        value = options.transformFields[dtoField](value);
      }

      // 检查是否应该忽略undefined值
      if (options?.ignoreUndefined && value === undefined) {
        continue;
      }

      result[sourceField] = value;
    }

    return result as TSource;
  }
}

/**
 * 转换器工厂
 * 提供便捷的转换器创建方法
 */
export class DtoConverterFactory {
  /**
   * 创建通用转换器
   * @param mappings 字段映射
   * @param transformers 字段转换器
   * @returns 通用转换器实例
   */
  static createGeneric<TSource, TTarget>(
    mappings?: Record<string, string>,
    transformers?: Record<string, (value: any) => any>
  ): GenericDtoConverter<TSource, TTarget> {
    const converter = new GenericDtoConverter<TSource, TTarget>();
    
    if (mappings) {
      converter.addFieldMappings(mappings);
    }
    
    if (transformers) {
      converter.addFieldTransformers(transformers);
    }
    
    return converter;
  }

  /**
   * 创建简单的字段映射转换器
   * @param mappings 字段映射
   * @returns 通用转换器实例
   */
  static createSimpleMapper<TSource, TTarget>(
    mappings: Record<string, string>
  ): GenericDtoConverter<TSource, TTarget> {
    return this.createGeneric<TSource, TTarget>(mappings);
  }
}