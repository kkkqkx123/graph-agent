/**
 * 应用层工作流服务绑定
 *
 * 包含应用层的业务服务和编排逻辑
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../../../infrastructure/container/container';
import { ThreadLifecycleInfrastructureService } from '../../../infrastructure/threads/services/thread-lifecycle-service';

/**
 * 应用层工作流服务绑定
 */
export class ApplicationWorkflowBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册线程生命周期服务（应用层服务）
    container.registerFactory<ThreadLifecycleInfrastructureService>(
      'ThreadLifecycleService',
      () => new ThreadLifecycleInfrastructureService(
        container.get('ThreadDefinitionRepository'),
        container.get('ThreadExecutionRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}