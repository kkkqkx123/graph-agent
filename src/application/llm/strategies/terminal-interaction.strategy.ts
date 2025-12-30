/**
 * 终端交互策略
 *
 * 使用Node.js readline模块实现终端用户交互
 */

import { injectable } from 'inversify';
import { IInteractionStrategy, InteractionType } from './interaction-strategy.interface';

@injectable()
export class TerminalInteraction implements IInteractionStrategy {
  private rlInterface: any = null;

  async promptUser(question: string, timeout: number): Promise<string> {
    // 延迟导入readline，避免在非Node.js环境中报错
    const readline = await import('readline');

    if (!this.rlInterface) {
      this.rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // 设置超时
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error(`用户输入超时 (${timeout}ms)`));
        }, timeout);
      }

      // 使用question方法等待用户输入
      this.rlInterface.question(question, (input: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(input.trim());
      });
    });
  }

  async close(): Promise<void> {
    if (this.rlInterface) {
      this.rlInterface.close();
      this.rlInterface = null;
    }
  }

  getType(): InteractionType {
    return InteractionType.TERMINAL;
  }
}