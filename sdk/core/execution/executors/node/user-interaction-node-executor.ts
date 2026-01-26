/**
 * UserInteraction节点执行器
 * 负责执行USER_INTERACTION节点，触发用户交互，等待用户输入
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * 用户交互类型
 */
type UserInteractionType = 'ask_for_approval' | 'ask_for_input' | 'ask_for_selection' | 'show_message';

/**
 * UserInteraction节点配置
 */
interface UserInteractionNodeConfig {
  /** 用户交互类型 */
  userInteractionType: UserInteractionType;
  /** 显示的消息 */
  showMessage: string;
  /** 默认输入（可选） */
  defaultInput?: string;
  /** 选项列表（用于ask_for_selection） */
  options?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * UserInteraction节点执行器
 */
export class UserInteractionNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.USER_INTERACTION) {
      return false;
    }

    const config = node.config as UserInteractionNodeConfig;

    // 检查必需的配置项
    if (!config.userInteractionType || typeof config.userInteractionType !== 'string') {
      throw new ValidationError('User interaction node must have a valid userInteractionType', `node.${node.id}`);
    }

    const validTypes = ['ask_for_approval', 'ask_for_input', 'ask_for_selection', 'show_message'];
    if (!validTypes.includes(config.userInteractionType)) {
      throw new ValidationError(`Invalid user interaction type: ${config.userInteractionType}`, `node.${node.id}`);
    }

    if (!config.showMessage || typeof config.showMessage !== 'string') {
      throw new ValidationError('User interaction node must have a valid showMessage', `node.${node.id}`);
    }

    // 检查选项配置（用于ask_for_selection）
    if (config.userInteractionType === 'ask_for_selection' && (!config.options || config.options.length === 0)) {
      throw new ValidationError('ask_for_selection type must have options', `node.${node.id}`);
    }

    // 检查超时配置
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ValidationError('User interaction node timeout must be a positive number', `node.${node.id}`);
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
    const config = node.config as UserInteractionNodeConfig;
    const timeout = config.timeout || 300000; // 默认5分钟

    // 步骤1：解析消息中的变量引用
    const resolvedMessage = this.resolveVariableReferences(config.showMessage, thread);

    // 步骤2：触发用户交互事件（模拟）
    // 实际实现应该通过EventManager触发事件
    console.log(`[User Interaction] Type: ${config.userInteractionType}, Message: ${resolvedMessage}`);

    // 步骤3：根据交互类型处理用户输入
    let userInput: any;

    switch (config.userInteractionType) {
      case 'ask_for_approval':
        userInput = await this.waitForApproval(timeout);
        break;

      case 'ask_for_input':
        userInput = await this.waitForInput(resolvedMessage, config.defaultInput, timeout);
        break;

      case 'ask_for_selection':
        userInput = await this.waitForSelection(config.options || [], timeout);
        break;

      case 'show_message':
        userInput = await this.showMessage(resolvedMessage, timeout);
        break;
    }

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      output: {
        userInteractionType: config.userInteractionType,
        showMessage: resolvedMessage,
        userInput
      }
    });

    // 步骤5：返回执行结果
    return {
      userInteractionType: config.userInteractionType,
      showMessage: resolvedMessage,
      userInput
    };
  }

  /**
   * 解析变量引用
   * @param message 消息
   * @param thread Thread实例
   * @returns 解析后的消息
   */
  private resolveVariableReferences(message: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return message.replace(variablePattern, (match, varPath) => {
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return `{{${varPath}}}`; // 保持原样，变量不存在
        }
        value = value[part];
      }

      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
  }

  /**
   * 等待用户批准
   * @param timeout 超时时间
   * @returns 批准结果
   */
  private async waitForApproval(timeout: number): Promise<boolean> {
    // 注意：这里使用模拟的用户批准
    // 实际实现应该通过事件系统等待用户响应

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('User interaction timeout'));
      }, timeout);

      // 模拟用户批准
      setTimeout(() => {
        clearTimeout(timer);
        resolve(true); // 默认批准
      }, 100);
    });
  }

  /**
   * 等待用户输入
   * @param message 消息
   * @param defaultInput 默认输入
   * @param timeout 超时时间
   * @returns 用户输入
   */
  private async waitForInput(message: string, defaultInput: string | undefined, timeout: number): Promise<string> {
    // 注意：这里使用模拟的用户输入
    // 实际实现应该通过事件系统等待用户响应

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('User interaction timeout'));
      }, timeout);

      // 模拟用户输入
      setTimeout(() => {
        clearTimeout(timer);
        resolve(defaultInput || 'Mock user input');
      }, 100);
    });
  }

  /**
   * 等待用户选择
   * @param options 选项列表
   * @param timeout 超时时间
   * @returns 用户选择的选项
   */
  private async waitForSelection(options: string[], timeout: number): Promise<string> {
    // 注意：这里使用模拟的用户选择
    // 实际实现应该通过事件系统等待用户响应

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('User interaction timeout'));
      }, timeout);

      // 模拟用户选择第一个选项
      setTimeout(() => {
        clearTimeout(timer);
        const selectedOption = options[0];
        if (selectedOption !== undefined) {
          resolve(selectedOption);
        } else {
          reject(new Error('No options available'));
        }
      }, 100);
    });
  }

  /**
   * 显示消息
   * @param message 消息
   * @param timeout 超时时间
   * @returns null
   */
  private async showMessage(message: string, timeout: number): Promise<null> {
    // 注意：这里使用模拟的消息显示
    // 实际实现应该通过事件系统显示消息

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, 100);
    });
  }
}
