/**
 * 会话转换器测试
 */

import { SessionConverter, SessionConverterFactory, SessionConverterUtils, SessionStatisticsConverter } from '../session-converter';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../../domain/sessions/value-objects/session-config';
import { SessionInfo, CreateSessionRequest, SessionConfigDto } from '../session.dto';
import { DtoConverterOptions } from '../../../common/dto';

// Mock Session类
jest.mock('../../../../domain/sessions/entities/session');
jest.mock('../../../../domain/sessions/value-objects/session-status');

describe('SessionConverter', () => {
  let converter: SessionConverter;

  beforeEach(() => {
    converter = new SessionConverter();
  });

  describe('toDto', () => {
    it('应该正确转换完整的会话实体', () => {
      // 创建模拟会话实体
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const result = converter.toDto(mockSession);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: '测试会话',
        status: 'active',
        messageCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
    });

    it('应该正确转换没有用户ID的会话实体', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: undefined,
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const result = converter.toDto(mockSession);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: undefined,
        title: '测试会话',
        status: 'active',
        messageCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
    });

    it('应该正确转换没有标题的会话实体', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: undefined,
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const result = converter.toDto(mockSession);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: undefined,
        status: 'active',
        messageCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
    });

    it('应该应用排除字段选项', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const options: DtoConverterOptions = {
        excludeFields: ['userId', 'createdAt']
      };

      const result = converter.toDto(mockSession, options);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        title: '测试会话',
        status: 'active',
        messageCount: 10,
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
      expect(result.userId).toBeUndefined();
      expect(result.createdAt).toBeUndefined();
    });

    it('应该应用包含字段选项', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const options: DtoConverterOptions = {
        includeFields: ['sessionId', 'title', 'status']
      };

      const result = converter.toDto(mockSession, options);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        title: '测试会话',
        status: 'active'
      });
      expect(result.userId).toBeUndefined();
      expect(result.messageCount).toBeUndefined();
    });

    it('应该应用字段转换选项', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const options: DtoConverterOptions = {
        transformFields: {
          title: (value: string) => value.toUpperCase(),
          messageCount: (value: number) => value * 2
        }
      };

      const result = converter.toDto(mockSession, options);

      expect(result).toEqual({
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: '测试会话'.toUpperCase(),
        status: 'active',
        messageCount: 20,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
    });

    it('应该应用字段重命名选项', () => {
      const mockSession = {
        sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
        title: '测试会话',
        status: {
          getValue: jest.fn().mockReturnValue('active')
        },
        messageCount: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
      } as unknown as Session;

      const options: DtoConverterOptions = {
        renameFields: {
          sessionId: 'id',
          userId: 'ownerId',
          messageCount: 'msgCount'
        }
      };

      const result = converter.toDto(mockSession, options);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        title: '测试会话',
        status: 'active',
        msgCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      });
    });
  });

  describe('toEntity', () => {
    it('应该抛出错误（需要业务上下文）', () => {
      const dto: SessionInfo = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'active',
        messageCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: '2024-01-01T12:00:00.000Z'
      };

      expect(() => converter.toEntity(dto)).toThrow('DTO到Entity的转换需要业务上下文，请使用工厂方法');
    });
  });

  describe('fromCreateRequest', () => {
    it('应该正确转换完整的创建请求', () => {
      const request: CreateSessionRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: '测试会话',
        config: {
          value: { key: 'value' },
          timeoutMinutes: '30',
          maxDuration: '24h',
          maxMessages: '100'
        }
      };

      const result = SessionConverter.fromCreateRequest(request);

      expect(result.userId).toBeDefined();
      expect(result.userId?.toString()).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.title).toBe('测试会话');
      expect(result.config).toBeDefined();
    });

    it('应该正确转换最小创建请求', () => {
      const request: CreateSessionRequest = {};

      const result = SessionConverter.fromCreateRequest(request);

      expect(result.userId).toBeUndefined();
      expect(result.title).toBeUndefined();
      expect(result.config).toBeUndefined();
    });

    it('应该正确转换部分创建请求', () => {
      const request: CreateSessionRequest = {
        title: '测试会话'
      };

      const result = SessionConverter.fromCreateRequest(request);

      expect(result.userId).toBeUndefined();
      expect(result.title).toBe('测试会话');
      expect(result.config).toBeUndefined();
    });
  });

  describe('createSessionConfig', () => {
    it('应该正确转换完整的配置', () => {
      const configDto: SessionConfigDto = {
        value: { key: 'value' },
        timeoutMinutes: '30',
        maxDuration: '24h',
        maxMessages: '100'
      };

      const result = SessionConverter.createSessionConfig(configDto);

      expect(result).toBeDefined();
      expect(result.value).toEqual({ key: 'value' });
      expect(result.getTimeoutMinutes()).toBe(30);
      expect(result.getMaxDuration()).toBe('24h');
      expect(result.getMaxMessages()).toBe(100);
    });

    it('应该正确转换部分配置', () => {
      const configDto: SessionConfigDto = {
        timeoutMinutes: '30'
      };

      const result = SessionConverter.createSessionConfig(configDto);

      expect(result).toBeDefined();
      expect(result.getTimeoutMinutes()).toBe(30);
      expect(result.getMaxDuration()).toBeUndefined();
      expect(result.getMaxMessages()).toBeUndefined();
    });

    it('应该处理空配置', () => {
      const configDto: SessionConfigDto = {};

      const result = SessionConverter.createSessionConfig(configDto);

      expect(result).toBeDefined();
      expect(result.getTimeoutMinutes()).toBeUndefined();
      expect(result.getMaxDuration()).toBeUndefined();
      expect(result.getMaxMessages()).toBeUndefined();
    });
  });

  describe('toDtoList', () => {
    it('应该正确批量转换会话列表', () => {
      const mockSessions = [
        {
          sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
          userId: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
          title: '会话1',
          status: {
            getValue: jest.fn().mockReturnValue('active')
          },
          messageCount: 10,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          lastActivityAt: new Date('2024-01-01T12:00:00.000Z')
        },
        {
          sessionId: ID.fromString('123e4567-e89b-12d3-a456-426614174002'),
          userId: ID.fromString('123e4567-e89b-12d3-a456-426614174003'),
          title: '会话2',
          status: {
            getValue: jest.fn().mockReturnValue('suspended')
          },
          messageCount: 20,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          lastActivityAt: new Date('2024-01-02T12:00:00.000Z')
        }
      ] as unknown as Session[];

      const results = converter.toDtoList(mockSessions);

      expect(results).toHaveLength(2);
      expect(results[0].sessionId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(results[0].title).toBe('会话1');
      expect(results[0].status).toBe('active');
      expect(results[1].sessionId).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(results[1].title).toBe('会话2');
      expect(results[1].status).toBe('suspended');
    });

    it('应该正确处理空列表', () => {
      const results = converter.toDtoList([]);

      expect(results).toEqual([]);
    });
  });
});

