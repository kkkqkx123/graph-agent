/**
 * User Interaction Node 执行策略
 * 
 * 负责执行用户交互节点
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { UserInteractionNode } from '../../../../domain/workflow/entities/node/user-interaction-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { InteractionEngine } from '../../../interaction/interaction-engine';
import { IInteractionContext } from '../../../interaction/interaction-context';
import { UserInteractionConfig } from '../../../../domain/interaction/value-objects/user-interaction-config';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * User Interaction Node 执行策略
 */
@injectable()
export class UserInteractionStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('InteractionEngine') private readonly interactionEngine: InteractionEngine
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof UserInteractionNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof UserInteractionNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 UserInteractionNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('UserInteractionStrategy 开始执行用户交互节点', {
      nodeId: node.nodeId.toString(),
      interactionType: node.interactionType,
    });

    try {
      // 构建用户交互配置
      const config = new UserInteractionConfig({
        interactionType: node.interactionType,
        prompt: node.prompt,
        options: node.options,
        timeout: node.timeout,
      });

      // 获取 Interaction 上下文
      let interactionContext = context.getMetadata('interactionContext') as IInteractionContext;
      if (!interactionContext) {
        interactionContext = this.interactionEngine.createContext();
        context.setMetadata('interactionContext', interactionContext);
      }

      // 调用 InteractionEngine 处理用户交互
      const result = await this.interactionEngine.handleUserInteraction(config, interactionContext);

      const executionTime = Date.now() - startTime;

      if (result.success) {
        // 更新执行上下文
        if (result.output) {
          context.setVariable('output', result.output);
        }

        return {
          success: true,
          output: result.output,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            interactionType: node.interactionType,
          },
        };
      } else {
        return {
          success: false,
          error: result.error,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            interactionType: node.interactionType,
          },
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('用户交互节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        interactionType: node.interactionType,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          interactionType: node.interactionType,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }
}