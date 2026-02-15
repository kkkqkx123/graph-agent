/**
 * 代码安全验证器接口
 * 应用层可实现自定义的安全验证逻辑
 */

import type {
  CodeRiskLevel,
  ValidationResult,
  SecurityCheckResult,
  Script,
  CodeSecurityPolicy
} from '@modular-agent/types';

/**
 * 代码安全验证器接口
 */
export interface CodeSecurityValidator {
  /**
   * 验证脚本名称安全性
   * @param scriptName 脚本名称
   * @param riskLevel 风险等级
   * @returns 验证结果
   */
  validateScriptName(
    scriptName: string,
    riskLevel: CodeRiskLevel
  ): ValidationResult;

  /**
   * 检查脚本是否包含危险命令
   * @param scriptName 脚本名称
   * @returns 是否包含危险命令
   */
  hasDangerousCommands(scriptName: string): boolean;

  /**
   * 评估脚本风险等级
   * @param scriptName 脚本名称
   * @returns 风险等级
   */
  assessRisk(scriptName: string): CodeRiskLevel;

  /**
   * 应用安全策略
   * @param script 脚本定义
   * @param policy 安全策略
   * @returns 安全检查结果
   */
  applySecurityPolicy(
    script: Script,
    policy: CodeSecurityPolicy
  ): SecurityCheckResult;
}

/**
 * SDK提供的默认实现
 */
export class DefaultCodeSecurityValidator implements CodeSecurityValidator {
  /**
   * 验证脚本名称安全性
   */
  validateScriptName(
    scriptName: string,
    riskLevel: CodeRiskLevel
  ): ValidationResult {
    // 基础验证：检查路径遍历
    if (riskLevel === 'low' || riskLevel === 'medium') {
      const invalidPatterns = ['..', '~', '/etc/', '/sys/', '\\\\'];
      for (const pattern of invalidPatterns) {
        if (scriptName.includes(pattern)) {
          return {
            valid: false,
            message: `Script path contains invalid pattern: "${pattern}"`
          };
        }
      }
    }
    return { valid: true };
  }

  /**
   * 检查脚本是否包含危险命令
   */
  hasDangerousCommands(scriptName: string): boolean {
    const dangerousCommands = [
      'rm -rf', 'rm -r', 'del /f', 'del /s',
      'format', 'shutdown', 'reboot', 'kill -9',
      'dd if=', 'mkfs', 'fdisk', 'wipefs'
    ];
    const lowerScriptName = scriptName.toLowerCase();
    return dangerousCommands.some(cmd =>
      lowerScriptName.includes(cmd.toLowerCase())
    );
  }

  /**
   * 评估脚本风险等级
   */
  assessRisk(scriptName: string): CodeRiskLevel {
    if (this.hasDangerousCommands(scriptName)) {
      return 'high';
    }
    if (scriptName.includes('..') || scriptName.includes('~') || 
        scriptName.includes('/etc/') || scriptName.includes('/sys/')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * 应用安全策略
   */
  applySecurityPolicy(
    script: Script,
    policy: CodeSecurityPolicy
  ): SecurityCheckResult {
    const violations: any[] = [];
    
    // 检查风险等级
    const riskLevel = this.assessRisk(script.name);
    if (!policy.allowedRiskLevels.includes(riskLevel)) {
      violations.push({
        type: 'risk_level' as const,
        message: `Script risk level ${riskLevel} is not allowed`,
        severity: 'error' as const,
        details: { riskLevel, allowedLevels: policy.allowedRiskLevels }
      });
    }
    
    // 检查黑名单
    if (policy.blacklist && policy.blacklist.includes(script.name)) {
      violations.push({
        type: 'blacklisted' as const,
        message: `Script is in blacklist`,
        severity: 'error' as const,
        details: { scriptName: script.name }
      });
    }
    
    // 检查危险命令
    if (policy.forbiddenCommands && this.hasDangerousCommands(script.name)) {
      violations.push({
        type: 'forbidden_command' as const,
        message: `Script contains forbidden commands`,
        severity: 'error' as const,
        details: { scriptName: script.name }
      });
    }
    
    // 检查脚本大小
    if (policy.maxScriptSize && script.content && script.content.length > policy.maxScriptSize) {
      violations.push({
        type: 'size_exceeded' as const,
        message: `Script size exceeds limit`,
        severity: 'error' as const,
        details: { 
          size: script.content.length, 
          maxSize: policy.maxScriptSize 
        }
      });
    }
    
    return {
      secure: violations.length === 0,
      violations
    };
  }
}