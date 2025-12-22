/**
 * HumanRelay工作流节点
 * 
 * 专门用于人工中转的工作流节点
 */

import { Node, NodeProps, NodePosition } from '../base/node';
import { ID } from '../../../../common/value-objects/id';
import { Timestamp } from '../../../../common/value-objects/timestamp';
import { Version } from '../../../../common/value-objects/version';
import { NodeType } from '../../../value-objects/node-type';
import { HumanRelayMode } from '../../../../llm/value-objects/human-relay-mode';

/**
 * HumanRelay节点配置接口
 */
export interface HumanRelayNodeConfig {
  /**
   * 操作模式
   */
  mode: 'single' | 'multi';

  /**
   * 超时时间（秒）
   */
  timeout: number;

  /**
   * 提示词模板
   */
  promptTemplate?: string;

  /**
   * 是否启用会话持久化
   */
  enableSessionPersistence: boolean;

  /**
   * 最大历史长度
   */
  maxHistoryLength?: number;

  /**
   * 前端类型
   */
  frontendType?: 'tui' | 'web' | 'api';

  /**
   * 自定义指令
   */
  customInstructions?: string;

  /**
   * 输入映射
   */
  inputMapping?: Record<string, string>;

  /**
   * 输出映射
   */
  outputMapping?: Record<string, string>;
}

/**
 * HumanRelay工作流节点
 */
export class HumanRelayNode extends Node {
  private readonly config: HumanRelayNodeConfig;

  constructor(
    id: ID,
    name: string,
    config: HumanRelayNodeConfig,
    position?: NodePosition,
    workflowId?: ID
  ) {
    const now = Timestamp.now();
    const props: NodeProps = {
      id,
      workflowId: workflowId || ID.generate(),
      type: NodeType.humanRelay(),
      name,
      position,
      properties: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };
    super(props);
    this.config = config;
  }

  /**
   * 获取节点配置
   */
  public getConfig(): HumanRelayNodeConfig {
    return { ...this.config };
  }

  /**
   * 获取HumanRelay模式
   */
  public getMode(): 'single' | 'multi' {
    return this.config.mode;
  }

  /**
   * 获取超时时间
   */
  public getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * 获取提示词模板
   */
  public getPromptTemplate(): string | undefined {
    return this.config.promptTemplate;
  }

  /**
   * 是否启用会话持久化
   */
  public isSessionPersistenceEnabled(): boolean {
    return this.config.enableSessionPersistence;
  }

  /**
   * 获取最大历史长度
   */
  public getMaxHistoryLength(): number {
    return this.config.maxHistoryLength || 50;
  }

  /**
   * 获取前端类型
   */
  public getFrontendType(): 'tui' | 'web' | 'api' {
    return this.config.frontendType || 'tui';
  }

  /**
   * 获取自定义指令
   */
  public getCustomInstructions(): string | undefined {
    return this.config.customInstructions;
  }

  /**
   * 获取输入映射
   */
  public getInputMapping(): Record<string, string> {
    return this.config.inputMapping || {};
  }

  /**
   * 获取输出映射
   */
  public getOutputMapping(): Record<string, string> {
    return this.config.outputMapping || {};
  }

  /**
   * 检查是否为单轮模式
   */
  public isSingleMode(): boolean {
    return this.config.mode === 'single';
  }

  /**
   * 检查是否为多轮模式
   */
  public isMultiMode(): boolean {
    return this.config.mode === 'multi';
  }

