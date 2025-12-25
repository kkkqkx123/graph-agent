/**
 * 接口层容器
 */

import { BaseContainer, IContainer, ContainerConfiguration } from '../../infrastructure/container/container';
import { HTTPServiceBindings, CLIServiceBindings, RequestContextBindings, ApiControllerBindings } from './bindings/interface-bindings';

/**
 * 接口层容器
 */
export class InterfaceContainer extends BaseContainer {
  constructor(
    applicationContainer: IContainer,
    config: ContainerConfiguration = {}
  ) {
    super(applicationContainer);
    this.configure(config);
    this.registerInterfaceServices();
  }

  /**
   * 注册接口层服务
   */
  private registerInterfaceServices(): void {
    // 注册接口层服务
    const httpBindings = new HTTPServiceBindings();
    httpBindings.registerServices(this, this.config);

    const cliBindings = new CLIServiceBindings();
    cliBindings.registerServices(this, this.config);

    const requestContextBindings = new RequestContextBindings();
    requestContextBindings.registerServices(this, this.config);

    const apiControllerBindings = new ApiControllerBindings();
    apiControllerBindings.registerServices(this, this.config);
  }
}