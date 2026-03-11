/**
 * Skill 注册表服务
 *
 * 负责 Skill 的发现、解析和管理
 * 遵循 Claude Code Skill 规范
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Skill,
  SkillMetadata,
  SkillConfig,
  SkillMatchResult,
  SkillParseError,
  SkillValidationError
} from '@modular-agent/types';
import { SkillParseError as SkillParseErrorClass, SkillValidationError as SkillValidationErrorClass } from '@modular-agent/types';

/**
 * Skill 注册表类
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private config: SkillConfig;
  private contentCache: Map<string, { content: string; timestamp: number }> = new Map();
  private resourceCache: Map<string, { content: string | Buffer; timestamp: number }> = new Map();

  constructor(config: SkillConfig) {
    this.config = {
      autoScan: true,
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * 初始化 Skill 注册表
   * 扫描所有配置的 Skill 目录
   */
  async initialize(): Promise<void> {
    if (!this.config.autoScan) {
      return;
    }

    for (const skillPath of this.config.paths) {
      await this.scanSkills(skillPath);
    }
  }

  /**
   * 扫描 Skill 目录
   * @param skillsPath Skill 目录路径
   */
  async scanSkills(skillsPath: string): Promise<void> {
    const absolutePath = path.resolve(skillsPath);

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillDir = path.join(absolutePath, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        try {
          await fs.access(skillMdPath);
          await this.loadSkill(skillDir);
        } catch {
          // 目录中没有 SKILL.md 文件，跳过
          continue;
        }
      }
    } catch (error) {
      // 目录不存在或无法访问，忽略
      console.warn(`Failed to scan skills directory: ${absolutePath}`, error);
    }
  }

  /**
   * 加载 Skill
   * @param skillDir Skill 目录路径
   * @throws SkillParseError 如果解析失败
   */
  private async loadSkill(skillDir: string): Promise<void> {
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const metadata = this.parseSkillMd(content, skillDir);

      // 验证目录名与 name 字段匹配
      const dirName = path.basename(skillDir);
      if (metadata.name !== dirName) {
        throw new SkillValidationErrorClass(
          metadata.name,
          `Skill directory name '${dirName}' does not match skill name '${metadata.name}'`
        );
      }

      const skill: Skill = {
        metadata,
        path: skillDir
      };

      this.skills.set(metadata.name, skill);
    } catch (error) {
      if (error instanceof SkillValidationErrorClass) {
        throw error;
      }

      throw new SkillParseErrorClass(
        skillDir,
        'Failed to parse SKILL.md',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 解析 SKILL.md 文件
   * @param content SKILL.md 文件内容
   * @param skillDir Skill 目录路径
   * @returns Skill 元数据
   * @throws SkillParseError 如果解析失败
   */
  private parseSkillMd(content: string, skillDir: string): SkillMetadata {
    // 提取 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch || !frontmatterMatch[1]) {
      throw new SkillParseErrorClass(skillDir, 'Missing YAML frontmatter');
    }

    const frontmatter = frontmatterMatch[1];

    try {
      // 简单的 YAML 解析（不依赖外部库）
      const metadata = this.parseYamlFrontmatter(frontmatter);

      // 验证必需字段
      if (!metadata['name']) {
        throw new SkillParseErrorClass(skillDir, 'Missing required field: name');
      }

      if (!metadata['description']) {
        throw new SkillParseErrorClass(skillDir, 'Missing required field: description');
      }

      // 验证 name 格式
      const name = metadata['name'] as string;
      if (!/^[a-z0-9-]+$/.test(name)) {
        throw new SkillParseErrorClass(
          skillDir,
          `Invalid skill name '${name}': must be lowercase alphanumeric with hyphens only`
        );
      }

      return {
        name: metadata['name'] as string,
        description: metadata['description'] as string,
        version: metadata['version'] as string | undefined,
        license: metadata['license'] as string | undefined,
        allowedTools: metadata['allowedTools'] as string[] | undefined,
        metadata: metadata['metadata'] as Record<string, string> | undefined
      };
    } catch (error) {
      if (error instanceof SkillParseErrorClass) {
        throw error;
      }

      throw new SkillParseErrorClass(
        skillDir,
        'Failed to parse YAML frontmatter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 简单的 YAML frontmatter 解析
   * @param yaml YAML 字符串
   * @returns 解析后的对象
   */
  private parseYamlFrontmatter(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');
    let currentKey = '';
    let inArray = false;
    let arrayKey = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // 数组项
      if (trimmed.startsWith('- ')) {
        if (inArray && arrayKey) {
          if (!result[arrayKey]) {
            result[arrayKey] = [];
          }
          result[arrayKey].push(trimmed.substring(2).trim());
        }
        continue;
      }

      // 键值对
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        // 检查是否是数组开始
        if (value === '' || value === '[]') {
          currentKey = key;
          arrayKey = key;
          inArray = true;
          if (value === '[]') {
            result[key] = [];
          }
        } else {
          // 解析值
          result[key] = this.parseYamlValue(value);
          inArray = false;
          currentKey = key;
        }
      }
    }

    return result;
  }

  /**
   * 解析 YAML 值
   * @param value YAML 值字符串
   * @returns 解析后的值
   */
  private parseYamlValue(value: string): any {
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 数字
    const num = Number(value);
    if (!isNaN(num)) return num;

    // null
    if (value === 'null' || value === '~') return null;

    // 默认为字符串
    return value;
  }

  /**
   * 获取所有 Skill 元数据
   * @returns Skill 元数据数组
   */
  getAllSkills(): SkillMetadata[] {
    return Array.from(this.skills.values()).map(skill => skill.metadata);
  }

  /**
   * 根据 name 获取 Skill
   * @param name Skill 名称
   * @returns Skill 或 undefined
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * 根据描述匹配 Skill
   * @param query 查询字符串
   * @returns 匹配结果数组
   */
  matchSkills(query: string): SkillMatchResult[] {
    const results: SkillMatchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const skill of this.skills.values()) {
      const score = this.calculateMatchScore(queryLower, skill.metadata);

      if (score > 0) {
        results.push({
          skill: skill.metadata,
          score,
          reason: `Description contains relevant keywords`
        });
      }
    }

    // 按分数降序排序
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算匹配分数
   * @param query 查询字符串（小写）
   * @param metadata Skill 元数据
   * @returns 匹配分数（0-1）
   */
  private calculateMatchScore(query: string, metadata: SkillMetadata): number {
    const description = metadata.description.toLowerCase();
    const name = metadata.name.toLowerCase();

    // 完全匹配名称
    if (query.includes(name)) {
      return 1.0;
    }

    // 部分匹配名称
    if (name.includes(query)) {
      return 0.8;
    }

    // 提取关键词
    const keywords = this.extractKeywords(description);
    const queryWords = query.split(/\s+/);

    let matchCount = 0;
    for (const word of queryWords) {
      if (keywords.some(keyword => keyword.includes(word) || word.includes(keyword))) {
        matchCount++;
      }
    }

    if (matchCount === 0) {
      return 0;
    }

    // 根据匹配关键词数量计算分数
    return Math.min(0.7, matchCount / queryWords.length * 0.7);
  }

  /**
   * 提取关键词
   * @param text 文本
   * @returns 关键词数组
   */
  private extractKeywords(text: string): string[] {
    // 移除常见停用词
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'when',
      'where', 'why', 'how', 'all', 'each', 'every', 'any', 'some', 'no',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^a-z0-9-]/g, ''))
      .filter(word => word.length > 0);
  }

  /**
   * 加载 Skill 完整内容
   * @param name Skill 名称
   * @returns SKILL.md 的 Markdown 主体内容
   */
  async loadSkillContent(name: string): Promise<string> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    // 检查缓存
    if (this.config.cacheEnabled && skill.content) {
      const cached = this.contentCache.get(name);
      if (cached && Date.now() - cached.timestamp < (this.config.cacheTTL || 300000)) {
        return cached.content;
      }
    }

    // 读取文件
    const skillMdPath = path.join(skill.path, 'SKILL.md');
    const content = await fs.readFile(skillMdPath, 'utf-8');

    // 移除 YAML frontmatter
    const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
    const body = bodyMatch && bodyMatch[1] ? bodyMatch[1].trim() : content;

    // 更新缓存
    if (this.config.cacheEnabled) {
      skill.content = body;
      this.contentCache.set(name, { content: body, timestamp: Date.now() });
    }

    return body;
  }

  /**
   * 加载 Skill 资源
   * @param name Skill 名称
   * @param resourceType 资源类型
   * @param resourcePath 资源路径（相对于资源目录）
   * @returns 资源内容
   */
  async loadSkillResource(
    name: string,
    resourceType: 'references' | 'examples' | 'scripts' | 'assets',
    resourcePath: string
  ): Promise<string | Buffer> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    const cacheKey = `${name}:${resourceType}:${resourcePath}`;

    // 检查缓存
    if (this.config.cacheEnabled) {
      const cached = this.resourceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.config.cacheTTL || 300000)) {
        return cached.content;
      }
    }

    // 读取文件
    const fullPath = path.join(skill.path, resourceType, resourcePath);
    const content = resourceType === 'assets'
      ? await fs.readFile(fullPath)
      : await fs.readFile(fullPath, 'utf-8');

    // 更新缓存
    if (this.config.cacheEnabled) {
      this.resourceCache.set(cacheKey, {
        content: content as string | Buffer,
        timestamp: Date.now()
      });
    }

    return content;
  }

  /**
   * 列出 Skill 的所有资源
   * @param name Skill 名称
   * @param resourceType 资源类型
   * @returns 资源路径数组
   */
  async listSkillResources(
    name: string,
    resourceType: 'references' | 'examples' | 'scripts' | 'assets'
  ): Promise<string[]> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    const resourceDir = path.join(skill.path, resourceType);

    try {
      const entries = await fs.readdir(resourceDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.contentCache.clear();
    this.resourceCache.clear();

    for (const skill of this.skills.values()) {
      skill.content = undefined;
      skill.references = undefined;
      skill.examples = undefined;
      skill.scripts = undefined;
      skill.assets = undefined;
    }
  }

  /**
   * 重新加载所有 Skill
   */
  async reload(): Promise<void> {
    this.skills.clear();
    this.clearCache();
    await this.initialize();
  }
}
