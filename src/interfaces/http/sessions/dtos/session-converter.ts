/**
 * 会话模块DTO转换器
 * 提供领域对象和DTO之间的转换功能
 */

import { DtoConverter, DtoConverterOptions, GenericDtoConverter } from '../../../../application/common/dto';
import { Session } from '../../../../domain/sessions/entities/session';
import { SessionInfo, CreateSessionRequest, SessionConfigDto } from './session.dto';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionConfig, SessionConfigProps } from '../../../../domain/sessions/value-objects/session-config';

/**
 * 会话转换器
 * 负责Session领域对象和SessionInfo DTO之间的转换
 */
export class SessionConverter extends DtoConverter<Session, SessionInfo> {
  /**
   * 领域对象转换为DTO
   */
  toDto(entity: Session, options?: DtoConverterOptions): SessionInfo {
    const baseInfo: SessionInfo = {
      sessionId: entity.sessionId.toString(),
      userId: entity.userId?.toString(),
      title: entity.title,
      status: entity.status.getValue() as "active" | "suspended" | "terminated",
      messageCount: entity.messageCount,
      createdAt: entity.createdAt.toISOString(),
      lastActivityAt: entity.lastActivityAt.toISOString()
    };

    // 应用转换选项
    return this.applyOptions(baseInfo, options);
  }

