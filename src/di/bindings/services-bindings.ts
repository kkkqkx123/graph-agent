/**
 * Services层服务绑定
 *
 * 绑定服务层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// Services层服务实现
import { ThreadCopy } from '../../services/threads/thread-copy';
import { ThreadExecution } from '../../services/threads/thread-execution';
import { ThreadFork } from '../../services/threads/thread-fork';
import { ThreadLifecycle } from '../../services/threads/thread-lifecycle';
import { ThreadMaintenance } from '../../services/threads/thread-maintenance';
import { ThreadManagement } from '../../services/threads/thread-management';
import { ThreadMonitoring } from '../../services/threads/thread-monitoring';
import { HumanRelay } from '../../services/llm/human-relay';
import { Wrapper } from '../../services/llm/wrapper';
import { SessionLifecycle } from '../../services/sessions/session-lifecycle';
import { SessionMaintenance } from '../../services/sessions/session-maintenance';
import { SessionManagement } from '../../services/sessions/session-management';
import { SessionMonitoring } from '../../services/sessions/session-monitoring';
import { SessionOrchestration } from '../../services/sessions/session-orchestration';
import { SessionResource } from '../../services/sessions/session-resource';
import { StateHistory } from '../../services/state/state-history';
import { StateManagement } from '../../services/state/state-management';
import { StateRecovery } from '../../services/state/state-recovery';
import { StateSnapshot } from '../../services/state/state-snapshot';
import { FunctionManagement } from '../../services/workflow/function-management';
import { WorkflowLifecycle } from '../../services/workflow/workflow-lifecycle';
import { WorkflowManagement } from '../../services/workflow/workflow-management';
import { WorkflowValidator } from '../../services/workflow/workflow-validator';
import { ExpressionEvaluator } from '../../services/workflow/expression-evaluator';
import { FunctionExecutionEngine } from '../../services/workflow/function-execution-engine';
import { GraphAlgorithm } from '../../services/workflow/graph-algorithm';
import { Monitoring } from '../../services/workflow/monitoring';
import { NodeRouter } from '../../services/workflow/node-router';
import { WorkflowExecution } from '../../services/workflow/workflow-execution';
import { Checkpoint } from '../../services/checkpoints/checkpoint';
import { CheckpointAnalysis } from '../../services/checkpoints/checkpoint-analysis';
import { CheckpointBackup } from '../../services/checkpoints/checkpoint-backup';
import { CheckpointCleanup } from '../../services/checkpoints/checkpoint-cleanup';
import { CheckpointCreation } from '../../services/checkpoints/checkpoint-creation';
import { CheckpointManagement } from '../../services/checkpoints/checkpoint-management';
import { CheckpointQuery } from '../../services/checkpoints/checkpoint-query';
import { CheckpointRestore } from '../../services/checkpoints/checkpoint-restore';
import { ThreadStateManager } from '../../services/threads/thread-state-manager';
import { ThreadHistoryManager } from '../../services/threads/thread-history-manager';
import { ThreadConditionalRouter } from '../../services/threads/thread-conditional-router';
import { WorkflowExecutionEngine } from '../../services/threads/workflow-execution-engine';
import { FunctionRegistry } from '../../services/workflow/functions/function-registry';
import { MapTransformFunction } from '../../services/workflow/functions/nodes/data-transformer/map-transform.function';
import { FilterTransformFunction } from '../../services/workflow/functions/nodes/data-transformer/filter-transform.function';
import { ReduceTransformFunction } from '../../services/workflow/functions/nodes/data-transformer/reduce-transform.function';
import { SortTransformFunction } from '../../services/workflow/functions/nodes/data-transformer/sort-transform.function';
import { GroupTransformFunction } from '../../services/workflow/functions/nodes/data-transformer/group-transform.function';
import { NodeExecutor } from '../../services/workflow/nodes/node-executor';
import { EdgeExecutor } from '../../services/workflow/edges/edge-executor';
import { HookExecutor } from '../../services/workflow/hooks/hook-executor';
import { HookFactory } from '../../services/workflow/hooks/hook-factory';
import { LLMWrapperManager } from '../../services/llm/managers/llm-wrapper-manager';
import { PollingPoolManager } from '../../services/llm/managers/pool-manager';
import { TaskGroupManager } from '../../services/llm/managers/task-group-manager';
import { PromptBuilder } from '../../services/prompts/prompt-builder';
import { TemplateProcessor } from '../../services/prompts/template-processor';
import { PromptReferenceParser } from '../../services/prompts/prompt-reference-parser';
import { PromptReferenceValidator } from '../../services/prompts/prompt-reference-validator';

/**
 * Services层绑定模块
 */
