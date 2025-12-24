/**
 * 基础设施层仓储绑定
 * 
 * 只包含基础设施层的仓储实现，不包含应用层服务
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { SessionDefinitionRepository } from '../../../domain/sessions/interfaces/session-definition-repository.interface';
import { SessionActivityRepository } from '../../../domain/sessions/interfaces/session-activity-repository.interface';
import { ThreadDefinitionRepository } from '../../../domain/threads/interfaces/thread-definition-repository.interface';
import { ThreadExecutionRepository } from '../../../domain/threads/interfaces/thread-execution-repository.interface';
import { SessionDefinitionInfrastructureRepository } from '../../sessions/repositories/session-definition-infrastructure-repository';
import { SessionActivityInfrastructureRepository } from '../../sessions/repositories/session-activity-infrastructure-repository';
import { ThreadDefinitionInfrastructureRepository } from '../../threads/repositories/thread-definition-infrastructure-repository';
import { ThreadExecutionInfrastructureRepository } from '../../threads/repositories/thread-execution-infrastructure-repository';

/**
 * 基础设施层仓储绑定
 */
export class InfrastructureRepositoryBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册Session仓储
    container.registerFactory<SessionDefinitionRepository>(
      'SessionDefinitionRepository',
      () => new SessionDefinitionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    container.registerFactory<SessionActivityRepository>(
      'SessionActivityRepository',
      () => new SessionActivityInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册Thread仓储
    container.registerFactory<ThreadDefinitionRepository>(
      'ThreadDefinitionRepository',
      () => new ThreadDefinitionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    container.registerFactory<ThreadExecutionRepository>(
      'ThreadExecutionRepository',
      () => new ThreadExecutionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}