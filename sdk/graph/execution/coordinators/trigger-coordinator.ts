/**
 * TriggerCoordinator - 触发器协调器
 * 负责触发器的注册、注销和执行触发动作
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装触发器定义和运行时状态的协调逻辑
 * - 依赖注入：通过 TriggerHandlerContextFactory 管理依赖
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
  TriggerRuntimeState,
  TriggerExecutionResult
} from '@modular-agent/types';
import type { BaseEvent, NodeCustomEvent } from '@modular-agent/types';
import type { ID } from '@modular-agent/types';
import { getTriggerHandler } from '../handlers/trigger-handlers/index.js';
import { ExecutionError, ConfigurationValidationError, RuntimeValidationError, DependencyInjectionError } from '@modular-agent/types';
import { generateId, now, getErrorOrNew } from '@modular-agent/common-utils';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { convertToTrigger } from '@modular-agent/types';
import { createContextualLogger } from '../../../utils/contextual-logger.js';
import {
  TriggerHandlerContextFactory,
  type TriggerHandlerContextFactoryConfig,
  type LifecycleTriggerContext,
  type SkipNodeTriggerContext,
  type SetVariableTriggerContext,
  type ExecuteSubgraphTriggerContext
} from '../factories/trigger-handler-context-factory.js';

const logger = createContextualLogger({ component: 'TriggerCoordinator' });

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
 * - 使用 TriggerHandlerContextFactory 管理依赖
 * - WorkflowRegistry 作为触发器定义的单一信息源
 */
export class TriggerCoordinator {
  /** 上下文工厂 */
  private contextFactory: TriggerHandlerContextFactory;

  /**
   * 构造函数（使用工厂配置）
   *
   * @param config 工厂配置
   */
  constructor(config: TriggerHandlerContextFactoryConfig) {
    this.contextFactory = new TriggerHandlerContextFactory(config);
  }

  /**
   * 获取上下文工厂（供外部访问依赖）
   */
  getContextFactory(): TriggerHandlerContextFactory {
    return this.contextFactory;
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

    const stateManager = this.contextFactory.getStateManager();

    // 检查是否已存在
    if (stateManager.hasState(workflowTrigger.id)) {
      throw new RuntimeValidationError(`触发器状态 ${workflowTrigger.id} 已存在`, { operation: 'registerTrigger', field: 'trigger.id', value: workflowTrigger.id });
    }

    // 创建运行时状态
    const state: TriggerRuntimeState = {
      triggerId: workflowTrigger.id,
      threadId: stateManager.getThreadId(),
      workflowId: workflowId,
      status: workflowTrigger.enabled !== false ? 'enabled' as TriggerStatus : 'disabled' as TriggerStatus,
      triggerCount: 0,
      updatedAt: now()
    };

    // 注册状态
    stateManager.register(state);
  }

