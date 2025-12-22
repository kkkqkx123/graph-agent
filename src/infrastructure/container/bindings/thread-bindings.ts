/**
 * Thread相关服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ThreadDefinitionRepository } from '../../../domain/threads/interfaces/thread-definition-repository.interface';
import { ThreadExecutionRepository } from '../../../domain/threads/interfaces/thread-execution-repository.interface';
import { ThreadDefinitionInfrastructureRepository } from '../../threads/repositories/thread-definition-infrastructure-repository';
import { ThreadExecutionInfrastructureRepository } from '../../threads/repositories/thread-execution-infrastructure-repository';

/**
 * Thread服务绑定
 */
export class ThreadInfrastructureBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册ThreadDefinition仓储
    container.registerFactory<ThreadDefinitionRepository>(
      'ThreadDefinitionRepository',
      () => new ThreadDefinitionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册ThreadExecution仓储
    container.registerFactory<ThreadExecutionRepository>(
      'ThreadExecutionRepository',
      () => new ThreadExecutionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}