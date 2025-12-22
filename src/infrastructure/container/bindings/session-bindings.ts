/**
 * Session相关服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { SessionDefinitionRepository } from '../../../domain/sessions/interfaces/session-definition-repository.interface';
import { SessionActivityRepository } from '../../../domain/sessions/interfaces/session-activity-repository.interface';
import { SessionDefinitionInfrastructureRepository } from '../../sessions/repositories/session-definition-infrastructure-repository';
import { SessionActivityInfrastructureRepository } from '../../sessions/repositories/session-activity-infrastructure-repository';

/**
 * Session服务绑定
 */
export class SessionInfrastructureBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册SessionDefinition仓储
    container.registerFactory<SessionDefinitionRepository>(
      'SessionDefinitionRepository',
      () => new SessionDefinitionInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册SessionActivity仓储
    container.registerFactory<SessionActivityRepository>(
      'SessionActivityRepository',
      () => new SessionActivityInfrastructureRepository(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}