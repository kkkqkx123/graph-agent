/**
 * 工作流相关服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { GraphAlgorithmService } from '../../../domain/workflow/interfaces/graph-algorithm-service.interface';
import { GraphValidationService } from '../../../domain/workflow/interfaces/graph-validation-service.interface';
import { GraphAlgorithmServiceImpl } from '../../workflow/services/graph-algorithm-service';
import { GraphValidationServiceImpl } from '../../workflow/services/graph-validation-service';
import { ThreadLifecycleService } from '../../../domain/threads/interfaces/thread-lifecycle-service.interface';
import { ThreadCoordinatorService } from '../../../domain/threads/interfaces/thread-coordinator-service.interface';
import { SessionResourceService } from '../../../domain/sessions/interfaces/session-resource-service.interface';
import { SessionOrchestrationService } from '../../../domain/sessions/interfaces/session-orchestration-service.interface';
import { ThreadLifecycleInfrastructureService } from '../../threads/services/thread-lifecycle-service';
import { ThreadCoordinatorInfrastructureService } from '../../threads/services/thread-coordinator-service';
import { SessionResourceInfrastructureService } from '../../sessions/services/session-resource-infrastructure-service';
import { SessionOrchestrationInfrastructureService } from '../../sessions/services/session-orchestration-infrastructure-service';

/**
 * 工作流服务绑定
 */
export class WorkflowInfrastructureBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册图算法服务
    container.registerFactory<GraphAlgorithmService>(
      'GraphAlgorithmService',
      () => new GraphAlgorithmServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册图验证服务
    container.registerFactory<GraphValidationService>(
      'GraphValidationService',
      () => new GraphValidationServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册线程生命周期服务
    container.registerFactory<ThreadLifecycleService>(
      'ThreadLifecycleService',
      () => new ThreadLifecycleInfrastructureService(
        container.get('ThreadDefinitionRepository'),
        container.get('ThreadExecutionRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册线程协调服务
    container.registerFactory<ThreadCoordinatorService>(
      'ThreadCoordinatorService',
      () => new ThreadCoordinatorInfrastructureService(
        container.get('ThreadDefinitionRepository'),
        container.get('ThreadExecutionRepository'),
        container.get('ThreadLifecycleService')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册会话资源服务
    container.registerFactory<SessionResourceService>(
      'SessionResourceService',
      () => new SessionResourceInfrastructureService(
        container.get('SessionDefinitionRepository'),
        container.get('SessionActivityRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册会话编排服务
    container.registerFactory<SessionOrchestrationService>(
      'SessionOrchestrationService',
      () => new SessionOrchestrationInfrastructureService(
        container.get('SessionDefinitionRepository'),
        container.get('SessionActivityRepository'),
        container.get('SessionResourceService'),
        container.get('ThreadCoordinatorService')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}