  /**
   * DTO转换为领域对象
   * 注意：从DTO到领域对象的转换需要业务上下文，通常使用工厂方法
   */
  toEntity(dto: SessionInfo, options?: DtoConverterOptions): Session {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  /**
   * 从创建请求创建领域对象
   * 这是一个工厂方法，不是标准的转换方法
   */
  static fromCreateRequest(request: CreateSessionRequest): {
    userId?: ID;
    title?: string;
    config?: SessionConfig;
  } {
    const userId = request.userId ? ID.fromString(request.userId) : undefined;
    const config = request.config ? SessionConverter.createSessionConfig(request.config) : undefined;

    return {
      userId,
      title: request.title,
      config
    };
  }

  /**
   * 创建会话配置对象
   */
  static createSessionConfig(configDto: SessionConfigDto): SessionConfig {
    const configProps: Partial<SessionConfigProps> = {};

    if (configDto) {
      // @ts-ignore - TypeScript requires index signature access for this property
      configProps.value = configDto.value;
    }

    if (configDto) {
      // @ts-ignore - TypeScript requires index signature access for this property
      if (configDto.timeoutMinutes) {
        configProps.timeoutMinutes = parseInt(configDto.timeoutMinutes);
      }
    }

    if (configDto) {
      // @ts-ignore - TypeScript requires index signature access for this property
      if (configDto.maxDuration) {
        configProps.maxDuration = parseInt(configDto.maxDuration as string);
      }
    }

    if (configDto) {
      // @ts-ignore - TypeScript requires index signature access for this property
      if (configDto.maxMessages) {
        configProps.maxMessages = parseInt(configDto.maxMessages);
      }
    }

    return SessionConfig.create(configProps);
  }

  /**
   * 批量转换会话列表
   */
  override toDtoList(entities: Session[], options?: DtoConverterOptions): SessionInfo[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  /**
   * 应用转换选项
   */
  private applyOptions(dto: SessionInfo, options?: DtoConverterOptions): SessionInfo {
    if (!options) return dto;

    let result = { ...dto };

    // 处理排除字段
    if (options.excludeFields) {
      options.excludeFields.forEach(field => {
        delete (result as any)[field];
      });
    }

    // 处理包含字段
    if (options.includeFields) {
      const filtered: any = {};
      options.includeFields.forEach(field => {
        if (field in result) {
          filtered[field] = (result as any)[field];
        }
      });
      result = filtered;
    }

    // 处理字段转换
    if (options.transformFields) {
      Object.entries(options.transformFields).forEach(([field, transformer]) => {
        if (field in result) {
          (result as any)[field] = transformer((result as any)[field]);
        }
      });
    }

    // 处理字段重命名
    if (options.renameFields) {
      const renamed: any = {};
      Object.entries(result).forEach(([field, value]) => {
        const newField = options.renameFields![field] || field;
        renamed[newField] = value;
      });
      result = renamed;
    }

    return result;
  }
}

/**
 * 会话统计转换器
 * 用于会话统计数据的转换
 */
export class SessionStatisticsConverter extends DtoConverter<any, any> {
  /**
   * 从领域对象统计转换为DTO统计
   */
  toDto(
    statistics: {
      total: number;
      active: number;
      suspended: number;
      terminated: number;
    },
    options?: DtoConverterOptions
  ): any {
    const result = { ...statistics };

    // 应用转换选项
    return this.applyOptions(result, options);
  }

  /**
   * DTO统计转换为领域对象统计
   */
  toEntity(dto: any, options?: DtoConverterOptions): any {
    const result = { ...dto };

    // 应用转换选项
    return this.applyOptions(result, options);
  }

  /**
   * 应用转换选项
   */
  private applyOptions(data: any, options?: DtoConverterOptions): any {
    if (!options) return data;

    let result = { ...data };

    // 处理排除字段
    if (options.excludeFields) {
      options.excludeFields.forEach(field => {
        delete result[field];
      });
    }

    // 处理包含字段
    if (options.includeFields) {
      const filtered: any = {};
      options.includeFields.forEach(field => {
        if (field in result) {
          filtered[field] = result[field];
        }
      });
      result = filtered;
    }

    return result;
  }
}

/**
 * 通用会话转换器
 * 基于配置的转换器，用于简单的字段映射
 */
export class GenericSessionConverter extends GenericDtoConverter<Session, SessionInfo> {
  constructor() {
    super();

    // 添加字段映射
    this.addFieldMappings({
      'sessionId': 'sessionId',
      'userId': 'userId',
      'title': 'title',
      'status': 'status',
      'messageCount': 'messageCount',
      'createdAt': 'createdAt',
      'lastActivityAt': 'lastActivityAt'
    });

    // 添加字段转换器
    this.addFieldTransformers({
      'sessionId': (value: ID) => value.toString(),
      'userId': (value: ID | undefined) => value?.toString(),
      'status': (value: any) => value.getValue(),
      'createdAt': (value: Date) => value.toISOString(),
      'lastActivityAt': (value: Date) => value.toISOString()
    });
  }
}

/**
 * 转换器工厂
 */
export class SessionConverterFactory {
  /**
   * 创建标准会话转换器
   */
  static createSessionConverter(): SessionConverter {
    return new SessionConverter();
  }

  /**
   * 创建会话统计转换器
   */
  static createSessionStatisticsConverter(): SessionStatisticsConverter {
    return new SessionStatisticsConverter();
  }

  /**
   * 创建通用会话转换器
   */
  static createGenericSessionConverter(): GenericSessionConverter {
    return new GenericSessionConverter();
  }

  /**
   * 创建自定义转换器
   */
  static createCustomConverter<TSource, TTarget>(
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
}

/**
 * 转换器工具函数
 */
export class SessionConverterUtils {
  /**
   * 安全转换ID
   */
  static safeConvertId(id: ID | string | undefined): string | undefined {
    if (!id) return undefined;
    if (typeof id === 'string') return id;
    return id.toString();
  }

  /**
   * 安全转换日期
   */
  static safeConvertDate(date: Date | string | undefined): string | undefined {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }

  /**
   * 批量转换ID列表
   */
  static convertIdList(ids: (ID | string)[]): string[] {
    return ids.map(id => this.safeConvertId(id)!);
  }

  /**
   * 批量转换日期列表
   */
  static convertDateList(dates: (Date | string)[]): string[] {
    return dates.map(date => this.safeConvertDate(date)!);
  }

  /**
   * 深度转换嵌套对象
   */
  static deepConvertObject(obj: any, converters: Record<string, (value: any) => any>): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepConvertObject(item, converters));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (converters[key]) {
        result[key] = converters[key](value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.deepConvertObject(value, converters);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}