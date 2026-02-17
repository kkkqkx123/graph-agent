// ============================================================
// 依赖注入容器 - 入口文件
// ============================================================

// 导出类型
export {
  ServiceIdentifier,
  BindingScope,
  BindingType,
  Request,
  Injectable,
  Constructor,
  Factory,
  DynamicValue,
} from './types.js';

// 导出绑定相关
export {
  Binding,
  BindToFluentSyntax,
  BindInFluentSyntax,
  BindWhenFluentSyntax,
  BindingBuilder,
} from './binding.js';

// 导出解析引擎
export { ResolutionEngine, ResolutionContext } from './resolver.js';

// 导出容器
export { Container } from './container.js';
