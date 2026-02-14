/**
 * TriggerCoordinator - 触发器协调器
 * 负责触发器的注册、注销和执行触发动作
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装触发器定义和运行时状态的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 *
 * 职责：
 * - 触发器的注册、注销、启用、禁用
 * - 处理事件并执行匹配的触发器
 * - 从 WorkflowRegistry 查询触发器定义
 * - 从 TriggerStateManager 获取运行时状态
 *
 * 注意：
 * - 不再通过 EventManager 监听事件，改为由 ThreadExecutor 直接调用 handleEvent()
 * - 不维护 threadId，所有线程ID从 TriggerStateManager 获取
 * - WorkflowRegistry 作为触发器定义的单一信息源
 */

import type {
  Trigger,
  TriggerStatus,
  WorkflowTrigger,
  TriggerRuntimeState
} from '@modular-agent/types';
import type { BaseEvent, NodeCustomEvent } from '@modular-agent/types';
import type { ID } from '@modular-agent/types';
import { getTriggerHandler } from '../handlers/trigger-handlers';
import { ValidationError, ExecutionError, ConfigurationValidationError, RuntimeValidationError } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { GlobalMessageStorage } from '../../services/global-message-storage';
import { TriggerStateManager } from '../managers/trigger-state-manager';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager';
import { convertToTrigger } from '@modular-agent/types';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils';
import { graphRegistry } from '../../services/graph-registry';

/**
 * TriggerCoordinator - 触发器协调器
 *
 * 职责：
 * - 触发器的注册、注销、启用、禁用
 * - 处理事件并执行匹配的触发器
 * - 从 WorkflowRegistry 查询触发器定义
 * - 从 TriggerStateManager 获取运行时状态
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装触发器定义和运行时状态的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 * - WorkflowRegistry 作为触发器定义的单一信息源
 */
export class TriggerCoordinator {
  private threadRegistry: ThreadRegistry;
  private workflowRegistry: WorkflowRegistry;
  private stateManager: TriggerStateManager;
  private checkpointStateManager?: CheckpointStateManager;
  private globalMessageStorage?: GlobalMessageStorage;

  constructor(
    threadRegistry: ThreadRegistry,
    workflowRegistry: WorkflowRegistry,
    stateManager: TriggerStateManager,
    checkpointStateManager?: CheckpointStateManager,
    globalMessageStorage?: GlobalMessageStorage
  ) {
    this.threadRegistry = threadRegistry;
    this.workflowRegistry = workflowRegistry;
    this.stateManager = stateManager;
    this.checkpointStateManager = checkpointStateManager;
    this.globalMessageStorage = globalMessageStorage;
  }

  /**
   * 注册触发器（初始化运行时状态）
   * @param workflowTrigger 工作流触发器定义
   * @param workflowId 工作流 ID
   */
  register(workflowTrigger: WorkflowTrigger, workflowId: ID): void {
    // 验证触发器
    if (!workflowTrigger.id) {
      throw new ConfigurationValidationError('触发器 ID 不能为空', {
        configType: 'trigger',
        configPath: 'trigger.id'
      });
    }
    if (!workflowTrigger.name) {
      throw new ConfigurationValidationError('触发器名称不能为空', {
        configType: 'trigger',
        configPath: 'trigger.name'
      });
    }
    if (!workflowTrigger.condition || !workflowTrigger.condition.eventType) {
      throw new ConfigurationValidationError('触发条件不能为空', {
        configType: 'trigger',
        configPath: 'trigger.condition'
      });
    }
    if (!workflowTrigger.action || !workflowTrigger.action.type) {
      throw new ConfigurationValidationError('触发动作不能为空', {
        configType: 'trigger',
        configPath: 'trigger.action'
      });
    }

    // 检查是否已存在
    if (this.stateManager.hasState(workflowTrigger.id)) {
      throw new RuntimeValidationError(`触发器状态 ${workflowTrigger.id} 已存在`, { operation: 'registerTrigger', field: 'trigger.id', value: workflowTrigger.id });
    }

    // 创建运行时状态
    const state: TriggerRuntimeState = {
      triggerId: workflowTrigger.id,
      threadId: this.stateManager.getThreadId(),
      workflowId: workflowId,
      status: workflowTrigger.enabled !== false ? 'enabled' as TriggerStatus : 'disabled' as TriggerStatus,
      triggerCount: 0,
      updatedAt: now()
    };

    // 注册状态
    this.stateManager.register(state);
  }

