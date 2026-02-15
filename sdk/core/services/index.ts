/**
 * 服务模块导出
 * 
 * 重要变更：
 * - 本模块不再导出任何内容
 * - 所有服务类定义在各自的文件中导出（仅供类型引用）
 * - 所有单例实例通过 SingletonRegistry 统一管理
 * - 使用方式：SingletonRegistry.get<ServiceName>('serviceName')
 * 
 * 设计原则：
 * - 强制通过 SingletonRegistry 访问服务，避免误用
 * - 确保单例的全局唯一性
 * - 支持测试环境下的单例替换
 * 
 * 示例：
 * import { SingletonRegistry } from '../execution/context/singleton-registry'
 * const eventManager = SingletonRegistry.getEventManager()
 * 
 * 如需类型引用，直接从具体服务文件导入：
 * import type { EventManager } from './event-manager'
 */