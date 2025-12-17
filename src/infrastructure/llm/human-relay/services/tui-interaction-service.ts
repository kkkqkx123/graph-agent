/**
 * TUI交互服务实现
 * 
 * 提供命令行界面的交互服务
 * 注意：这是一个简化的实现，实际使用时可能需要更完善的TUI库
 */

import { injectable } from 'inversify';
import { HumanRelayPrompt } from '../../../../domain/llm/entities/human-relay-prompt';
import { InteractionStatus, FrontendType } from '../../../../domain/llm/interfaces/human-relay-interaction.interface';
import { BaseTUIInteractionService } from '../interfaces/frontend-services.interface';

/**
 * TUI交互服务实现
 */
@injectable()
export class TUIInteractionService extends BaseTUIInteractionService {
  private isActive: boolean = false;
  private currentPrompt: HumanRelayPrompt | null = null;

  constructor(config: Record<string, any> = {}) {
    super(config);
  }

  /**
   * 发送提示给TUI界面
   */
  public async sendPrompt(prompt: HumanRelayPrompt): Promise<string> {
    this.isActive = true;
    this.currentPrompt = prompt;
    
    try {
      // 渲染提示词
      const renderedPrompt = prompt.render();
      
      // 显示TUI界面并获取用户输入
      const userInput = await this.showTUIPrompt(renderedPrompt);
      
      return userInput;
    } finally {
      this.isActive = false;
      this.currentPrompt = null;
    }
  }

  /**
   * 检查用户是否可用
   */
  public async isUserAvailable(): Promise<boolean> {
    // 检查TUI环境是否可用
    return this.isTUIAvailable();
  }

  /**
   * 获取交互状态
   */
  public async getStatus(): Promise<InteractionStatus> {
    if (this.isActive) {
      return InteractionStatus.BUSY;
    }
    
    return await this.isUserAvailable() 
      ? InteractionStatus.AVAILABLE 
      : InteractionStatus.UNAVAILABLE;
  }

  /**
   * 取消当前交互
   */
  public async cancel(): Promise<boolean> {
    if (this.isActive) {
      this.isActive = false;
      this.currentPrompt = null;
      return true;
    }
    return true;
  }

  /**
   * 设置TUI样式
   */
  public async setStyle(style: {
    promptStyle?: 'minimal' | 'highlight' | 'detailed';
    inputAreaHeight?: number;
    showTimer?: boolean;
    showHistory?: boolean;
  }): Promise<boolean> {
    this.config = { ...this.config, ...style };
    return true;
  }

  /**
   * 显示帮助信息
   */
  public async showHelp(): Promise<boolean> {
    console.log(`
=== HumanRelay TUI 帮助 ===

命令:
  Ctrl+C - 取消当前交互
  Ctrl+D - 结束输入
  ESC   - 清空当前输入

快捷键:
  Tab   - 自动补全（如果支持）
  ↑/↓  - 浏览历史记录（如果支持）

提示:
- 将显示的提示词复制到Web LLM中
- 将Web LLM的回复粘贴到输入区域
- 使用Ctrl+D或输入"---END---"结束输入
    `);
    return true;
  }

  /**
   * 清屏
   */
  public async clearScreen(): Promise<boolean> {
    console.clear();
    return true;
  }

  // 私有方法

  /**
   * 检查是否在支持TUI的环境中运行
   */
  private isTUIAvailable(): boolean {
    // 检查是否在支持TUI的环境中运行
    // 在Node.js环境中检查stdout和stdin
    return typeof process !== 'undefined' && 
           process.stdout && 
           process.stdout.isTTY && 
           process.stdin && 
           process.stdin.isTTY;
  }

  /**
   * 显示TUI提示并获取用户输入
   */
  private async showTUIPrompt(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 简化的TUI实现
      console.log('\n' + '='.repeat(60));
      console.log('🤖 HumanRelay 提示');
      console.log('='.repeat(60));
      console.log();
      console.log('请将以下内容复制到Web LLM中：');
      console.log();
      console.log('─'.repeat(40));
      console.log(prompt);
      console.log('─'.repeat(40));
      console.log();
      console.log('请将Web LLM的回复粘贴到下方（输入完成后按Ctrl+D）：');
      console.log();

      // 监听用户输入
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      let input = '';
      let hasEnded = false;

      rl.on('line', (line: string) => {
        if (hasEnded) return;
        
        // 检查结束标记
        if (line.trim() === '---END---') {
          hasEnded = true;
          rl.close();
          resolve(input.trim());
          return;
        }

        input += line + '\n';
      });

      rl.on('close', () => {
        if (!hasEnded) {
          hasEnded = true;
          resolve(input.trim());
        }
      });

      // 处理Ctrl+C
      rl.on('SIGINT', () => {
        if (!hasEnded) {
          hasEnded = true;
          rl.close();
          reject(new Error('用户取消了交互'));
        }
      });

      // 设置超时处理
      const timeout = (this.config['timeout'] as number) || 300000; // 默认5分钟
      setTimeout(() => {
        if (!hasEnded) {
          hasEnded = true;
          rl.close();
          reject(new Error('用户输入超时'));
        }
      }, timeout);
    });
  }
}