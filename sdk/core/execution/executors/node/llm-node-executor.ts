/**
 * LLM节点执行器
 * 负责执行LLM节点，调用LLM API，处理LLM响应
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * LLM节点配置
 */
interface LLMNodeConfig {
  /** LLM Profile ID */
  profileId: string;
  /** Prompt模板 */
  prompt: string;
  /** LLM参数（可选） */
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  /** 是否流式输出 */
  stream?: boolean;
  /** 工具配置（可选） */
  tools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
}

/**
 * LLM响应结果
 */
interface LLMResult {
  /** 响应内容 */
  content: string;
  /** Token使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason?: string;
  /** 工具调用 */
  toolCalls?: Array<{
    id: string;
    name: string;
    parameters: any;
  }>;
}

/**
 * LLM节点执行器
 */
export class LLMNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.LLM) {
      return false;
    }

    const config = node.config as LLMNodeConfig;

    // 检查必需的配置项
    if (!config.profileId || typeof config.profileId !== 'string') {
      throw new ValidationError('LLM node must have a valid profileId', `node.${node.id}`);
    }

    if (!config.prompt || typeof config.prompt !== 'string') {
      throw new ValidationError('LLM node must have a valid prompt', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as LLMNodeConfig;

    // 步骤1：解析prompt中的变量引用
    const resolvedPrompt = this.resolveVariableReferences(config.prompt, thread);

    // 步骤2：调用LLM API
    const llmResult = await this.callLLM(config, resolvedPrompt);

    // 步骤3：处理工具调用（如果有）
    let toolResults: any[] = [];
    if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
      toolResults = await this.handleToolCalls(llmResult.toolCalls, thread);
    }

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'llm',
      details: {
        profileId: config.profileId,
        prompt: resolvedPrompt,
        response: llmResult.content,
        usage: llmResult.usage,
        toolCalls: llmResult.toolCalls
      }
    });

    // 步骤5：返回执行结果
    return {
      content: llmResult.content,
      usage: llmResult.usage,
      finishReason: llmResult.finishReason,
      toolCalls: llmResult.toolCalls,
      toolResults
    };
  }

  /**
   * 解析prompt中的变量引用
   * @param prompt Prompt模板
   * @param thread Thread实例
   * @returns 解析后的prompt
   */
  private resolveVariableReferences(prompt: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return prompt.replace(variablePattern, (match, varPath) => {
      // 从variableValues获取变量值
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return `{{${varPath}}}`; // 保持原样，变量不存在
        }
        value = value[part];
      }

      // 根据值的类型返回字符串表示
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      } else {
        return String(value);
      }
    });
  }

  /**
   * 调用LLM API
   * @param config 节点配置
   * @param prompt 解析后的prompt
   * @returns LLM响应结果
   */
  private async callLLM(config: LLMNodeConfig, prompt: string): Promise<LLMResult> {
    // 注意：这里使用模拟的LLM调用
    // 实际实现应该使用LLMWrapper调用真实的LLM API

    try {
      // 模拟LLM调用延迟
      await this.sleep(100);

      // 模拟LLM响应
      const mockResponse = this.generateMockResponse(prompt);

      return {
        content: mockResponse,
        usage: {
          promptTokens: prompt.length / 4,
          completionTokens: mockResponse.length / 4,
          totalTokens: (prompt.length + mockResponse.length) / 4
        },
        finishReason: 'stop'
      };
    } catch (error) {
      throw new ValidationError(`LLM call failed: ${error}`, 'llm.call');
    }
  }

  /**
   * 生成模拟响应
   * @param prompt Prompt
   * @returns 模拟响应
   */
  private generateMockResponse(prompt: string): string {
    // 简单的模拟响应生成
    return `This is a mock response for the prompt: "${prompt.substring(0, 50)}..."`;
  }

  /**
   * 处理工具调用
   * @param toolCalls 工具调用数组
   * @param thread Thread实例
   * @returns 工具执行结果数组
   */
  private async handleToolCalls(toolCalls: Array<{ id: string; name: string; parameters: any }>, thread: Thread): Promise<any[]> {
    const results: any[] = [];

    for (const toolCall of toolCalls) {
      try {
        // 注意：这里使用模拟的工具调用
        // 实际实现应该使用ToolService执行工具

        const result = {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: `Mock result for tool: ${toolCall.name}`
        };

        results.push(result);
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * 睡眠指定时间
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