  /**
   * 注销触发器（删除运行时状态）
   * @param triggerId 触发器 ID
   */
  unregister(triggerId: ID): void {
    if (!this.stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    // 删除状态
    this.stateManager.deleteState(triggerId);
  }

  /**
   * 启用触发器
   * @param triggerId 触发器 ID
   */
  enable(triggerId: ID): void {
    if (!this.stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    const state = this.stateManager.getState(triggerId);
    if (state && state.status !== 'disabled' as TriggerStatus) {
      return;
    }

    // 更新状态
    this.stateManager.updateStatus(triggerId, 'enabled' as TriggerStatus);
  }

  /**
   * 禁用触发器
   * @param triggerId 触发器 ID
   */
  disable(triggerId: ID): void {
    if (!this.stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    const state = this.stateManager.getState(triggerId);
    if (state && state.status !== 'enabled' as TriggerStatus) {
      return;
    }

    // 更新状态
    this.stateManager.updateStatus(triggerId, 'disabled' as TriggerStatus);
  }

  /**
   * 获取触发器（定义 + 状态）
   * @param triggerId 触发器 ID
   * @returns 触发器，如果不存在则返回 undefined
   */
  get(triggerId: ID): Trigger | undefined {
    // 获取状态
    const state = this.stateManager.getState(triggerId);
    if (!state) {
      return undefined;
    }

    // 获取定义
    const workflowTrigger = this.getWorkflowTrigger(triggerId);
    if (!workflowTrigger) {
      return undefined;
    }

    // 合并定义和状态
    return this.mergeTrigger(workflowTrigger, state);
  }

  /**
   * 获取所有触发器（定义 + 状态）
   * @returns 触发器数组
   */
  getAll(): Trigger[] {
    // 获取所有状态
    const allStates = this.stateManager.getAllStates();
    const triggers: Trigger[] = [];

    // 为每个状态获取定义并合并
    for (const [triggerId, state] of allStates.entries()) {
      const workflowTrigger = this.getWorkflowTrigger(triggerId);
      if (workflowTrigger) {
        triggers.push(this.mergeTrigger(workflowTrigger, state));
      }
    }

    return triggers;
  }

  /**
   * 处理事件（由 ThreadExecutor 直接调用）
   * @param event 事件对象
   */
  async handleEvent(event: BaseEvent): Promise<void> {
    // 获取所有触发器
    const triggers = this.getAll();

    // 过滤出监听该事件类型且已启用的触发器
    const enabledTriggers = triggers.filter(
      (trigger) =>
        trigger.condition.eventType === event.type &&
        trigger.status === 'enabled' as TriggerStatus
    );

    // 评估并执行触发器
    for (const trigger of enabledTriggers) {
      try {
        // 检查触发次数限制
        if (trigger.maxTriggers && trigger.maxTriggers > 0 && trigger.triggerCount >= trigger.maxTriggers) {
          continue;
        }

        // 检查关联关系
        if (trigger.workflowId && event.workflowId !== trigger.workflowId) {
          continue;
        }
        if (trigger.threadId && event.threadId !== trigger.threadId) {
          continue;
        }

        // 对于 NODE_CUSTOM_EVENT 事件，需要额外匹配 eventName
        if (event.type === EventType.NODE_CUSTOM_EVENT) {
          const customEvent = event as NodeCustomEvent;
          if (trigger.condition.eventName && trigger.condition.eventName !== customEvent.eventName) {
            continue;
          }
        }

        // 执行触发器
        await this.executeTrigger(trigger);
      } catch (error) {
        // 静默处理错误，避免影响其他触发器
      }
    }
  }

  /**
   * 执行触发器
   * @param trigger 触发器
   */
  private async executeTrigger(trigger: Trigger): Promise<void> {
    // 触发前创建检查点（如果配置了）
    if (trigger.createCheckpoint && this.checkpointStateManager && this.globalMessageStorage && trigger.threadId) {
      try {
        const dependencies: CheckpointDependencies = {
          threadRegistry: this.threadRegistry,
          checkpointStateManager: this.checkpointStateManager,
          workflowRegistry: this.workflowRegistry,
          globalMessageStorage: this.globalMessageStorage
        };

        await createCheckpoint(
          {
            threadId: trigger.threadId,
            description: trigger.checkpointDescription || `Trigger: ${trigger.name}`
          },
          dependencies
        );
      } catch (error) {
        console.error(
          `Failed to create checkpoint for trigger "${trigger.name}":`,
          error
        );
        // 检查点创建失败不应影响触发器执行
      }
    }

    // 使用 trigger handler 函数执行触发动作
    const handler = getTriggerHandler(trigger.action.type);

    // 创建一个临时的 ExecutionContext，包含 ThreadRegistry 和 WorkflowRegistry
    const executionContext = {
      getThreadRegistry: () => this.threadRegistry,
      getWorkflowRegistry: () => this.workflowRegistry,
      getCurrentThreadId: () => trigger.threadId || null,
    };

    const result = await handler(trigger.action, trigger.id, executionContext);

    // 更新触发器状态
    this.stateManager.incrementTriggerCount(trigger.id);

    // 如果是一次性触发器，禁用它
    if (trigger.maxTriggers === 1) {
      this.stateManager.updateStatus(trigger.id, 'disabled' as TriggerStatus);
    }
  }

  /**
   * 清空所有触发器状态
   */
  clear(): void {
    this.stateManager.clear();
  }

  /**
   * 获取工作流触发器定义
   * @param triggerId 触发器 ID
   * @param workflowId 工作流 ID（可选，如果不提供则从状态管理器获取）
   * @returns 工作流触发器定义，如果不存在则返回 undefined
   */
  private getWorkflowTrigger(triggerId: ID, workflowId?: ID): WorkflowTrigger | undefined {
    // 如果没有提供 workflowId，从状态管理器获取
    const targetWorkflowId = workflowId || this.stateManager.getWorkflowId();
    if (!targetWorkflowId) {
      return undefined;
    }

    // 获取处理后的图
    const processedWorkflow = graphRegistry.get(targetWorkflowId);
    if (!processedWorkflow || !processedWorkflow.triggers) {
      return undefined;
    }

    // 查找触发器定义
    return processedWorkflow.triggers.find((t: any) => t.id === triggerId);
  }

  /**
   * 合并触发器定义和状态
   * @param workflowTrigger 工作流触发器定义
   * @param state 运行时状态
   * @returns 完整的触发器
   */
  private mergeTrigger(workflowTrigger: WorkflowTrigger, state: TriggerRuntimeState): Trigger {
    // 使用 convertToTrigger 转换为 Trigger
    const workflowId = this.stateManager.getWorkflowId();
    const trigger = convertToTrigger(workflowTrigger, workflowId!);

    // 合并运行时状态
    trigger.status = state.status;
    trigger.triggerCount = state.triggerCount;
    trigger.threadId = state.threadId;
    trigger.updatedAt = state.updatedAt;

    return trigger;
  }
}