  /**
   * 注销触发器（删除运行时状态）
   * @param triggerId 触发器 ID
   */
  unregister(triggerId: ID): void {
    const stateManager = this.contextFactory.getStateManager();
    if (!stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    // 删除状态
    stateManager.deleteState(triggerId);
  }

  /**
   * 启用触发器
   * @param triggerId 触发器 ID
   */
  enable(triggerId: ID): void {
    const stateManager = this.contextFactory.getStateManager();
    if (!stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    const state = stateManager.getState(triggerId);
    if (state && state.status !== 'disabled' as TriggerStatus) {
      return;
    }

    // 更新状态
    stateManager.updateStatus(triggerId, 'enabled' as TriggerStatus);
  }

  /**
   * 禁用触发器
   * @param triggerId 触发器 ID
   */
  disable(triggerId: ID): void {
    const stateManager = this.contextFactory.getStateManager();
    if (!stateManager.hasState(triggerId)) {
      throw new ExecutionError(`触发器状态 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    const state = stateManager.getState(triggerId);
    if (state && state.status !== 'enabled' as TriggerStatus) {
      return;
    }

    // 更新状态
    stateManager.updateStatus(triggerId, 'disabled' as TriggerStatus);
  }

  /**
   * 获取触发器（定义 + 状态）
   * @param triggerId 触发器 ID
   * @returns 触发器，如果不存在则返回 undefined
   */
  get(triggerId: ID): Trigger | undefined {
    const stateManager = this.contextFactory.getStateManager();
    // 获取状态
    const state = stateManager.getState(triggerId);
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
    const stateManager = this.contextFactory.getStateManager();
    // 获取所有状态
    const allStates = stateManager.getAllStates();
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
        if (trigger.maxTriggers && trigger.maxTriggers > 0 && (trigger.triggerCount ?? 0) >= trigger.maxTriggers) {
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
        if (event.type === 'NODE_CUSTOM_EVENT') {
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
    const { checkpointStateManager, graphRegistry, threadRegistry, workflowRegistry, threadLifecycleCoordinator, eventManager, threadBuilder, taskQueueManager } = this.contextFactory.getDependencies();
    const stateManager = this.contextFactory.getStateManager();

    // 触发前创建检查点（如果配置了）
    if (trigger.createCheckpoint && checkpointStateManager && trigger.threadId) {
      // 如果未提供 graphRegistry，跳过检查点创建
      if (!graphRegistry) {
        logger.warn(
          'GraphRegistry not provided, skipping checkpoint creation',
          { triggerName: trigger.name, triggerId: trigger.id }
        );
      } else {
        try {
          const dependencies: CheckpointDependencies = {
            threadRegistry: threadRegistry!,
            checkpointStateManager: checkpointStateManager,
            workflowRegistry: workflowRegistry!,
            graphRegistry: graphRegistry
          };

          await createCheckpoint(
            {
              threadId: trigger.threadId,
              description: trigger.checkpointDescription || `Trigger: ${trigger.name}`
            },
            dependencies
          );
        } catch (error) {
          // 检查点创建失败不应影响触发器执行，仅记录错误
          logger.warn(
            'Failed to create checkpoint for trigger',
            { triggerName: trigger.name, triggerId: trigger.id },
            undefined,
            getErrorOrNew(error)
          );
        }
      }
    }

    // 使用 trigger handler 函数执行触发动作
    const handler = getTriggerHandler(trigger.action.type);

    // 根据不同的handler类型传递不同的依赖
    let result: TriggerExecutionResult;

    switch (trigger.action.type) {
      case 'stop_thread':
      case 'pause_thread':
      case 'resume_thread':
        if (!threadLifecycleCoordinator) {
          throw new DependencyInjectionError('ThreadLifecycleCoordinator not provided', 'ThreadLifecycleCoordinator');
        }
        result = await handler(trigger.action, trigger.id, threadLifecycleCoordinator);
        break;

      case 'skip_node':
        if (!threadRegistry || !eventManager) {
          throw new DependencyInjectionError('ThreadRegistry or EventManager not provided', 'ThreadRegistry/EventManager');
        }
        result = await handler(trigger.action, trigger.id, threadRegistry, eventManager);
        break;

      case 'set_variable':
      case 'apply_message_operation':
        if (!threadRegistry) {
          throw new DependencyInjectionError('ThreadRegistry not provided', 'ThreadRegistry');
        }
        result = await handler(trigger.action, trigger.id, threadRegistry);
        break;

      case 'execute_triggered_subgraph':
        if (!threadRegistry || !eventManager || !threadBuilder || !taskQueueManager) {
          throw new DependencyInjectionError('Required dependencies not provided for execute_triggered_subgraph', 'ThreadRegistry/EventManager/ThreadBuilder/TaskQueueManager');
        }
        result = await handler(
          trigger.action,
          trigger.id,
          threadRegistry,
          eventManager,
          threadBuilder,
          taskQueueManager,
          trigger.threadId
        );
        break;

      default:
        // 对于其他handler，使用向后兼容的方式
        result = await handler(trigger.action, trigger.id);
        break;
    }

    // 更新触发器状态
    stateManager.incrementTriggerCount(trigger.id);

    // 如果是一次性触发器，禁用它
    if (trigger.maxTriggers === 1) {
      stateManager.updateStatus(trigger.id, 'disabled' as TriggerStatus);
    }
  }

  /**
   * 清空所有触发器状态
   */
  clear(): void {
    const stateManager = this.contextFactory.getStateManager();
    stateManager.cleanup();
  }

  /**
   * 获取工作流触发器定义
   * @param triggerId 触发器 ID
   * @param workflowId 工作流 ID（可选，如果不提供则从状态管理器获取）
   * @returns 工作流触发器定义，如果不存在则返回 undefined
   */
  private getWorkflowTrigger(triggerId: ID, workflowId?: ID): WorkflowTrigger | undefined {
    const stateManager = this.contextFactory.getStateManager();
    const { graphRegistry } = this.contextFactory.getDependencies();

    // 如果没有提供 workflowId，从状态管理器获取
    const targetWorkflowId = workflowId || stateManager.getWorkflowId();
    if (!targetWorkflowId) {
      return undefined;
    }

    // 使用注入的graphRegistry
    if (!graphRegistry) {
      throw new DependencyInjectionError(
        'GraphRegistry is required for trigger execution',
        'GraphRegistry',
        'TriggerCoordinator.getWorkflowTrigger',
        undefined,
        undefined,
        { triggerId, workflowId: targetWorkflowId }
      );
    }

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
    const stateManager = this.contextFactory.getStateManager();
    // 使用 convertToTrigger 转换为 Trigger
    const workflowId = stateManager.getWorkflowId();
    const trigger = convertToTrigger(workflowTrigger, workflowId!);

    // 合并运行时状态
    trigger.status = state.status;
    trigger.triggerCount = state.triggerCount;
    trigger.threadId = state.threadId;
    trigger.updatedAt = state.updatedAt;

    return trigger;
  }
}
