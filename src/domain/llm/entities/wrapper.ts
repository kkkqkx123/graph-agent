import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { PollingPool } from './pool';

/**
 * LLM包装器请求接口
 */
export interface LLMWrapperRequest {
  /**
   * 消息列表
   */
  messages: any[];

  /**
   * 请求选项
   */
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    tools?: any[];
    toolChoice?: any;
    stream?: boolean;
    metadata?: Record<string, any>;
  };

  /**
   * 提示文本（向后兼容）
   */
  prompt?: string;

  /**
   * 内容（向后兼容）
   */
  content?: string;
}

/**
 * LLM包装器基类
 * 
 * 纯领域实体，表示LLM调用的抽象包装器
 * Domain层只定义包装器的配置和元数据，不包含具体实现逻辑
 */
export abstract class LLMWrapper extends Entity {
  constructor(
    id: ID,
    public readonly name: string,
    public readonly config: Record<string, any>
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 验证包装器有效性
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('包装器名称不能为空');
    }
  }

  /**
   * 获取包装器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取包装器配置
   */
  getConfig(): Record<string, any> {
    return this.config;
  }
}

/**
 * 轮询池包装器
 * 
 * 使用轮询池选择LLM实例的包装器
 */
export class PollingPoolWrapper extends LLMWrapper {
  constructor(
    id: ID,
    name: string,
    config: Record<string, any>,
    public readonly pool: PollingPool
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
    if (!this.pool) {
      throw new Error('轮询池不能为空');
    }
  }

  /**
   * 获取轮询池
   */
  getPool(): PollingPool {
    return this.pool;
  }
}

/**
 * 任务组包装器
 * 
 * 使用任务组管理器选择模型的包装器
 */
export class TaskGroupWrapper extends LLMWrapper {
  constructor(
    id: ID,
    name: string,
    config: Record<string, any>
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
  }

  /**
   * 获取任务组名称
   */
  getTaskGroupName(): string {
    return this.name;
  }
}

/**
 * 直接LLM包装器
 * 
 * 直接调用LLM客户端的包装器
 */
export class DirectLLMWrapper extends LLMWrapper {
  constructor(
    id: ID,
    name: string,
    config: Record<string, any>
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
  }

  /**
   * 获取客户端名称
   */
  getClientName(): string {
    return this.name;
  }
}