import { SecurityValidator, SECURITY_CONFIG } from '../security-validator';
import { ValidationError } from '../../types/errors';

describe('SecurityValidator', () => {
  describe('validateExpression', () => {
    test('should accept valid expressions', () => {
      expect(() => SecurityValidator.validateExpression('age > 18')).not.toThrow();
      expect(() => SecurityValidator.validateExpression('user.name == "John"')).not.toThrow();
      expect(() => SecurityValidator.validateExpression('status in ["active", "pending"]')).not.toThrow();
    });

    test('should throw ValidationError for empty expression', () => {
      expect(() => SecurityValidator.validateExpression('')).toThrow(ValidationError);
      expect(() => SecurityValidator.validateExpression('')).toThrow('Expression must be a non-empty string');
    });

    test('should throw ValidationError for non-string expression', () => {
      expect(() => SecurityValidator.validateExpression(null as any)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateExpression(undefined as any)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateExpression(123 as any)).toThrow(ValidationError);
    });

    test('should throw ValidationError for expression exceeding max length', () => {
      const longExpression = 'a'.repeat(SECURITY_CONFIG.MAX_EXPRESSION_LENGTH + 1);
      expect(() => SecurityValidator.validateExpression(longExpression)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateExpression(longExpression)).toThrow(
        `Expression length exceeds maximum limit of ${SECURITY_CONFIG.MAX_EXPRESSION_LENGTH}`
      );
    });

    test('should accept expression at max length', () => {
      const maxExpression = 'a'.repeat(SECURITY_CONFIG.MAX_EXPRESSION_LENGTH);
      expect(() => SecurityValidator.validateExpression(maxExpression)).not.toThrow();
    });
  });

  describe('validatePath', () => {
    test('should accept valid simple paths', () => {
      expect(() => SecurityValidator.validatePath('name')).not.toThrow();
      expect(() => SecurityValidator.validatePath('user')).not.toThrow();
      expect(() => SecurityValidator.validatePath('age')).not.toThrow();
    });

    test('should accept valid nested paths', () => {
      expect(() => SecurityValidator.validatePath('user.name')).not.toThrow();
      expect(() => SecurityValidator.validatePath('user.profile.age')).not.toThrow();
      expect(() => SecurityValidator.validatePath('data.settings.theme')).not.toThrow();
    });

    test('should accept valid array access paths', () => {
      expect(() => SecurityValidator.validatePath('items[0]')).not.toThrow();
      expect(() => SecurityValidator.validatePath('users[0].name')).not.toThrow();
      expect(() => SecurityValidator.validatePath('data.lists[1].items[0]')).not.toThrow();
    });

    test('should throw ValidationError for empty path', () => {
      expect(() => SecurityValidator.validatePath('')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('')).toThrow('Path must be a non-empty string');
    });

    test('should throw ValidationError for non-string path', () => {
      expect(() => SecurityValidator.validatePath(null as any)).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath(undefined as any)).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath(123 as any)).toThrow(ValidationError);
    });

    test('should throw ValidationError for paths with forbidden properties', () => {
      expect(() => SecurityValidator.validatePath('__proto__')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user.__proto__')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('constructor')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user.constructor')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('prototype')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user.prototype')).toThrow(ValidationError);
    });

    test('should throw ValidationError for paths with invalid characters', () => {
      expect(() => SecurityValidator.validatePath('user-name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user@name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user#name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user$name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('user.name!')).toThrow(ValidationError);
    });

    test('should throw ValidationError for paths starting with number', () => {
      expect(() => SecurityValidator.validatePath('123name')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('1user.name')).toThrow(ValidationError);
    });

    test('should throw ValidationError for paths exceeding max depth', () => {
      const deepPath = 'a.b.c.d.e.f.g.h.i.j.k';
      expect(() => SecurityValidator.validatePath(deepPath)).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath(deepPath)).toThrow(
        `Path depth exceeds maximum limit of ${SECURITY_CONFIG.MAX_PATH_DEPTH}`
      );
    });

    test('should accept path at max depth', () => {
      const maxDepthPath = 'a.b.c.d.e.f.g.h.i.j';
      expect(() => SecurityValidator.validatePath(maxDepthPath)).not.toThrow();
    });

    test('should throw ValidationError for invalid array index format', () => {
      expect(() => SecurityValidator.validatePath('items[abc]')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('items[1.5]')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('items[-1]')).toThrow(ValidationError);
      expect(() => SecurityValidator.validatePath('items[]')).toThrow(ValidationError);
    });
  });

  describe('validateArrayIndex', () => {
    test('should accept valid array indices', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(() => SecurityValidator.validateArrayIndex(arr, 0)).not.toThrow();
      expect(() => SecurityValidator.validateArrayIndex(arr, 2)).not.toThrow();
      expect(() => SecurityValidator.validateArrayIndex(arr, 4)).not.toThrow();
    });

    test('should throw ValidationError for non-array target', () => {
      expect(() => SecurityValidator.validateArrayIndex({} as any, 0)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex(null as any, 0)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex('string' as any, 0)).toThrow(ValidationError);
    });

    test('should throw ValidationError for negative index', () => {
      const arr = [1, 2, 3];
      expect(() => SecurityValidator.validateArrayIndex(arr, -1)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex(arr, -5)).toThrow(ValidationError);
    });

    test('should throw ValidationError for index out of bounds', () => {
      const arr = [1, 2, 3];
      expect(() => SecurityValidator.validateArrayIndex(arr, 3)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex(arr, 10)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex(arr, 100)).toThrow(ValidationError);
    });

    test('should throw ValidationError with correct message', () => {
      const arr = [1, 2, 3];
      expect(() => SecurityValidator.validateArrayIndex(arr, 5)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateArrayIndex(arr, 5)).toThrow(
        'Array index 5 out of bounds. Array length is 3'
      );
    });
  });

  describe('validateValueType', () => {
    test('should accept allowed primitive types', () => {
      expect(() => SecurityValidator.validateValueType('string')).not.toThrow();
      expect(() => SecurityValidator.validateValueType(123)).not.toThrow();
      expect(() => SecurityValidator.validateValueType(true)).not.toThrow();
      expect(() => SecurityValidator.validateValueType(false)).not.toThrow();
    });

    test('should accept null', () => {
      expect(() => SecurityValidator.validateValueType(null)).not.toThrow();
    });

    test('should accept arrays', () => {
      expect(() => SecurityValidator.validateValueType([1, 2, 3])).not.toThrow();
      expect(() => SecurityValidator.validateValueType([])).not.toThrow();
      expect(() => SecurityValidator.validateValueType(['a', 'b'])).not.toThrow();
    });

    test('should accept plain objects', () => {
      expect(() => SecurityValidator.validateValueType({})).not.toThrow();
      expect(() => SecurityValidator.validateValueType({ key: 'value' })).not.toThrow();
    });

    test('should accept undefined', () => {
      expect(() => SecurityValidator.validateValueType(undefined)).not.toThrow();
    });

    test('should throw ValidationError for disallowed types', () => {
      expect(() => SecurityValidator.validateValueType(() => {})).toThrow(ValidationError);
      expect(() => SecurityValidator.validateValueType(new Date())).toThrow(ValidationError);
      expect(() => SecurityValidator.validateValueType(/regex/)).toThrow(ValidationError);
      expect(() => SecurityValidator.validateValueType(new Map())).toThrow(ValidationError);
      expect(() => SecurityValidator.validateValueType(new Set())).toThrow(ValidationError);
    });

    test('should throw ValidationError with correct message', () => {
      expect(() => SecurityValidator.validateValueType(() => {})).toThrow(ValidationError);
      expect(() => SecurityValidator.validateValueType(() => {})).toThrow(
        'Value type function is not allowed'
      );
    });
  });

  describe('SECURITY_CONFIG', () => {
    test('should have correct configuration values', () => {
      expect(SECURITY_CONFIG.MAX_EXPRESSION_LENGTH).toBe(1000);
      expect(SECURITY_CONFIG.MAX_PATH_DEPTH).toBe(10);
      expect(SECURITY_CONFIG.FORBIDDEN_PROPERTIES).toEqual(['__proto__', 'constructor', 'prototype']);
      expect(SECURITY_CONFIG.VALID_PATH_PATTERN).toBeInstanceOf(RegExp);
    });

    test('VALID_PATH_PATTERN should match valid paths', () => {
      const pattern = SECURITY_CONFIG.VALID_PATH_PATTERN;
      expect(pattern.test('name')).toBe(true);
      expect(pattern.test('user_name')).toBe(true);
      expect(pattern.test('userName')).toBe(true);
      expect(pattern.test('user.name')).toBe(true);
      expect(pattern.test('items[0]')).toBe(true);
      expect(pattern.test('users[0].name')).toBe(true);
    });

    test('VALID_PATH_PATTERN should reject invalid paths', () => {
      const pattern = SECURITY_CONFIG.VALID_PATH_PATTERN;
      expect(pattern.test('user-name')).toBe(false);
      expect(pattern.test('user@name')).toBe(false);
      expect(pattern.test('user name')).toBe(false);
      expect(pattern.test('123name')).toBe(false);
      expect(pattern.test('items[abc]')).toBe(false);
    });
  });
});