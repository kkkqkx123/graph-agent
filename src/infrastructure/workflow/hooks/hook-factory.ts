import { HookPointValue } from '../../../domain/workflow/value-objects/hook-point';
import { Hook, HookProps } from '../../../domain/workflow/entities/hook';
import { BeforeExecuteHook, BeforeExecuteHookConfig } from './impl/before-execute-hook';
import { AfterExecuteHook, AfterExecuteHookConfig } from './impl/after-execute-hook';
import {
  BeforeNodeExecuteHook,
  BeforeNodeExecuteHookConfig,
} from './impl/before-node-execute-hook';
import { AfterNodeExecuteHook, AfterNodeExecuteHookConfig } from './impl/after-node-execute-hook';

/**
 * Hook配置接口
 */
export interface HookConfig {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly config: Record<string, any>;
  readonly enabled?: boolean;
  readonly priority?: number;
  readonly continueOnError?: boolean;
  readonly failFast?: boolean;
}

/**
 * Hook工厂类
 * 负责根据hook点类型创建具体的Hook实例
 */
export class HookFactory {
  /**
   * 创建Hook实例
   * @param hookPoint 钩子点
   * @param config Hook配置
   * @returns Hook实例
   */
  public static createHook(hookPoint: string, config: HookConfig): Hook {
    const hookPointValue = HookPointValue.fromString(hookPoint);

    switch (hookPointValue.getValue()) {
      case 'before_execute':
        return this.createBeforeExecuteHook(config);

      case 'after_execute':
        return this.createAfterExecuteHook(config);

      case 'before_node_execute':
        return this.createBeforeNodeExecuteHook(config);

      case 'after_node_execute':
        return this.createAfterNodeExecuteHook(config);

      default:
        throw new Error(`不支持的钩子点: ${hookPoint}`);
    }
  }

  /**
   * 从HookProps创建Hook实例
   * @param props Hook属性
   * @returns Hook实例
   */
  public static fromProps(props: HookProps): Hook {
    switch (props.hookPoint.getValue()) {
      case 'before_execute':
        return BeforeExecuteHook.fromProps(props);

      case 'after_execute':
        return AfterExecuteHook.fromProps(props);

      case 'before_node_execute':
        return BeforeNodeExecuteHook.fromProps(props);

      case 'after_node_execute':
        return AfterNodeExecuteHook.fromProps(props);

      default:
        throw new Error(`不支持的钩子点: ${props.hookPoint.toString()}`);
    }
  }

  /**
   * 创建执行前Hook
   * @param config Hook配置
   * @returns BeforeExecuteHook实例
   */
  private static createBeforeExecuteHook(config: HookConfig): BeforeExecuteHook {
    return BeforeExecuteHook.create(
      config.name,
      config.description,
      config.config as BeforeExecuteHookConfig,
      config.enabled ?? true,
      config.priority ?? 0,
      config.continueOnError ?? true,
      config.failFast ?? false
    );
  }

  /**
   * 创建执行后Hook
   * @param config Hook配置
   * @returns AfterExecuteHook实例
   */
  private static createAfterExecuteHook(config: HookConfig): AfterExecuteHook {
    return AfterExecuteHook.create(
      config.name,
      config.description,
      config.config as AfterExecuteHookConfig,
      config.enabled ?? true,
      config.priority ?? 0,
      config.continueOnError ?? true,
      config.failFast ?? false
    );
  }

  /**
   * 创建节点执行前Hook
   * @param config Hook配置
   * @returns BeforeNodeExecuteHook实例
   */
  private static createBeforeNodeExecuteHook(config: HookConfig): BeforeNodeExecuteHook {
    const nodeConfig = config.config as BeforeNodeExecuteHookConfig;

    if (!nodeConfig.nodeId || !nodeConfig.nodeType) {
      throw new Error('节点相关Hook必须提供nodeId和nodeType');
    }

    return BeforeNodeExecuteHook.create(
      nodeConfig.nodeId,
      nodeConfig.nodeType,
      config.name,
      config.description,
      nodeConfig,
      config.enabled ?? true,
      config.priority ?? 0,
      config.continueOnError ?? true,
      config.failFast ?? false
    );
  }

  /**
   * 创建节点执行后Hook
   * @param config Hook配置
   * @returns AfterNodeExecuteHook实例
   */
  private static createAfterNodeExecuteHook(config: HookConfig): AfterNodeExecuteHook {
    const nodeConfig = config.config as AfterNodeExecuteHookConfig;

    if (!nodeConfig.nodeId || !nodeConfig.nodeType) {
      throw new Error('节点相关Hook必须提供nodeId和nodeType');
    }

    return AfterNodeExecuteHook.create(
      nodeConfig.nodeId,
      nodeConfig.nodeType,
      config.name,
      config.description,
      nodeConfig,
      config.enabled ?? true,
      config.priority ?? 0,
      config.continueOnError ?? true,
      config.failFast ?? false
    );
  }

  /**
   * 获取所有支持的钩子点
   * @returns 钩子点列表
   */
  public static getSupportedHookPoints(): string[] {
    return ['before_execute', 'after_execute', 'before_node_execute', 'after_node_execute'];
  }

  /**
   * 检查钩子点是否支持
   * @param hookPoint 钩子点
   * @returns 是否支持
   */
  public static isHookPointSupported(hookPoint: string): boolean {
    return this.getSupportedHookPoints().includes(hookPoint);
  }
}
