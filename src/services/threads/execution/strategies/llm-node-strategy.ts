/**
 * LLM Node 执行策略
 * 
 * 负责执行 LLM 节点
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { LLMNode } from '../../../../domain/workflow/entities/node/llm-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { InteractionEngine } from '../../../interaction/interaction-engine';
import { IInteractionContext, InteractionContext } from '../../../interaction/interaction-context';
import { LLMConfig } from '../../../../domain/interaction/value-objects/llm-config';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * LLM Node 执行策略
 */
@injectable()
export class LLMNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('InteractionEngine') private readonly interactionEngine: InteractionEngine
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof LLMNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof LLMNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 LLMNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('LLMNodeStrategy 开始执行 LLM 节点', {
      nodeId: node.nodeId.toString(),
      model: node.model,
    });

    try {
      // 构建 LLM 配置
      const config = new LLMConfig({
        provider: 'openai', // TODO: 从配置或节点属性中获取
        model: node.model,
        prompt: node.prompt,
        temperature: node.temperature,
        maxTokens: node.maxTokens,
        topP: node.topP,
        frequencyPenalty: node.frequencyPenalty,
        presencePenalty: node.presencePenalty,
        stopSequences: node.stopSequences,
      });

      // 创建或获取 Interaction 上下文
      let interactionContext = context.getMetadata('interactionContext') as IInteractionContext;
      if (!interactionContext) {
        interactionContext = this.interactionEngine.createContext();
        context.setMetadata('interactionContext', interactionContext);
      }

      // 调用 InteractionEngine 执行 LLM
      const result = await this.interactionEngine.executeLLM(config, interactionContext);

      const executionTime = Date.now() - startTime;

      if (result.success) {
        // 更新执行上下文
        if (result.output) {
          context.setVariable('output', result.output);
        }

        if (result.messages) {
          context.setVariable('messages', result.messages);
        }

        if (result.llmCalls) {
          context.setVariable('llmCalls', result.llmCalls);
        }

        if (result.tokenUsage) {
          context.setVariable('tokenUsage', result.tokenUsage);
        }

        return {
          success: true,
          output: result.output,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            model: node.model,
            llmCalls: result.llmCalls?.length || 0,
            tokenUsage: result.tokenUsage,
          },
        };
      } else {
        return {
          success: false,
          error: result.error,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            model: node.model,
          },
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('LLM 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        model: node.model,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          model: node.model,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }
}