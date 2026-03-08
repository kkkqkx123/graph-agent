import { describe, it, expect } from 'vitest';
import { renderTemplate, renderTemplates, validateTemplateVariables } from './template-renderer';

describe('template-renderer', () => {
  describe('renderTemplate', () => {
    it('应该返回空字符串当模板为空', () => {
      expect(renderTemplate('', {})).toBe('');
    });

    it('应该返回原始模板当变量为空', () => {
      expect(renderTemplate('Hello {{name}}', {})).toBe('Hello {{name}}');
    });

    it('应该返回原始模板当变量为null', () => {
      expect(renderTemplate('Hello {{name}}', null as any)).toBe('Hello {{name}}');
    });

    it('应该返回原始模板当变量为undefined', () => {
      expect(renderTemplate('Hello {{name}}', undefined as any)).toBe('Hello {{name}}');
    });

    it('应该正确替换单个变量', () => {
      const result = renderTemplate('Hello, {{name}}!', { name: 'Alice' });
      expect(result).toBe('Hello, Alice!');
    });

    it('应该正确替换多个变量', () => {
      const result = renderTemplate('Hello, {{name}}! Today is {{date}}.', {
        name: 'Alice',
        date: '2024-01-01',
      });
      expect(result).toBe('Hello, Alice! Today is 2024-01-01.');
    });

    it('应该正确处理嵌套变量', () => {
      const result = renderTemplate('User: {{user.name}}, Age: {{user.age}}', {
        user: { name: 'Bob', age: 30 },
      });
      expect(result).toBe('User: Bob, Age: 30');
    });

    it('应该正确处理数组索引', () => {
      const result = renderTemplate('First item: {{items[0].name}}', {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });
      expect(result).toBe('First item: Item 1');
    });

    it('应该保留未定义的变量占位符', () => {
      const result = renderTemplate('Hello, {{name}}! {{missing}}', { name: 'Alice' });
      expect(result).toBe('Hello, Alice! {{missing}}');
    });

    it('应该保留null变量占位符', () => {
      const result = renderTemplate('Hello, {{name}}! {{nullVar}}', { name: 'Alice', nullVar: null });
      expect(result).toBe('Hello, Alice! {{nullVar}}');
    });

    it('应该处理变量名周围的空白字符', () => {
      const result = renderTemplate('Hello, {{ name }}!', { name: 'Alice' });
      expect(result).toBe('Hello, Alice!');
    });

    it('应该将数字转换为字符串', () => {
      const result = renderTemplate('Count: {{count}}', { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('应该将布尔值转换为字符串', () => {
      const result = renderTemplate('Active: {{active}}', { active: true });
      expect(result).toBe('Active: true');
    });

    it('应该将对象转换为字符串', () => {
      const result = renderTemplate('Data: {{data}}', { data: { key: 'value' } });
      expect(result).toBe('Data: [object Object]');
    });

    it('应该处理连续的占位符', () => {
      const result = renderTemplate('{{first}}{{second}}{{third}}', {
        first: 'A',
        second: 'B',
        third: 'C',
      });
      expect(result).toBe('ABC');
    });

    it('应该处理重复的变量', () => {
      const result = renderTemplate('{{name}} says hello to {{name}}', { name: 'Alice' });
      expect(result).toBe('Alice says hello to Alice');
    });

    it('应该处理空字符串变量值', () => {
      const result = renderTemplate('Hello, {{name}}!', { name: '' });
      expect(result).toBe('Hello, !');
    });

    it('应该处理0值', () => {
      const result = renderTemplate('Count: {{count}}', { count: 0 });
      expect(result).toBe('Count: 0');
    });

    it('应该处理false值', () => {
      const result = renderTemplate('Active: {{active}}', { active: false });
      expect(result).toBe('Active: false');
    });

    it('应该处理没有花括号的文本', () => {
      const result = renderTemplate('Hello, World!', { name: 'Alice' });
      expect(result).toBe('Hello, World!');
    });

    it('应该处理只有花括号没有变量名的情况', () => {
      const result = renderTemplate('Hello, {{}}!', { name: 'Alice' });
      expect(result).toBe('Hello, {{}}!');
    });
  });

  describe('renderTemplates', () => {
    it('应该批量渲染多个模板', () => {
      const templates = [
        'Hello, {{name}}!',
        'Goodbye, {{name}}!',
        'See you, {{name}}!',
      ];
      const result = renderTemplates(templates, { name: 'Alice' });
      expect(result).toEqual([
        'Hello, Alice!',
        'Goodbye, Alice!',
        'See you, Alice!',
      ]);
    });

    it('应该处理空数组', () => {
      const result = renderTemplates([], { name: 'Alice' });
      expect(result).toEqual([]);
    });

    it('应该处理混合的模板', () => {
      const templates = ['Hello, {{name}}!', 'Just text', 'Missing {{var}}'];
      const result = renderTemplates(templates, { name: 'Alice' });
      expect(result).toEqual(['Hello, Alice!', 'Just text', 'Missing {{var}}']);
    });
  });

  describe('validateTemplateVariables', () => {
    it('应该返回空数组当所有变量都存在', () => {
      const missing = validateTemplateVariables('Hello, {{name}}!', { name: 'Alice' });
      expect(missing).toEqual([]);
    });

    it('应该返回缺失的变量名', () => {
      const missing = validateTemplateVariables('Hello, {{name}}! {{missing}}', { name: 'Alice' });
      expect(missing).toEqual(['missing']);
    });

    it('应该返回多个缺失的变量名', () => {
      const missing = validateTemplateVariables('{{var1}} and {{var2}} and {{var3}}', { var1: 'value1' });
      expect(missing).toEqual(['var2', 'var3']);
    });

    it('应该检测嵌套变量', () => {
      const missing = validateTemplateVariables('{{user.name}}', { user: { age: 30 } });
      expect(missing).toEqual(['user.name']);
    });

    it('应该检测数组索引变量', () => {
      const missing = validateTemplateVariables('{{items[0].name}}', { items: [] });
      expect(missing).toEqual(['items[0].name']);
    });

    it('应该处理null值变量', () => {
      const missing = validateTemplateVariables('{{name}} and {{nullVar}}', { name: 'Alice', nullVar: null });
      expect(missing).toEqual(['nullVar']);
    });

    it('应该处理undefined值变量', () => {
      const missing = validateTemplateVariables('{{name}} and {{undefinedVar}}', { name: 'Alice', undefinedVar: undefined });
      expect(missing).toEqual(['undefinedVar']);
    });

    it('应该处理重复的变量', () => {
      const missing = validateTemplateVariables('{{name}} and {{name}}', {});
      expect(missing).toEqual(['name']);
    });

    it('应该处理空模板', () => {
      const missing = validateTemplateVariables('', { name: 'Alice' });
      expect(missing).toEqual([]);
    });

    it('应该处理没有占位符的模板', () => {
      const missing = validateTemplateVariables('Just plain text', { name: 'Alice' });
      expect(missing).toEqual([]);
    });

    it('应该处理变量名周围的空白字符', () => {
      const missing = validateTemplateVariables('{{ name }} and {{ missing }}', { name: 'Alice' });
      expect(missing).toEqual(['missing']);
    });

    it('应该处理0值变量', () => {
      const missing = validateTemplateVariables('{{count}}', { count: 0 });
      expect(missing).toEqual([]);
    });

    it('应该处理false值变量', () => {
      const missing = validateTemplateVariables('{{active}}', { active: false });
      expect(missing).toEqual([]);
    });

    it('应该处理空字符串变量', () => {
      const missing = validateTemplateVariables('{{name}}', { name: '' });
      expect(missing).toEqual([]);
    });
  });
});
