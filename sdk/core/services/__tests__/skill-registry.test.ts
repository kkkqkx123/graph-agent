/**
 * SkillRegistry 单元测试
 * 测试 Skill 的发现、解析和管理功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillRegistry } from '../skill-registry.js';
import type { SkillConfig } from '@modular-agent/types';
import { SkillParseError, SkillValidationError } from '@modular-agent/types';

// Mock fs module
vi.mock('fs/promises');

describe('SkillRegistry', () => {
  let registry: SkillRegistry;
  let mockFs: any;

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    const config: SkillConfig = {
      paths: ['/test/skills'],
      autoScan: false, // 禁用自动扫描，手动控制测试
      cacheEnabled: true,
      cacheTTL: 300000
    };
    registry = new SkillRegistry(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSkillMd', () => {
    it('should parse valid SKILL.md with required fields', async () => {
      const skillMdContent = `---
name: test-skill
description: A test skill for testing
---
# Test Skill

This is a test skill.`;

      // 创建临时目录结构
      mockFs.readdir.mockResolvedValue([
        { name: 'test-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');

      const skills = registry.getAllSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('test-skill');
      expect(skills[0].description).toBe('A test skill for testing');
    });

    it('should parse SKILL.md with optional fields', async () => {
      const skillMdContent = `---
name: advanced-skill
description: An advanced skill
version: 1.0.0
license: MIT
allowedTools:
  - tool1
  - tool2
metadata:
  author: test-author
  category: testing
---
# Advanced Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'advanced-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');

      const skills = registry.getAllSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].version).toBe('1.0.0');
      expect(skills[0].license).toBe('MIT');
      expect(skills[0].allowedTools).toEqual(['tool1', 'tool2']);
      expect(skills[0].metadata).toEqual({
        author: 'test-author',
        category: 'testing'
      });
    });

    it('should throw error when name field is missing', async () => {
      const skillMdContent = `---
description: A skill without name
---
# Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'invalid-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await expect(registry.scanSkills('/test/skills')).rejects.toThrow(SkillParseError);
    });

    it('should throw error when description field is missing', async () => {
      const skillMdContent = `---
name: no-desc-skill
---
# Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'no-desc-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await expect(registry.scanSkills('/test/skills')).rejects.toThrow(SkillParseError);
    });

    it('should throw error when directory name does not match skill name', async () => {
      const skillMdContent = `---
name: different-name
description: A skill with mismatched name
---
# Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'wrong-dir-name', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await expect(registry.scanSkills('/test/skills')).rejects.toThrow(SkillValidationError);
    });

    it('should throw error for invalid skill name format', async () => {
      const skillMdContent = `---
name: Invalid_Name
description: A skill with invalid name
---
# Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'Invalid_Name', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await expect(registry.scanSkills('/test/skills')).rejects.toThrow(SkillParseError);
    });
  });

  describe('getSkill', () => {
    it('should return skill by name', async () => {
      const skillMdContent = `---
name: my-skill
description: My skill
---
# My Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'my-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');

      const skill = registry.getSkill('my-skill');
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('my-skill');
    });

    it('should return undefined for non-existent skill', () => {
      const skill = registry.getSkill('non-existent');
      expect(skill).toBeUndefined();
    });
  });

  describe('matchSkills', () => {
    beforeEach(async () => {
      const skill1 = `---
name: coding-patterns
description: This skill should be used when the user asks about coding patterns, best practices, or code architecture
---
# Coding Patterns`;

      const skill2 = `---
name: workflow-design
description: This skill should be used when the user asks to create a workflow or design a workflow
---
# Workflow Design`;

      const skill3 = `---
name: testing-strategies
description: This skill provides testing strategies and test patterns
---
# Testing Strategies`;

      mockFs.readdir.mockResolvedValue([
        { name: 'coding-patterns', isDirectory: () => true },
        { name: 'workflow-design', isDirectory: () => true },
        { name: 'testing-strategies', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce(skill1)
        .mockResolvedValueOnce(skill2)
        .mockResolvedValueOnce(skill3);

      await registry.scanSkills('/test/skills');
    });

    it('should match skills by name', () => {
      const results = registry.matchSkills('coding-patterns');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].skill.name).toBe('coding-patterns');
      expect(results[0].score).toBe(1.0);
    });

    it('should match skills by description keywords', () => {
      const results = registry.matchSkills('create a workflow');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.skill.name === 'workflow-design')).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = registry.matchSkills('xyz123nonexistent');
      expect(results).toEqual([]);
    });

    it('should sort results by score descending', () => {
      const results = registry.matchSkills('workflow patterns');
      expect(results.length).toBeGreaterThan(0);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('loadSkillContent', () => {
    it('should load skill content without frontmatter', async () => {
      const skillMdContent = `---
name: test-skill
description: Test skill
---
# Test Skill

This is the body content.

## Section 1
Some content here.`;

      mockFs.readdir.mockResolvedValue([
        { name: 'test-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');
      const content = await registry.loadSkillContent('test-skill');

      expect(content).not.toContain('---');
      expect(content).toContain('# Test Skill');
      expect(content).toContain('This is the body content.');
    });

    it('should cache skill content', async () => {
      const skillMdContent = `---
name: cached-skill
description: Cached skill
---
# Cached Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'cached-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');

      // 第一次加载
      await registry.loadSkillContent('cached-skill');
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // 1 for scan, 1 for load

      // 第二次加载应该使用缓存
      mockFs.readFile.mockClear();
      await registry.loadSkillContent('cached-skill');
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent skill', async () => {
      await expect(registry.loadSkillContent('non-existent')).rejects.toThrow(
        "Skill 'non-existent' not found"
      );
    });
  });

  describe('loadSkillResource', () => {
    beforeEach(async () => {
      const skillMdContent = `---
name: resource-skill
description: Skill with resources
---
# Resource Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'resource-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');
    });

    it('should load reference resource', async () => {
      const referenceContent = '# Reference Document\n\nThis is a reference.';
      mockFs.readFile.mockResolvedValue(referenceContent);

      const content = await registry.loadSkillResource(
        'resource-skill',
        'references',
        'guide.md'
      );

      expect(content).toBe(referenceContent);
    });

    it('should load example resource', async () => {
      const exampleContent = '```typescript\nconst x = 1;\n```';
      mockFs.readFile.mockResolvedValue(exampleContent);

      const content = await registry.loadSkillResource(
        'resource-skill',
        'examples',
        'example.ts'
      );

      expect(content).toBe(exampleContent);
    });

    it('should load script resource', async () => {
      const scriptContent = 'console.log("Hello");';
      mockFs.readFile.mockResolvedValue(scriptContent);

      const content = await registry.loadSkillResource(
        'resource-skill',
        'scripts',
        'helper.js'
      );

      expect(content).toBe(scriptContent);
    });

    it('should load asset as buffer', async () => {
      const assetBuffer = Buffer.from('binary data');
      mockFs.readFile.mockResolvedValue(assetBuffer);

      const content = await registry.loadSkillResource(
        'resource-skill',
        'assets',
        'image.png'
      );

      expect(content).toBeInstanceOf(Buffer);
    });
  });

  describe('listSkillResources', () => {
    beforeEach(async () => {
      const skillMdContent = `---
name: list-skill
description: Skill for listing
---
# List Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'list-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');
    });

    it('should list all resources in a directory', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'ref1.md', isFile: () => true },
        { name: 'ref2.md', isFile: () => true },
        { name: 'subdir', isFile: () => false }
      ] as any);

      const resources = await registry.listSkillResources('list-skill', 'references');

      expect(resources).toEqual(['ref1.md', 'ref2.md']);
    });

    it('should return empty array if directory does not exist', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const resources = await registry.listSkillResources('list-skill', 'examples');

      expect(resources).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      const skillMdContent = `---
name: cache-skill
description: Cache test
---
# Cache Skill`;

      mockFs.readdir.mockResolvedValue([
        { name: 'cache-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(skillMdContent);

      await registry.scanSkills('/test/skills');
      await registry.loadSkillContent('cache-skill');

      registry.clearCache();

      const skill = registry.getSkill('cache-skill');
      expect(skill?.content).toBeUndefined();
    });
  });

  describe('reload', () => {
    it('should reload all skills', async () => {
      const skillMdContent1 = `---
name: reload-skill
description: Before reload
---
# Before`;

      const skillMdContent2 = `---
name: reload-skill
description: After reload
---
# After`;

      mockFs.readdir.mockResolvedValue([
        { name: 'reload-skill', isDirectory: () => true }
      ] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValueOnce(skillMdContent1);

      await registry.scanSkills('/test/skills');

      let skills = registry.getAllSkills();
      expect(skills[0].description).toBe('Before reload');

      // 模拟文件更新
      mockFs.readFile.mockResolvedValue(skillMdContent2);

      await registry.reload();

      skills = registry.getAllSkills();
      expect(skills[0].description).toBe('After reload');
    });
  });
});
