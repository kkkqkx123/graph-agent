/**
 * 提示词DTO单元测试
 */

import {
  PromptInfoDto,
  PromptSearchRequestDto,
  PromptConfigRequestDto,
  PromptInjectionRequestDto,
  PromptConverter,
  DtoValidationError
} from '../prompts.dto';

describe('Prompt DTOs', () => {
  describe('PromptInfoDto', () => {
    let promptInfoDto: PromptInfoDto;

    beforeEach(() => {
      promptInfoDto = new PromptInfoDto();
    });

    it('应该验证有效的提示词信息', () => {
      const validPromptInfo = {
        promptId: '123e4567-e89b-12d3-a456-426614174000',
        name: '测试提示词',
        category: 'system',
        description: '这是一个测试提示词',
        content: '这是提示词内容',
        tags: ['测试', '系统'],
        metadata: { key: 'value' },
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      const result = promptInfoDto.validate(validPromptInfo);
      expect(result).toEqual(validPromptInfo);
    });

    it('应该拒绝无效的提示词信息', () => {
      const invalidPromptInfo = {
        promptId: 'invalid-uuid',
        name: '',
        category: '',
        content: '',
        tags: 'not-an-array',
        metadata: 'not-an-object',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date'
      };

      expect(() => {
        promptInfoDto.validate(invalidPromptInfo);
      }).toThrow(DtoValidationError);
    });

    it('应该安全验证并返回成功结果', () => {
      const validPromptInfo = {
        promptId: '123e4567-e89b-12d3-a456-426614174000',
        name: '测试提示词',
        category: 'system',
        content: '这是提示词内容',
        tags: ['测试'],
        metadata: {},
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      const result = promptInfoDto.safeValidate(validPromptInfo);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPromptInfo);
    });

    it('应该安全验证并返回失败结果', () => {
      const invalidPromptInfo = {
        promptId: 'invalid-uuid',
        name: '',
        category: '',
        content: ''
      };

      const result = promptInfoDto.safeValidate(invalidPromptInfo);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('PromptSearchRequestDto', () => {
    let promptSearchRequestDto: PromptSearchRequestDto;

    beforeEach(() => {
      promptSearchRequestDto = new PromptSearchRequestDto();
    });

    it('应该验证有效的搜索请求', () => {
      const validSearchRequest = {
        keyword: '测试',
        category: 'system',
        tags: ['测试', '系统'],
        searchIn: 'all',
        pagination: {
          page: 1,
          size: 20
        },
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const result = promptSearchRequestDto.validate(validSearchRequest);
      expect(result).toEqual(validSearchRequest);
    });

    it('应该使用默认值验证部分搜索请求', () => {
      const partialSearchRequest = {
        keyword: '测试'
      };

      const result = promptSearchRequestDto.validate(partialSearchRequest);
      expect(result.keyword).toBe('测试');
      expect(result.searchIn).toBe('all');
      expect(result.pagination).toBeUndefined();
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });
  });

  describe('PromptConfigRequestDto', () => {
    let promptConfigRequestDto: PromptConfigRequestDto;

    beforeEach(() => {
      promptConfigRequestDto = new PromptConfigRequestDto();
    });

    it('应该验证有效的配置请求', () => {
      const validConfigRequest = {
        config: {
          rules: ['规则1', '规则2'],
          setting1: 'value1'
        },
        overwrite: true,
        description: '测试配置'
      };

      const result = promptConfigRequestDto.validate(validConfigRequest);
      expect(result).toEqual(validConfigRequest);
    });

    it('应该使用默认值验证部分配置请求', () => {
      const partialConfigRequest = {
        config: {
          rules: ['规则1']
        }
      };

      const result = promptConfigRequestDto.validate(partialConfigRequest);
      expect(result.config).toEqual({ rules: ['规则1'] });
      expect(result.overwrite).toBe(false);
      expect(result.description).toBeUndefined();
    });
  });

  describe('PromptInjectionRequestDto', () => {
    let promptInjectionRequestDto: PromptInjectionRequestDto;

    beforeEach(() => {
      promptInjectionRequestDto = new PromptInjectionRequestDto();
    });

    it('应该验证有效的注入请求', () => {
      const validInjectionRequest = {
        workflowId: '123e4567-e89b-12d3-a456-426614174000',
        config: {
          config: {
            rules: ['规则1']
          }
        },
        injectionPoint: 'start',
        customPosition: {
          before: 'node1'
        },
        force: true
      };

      const result = promptInjectionRequestDto.validate(validInjectionRequest);
      expect(result).toEqual(validInjectionRequest);
    });

    it('应该使用默认值验证部分注入请求', () => {
      const partialInjectionRequest = {
        workflowId: '123e4567-e89b-12d3-a456-426614174000',
        config: {
          config: {}
        }
      };

      const result = promptInjectionRequestDto.validate(partialInjectionRequest);
      expect(result.workflowId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.injectionPoint).toBe('end');
      expect(result.force).toBe(false);
    });
  });

  describe('PromptConverter', () => {
    let promptConverter: PromptConverter;

    beforeEach(() => {
      promptConverter = new PromptConverter();
    });

    it('应该将领域对象转换为DTO', () => {
      const domainPrompt = {
        promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174000' },
        name: '测试提示词',
        category: 'system',
        description: '这是一个测试提示词',
        content: '这是提示词内容',
        metadata: {
          tags: ['测试', '系统'],
          createdBy: 'user1'
        },
        createdAt: { toISOString: () => '2023-01-01T00:00:00Z' },
        updatedAt: { toISOString: () => '2023-01-01T00:00:00Z' }
      };

      const result = promptConverter.toDto(domainPrompt);
      
      expect(result.promptId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('测试提示词');
      expect(result.category).toBe('system');
      expect(result.description).toBe('这是一个测试提示词');
      expect(result.content).toBe('这是提示词内容');
      expect(result.tags).toEqual(['测试', '系统']);
      expect(result.metadata).toEqual({
        tags: ['测试', '系统'],
        createdBy: 'user1'
      });
      expect(result.createdAt).toBe('2023-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2023-01-01T00:00:00Z');
    });

    it('应该将领域对象转换为摘要', () => {
      const domainPrompt = {
        promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174000' },
        name: '测试提示词',
        category: 'system',
        description: '这是一个测试提示词',
        metadata: {
          tags: ['测试', '系统']
        },
        createdAt: { toISOString: () => '2023-01-01T00:00:00Z' }
      };

      const result = promptConverter.toSummary(domainPrompt);
      
      expect(result.promptId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('测试提示词');
      expect(result.category).toBe('system');
      expect(result.description).toBe('这是一个测试提示词');
      expect(result.tags).toEqual(['测试', '系统']);
      expect(result.createdAt).toBe('2023-01-01T00:00:00Z');
    });

    it('应该批量转换领域对象为DTO', () => {
      const domainPrompts = [
        {
          promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174000' },
          name: '测试提示词1',
          category: 'system',
          content: '内容1',
          metadata: { tags: ['测试'] },
          createdAt: { toISOString: () => '2023-01-01T00:00:00Z' },
          updatedAt: { toISOString: () => '2023-01-01T00:00:00Z' }
        },
        {
          promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174001' },
          name: '测试提示词2',
          category: 'user',
          content: '内容2',
          metadata: { tags: ['用户'] },
          createdAt: { toISOString: () => '2023-01-02T00:00:00Z' },
          updatedAt: { toISOString: () => '2023-01-02T00:00:00Z' }
        }
      ];

      const results = promptConverter.toDtoList(domainPrompts);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('测试提示词1');
      expect(results[1].name).toBe('测试提示词2');
    });

    it('应该批量转换领域对象为摘要', () => {
      const domainPrompts = [
        {
          promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174000' },
          name: '测试提示词1',
          category: 'system',
          metadata: { tags: ['测试'] },
          createdAt: { toISOString: () => '2023-01-01T00:00:00Z' }
        },
        {
          promptId: { toString: () => '123e4567-e89b-12d3-a456-426614174001' },
          name: '测试提示词2',
          category: 'user',
          metadata: { tags: ['用户'] },
          createdAt: { toISOString: () => '2023-01-02T00:00:00Z' }
        }
      ];

      const results = promptConverter.toSummaryList(domainPrompts);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('测试提示词1');
      expect(results[1].name).toBe('测试提示词2');
    });

    it('应该在DTO到实体转换时抛出错误', () => {
      const dto = {
        promptId: '123e4567-e89b-12d3-a456-426614174000',
        name: '测试提示词',
        category: 'system',
        content: '内容',
        tags: [],
        metadata: {},
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      expect(() => {
        promptConverter.toEntity(dto);
      }).toThrow('DTO到Entity的转换需要业务上下文，请使用工厂方法');
    });
  });
});