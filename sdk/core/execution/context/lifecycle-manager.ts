/**
 * LifecycleManager - 生命周期管理器
 * 负责管理组件的生命周期，包括清理和快照操作
 */

import type { LifecycleCapable } from '../managers/lifecycle-capable';
import { SystemExecutionError } from '@modular-agent/types';
import { getErrorOrNew } from '@modular-agent/common-utils';

/**
 * 生命周期管理器
 */
export class LifecycleManager {
  /**
   * 清理组件（按依赖关系的逆序）
   * @param components 需要清理的组件映射
   * @param cleanupOrder 清理顺序（按依赖关系的逆序）
   */
  async cleanupComponents(
    components: Map<string, any>,
    cleanupOrder: string[]
  ): Promise<void> {
    for (const key of cleanupOrder) {
      const component = components.get(key);
      if (!component) {
        continue;
      }

      // 检查组件是否实现了LifecycleCapable接口
      if (this.isLifecycleCapable(component)) {
        try {
          const cleanupResult = component.cleanup();
          // 支持同步和异步的cleanup方法
          if (cleanupResult instanceof Promise) {
            await cleanupResult;
          }
        } catch (error) {
          // 抛出系统执行错误，由 ErrorService 统一处理
          throw new SystemExecutionError(
            `Error cleaning up component ${key}`,
            'LifecycleManager',
            'cleanup',
            undefined,
            undefined,
            { componentName: key, originalError: getErrorOrNew(error) }
          );
        }
      }
    }
  }

  /**
   * 获取所有实现了LifecycleCapable接口的组件
   * @param components 组件映射
   * @param managedComponents 需要管理的组件列表
   * @returns 生命周期管理器数组
   */
  getLifecycleCapableComponents(
    components: Map<string, any>,
    managedComponents: string[]
  ): Array<{ name: string; manager: LifecycleCapable }> {
    const managers: Array<{ name: string; manager: LifecycleCapable }> = [];
    
    for (const key of managedComponents) {
      const component = components.get(key);
      if (component && this.isLifecycleCapable(component)) {
        managers.push({ name: key, manager: component });
      }
    }
    
    return managers;
  }

  /**
   * 检查组件是否实现了LifecycleCapable接口
   * @param component 组件实例
   * @returns 是否实现了LifecycleCapable接口
   */
  private isLifecycleCapable(component: any): component is LifecycleCapable {
    return !!(
      component &&
      typeof component.cleanup === 'function' &&
      typeof component.createSnapshot === 'function' &&
      typeof component.restoreFromSnapshot === 'function'
    );
  }
}