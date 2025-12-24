/**
 * 应用层容器
 */

import { BaseContainer, IContainer, ContainerConfiguration } from '../../infrastructure/container/container';

/**
 * 应用层容器
 */
export class ApplicationContainer extends BaseContainer {
  constructor(
    infrastructureContainer: IContainer,
    config: ContainerConfiguration = {}
  ) {
    super(infrastructureContainer);
    this.configure(config);
    this.registerApplicationServices();
  }

  /**
   * 注册应用层服务
   */
  private registerApplicationServices(): void {
    // 注册应用层服务
    // TODO: 实现具体的服务绑定
  }
}