export const servicesBindings = new ContainerModule((bind: any) => {
  // ========== Services层服务绑定 ==========

  // 线程服务
  bind(TYPES.ThreadCopy).to(ThreadCopy).inSingletonScope();
  bind(TYPES.ThreadExecution).to(ThreadExecution).inSingletonScope();
  bind(TYPES.ThreadFork).to(ThreadFork).inSingletonScope();
  bind(TYPES.ThreadLifecycle).to(ThreadLifecycle).inSingletonScope();
  bind(TYPES.ThreadMaintenance).to(ThreadMaintenance).inSingletonScope();
  bind(TYPES.ThreadManagement).to(ThreadManagement).inSingletonScope();
  bind(TYPES.ThreadMonitoring).to(ThreadMonitoring).inSingletonScope();
  bind(TYPES.ThreadStateManager).to(ThreadStateManager).inSingletonScope();
  bind(TYPES.ThreadHistoryManager).to(ThreadHistoryManager).inSingletonScope();
  bind(TYPES.ThreadConditionalRouter).to(ThreadConditionalRouter).inSingletonScope();
  bind(TYPES.WorkflowExecutionEngine).to(WorkflowExecutionEngine).inSingletonScope();

  // LLM服务
  bind(TYPES.HumanRelay).to(HumanRelay).inSingletonScope();
  bind(TYPES.Wrapper).to(Wrapper).inSingletonScope();
  bind(TYPES.LLMWrapperManager).to(LLMWrapperManager).inSingletonScope();
  bind(TYPES.PollingPoolManager).to(PollingPoolManager).inSingletonScope();
  bind(TYPES.TaskGroupManager).to(TaskGroupManager).inSingletonScope();

  // 会话服务
  bind(TYPES.SessionLifecycle).to(SessionLifecycle).inSingletonScope();
  bind(TYPES.SessionMaintenance).to(SessionMaintenance).inSingletonScope();
  bind(TYPES.SessionManagement).to(SessionManagement).inSingletonScope();
  bind(TYPES.SessionMonitoring).to(SessionMonitoring).inSingletonScope();
  bind(TYPES.SessionOrchestration).to(SessionOrchestration).inSingletonScope();
  bind(TYPES.SessionResource).to(SessionResource).inSingletonScope();

  // 状态服务
  bind(TYPES.StateHistory).to(StateHistory).inSingletonScope();
  bind(TYPES.StateManagement).to(StateManagement).inSingletonScope();
  bind(TYPES.StateRecovery).to(StateRecovery).inSingletonScope();
  bind(TYPES.StateSnapshot).to(StateSnapshot).inSingletonScope();

  // 工作流服务
  bind(TYPES.FunctionManagement).to(FunctionManagement).inSingletonScope();
  bind(TYPES.WorkflowLifecycle).to(WorkflowLifecycle).inSingletonScope();
  bind(TYPES.WorkflowManagement).to(WorkflowManagement).inSingletonScope();
  bind(TYPES.WorkflowValidator).to(WorkflowValidator).inSingletonScope();
  bind(TYPES.ExpressionEvaluator).to(ExpressionEvaluator).inSingletonScope();
  bind(TYPES.FunctionExecutionEngine).to(FunctionExecutionEngine).inSingletonScope();
  bind(TYPES.GraphAlgorithm).to(GraphAlgorithm).inSingletonScope();
  bind(TYPES.Monitoring).to(Monitoring).inSingletonScope();
  bind(TYPES.NodeRouter).to(NodeRouter).inSingletonScope();
  bind(TYPES.WorkflowExecution).to(WorkflowExecution).inSingletonScope();

  // 检查点服务
  bind(TYPES.Checkpoint).to(Checkpoint).inSingletonScope();
  bind(TYPES.CheckpointAnalysis).to(CheckpointAnalysis).inSingletonScope();
  bind(TYPES.CheckpointBackup).to(CheckpointBackup).inSingletonScope();
  bind(TYPES.CheckpointCleanup).to(CheckpointCleanup).inSingletonScope();
  bind(TYPES.CheckpointCreation).to(CheckpointCreation).inSingletonScope();
  bind(TYPES.CheckpointManagement).to(CheckpointManagement).inSingletonScope();
  bind(TYPES.CheckpointQuery).to(CheckpointQuery).inSingletonScope();
  bind(TYPES.CheckpointRestore).to(CheckpointRestore).inSingletonScope();

  // Prompt服务
  bind(TYPES.PromptBuilder).to(PromptBuilder).inSingletonScope();
  bind(TYPES.TemplateProcessor).to(TemplateProcessor).inSingletonScope();
  bind(TYPES.PromptReferenceParser).to(PromptReferenceParser).inSingletonScope();
  bind(TYPES.PromptReferenceValidator).to(PromptReferenceValidator).inSingletonScope();

  // ========== 函数注册表绑定 ==========

  // 创建并配置 FunctionRegistry 单例
  bind(TYPES.FunctionRegistry)
    .toDynamicValue((context: any) => {
      const functionRegistry = new FunctionRegistry();

      // 注册内置的转换函数
      functionRegistry.registerSingleton(new MapTransformFunction());
      functionRegistry.registerSingleton(new FilterTransformFunction());
      functionRegistry.registerSingleton(new ReduceTransformFunction());
      functionRegistry.registerSingleton(new SortTransformFunction());
      functionRegistry.registerSingleton(new GroupTransformFunction());

      return functionRegistry;
    })
    .inSingletonScope();

  // ========== 节点和边执行器绑定 ==========

  bind(TYPES.NodeExecutor).to(NodeExecutor).inSingletonScope();
  bind(TYPES.EdgeExecutor).to(EdgeExecutor).inSingletonScope();
  bind(TYPES.HookExecutor).to(HookExecutor).inSingletonScope();
  bind(TYPES.HookFactory).to(HookFactory).inSingletonScope();
});