  /**
   * 验证节点配置
   */
  public validateConfig(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证模式
    if (!['single', 'multi'].includes(this.config.mode)) {
      errors.push('无效的HumanRelay模式');
    }

    // 验证超时时间
    if (this.config.timeout <= 0) {
      errors.push('超时时间必须大于0');
    }

    if (this.config.timeout > 3600) {
      errors.push('超时时间不能超过3600秒（1小时）');
    }

    // 验证多轮模式的特殊要求
    if (this.config.mode === 'multi') {
      if (!this.config.enableSessionPersistence) {
        errors.push('多轮模式建议启用会话持久化');
      }

      if (this.config.maxHistoryLength && this.config.maxHistoryLength < 2) {
        errors.push('多轮模式的最大历史长度至少为2');
      }
    }

    // 验证前端类型
    if (this.config.frontendType && !['tui', 'web', 'api'].includes(this.config.frontendType)) {
      errors.push('无效的前端类型');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取节点描述
   */
  public getDescription(): string {
    const modeText = this.config.mode === 'single' ? '单轮' : '多轮';
    const timeoutText = `${this.config.timeout}秒`;
    const frontendText = this.config.frontendType || 'TUI';

    return `HumanRelay ${modeText}模式 (${frontendText}, ${timeoutText}超时)`;
  }

  /**
   * 获取节点能力
   */
  public getCapabilities(): string[] {
    const capabilities = ['人工交互', 'Web LLM集成'];

    if (this.config.mode === 'multi') {
      capabilities.push('对话历史', '上下文保持');
    }

    if (this.config.enableSessionPersistence) {
      capabilities.push('会话持久化');
    }

    if (this.config.frontendType === 'web') {
      capabilities.push('Web界面');
    } else if (this.config.frontendType === 'api') {
      capabilities.push('API接口');
    } else {
      capabilities.push('命令行界面');
    }

    return capabilities;
  }

  /**
   * 创建默认单轮模式节点
   */
  public static createSingleMode(
    id: ID,
    name: string,
    timeout: number = 300,
    position?: NodePosition,
    workflowId?: ID
  ): HumanRelayNode {
    const config: HumanRelayNodeConfig = {
      mode: 'single',
      timeout,
      enableSessionPersistence: false,
      maxHistoryLength: 1
    };

    return new HumanRelayNode(id, name, config, position, workflowId);
  }

  /**
   * 创建默认多轮模式节点
   */
  public static createMultiMode(
    id: ID,
    name: string,
    timeout: number = 600,
    maxHistoryLength: number = 100,
    position?: NodePosition,
    workflowId?: ID
  ): HumanRelayNode {
    const config: HumanRelayNodeConfig = {
      mode: 'multi',
      timeout,
      enableSessionPersistence: true,
      maxHistoryLength
    };

    return new HumanRelayNode(id, name, config, position, workflowId);
  }

  /**
   * 从配置创建节点
   */
  public static fromConfig(
    id: ID,
    name: string,
    config: any,
    position?: NodePosition,
    workflowId?: ID
  ): HumanRelayNode {
    const nodeConfig: HumanRelayNodeConfig = {
      mode: config.mode || 'single',
      timeout: config.timeout || 300,
      enableSessionPersistence: config.enableSessionPersistence || false,
      maxHistoryLength: config.maxHistoryLength,
      frontendType: config.frontendType,
      promptTemplate: config.promptTemplate,
      customInstructions: config.customInstructions,
      inputMapping: config.inputMapping,
      outputMapping: config.outputMapping
    };

    return new HumanRelayNode(id, name, nodeConfig, position, workflowId);
  }

  /**
   * 转换为JSON对象
   */
  public override toJSON(): Record<string, any> {
    return {
      id: this.nodeId.toString(),
      workflowId: this.workflowId.toString(),
      name: this.name,
      type: this.type.toString(),
      position: this.position,
      config: this.config,
      description: this.getDescription(),
      capabilities: this.getCapabilities()
    };
  }

  /**
   * 从JSON对象创建节点
   */
  public static fromJSON(json: Record<string, any>): HumanRelayNode {
    return new HumanRelayNode(
      ID.fromString(json['id']),
      json['name'],
      json['config'],
      json['position'],
      json['workflowId'] ? ID.fromString(json['workflowId']) : undefined
    );
  }
}