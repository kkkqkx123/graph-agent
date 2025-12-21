import { ValidationUtils, ValidationResult, ValidationRule } from '../validation-utils';

describe('ValidationUtils', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      const result = ValidationUtils.required('test', 'fieldName');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for null values', () => {
      const result = ValidationUtils.required(null, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能为空');
    });

    it('should fail for undefined values', () => {
      const result = ValidationUtils.required(undefined, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能为空');
    });

    it('should fail for empty strings', () => {
      const result = ValidationUtils.required('', 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能为空');
    });

    it('should use default field name', () => {
      const result = ValidationUtils.required(null);
      expect(result.errors).toContain('字段不能为空');
    });
  });

  describe('length', () => {
    it('should pass for valid string length', () => {
      const result = ValidationUtils.length('hello', 3, 10, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for string too short', () => {
      const result = ValidationUtils.length('hi', 3, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName长度不能少于3个字符');
    });

    it('should fail for string too long', () => {
      const result = ValidationUtils.length('hello world', 3, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName长度不能超过10个字符');
    });

    it('should fail for non-string values', () => {
      const result = ValidationUtils.length('123', 3, 10, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should work with only minimum constraint', () => {
      const result = ValidationUtils.length('hello', 3, undefined, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should work with only maximum constraint', () => {
      const result = ValidationUtils.length('hello', undefined, 10, 'fieldName');
      expect(result.isValid).toBe(true);
    });
  });

  describe('range', () => {
    it('should pass for numbers within range', () => {
      const result = ValidationUtils.range(5, 1, 10, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for numbers below minimum', () => {
      const result = ValidationUtils.range(0, 1, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能小于1');
    });

    it('should fail for numbers above maximum', () => {
      const result = ValidationUtils.range(15, 1, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能大于10');
    });

    it('should fail for non-number values', () => {
      const result = ValidationUtils.range(0, 1, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName不能小于1');
    });

    it('should fail for NaN', () => {
      const result = ValidationUtils.range(NaN, 1, 10, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName必须是有效数字');
    });
  });

  describe('email', () => {
    it('should pass for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const result = ValidationUtils.email(email, 'fieldName');
        expect(result.isValid).toBe(true);
      });
    });

    it('should fail for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com'
      ];

      invalidEmails.forEach(email => {
        const result = ValidationUtils.email(email, 'fieldName');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('fieldName格式不正确');
      });
    });

    it('should fail for non-string values', () => {
      const result = ValidationUtils.email('123', 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName格式不正确');
    });
  });

  describe('url', () => {
    it('should pass for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://subdomain.example.com/path',
        'ftp://example.com/file.txt'
      ];

      validUrls.forEach(url => {
        const result = ValidationUtils.url(url, 'fieldName');
        expect(result.isValid).toBe(true);
      });
    });

    it('should fail for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com',
        'http://',
        '://missing-protocol.com'
      ];

      invalidUrls.forEach(url => {
        const result = ValidationUtils.url(url, 'fieldName');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('fieldName格式不正确');
      });
    });

    it('should fail for non-string values', () => {
      const result = ValidationUtils.url('123', 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName格式不正确');
    });
  });

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      const result = ValidationUtils.pattern('ABC123', /^[A-Z]{3}\d{3}$/, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for non-matching patterns', () => {
      const result = ValidationUtils.pattern('abc123', /^[A-Z]{3}\d{3}$/, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName格式不正确');
    });

    it('should fail for non-string values', () => {
      const result = ValidationUtils.pattern('123', /pattern/, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName格式不正确');
    });
  });

  describe('enum', () => {
    it('should pass for valid enum values', () => {
      const colors = ['red', 'green', 'blue'];
      const result = ValidationUtils.enum('red', colors, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid enum values', () => {
      const colors = ['red', 'green', 'blue'];
      const result = ValidationUtils.enum('yellow', colors, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName必须是有效值');
    });
  });

  describe('array', () => {
    it('should pass for valid arrays', () => {
      const result = ValidationUtils.array([1, 2, 3], 2, 5, 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for non-array values', () => {
      const result = ValidationUtils.array('not an array', 2, 5, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName必须是数组');
    });

    it('should fail for arrays too short', () => {
      const result = ValidationUtils.array([1], 2, 5, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName至少需要2个元素');
    });

    it('should fail for arrays too long', () => {
      const result = ValidationUtils.array([1, 2, 3, 4, 5, 6], 2, 5, 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName最多只能有5个元素');
    });
  });

  describe('object', () => {
    it('should pass for valid objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = ValidationUtils.object(obj, ['name'], 'fieldName');
      expect(result.isValid).toBe(true);
    });

    it('should fail for non-object values', () => {
      const result = ValidationUtils.object('not an object', ['name'], 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName必须是对象');
    });

    it('should fail for arrays', () => {
      const result = ValidationUtils.object([1, 2, 3], ['name'], 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName必须是对象');
    });

    it('should fail for missing required keys', () => {
      const obj = { value: 123 };
      const result = ValidationUtils.object(obj, ['name', 'value'], 'fieldName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fieldName缺少必需字段: name');
    });

    it('should pass when all required keys are present', () => {
      const obj = { name: 'test', value: 123 };
      const result = ValidationUtils.object(obj, ['name', 'value'], 'fieldName');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAll', () => {
    it('should combine multiple validation results', () => {
      const validation1: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['warning1']
      };

      const validation2: ValidationResult = {
        isValid: false,
        errors: ['error1', 'error2'],
        warnings: ['warning2']
      };

      const result = ValidationUtils.validateAll([validation1, validation2]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['error1', 'error2']);
      expect(result.warnings).toEqual(['warning1', 'warning2']);
    });

    it('should pass when all validations pass', () => {
      const validation1: ValidationResult = { isValid: true, errors: [], warnings: [] };
      const validation2: ValidationResult = { isValid: true, errors: [], warnings: [] };

      const result = ValidationUtils.validateAll([validation1, validation2]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateWithRules', () => {
    it('should validate using custom rules', () => {
      const rules: ValidationRule<string>[] = [
        {
          name: 'minLength',
          validate: (value) => value.length >= 5,
          message: '字符串长度至少为5'
        },
        {
          name: 'containsNumber',
          validate: (value) => /\d/.test(value),
          message: '必须包含数字'
        }
      ];

      const result = ValidationUtils.validateWithRules('test123', rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when rules return false', () => {
      const rules: ValidationRule<string>[] = [
        {
          name: 'minLength',
          validate: (value) => value.length >= 5,
          message: '字符串长度至少为5'
        }
      ];

      const result = ValidationUtils.validateWithRules('test', rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('字符串长度至少为5');
    });

    it('should use custom error messages', () => {
      const rules: ValidationRule<string>[] = [
        {
          name: 'customRule',
          validate: (value) => value === 'expected',
          message: '值必须是expected'
        }
      ];

      const result = ValidationUtils.validateWithRules('wrong', rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('值必须是expected');
    });

    it('should use rule name when no custom message', () => {
      const rules: ValidationRule<string>[] = [
        {
          name: 'customRule',
          validate: (value) => value === 'expected'
        }
      ];

      const result = ValidationUtils.validateWithRules('wrong', rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('验证规则 customRule 失败');
    });
  });

  describe('createRule', () => {
    it('should create custom validation rule', () => {
      const rule = ValidationUtils.createRule(
        'positiveNumber',
        (value: number) => value > 0,
        '数字必须为正数'
      );

      expect(rule.name).toBe('positiveNumber');
      expect(rule.validate(5)).toBe(true);
      expect(rule.validate(-1)).toBe(false);
      expect(rule.message).toBe('数字必须为正数');
    });
  });
});