/**
 * 变量作用域枚举
 *
 * 定义系统中不同类型的变量作用域
 */
export enum VariableScope {
  /** 节点局部变量 */
  LOCAL = 'local',
  /** 全局执行变量 */
  GLOBAL = 'global',
  /** 节点执行结果 */
  NODE_RESULT = 'node_result',
}

/**
 * 变量作用域工具类
 */
export class VariableScopeUtils {
  /**
   * 检查是否为局部变量作用域
   */
  static isLocal(scope: VariableScope): boolean {
    return scope === VariableScope.LOCAL;
  }

  /**
   * 检查是否为全局变量作用域
   */
  static isGlobal(scope: VariableScope): boolean {
    return scope === VariableScope.GLOBAL;
  }

  /**
   * 检查是否为节点执行结果作用域
   */
  static isNodeResult(scope: VariableScope): boolean {
    return scope === VariableScope.NODE_RESULT;
  }

  /**
   * 获取作用域的显示名称
   */
  static getDisplayName(scope: VariableScope): string {
    switch (scope) {
      case VariableScope.LOCAL:
        return '局部变量';
      case VariableScope.GLOBAL:
        return '全局变量';
      case VariableScope.NODE_RESULT:
        return '节点执行结果';
      default:
        return '未知作用域';
    }
  }
}