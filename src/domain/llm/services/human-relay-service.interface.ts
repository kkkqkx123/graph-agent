/**
 * HumanRelay服务接口
 *
 * 定义HumanRelay业务逻辑的抽象接口
 * 位于Domain层，确保Infrastructure层可以依赖
 */

import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { HumanRelayMode } from '../value-objects/human-relay-mode';

/**
 * HumanRelay配置接口
 */
export interface HumanRelayConfig {
  mode: HumanRelayMode;
  maxHistoryLength: number;
  defaultTimeout: number;
  templates?: {
    single?: string;
    multi?: string;
  };
}

/**
 * HumanRelay服务接口
 */
export interface IHumanRelayService {
  /**
   * 处理HumanRelay请求
   * @param request LLM请求
   * @param config HumanRelay配置
   * @returns LLM响应
   */
  processRequest(request: LLMRequest, config: HumanRelayConfig): Promise<LLMResponse>;

  /**
   * 设置交互策略
   * @param strategy 交互策略
   */
  setInteractionStrategy(strategy: any): void;

  /**
   * 获取当前交互策略
   * @returns 当前交互策略
   */
  getInteractionStrategy(): any;
}