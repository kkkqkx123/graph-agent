/**
 * 应用层工作流服务绑定
 * 
 * 包含应用层的业务服务和编排逻辑
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../../../infrastructure/container/container';
import { GraphAlgorithmService } from '../../../infrastructure/workflow/interfaces/graph-algorithm-service.interface';
import { GraphValidationServiceImpl } from '../../../infrastructure/workflow/services/graph-validation-service';
import { GraphAlgorithmServiceImpl } from '../../../infrastructure/workflow/services/graph-algorithm-service';
import { ThreadLifecycleInfrastructureService } from '../../../infrastructure/threads/services/thread-lifecycle-service';
import { ThreadCoordinatorInfrastructureService } from '../../../infrastructure/threads/services/thread-coordinator-service';

/**
 * 应用层工作流服务绑定
 */
export class ApplicationWorkflowBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册图算法服务（领域服务，但在应用层使用）
    container.registerFactory<GraphAlgorithmService>(
      'GraphAlgorithmService',
      () => new GraphAlgorithmServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册图验证服务（领域服务，但在应用层使用）
    container.registerFactory<GraphValidationServiceImpl>(
      'GraphValidationService',
      () => new GraphValidationServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册线程生命周期服务（应用层服务）
    container.registerFactory<ThreadLifecycleInfrastructureService>(
      'ThreadLifecycleService',
      () => new ThreadLifecycleInfrastructureService(
        container.get('ThreadDefinitionRepository'),
        container.get('ThreadExecutionRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册线程协调服务（应用层服务）
    container.registerFactory<ThreadCoordinatorInfrastructureService>(
      'ThreadCoordinatorService',
      () => new ThreadCoordinatorInfrastructureService(
        container.get('ThreadRepository'),
        container.get('ThreadLifecycleService'),
        container.get('ThreadDefinitionRepository'),
        container.get('ThreadExecutionRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}