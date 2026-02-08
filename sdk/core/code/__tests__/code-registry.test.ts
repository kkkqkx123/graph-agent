/**
 * CodeRegistry 单元测试
 */

import { CodeRegistry } from '../code-registry';
import { ScriptType } from '../../../types/code';
import { ValidationError, NotFoundError } from '../../../types/errors';

describe('CodeRegistry', () => {
  let registry: CodeRegistry;

  beforeEach(() => {
    registry = new CodeRegistry();
  });

  const createValidScript = (name: string, type: ScriptType = ScriptType.SHELL) => ({
    id: `script-${name}`,
    name,
    type,
    description: `Test script ${name}`,
    content: 'echo "Hello World"',
    enabled: true,
    options: {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      workingDirectory: '/tmp',
      environment: { TEST_VAR: 'test' },
      sandbox: false
    },
    metadata: {
      category: 'test',
      tags: ['test', 'script'],
      author: 'test-author',
      version: '1.0.0'
    }
  });

  const createValidScriptWithFilePath = (name: string, type: ScriptType = ScriptType.SHELL) => ({
    id: `script-${name}`,
    name,
    type,
    description: `Test script ${name}`,
    filePath: '/path/to/script.sh',
    enabled: true,
    options: {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    metadata: {
      category: 'test',
      tags: ['test', 'script']
    }
  });

  describe('register - 注册脚本定义', () => {
    it('应该成功注册有效的脚本定义', () => {
      const script = createValidScript('test-script');

      expect(() => registry.register(script)).not.toThrow();
      expect(registry.has('test-script')).toBe(true);
    });

    it('应该成功注册包含文件路径的脚本定义', () => {
      const script = createValidScriptWithFilePath('file-script');

      expect(() => registry.register(script)).not.toThrow();
      expect(registry.has('file-script')).toBe(true);
    });

    it('应该抛出 ValidationError 当脚本名称已存在', () => {
      const script = createValidScript('test-script');

      registry.register(script);

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('already exists');
    });

    it('应该抛出 ValidationError 当脚本名称为空', () => {
      const script = createValidScript('test-script');
      script.name = '';

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script name is required');
    });

    it('应该抛出 ValidationError 当脚本名称为非字符串', () => {
      const script = createValidScript('test-script');
      (script as any).name = 123;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script name is required and must be a string');
    });

    it('应该抛出 ValidationError 当脚本类型为空', () => {
      const script = createValidScript('test-script');
      script.type = '' as any;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script type is required and must be a string');
    });

    it('应该抛出 ValidationError 当脚本描述为空', () => {
      const script = createValidScript('test-script');
      script.description = '';

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script description is required and must be a string');
    });

    it('应该抛出 ValidationError 当脚本内容和文件路径都为空', () => {
      const script = createValidScript('test-script');
      delete (script as any).content;
      delete (script as any).filePath;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script must have either content or filePath');
    });

    it('应该抛出 ValidationError 当脚本选项为空', () => {
      const script = createValidScript('test-script');
      script.options = undefined as any;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script options are required');
    });

    it('应该抛出 ValidationError 当超时时间为负数', () => {
      const script = createValidScript('test-script');
      script.options.timeout = -1;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script timeout must be a positive number');
    });

    it('应该抛出 ValidationError 当重试次数为负数', () => {
      const script = createValidScript('test-script');
      script.options.retries = -1;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script retries must be a non-negative number');
    });

    it('应该抛出 ValidationError 当重试延迟为负数', () => {
      const script = createValidScript('test-script');
      script.options.retryDelay = -1;

      expect(() => {
        registry.register(script);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(script);
      }).toThrow('Script retryDelay must be a non-negative number');
    });
  });

  describe('registerBatch - 批量注册脚本', () => {
    it('应该成功批量注册多个脚本', () => {
      const scripts = [
        createValidScript('script-1'),
        createValidScript('script-2'),
        createValidScript('script-3')
      ];

      registry.registerBatch(scripts);

      expect(registry.size()).toBe(3);
      expect(registry.has('script-1')).toBe(true);
      expect(registry.has('script-2')).toBe(true);
      expect(registry.has('script-3')).toBe(true);
    });

    it('应该在第一个无效脚本时停止注册', () => {
      const scripts = [
        createValidScript('script-1'),
        {
          ...createValidScript('script-2'),
          name: '' // 无效的脚本名称
        },
        createValidScript('script-3')
      ];

      expect(() => {
        registry.registerBatch(scripts);
      }).toThrow(ValidationError);

      // 只有第一个脚本应该被注册
      expect(registry.size()).toBe(1);
      expect(registry.has('script-1')).toBe(true);
      expect(registry.has('script-2')).toBe(false);
      expect(registry.has('script-3')).toBe(false);
    });
  });

  describe('get - 获取脚本定义', () => {
    it('应该返回已注册的脚本定义', () => {
      const script = createValidScript('test-script');

      registry.register(script);

      const result = registry.get('test-script');

      expect(result).toEqual(script);
    });

    it('应该返回 undefined 当脚本不存在', () => {
      const result = registry.get('non-existent-script');

      expect(result).toBeUndefined();
    });
  });

  describe('has - 检查脚本是否存在', () => {
    it('应该返回 true 当脚本存在', () => {
      const script = createValidScript('test-script');

      registry.register(script);

      expect(registry.has('test-script')).toBe(true);
    });

    it('应该返回 false 当脚本不存在', () => {
      expect(registry.has('non-existent-script')).toBe(false);
    });
  });

  describe('remove - 删除脚本定义', () => {
    it('应该成功删除脚本定义', () => {
      const script = createValidScript('test-script');

      registry.register(script);
      registry.remove('test-script');

      expect(registry.has('test-script')).toBe(false);
      expect(registry.get('test-script')).toBeUndefined();
    });

    it('应该抛出 NotFoundError 当删除不存在的脚本', () => {
      expect(() => {
        registry.remove('non-existent-script');
      }).toThrow(NotFoundError);
      expect(() => {
        registry.remove('non-existent-script');
      }).toThrow('Script \'non-existent-script\' not found');
    });
  });

  describe('list - 列出所有脚本', () => {
    it('应该返回所有已注册的脚本', () => {
      const scripts = [
        createValidScript('script-1'),
        createValidScript('script-2')
      ];

      registry.registerBatch(scripts);

      const result = registry.list();

      expect(result).toHaveLength(2);
      expect(result.map(s => s.name)).toContain('script-1');
      expect(result.map(s => s.name)).toContain('script-2');
    });

    it('应该返回空数组当没有脚本', () => {
      const result = registry.list();

      expect(result).toEqual([]);
    });
  });

  describe('listByType - 按类型列出脚本', () => {
    it('应该返回指定类型的脚本', () => {
      const scripts = [
        createValidScript('script-1', ScriptType.SHELL),
        createValidScript('script-2', ScriptType.POWERSHELL),
        createValidScript('script-3', ScriptType.SHELL)
      ];

      registry.registerBatch(scripts);

      const shellScripts = registry.listByType(ScriptType.SHELL);

      expect(shellScripts).toHaveLength(2);
      expect(shellScripts.map(s => s.name)).toContain('script-1');
      expect(shellScripts.map(s => s.name)).toContain('script-3');
    });

    it('应该返回空数组当没有匹配类型的脚本', () => {
      const result = registry.listByType(ScriptType.PYTHON);

      expect(result).toEqual([]);
    });
  });

  describe('listByCategory - 按分类列出脚本', () => {
    it('应该返回指定分类的脚本', () => {
      const scripts = [
        {
          ...createValidScript('script-1'),
          metadata: { category: 'ai' }
        },
        {
          ...createValidScript('script-2'),
          metadata: { category: 'ai' }
        },
        {
          ...createValidScript('script-3'),
          metadata: { category: 'utility' }
        }
      ];

      registry.registerBatch(scripts);

      const aiScripts = registry.listByCategory('ai');

      expect(aiScripts).toHaveLength(2);
      expect(aiScripts.map(s => s.name)).toContain('script-1');
      expect(aiScripts.map(s => s.name)).toContain('script-2');
    });

    it('应该返回空数组当没有匹配分类的脚本', () => {
      const result = registry.listByCategory('non-existent-category');

      expect(result).toEqual([]);
    });

    it('应该返回空数组当脚本没有元数据', () => {
      const script = createValidScript('script-1');
      delete (script as any).metadata;
      registry.register(script);

      const result = registry.listByCategory('ai');

      expect(result).toEqual([]);
    });
  });

  describe('clear - 清空所有脚本', () => {
    it('应该清空所有脚本定义', () => {
      const scripts = [
        createValidScript('script-1'),
        createValidScript('script-2')
      ];

      registry.registerBatch(scripts);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('size - 获取脚本数量', () => {
    it('应该返回已注册的脚本数量', () => {
      const scripts = [
        createValidScript('script-1'),
        createValidScript('script-2')
      ];

      registry.registerBatch(scripts);

      expect(registry.size()).toBe(2);
    });

    it('应该返回 0 当没有脚本', () => {
      expect(registry.size()).toBe(0);
    });
  });

  describe('validate - 验证脚本定义', () => {
    it('应该返回 true 当脚本有效', () => {
      const script = createValidScript('test-script');

      const result = registry.validate(script);

      expect(result).toBe(true);
    });

    it('应该抛出 ValidationError 当脚本无效', () => {
      const invalidScript = {
        ...createValidScript('test-script'),
        name: ''
      };

      expect(() => {
        registry.validate(invalidScript);
      }).toThrow(ValidationError);
    });
  });

  describe('search - 搜索脚本', () => {
    it('应该根据关键词搜索脚本', () => {
      const scripts = [
        createValidScript('ai-script'),
        createValidScript('data-processing'),
        createValidScript('test-script')
      ];

      registry.registerBatch(scripts);

      const result = registry.search('ai');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('ai-script');
    });

    it('应该不区分大小写', () => {
      const script = createValidScript('AI-Script');

      registry.register(script);

      const result = registry.search('ai');

      expect(result).toHaveLength(1);
    });

    it('应该搜索名称、描述、标签和分类', () => {
      const script = createValidScript('test-script');
      script.description = 'AI powered script';
      script.metadata = {
        category: 'ai-tools',
        tags: ['machine-learning', 'ai'],
        author: 'test-author',
        version: '1.0.0'
      };

      registry.register(script);

      expect(registry.search('ai')).toHaveLength(1);
      expect(registry.search('machine')).toHaveLength(1);
      expect(registry.search('tools')).toHaveLength(1);
    });

    it('应该返回空数组当没有匹配的脚本', () => {
      const result = registry.search('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('update - 更新脚本定义', () => {
    it('应该成功更新脚本定义', () => {
      const script = createValidScript('test-script');

      registry.register(script);

      const updates = {
        description: 'Updated description',
        options: {
          ...script.options,
          timeout: 10000
        }
      };

      registry.update('test-script', updates);

      const result = registry.get('test-script');
      expect(result?.description).toBe('Updated description');
      expect(result?.options.timeout).toBe(10000);
    });

    it('应该抛出 NotFoundError 当脚本不存在', () => {
      const updates = {
        description: 'Updated description'
      };

      expect(() => {
        registry.update('non-existent-script', updates);
      }).toThrow(NotFoundError);
      expect(() => {
        registry.update('non-existent-script', updates);
      }).toThrow('Script \'non-existent-script\' not found');
    });

    it('应该抛出 ValidationError 当更新后的脚本无效', () => {
      const script = createValidScript('test-script');

      registry.register(script);

      const updates = {
        name: '' // 无效的名称
      };

      expect(() => {
        registry.update('test-script', updates);
      }).toThrow(ValidationError);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的脚本生命周期', () => {
      // 1. 注册脚本
      const script = createValidScript('test-script');

      registry.register(script);
      expect(registry.has('test-script')).toBe(true);

      // 2. 获取脚本
      const retrieved = registry.get('test-script');
      expect(retrieved).toEqual(script);

      // 3. 更新脚本
      const updates = {
        description: 'Updated description',
        metadata: {
          ...script.metadata,
          tags: ['updated', 'script']
        }
      };
      registry.update('test-script', updates);

      const updated = registry.get('test-script');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.metadata?.tags).toEqual(['updated', 'script']);

      // 4. 搜索脚本
      const searchResults = registry.search('updated');
      expect(searchResults).toHaveLength(1);

      // 5. 按类型列出脚本
      const shellScripts = registry.listByType(ScriptType.SHELL);
      expect(shellScripts).toHaveLength(1);

      // 6. 删除脚本
      registry.remove('test-script');
      expect(registry.has('test-script')).toBe(false);
    });

    it('应该支持批量操作', () => {
      const scripts = [
        createValidScript('script-1'),
        createValidScript('script-2'),
        createValidScript('script-3')
      ];

      // 批量注册
      registry.registerBatch(scripts);
      expect(registry.size()).toBe(3);

      // 批量列出
      const allScripts = registry.list();
      expect(allScripts).toHaveLength(3);

      // 按分类列出
      const testScripts = registry.listByCategory('test');
      expect(testScripts).toHaveLength(3);

      // 清空
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});