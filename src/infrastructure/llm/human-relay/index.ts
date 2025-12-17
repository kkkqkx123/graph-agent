/**
 * HumanRelay基础设施索引
 */

// 前端交互管理器
export * from './frontend-interaction-manager';

// 前端服务接口
export * from './interfaces/frontend-services.interface';

// 前端服务实现
export * from './services/tui-interaction-service';
export * from './services/web-interaction-service';
export * from './services/api-interaction-service';