/**
 * 提示词状态枚举
 */

export enum PromptStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated'
}

/**
 * 获取提示词状态的显示名称
 */
export function getPromptStatusDisplayName(status: PromptStatus): string {
  const displayNames: Record<PromptStatus, string> = {
    [PromptStatus.ACTIVE]: '活跃',
    [PromptStatus.INACTIVE]: '未激活',
    [PromptStatus.DRAFT]: '草稿',
    [PromptStatus.ARCHIVED]: '已归档',
    [PromptStatus.DEPRECATED]: '已弃用'
  };
  return displayNames[status] || status;
}

/**
 * 检查状态是否为活跃
 */
export function isActiveStatus(status: PromptStatus): boolean {
  return status === PromptStatus.ACTIVE;
}