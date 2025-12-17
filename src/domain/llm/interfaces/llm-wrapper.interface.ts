import { ILLMClient } from './llm-client.interface';

/**
 * LLM包装器接口
 * 
 * 定义统一的LLM调用接口
 */
export interface ILLMWrapper {
  /**
   * 生成响应
   * @param request LLM请求
   * @returns LLM响应
   */
  generateResponse(request: any): Promise<any>;

  /**
   * 流式生成响应
   * @param request LLM请求
   * @returns 响应流
   */
  generateResponseStream(request: any): Promise<AsyncIterable<any>>;

  /**
   * 获取包装器名称
   * @returns 包装器名称
   */
  getName(): string;

  /**
   * 检查包装器是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取包装器状态
   * @returns 状态信息
   */
  getStatus(): Promise<Record<string, any>>;

  /**
   * 关闭包装器
   */
  close(): Promise<void>;
}

/**
 * 包装器工厂接口
 */
export interface ILLMWrapperFactory {
  /**
   * 创建轮询池包装器
   * @param poolName 轮询池名称
   * @param config 配置
   * @returns 轮询池包装器
   */
  createPollingPoolWrapper(poolName: string, config?: Record<string, any>): Promise<ILLMWrapper>;

  /**
   * 创建任务组包装器
   * @param groupName 任务组名称
   * @param config 配置
   * @returns 任务组包装器
   */
  createTaskGroupWrapper(groupName: string, config?: Record<string, any>): Promise<ILLMWrapper>;

  /**
   * 创建直接LLM包装器
   * @param client LLM客户端
   * @param config 配置
   * @returns 直接LLM包装器
   */
  createDirectLLMWrapper(client: ILLMClient, config?: Record<string, any>): Promise<ILLMWrapper>;

  /**
   * 获取所有包装器
   * @returns 包装器列表
   */
  getAllWrappers(): Promise<ILLMWrapper[]>;

  /**
   * 关闭所有包装器
   */
  closeAll(): Promise<void>;
}