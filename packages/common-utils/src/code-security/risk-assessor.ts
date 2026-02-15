/**
 * 风险等级工具
 * 提供风险等级相关的纯工具函数
 *
 * 注意：SDK完全信任用户配置的风险等级，不进行任何预设的验证或评估。
 * 应用层应根据实际需求实现自定义的风险评估逻辑。
 */

import { CodeRiskLevel } from '@modular-agent/types';

/**
 * 获取风险等级的优先级数值
 * 用于比较风险等级的高低
 *
 * @param riskLevel 风险等级
 * @returns 优先级数值（越大风险越高）
 */
export function getRiskLevelPriority(riskLevel: CodeRiskLevel): number {
  const priorityMap: Record<CodeRiskLevel, number> = {
    [CodeRiskLevel.NONE]: 0,
    [CodeRiskLevel.LOW]: 1,
    [CodeRiskLevel.MEDIUM]: 2,
    [CodeRiskLevel.HIGH]: 3
  };
  return priorityMap[riskLevel];
}

/**
 * 比较两个风险等级
 *
 * @param riskLevel1 第一个风险等级
 * @param riskLevel2 第二个风险等级
 * @returns 1表示第一个更高，-1表示第二个更高，0表示相等
 */
export function compareRiskLevels(
  riskLevel1: CodeRiskLevel,
  riskLevel2: CodeRiskLevel
): number {
  const priority1 = getRiskLevelPriority(riskLevel1);
  const priority2 = getRiskLevelPriority(riskLevel2);
  
  if (priority1 > priority2) return 1;
  if (priority1 < priority2) return -1;
  return 0;
}