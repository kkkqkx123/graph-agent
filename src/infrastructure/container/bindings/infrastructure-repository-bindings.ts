/**
 * 基础设施层仓储绑定
 * 
 * 只包含基础设施层的仓储实现，不包含应用层服务
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { SessionRepository as SessionInfrastructureRepository } from '../../persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../../persistence/repositories/thread-repository';
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
    container.registerFactory<ThreadRepository>(
      'ThreadRepository',
      () => {
        const connectionManager = container.get<ConnectionManager>('ConnectionManager');
        return new ThreadInfrastructureRepository(connectionManager);
      },
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}