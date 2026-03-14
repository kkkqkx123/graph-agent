/**
 * Skill 类型定义
 *
 * 遵循 Claude Code Skill 规范
 * @see https://github.com/anthropics/claude-code
 */

/**
 * Skill 元数据
 *
 * 从 SKILL.md 的 YAML frontmatter 中解析
 */
export interface SkillMetadata {
  /**
   * Skill 名称
   * - 必须使用 hyphen-case（小写字母 + 连字符）
   * - 必须与包含 SKILL.md 的目录名匹配
   */
  name: string;

  /**
   * Skill 描述
   * - 描述 Skill 的功能和使用场景
   * - 用于 Skill 匹配和发现
   */
  description: string;

  /**
   * Skill 版本号（可选）
   */
  version?: string;

  /**
   * 许可证（可选）
   */
  license?: string;

  /**
   * 预批准的工具列表（可选）
   * - 当前仅在 Claude Code 中支持
   */
  allowedTools?: string[];

  /**
   * 自定义元数据（可选）
   * - 客户端可用于存储额外属性
   * - 建议使用合理的唯一键名以避免冲突
   */
  metadata?: Record<string, string>;
}

/**
 * Skill 资源类型
 */
export type SkillResourceType = 'references' | 'examples' | 'scripts' | 'assets';

/**
 * Skill 定义
 *
 * 表示一个完整的 Skill，包含元数据和内容
 */
export interface Skill {
  /**
   * Skill 元数据
   */
  metadata: SkillMetadata;

  /**
   * Skill 目录的绝对路径
   */
  path: string;

  /**
   * SKILL.md 的 Markdown 主体内容
   * - 不包含 YAML frontmatter
   * - 懒加载，仅在需要时填充
   */
  content?: string;

  /**
   * 参考文档
   * - 键：文件名（相对路径）
   * - 值：文件内容
   * - 懒加载
   */
  references?: Record<string, string>;

  /**
   * 示例代码
   * - 键：文件名（相对路径）
   * - 值：文件内容
   * - 懒加载
   */
  examples?: Record<string, string>;

  /**
   * 工具脚本
   * - 键：文件名（相对路径）
   * - 值：文件内容
   * - 懒加载
   */
  scripts?: Record<string, string>;

  /**
   * 资源文件
   * - 键：文件名（相对路径）
   * - 值：文件内容或 Buffer
   * - 懒加载
   */
  assets?: Record<string, string | Buffer>;
}

/**
 * Skill 配置
 *
 * 用于配置 Skill 系统的行为
 */
export interface SkillConfig {
  /**
   * Skill 目录路径列表
   * - 支持多个目录
   * - 支持相对路径和绝对路径
   */
  paths: string[];

  /**
   * 是否自动扫描 Skill 目录
   * - 默认：true
   */
  autoScan?: boolean;

  /**
   * 是否启用缓存
   * - 默认：true
   */
  cacheEnabled?: boolean;

  /**
   * 缓存过期时间（毫秒）
   * - 默认：300000（5分钟）
   */
  cacheTTL?: number;
}

/**
 * Skill 匹配结果
 */
export interface SkillMatchResult {
  /**
   * 匹配的 Skill 元数据
   */
  skill: SkillMetadata;

  /**
   * 匹配分数
   * - 范围：0-1
   * - 越高表示匹配度越高
   */
  score: number;

  /**
   * 匹配原因
   */
  reason: string;
}

/**
 * Skill 加载上下文
 */
export interface SkillLoadContext {
  /**
   * 要加载的 Skill
   */
  skill: Skill;

  /**
   * Agent 上下文
   * - 用于访问 Agent 的状态和资源
   */
  agentContext?: any;

  /**
   * 变量
   * - 用于 Skill 加载时的变量替换
   */
  variables?: Record<string, any>;

  /**
   * 可用的工具列表
   * - 用于权限验证
   */
  tools?: string[];
}

/**
 * Skill 加载结果
 */
export interface SkillLoadResult {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * Skill 内容
   */
  content?: string;

  /**
   * 结果数据
   */
  data?: any;

  /**
   * 错误信息
   */
  error?: Error;

  /**
   * 加载时间（毫秒）
   */
  loadTime?: number;

  /**
   * 是否来自缓存
   */
  cached?: boolean;
}

// ============================================================
// 向后兼容的类型别名（已弃用，将在未来版本移除）
// ============================================================

/**
 * @deprecated 使用 SkillLoadContext 代替
 * Skill 执行上下文
 */
export type SkillExecutionContext = SkillLoadContext;

/**
 * @deprecated 使用 SkillLoadResult 代替
 * Skill 执行结果
 */
export type SkillExecutionResult = SkillLoadResult;

/**
 * Skill 解析错误
 */
export class SkillParseError extends Error {
  constructor(
    public readonly skillPath: string,
    public readonly reason: string,
    public readonly originalError?: Error
  ) {
    super(`Failed to parse skill at ${skillPath}: ${reason}`);
    this.name = 'SkillParseError';
  }
}

/**
 * Skill 验证错误
 */
export class SkillValidationError extends Error {
  constructor(
    public readonly skillName: string,
    public readonly reason: string
  ) {
    super(`Skill validation failed for ${skillName}: ${reason}`);
    this.name = 'SkillValidationError';
  }
}
