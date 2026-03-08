/**
 * @modular-agent/storage
 * 存储包，提供多种存储后端实现
 *
 * 设计原则：
 * - SDK 只依赖 StorageCallback 接口
 * - packages 提供具体实现供 apps 层使用
 * - apps 层可选择使用内置实现或自行实现接口
 *
 * 支持的存储类型：
 * - Checkpoint（检查点）
 * - Thread（线程）
 * - Workflow（工作流）
 * - Task（任务）
 */

// 核心类型定义
export * from './types/index.js';

// JSON 文件存储实现
export * from './json/index.js';

// SQLite 存储实现
export * from './sqlite/index.js';

// 内存存储实现（用于测试）
export * from './memory/index.js';
