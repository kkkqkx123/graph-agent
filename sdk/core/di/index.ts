/**
 * DI 模块导出
 * 导出 DI 容器的所有公共 API
 */

// 重新导出 common-utils 的 DI 类型
export {
  Container,
  ServiceIdentifier,
  BindingScope,
  BindingType,
  Injectable,
  Constructor,
  Factory,
  DynamicValue,
} from '@modular-agent/common-utils';

// 导出 SDK 服务标识符
export * as ServiceIdentifiers from './service-identifiers.js';

// 导出容器配置函数
export {
  initializeContainer,
  getContainer,
  resetContainer,
  isContainerInitialized,
} from './container-config.js';