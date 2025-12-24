/**
 * 基础设施层仓储绑定
 * 
 * 只包含基础设施层的仓储实现，不包含应用层服务
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ThreadDefinitionRepository } from '../../../domain/threads/interfaces/thread-definition-repository.interface';
import { ThreadExecutionRepository } from '../../../domain/threads/interfaces/thread-execution-repository.interface';
import { SessionRepository as SessionInfrastructureRepository } from '../../persistence/repositories/session/session-repository';
import { ThreadDefinitionInfrastructureRepository } from '../../threads/repositories/thread-definition-infrastructure-repository';
import { ThreadExecutionInfrastructureRepository } from '../../threads/repositories/thread-execution-infrastructure-repository';
import { ConnectionManager } from '../../persistence/connections/connection-manager';

/**
 * 基础设施层仓储绑定
 */
export class InfrastructureRepositoryBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册Session仓储
    container.registerFactory<SessionRepository>(
      'SessionRepository',
      () => {
        const connectionManager = container.get<ConnectionManager>('ConnectionManager');
        return new SessionInfrastructureRepository(connectionManager);
      },
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