/**
 * 提示词类型枚举
 */

export enum PromptType {
  SYSTEM = 'system',
  RULES = 'rules',
  USER_COMMAND = 'user_command',
  CONTEXT = 'context',
  EXAMPLES = 'examples',
  CONSTRAINTS = 'constraints',
  FORMAT = 'format',
  CUSTOM = 'custom'
}

/**
 * 获取提示词类型的显示名称
 */
export function getPromptTypeDisplayName(type: PromptType): string {
  const displayNames: Record<PromptType, string> = {
    [PromptType.SYSTEM]: '系统提示词',
    [PromptType.RULES]: '规则提示词',
    [PromptType.USER_COMMAND]: '用户指令',
    [PromptType.CONTEXT]: '上下文',
    [PromptType.EXAMPLES]: '示例',
    [PromptType.CONSTRAINTS]: '约束',
    [PromptType.FORMAT]: '格式',
    [PromptType.CUSTOM]: '自定义'
  };
  return displayNames[type] || type;
}

/**
 * 根据类别字符串推断提示词类型
 */
export function inferPromptTypeFromCategory(category: string): PromptType {
  const mapping: Record<string, PromptType> = {
    'system': PromptType.SYSTEM,
    'rules': PromptType.RULES,
    'user_commands': PromptType.USER_COMMAND,
    'context': PromptType.CONTEXT,
    'examples': PromptType.EXAMPLES,
    'constraints': PromptType.CONSTRAINTS,
    'format': PromptType.FORMAT
  };
  return mapping[category] || PromptType.CUSTOM;
}