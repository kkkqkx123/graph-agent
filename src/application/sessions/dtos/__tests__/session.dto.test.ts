/**
 * 会话DTO测试
 */

import {
  CreateSessionRequestDto,
  SessionInfoDto,
  SessionStatisticsDto,
  SessionInfoSchema,
  CreateSessionRequestSchema,
  SessionStatisticsSchema,
  createSessionInfoDto,
  createSessionStatisticsDto,
  createCreateSessionRequestDto,
  DEFAULT_SESSION_CONFIG,
  SESSION_STATUS
} from '../session.dto';
import { DtoValidationError } from '../../../common/dto';

describe('SessionDTO', () => {
  describe('CreateSessionRequestDto', () => {
    let dto: CreateSessionRequestDto;

    beforeEach(() => {
      dto = createCreateSessionRequestDto();
    });

    describe('validate', () => {
      it('应该验证有效的创建会话请求', () => {
        const validRequest = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          title: '测试会话',
          config: {
            value: { key: 'value' },
            timeoutMinutes: '30',
            maxDuration: '24h',
            maxMessages: '100'
          }
        };

        const result = dto.validate(validRequest);

        expect(result).toEqual(validRequest);
        expect(result.userId).toBe(validRequest.userId);
        expect(result.title).toBe(validRequest.title);
        expect(result.config).toEqual(validRequest.config);
      });

      it('应该验证可选字段的请求', () => {
        const minimalRequest = {};

        const result = dto.validate(minimalRequest);

        expect(result).toEqual({});
        expect(result.userId).toBeUndefined();
        expect(result.title).toBeUndefined();
        expect(result.config).toBeUndefined();
      });

      it('应该验证部分字段的请求', () => {
        const partialRequest = {
          title: '测试会话'
        };

        const result = dto.validate(partialRequest);

        expect(result.title).toBe('测试会话');
        expect(result.userId).toBeUndefined();
        expect(result.config).toBeUndefined();
      });

      it('应该拒绝无效的UUID格式', () => {
        const invalidRequest = {
          userId: 'invalid-uuid',
          title: '测试会话'
        };

        expect(() => dto.validate(invalidRequest)).toThrow(DtoValidationError);
      });

      it('应该拒绝过长的标题', () => {
        const invalidRequest = {
          title: 'a'.repeat(201) // 超过200字符限制
        };

        expect(() => dto.validate(invalidRequest)).toThrow(DtoValidationError);
      });

      it('应该提供详细的错误信息', () => {
        const invalidRequest = {
          userId: 'invalid-uuid'
        };

        try {
          dto.validate(invalidRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(DtoValidationError);
          const validationError = error as DtoValidationError;
          const errors = validationError.getFormattedErrors();
          
          expect(errors).toHaveLength(1);
          expect(errors[0]?.field).toBe('userId');
          expect(errors[0]?.code).toBe('invalid_format');
        }
      });
    });

    describe('safeValidate', () => {
      it('应该安全验证有效的请求', () => {
        const validRequest = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          title: '测试会话'
        };

        const result = dto.safeValidate(validRequest);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(validRequest);
        expect(result.error).toBeUndefined();
      });

      it('应该安全验证无效的请求', () => {
        const invalidRequest = {
          userId: 'invalid-uuid'
        };

        const result = dto.safeValidate(invalidRequest);

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeDefined();
      });
    });

    describe('validateConfig', () => {
      it('应该验证有效的配置', () => {
        const validConfig = {
          value: { key: 'value' },
          timeoutMinutes: '30',
          maxDuration: '24h',
          maxMessages: '100'
        };

        const result = dto.validateConfig(validConfig);

        expect(result).toEqual(validConfig);
      });

      it('应该处理undefined配置', () => {
        const result = dto.validateConfig(undefined);

        expect(result).toBeUndefined();
      });

      it('应该验证部分配置', () => {
        const partialConfig = {
          timeoutMinutes: '30'
        };

        const result = dto.validateConfig(partialConfig);

        expect(result).toEqual(partialConfig);
      });
    });
  });

  describe('SessionInfoDto', () => {
    let dto: SessionInfoDto;

    beforeEach(() => {
      dto = createSessionInfoDto();
    });

    describe('validate', () => {
      it('应该验证有效的会话信息', () => {
        const validInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          title: '测试会话',
          status: 'active' as const,
          messageCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T12:00:00.000Z'
        };

        const result = dto.validate(validInfo);

        expect(result).toEqual(validInfo);
      });

      it('应该验证最小必需的会话信息', () => {
        const minimalInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'active' as const,
          messageCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        const result = dto.validate(minimalInfo);

        expect(result).toEqual(minimalInfo);
        expect(result.userId).toBeUndefined();
        expect(result.title).toBeUndefined();
      });

      it('应该拒绝无效的状态', () => {
        const invalidInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'invalid-status',
          messageCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(() => dto.validate(invalidInfo)).toThrow(DtoValidationError);
      });

      it('应该拒绝负的消息数量', () => {
        const invalidInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'active' as const,
          messageCount: -1,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(() => dto.validate(invalidInfo)).toThrow(DtoValidationError);
      });

      it('应该拒绝无效的日期格式', () => {
        const invalidInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'active' as const,
          messageCount: 10,
          createdAt: 'invalid-date',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(() => dto.validate(invalidInfo)).toThrow(DtoValidationError);
      });
    });

    describe('状态检查方法', () => {
      it('应该正确检查活跃状态', () => {
        const activeInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'active' as const,
          messageCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(dto.isActive(activeInfo)).toBe(true);
        expect(dto.isSuspended(activeInfo)).toBe(false);
        expect(dto.isTerminated(activeInfo)).toBe(false);
      });

      it('应该正确检查暂停状态', () => {
        const suspendedInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'suspended' as const,
          messageCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(dto.isSuspended(suspendedInfo)).toBe(true);
        expect(dto.isActive(suspendedInfo)).toBe(false);
        expect(dto.isTerminated(suspendedInfo)).toBe(false);
      });

      it('应该正确检查终止状态', () => {
        const terminatedInfo = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'terminated' as const,
          messageCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z'
        };

        expect(dto.isTerminated(terminatedInfo)).toBe(true);
        expect(dto.isActive(terminatedInfo)).toBe(false);
        expect(dto.isSuspended(terminatedInfo)).toBe(false);
      });
    });
  });

  describe('SessionStatisticsDto', () => {
    let dto: SessionStatisticsDto;

    beforeEach(() => {
      dto = createSessionStatisticsDto();
    });

    describe('validate', () => {
      it('应该验证有效的会话统计', () => {
        const validStats = {
          total: 100,
          active: 50,
          suspended: 30,
          terminated: 20
        };

        const result = dto.validate(validStats);

        expect(result).toEqual(validStats);
      });

      it('应该验证零统计', () => {
        const zeroStats = {
          total: 0,
          active: 0,
          suspended: 0,
          terminated: 0
        };

        const result = dto.validate(zeroStats);

        expect(result).toEqual(zeroStats);
      });

      it('应该拒绝负的统计值', () => {
        const invalidStats = {
          total: -1,
          active: 50,
          suspended: 30,
          terminated: 20
        };

        expect(() => dto.validate(invalidStats)).toThrow(DtoValidationError);
      });

      it('应该拒绝非整数统计值', () => {
        const invalidStats = {
          total: 100.5,
          active: 50,
          suspended: 30,
          terminated: 20
        };

        expect(() => dto.validate(invalidStats)).toThrow(DtoValidationError);
      });
    });

    describe('统计计算方法', () => {
      it('应该正确计算活跃率', () => {
        const stats = {
          total: 100,
          active: 50,
          suspended: 30,
          terminated: 20
        };

        const activeRate = dto.getActiveRate(stats);

        expect(activeRate).toBe(50);
      });

      it('应该正确计算终止率', () => {
        const stats = {
          total: 100,
          active: 50,
          suspended: 30,
          terminated: 20
        };

        const terminatedRate = dto.getTerminatedRate(stats);

        expect(terminatedRate).toBe(20);
      });

      it('应该处理零总数的情况', () => {
        const stats = {
          total: 0,
          active: 0,
          suspended: 0,
          terminated: 0
        };

        const activeRate = dto.getActiveRate(stats);
        const terminatedRate = dto.getTerminatedRate(stats);

        expect(activeRate).toBe(0);
        expect(terminatedRate).toBe(0);
      });
    });
  });

  describe('Schema验证', () => {
    it('应该验证Schema结构', () => {
      // 验证CreateSessionRequestSchema
      expect(CreateSessionRequestSchema.shape.userId).toBeDefined();
      expect(CreateSessionRequestSchema.shape.title).toBeDefined();
      expect(CreateSessionRequestSchema.shape.config).toBeDefined();

      // 验证SessionInfoSchema
      expect(SessionInfoSchema.shape.sessionId).toBeDefined();
      expect(SessionInfoSchema.shape.status).toBeDefined();
      expect(SessionInfoSchema.shape.messageCount).toBeDefined();

      // 验证SessionStatisticsSchema
      expect(SessionStatisticsSchema.shape.total).toBeDefined();
      expect(SessionStatisticsSchema.shape.active).toBeDefined();
      expect(SessionStatisticsSchema.shape.suspended).toBeDefined();
      expect(SessionStatisticsSchema.shape.terminated).toBeDefined();
    });

    it('应该验证Schema描述', () => {
      const createSchema = CreateSessionRequestSchema.shape;
      expect(createSchema.userId.description).toBe('用户ID');
      expect(createSchema.title.description).toBe('会话标题');
      expect(createSchema.config.description).toBe('会话配置');
    });
  });

  describe('工厂函数', () => {
    it('应该正确创建DTO实例', () => {
      const createDto = createCreateSessionRequestDto();
      const infoDto = createSessionInfoDto();
      const statsDto = createSessionStatisticsDto();

      expect(createDto).toBeInstanceOf(CreateSessionRequestDto);
      expect(infoDto).toBeInstanceOf(SessionInfoDto);
      expect(statsDto).toBeInstanceOf(SessionStatisticsDto);
    });

    it('应该创建独立的DTO实例', () => {
      const dto1 = createCreateSessionRequestDto();
      const dto2 = createCreateSessionRequestDto();

      expect(dto1).not.toBe(dto2);
    });
  });

  describe('常量', () => {
    it('应该定义正确的会话状态常量', () => {
      expect(SESSION_STATUS.ACTIVE).toBe('active');
      expect(SESSION_STATUS.SUSPENDED).toBe('suspended');
      expect(SESSION_STATUS.TERMINATED).toBe('terminated');
    });

    it('应该定义默认会话配置', () => {
      expect(DEFAULT_SESSION_CONFIG).toBeDefined();
      expect(DEFAULT_SESSION_CONFIG.timeoutMinutes).toBe('30');
      expect(DEFAULT_SESSION_CONFIG.maxDuration).toBe('24h');
      expect(DEFAULT_SESSION_CONFIG.maxMessages).toBe('100');
    });
  });
});