describe('SessionConverterFactory', () => {
  describe('createSessionConverter', () => {
    it('应该创建会话转换器实例', () => {
      const converter = SessionConverterFactory.createSessionConverter();

      expect(converter).toBeInstanceOf(SessionConverter);
    });
  });

  describe('createSessionStatisticsConverter', () => {
    it('应该创建会话统计转换器实例', () => {
      const converter = SessionConverterFactory.createSessionStatisticsConverter();

      expect(converter).toBeInstanceOf(SessionStatisticsConverter);
    });
  });

  describe('createGenericSessionConverter', () => {
    it('应该创建通用会话转换器实例', () => {
      const converter = SessionConverterFactory.createGenericSessionConverter();

      expect(converter).toBeDefined();
    });
  });

  describe('createCustomConverter', () => {
    it('应该创建自定义转换器', () => {
      const mappings = { 'field1': 'field2' };
      const transformers = { 'field1': (value: any) => value.toUpperCase() };

      const converter = SessionConverterFactory.createCustomConverter(mappings, transformers);

      expect(converter).toBeDefined();
    });
  });
});

describe('SessionConverterUtils', () => {
  describe('safeConvertId', () => {
    it('应该安全转换ID对象', () => {
      const id = ID.fromString('123e4567-e89b-12d3-a456-426614174000');
      const result = SessionConverterUtils.safeConvertId(id);

      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('应该安全转换字符串ID', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const result = SessionConverterUtils.safeConvertId(id);

      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('应该处理undefined ID', () => {
      const result = SessionConverterUtils.safeConvertId(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('safeConvertDate', () => {
    it('应该安全转换Date对象', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = SessionConverterUtils.safeConvertDate(date);

      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('应该安全转换字符串日期', () => {
      const date = '2024-01-01T00:00:00.000Z';
      const result = SessionConverterUtils.safeConvertDate(date);

      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('应该处理undefined日期', () => {
      const result = SessionConverterUtils.safeConvertDate(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('convertIdList', () => {
    it('应该批量转换ID列表', () => {
      const ids = [
        ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        '123e4567-e89b-12d3-a456-426614174001',
        ID.fromString('123e4567-e89b-12d3-a456-426614174002')
      ];

      const results = SessionConverterUtils.convertIdList(ids);

      expect(results).toEqual([
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002'
      ]);
    });
  });

  describe('convertDateList', () => {
    it('应该批量转换日期列表', () => {
      const dates = [
        new Date('2024-01-01T00:00:00.000Z'),
        '2024-01-02T00:00:00.000Z',
        new Date('2024-01-03T00:00:00.000Z')
      ];

      const results = SessionConverterUtils.convertDateList(dates);

      expect(results).toEqual([
        '2024-01-01T00:00:00.000Z',
        '2024-01-02T00:00:00.000Z',
        '2024-01-03T00:00:00.000Z'
      ]);
    });
  });

  describe('deepConvertObject', () => {
    it('应该深度转换嵌套对象', () => {
      const obj = {
        id: ID.fromString('123e4567-e89b-12d3-a456-426614174000'),
        name: '测试',
        nested: {
          id: ID.fromString('123e4567-e89b-12d3-a456-426614174001'),
          value: 'nested'
        },
        array: [
          { id: ID.fromString('123e4567-e89b-12d3-a456-426614174002') }
        ]
      };

      const converters = {
        id: (value: ID) => value.toString()
      };

      const result = SessionConverterUtils.deepConvertObject(obj, converters);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('测试');
      expect(result.nested.id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.nested.value).toBe('nested');
      expect(result.array[0].id).toBe('123e4567-e89b-12d3-a456-426614174002');
    });

    it('应该处理非对象值', () => {
      const value = 'string-value';
      const converters = { id: (value: any) => value };

      const result = SessionConverterUtils.deepConvertObject(value, converters);

      expect(result).toBe('string-value');
    });

    it('应该处理数组', () => {
      const array = [
        { id: ID.fromString('123e4567-e89b-12d3-a456-426614174000') },
        { id: ID.fromString('123e4567-e89b-12d3-a456-426614174001') }
      ];

      const converters = {
        id: (value: ID) => value.toString()
      };

      const result = SessionConverterUtils.deepConvertObject(array, converters);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result[1].id).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });
});