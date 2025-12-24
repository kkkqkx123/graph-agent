/**
 * 应用层服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../../../infrastructure/container/container';
import { WorkflowOrchestrationService } from '../../../application/workflow/services/workflow-orchestration-service';
import { ApplicationWorkflowBindings } from './application-workflow-bindings';

/**
 * 工作流服务绑定
 */
export class WorkflowServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册应用层工作流服务
    const workflowBindings = new ApplicationWorkflowBindings();
    workflowBindings.registerServices(container, config);

    // 注册工作流编排服务
    container.registerFactory(
      'WorkflowOrchestrationService',
      () => new WorkflowOrchestrationService(
        container.get('SessionOrchestrationService'),
        container.get('ThreadCoordinatorService'),
        container.get('GraphAlgorithmService'),
        container.get('GraphValidationService')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}

/**
 * 会话服务绑定
 */
export class SessionServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册会话服务
    // container.registerFactory<ISessionService>(
    //   'ISessionService',
    //   () => new SessionService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IDatabase>('IDatabase')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 工具服务绑定
 */
export class ToolServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册工具服务
    // container.registerFactory<IToolService>(
    //   'IToolService',
    //   () => new ToolService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IConfigManager>('IConfigManager')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

// 导出工作流绑定
export { ApplicationWorkflowBindings } from './application-workflow-bindings';

/**
 * 状态管理服务绑定
 */
export class StateServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册状态管理服务
    // container.registerFactory<IStateService>(
    //   'IStateService',
    //   () => new StateService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<ICache>('ICache')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 历史记录服务绑定
 */
export class HistoryServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册历史记录服务
    // container.registerFactory<IHistoryService>(
    //   'IHistoryService',
    //   () => new HistoryService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IDatabase>('IDatabase')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 工作流执行器绑定
 */
export class WorkflowExecutorBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册工作流执行器 - 瞬态生命周期
    // container.registerFactory<IWorkflowExecutor>(
    //   'IWorkflowExecutor',
    //   () => new WorkflowExecutor(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IWorkflowService>('IWorkflowService')
    //   ),
    //   { lifetime: ServiceLifetime.TRANSIENT }
    // );
  }
}