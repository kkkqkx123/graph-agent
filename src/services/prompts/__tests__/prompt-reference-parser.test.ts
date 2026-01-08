/**
 * PromptReferenceParser 单元测试
 */

import { PromptReferenceParser } from '../prompt-reference-parser';
import { ILogger } from '../../domain/common/types/logger-types';

describe('PromptReferenceParser', () => {
  let parser: PromptReferenceParser;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    parser = new PromptReferenceParser(mockLogger);
  });

  describe('parse', () => {
    it('应该正确解析基本引用格式', () => {
      const result = parser.parse('system.coder');
      expect(result.category).toBe('system');
      expect(result.name).toBe('coder');
    });

    it('应该正确解析复合提示词引用', () => {
      const result = parser.parse('system.coder.code_style');
      expect(result.category).toBe('system');
      expect(result.name).toBe('coder.code_style');
    });

    it('应该拒绝无效的引用格式', () => {
      expect(() => parser.parse('system')).toThrow('无效的提示词引用格式');
    });

    it('应该拒绝无效的类别', () => {
      expect(() => parser.parse('invalid.coder')).toThrow('无效的类别');
    });

    it('应该拒绝包含特殊字符的名称', () => {
      expect(() => parser.parse('system.coder@name')).toThrow('名称包含无效字符');
    });
  });

  describe('isValid', () => {
    it('应该验证有效的引用', () => {
      expect(parser.isValid('system.coder')).toBe(true);
      expect(parser.isValid('rules.format')).toBe(true);
      expect(parser.isValid('user_commands.code_review')).toBe(true);
    });

    it('应该拒绝无效的引用', () => {
      expect(parser.isValid('system')).toBe(false);
      expect(parser.isValid('invalid.coder')).toBe(false);
      expect(parser.isValid('system.coder@name')).toBe(false);
    });
  });

  describe('getValidCategories', () => {
    it('应该返回所有有效的类别', () => {
      const categories = parser.getValidCategories();
      expect(categories).toContain('system');
      expect(categories).toContain('rules');
      expect(categories).toContain('user_commands');
      expect(categories).toContain('templates');
      expect(categories).toContain('context');
      expect(categories).toContain('examples');
    });
  });
});
