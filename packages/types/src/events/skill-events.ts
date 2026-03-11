/**
 * Skill 相关事件类型定义
 *
 * Skill 是静态资源集合（提示词 + 参考脚本 + 资源文件），
 * 应该被"加载"而不是"执行"。
 */

import type { BaseEvent } from './base.js';
import type { ID, Timestamp } from '../common.js';
import type { SkillResourceType } from '../skill.js';

/**
 * Skill 加载类型
 */
export type SkillLoadType = 'metadata' | 'content' | 'resources';

/**
 * Skill 加载开始事件
 */
export interface SkillLoadStartedEvent extends BaseEvent {
  type: 'SKILL_LOAD_STARTED';
  /** Skill 名称 */
  skillName: string;
  /** 加载类型 */
  loadType: SkillLoadType;
}

/**
 * Skill 加载完成事件
 */
export interface SkillLoadCompletedEvent extends BaseEvent {
  type: 'SKILL_LOAD_COMPLETED';
  /** Skill 名称 */
  skillName: string;
  /** 加载类型 */
  loadType: SkillLoadType;
  /** 是否成功 */
  success: boolean;
  /** 是否来自缓存 */
  cached: boolean;
  /** 加载时间（毫秒） */
  loadTime: number;
}

/**
 * Skill 加载失败事件
 */
export interface SkillLoadFailedEvent extends BaseEvent {
  type: 'SKILL_LOAD_FAILED';
  /** Skill 名称 */
  skillName: string;
  /** 加载类型 */
  loadType: SkillLoadType;
  /** 错误信息 */
  error: string;
  /** 加载时间（毫秒） */
  loadTime: number;
}

/**
 * Skill 事件联合类型
 */
export type SkillEvent =
  | SkillLoadStartedEvent
  | SkillLoadCompletedEvent
  | SkillLoadFailedEvent;

// ============================================================
// 向后兼容的类型别名（已弃用，将在未来版本移除）
// ============================================================

/**
 * @deprecated 使用 SkillLoadStartedEvent 代替
 * Skill 执行开始事件
 */
export type SkillExecutionStartedEvent = SkillLoadStartedEvent;

/**
 * @deprecated 使用 SkillLoadCompletedEvent 代替
 * Skill 执行完成事件
 */
export type SkillExecutionCompletedEvent = SkillLoadCompletedEvent;

/**
 * @deprecated 使用 SkillLoadFailedEvent 代替
 * Skill 执行失败事件
 */
export type SkillExecutionFailedEvent = SkillLoadFailedEvent;
