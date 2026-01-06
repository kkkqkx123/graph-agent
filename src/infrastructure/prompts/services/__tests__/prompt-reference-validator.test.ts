/**
 * PromptReferenceValidator 单元测试
 */

import { PromptReferenceValidator, ReferenceErrorCode } from '../prompt-reference-validator';
import { ILogger } from '../../../../../domain/common/types/logger-types';

describe('PromptReferenceValidator', () => {
  let validator: PromptReferenceValidator;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    validator = new PromptReferenceValidator(mockLogger);
  });

  describe('validate', () => {
    it('应该验证有效的引用', () => {
      const result = validator.validate('system.coder');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝空引用', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ReferenceErrorCode.EMPTY_REFERENCE);
    });

    it('应该拒绝格式不正确的引用', () => {
      const result = validator.validate('system');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ReferenceErrorCode.INVALID_FORMAT);
    });

    it('应该拒绝无效的类别', () => {
      const result = validator.validate('invalid.coder');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ReferenceErrorCode.INVALID_CATEGORY);
    });

    it('应该拒绝包含特殊字符的名称', () => {
      const result = validator.validate('system.coder@name');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ReferenceErrorCode.INVALID_NAME);
    });

    it('应该验证复合提示词引用', () => {
      const result = validator.validate('system.coder.code_style');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('应该批量验证多个引用', () => {
      const references = ['system.coder', 'rules.format', 'invalid.coder'];
      const results = validator.validateBatch(references);

      expect(results.get('system.coder')?.valid).toBe(true);
      expect(results.get('rules.format')?.valid).toBe(true);
      expect(results.get('invalid.coder')?.valid).toBe(false);
    });
  });

  describe('isValid', () => {
    it('应该快速验证引用', () => {
      expect(validator.isValid('system.coder')).toBe(true);
      expect(validator.isValid('invalid.coder')).toBe(false);
    });
  });

  describe('getValidCategories', () => {
    it('应该返回所有有效的类别', () => {
      const categories = validator.getValidCategories();
      expect(categories).toContain('system');
      expect(categories).toContain('rules');
      expect(categories).toContain('user_commands');
      expect(categories).toContain('templates');
      expect(categories).toContain('context');
      expect(categories).toContain('examples');
    });
  });

  describe('isValidCategory', () => {
    it('应该验证类别是否有效', () => {
      expect(validator.isValidCategory('system')).toBe(true);
      expect(validator.isValidCategory('rules')).toBe(true);
      expect(validator.isValidCategory('invalid')).toBe(false);
    });
  });
});
