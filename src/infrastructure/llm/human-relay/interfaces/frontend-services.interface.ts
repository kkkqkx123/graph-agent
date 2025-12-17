/**
 * 前端服务接口
 * 
 * 定义各种前端交互服务的接口
 */

import { 
  InteractionStatus,
  FrontendType,
  IFrontendInteractionService,
  ITUIInteractionService,
  IWebInteractionService,
  IAPIInteractionService
} from '../../../../domain/llm/interfaces/human-relay-interaction.interface';
import { HumanRelayPrompt } from '../../../../domain/llm/entities';

// 重新导出域接口中的类型
export {
  IFrontendInteractionService,
  ITUIInteractionService,
  IWebInteractionService,
  IAPIInteractionService,
  InteractionStatus,
  FrontendType
};

/**
 * 前端服务基础实现（抽象类）
 */
export abstract class BaseFrontendInteractionService implements IFrontendInteractionService {
  protected frontendType: FrontendType;
  protected config: Record<string, any>;

  constructor(frontendType: FrontendType, config: Record<string, any> = {}) {
    this.frontendType = frontendType;
    this.config = config;
  }

  abstract sendPrompt(prompt: HumanRelayPrompt): Promise<string>;
  abstract isUserAvailable(): Promise<boolean>;
  abstract getStatus(): Promise<InteractionStatus>;
  abstract cancel(): Promise<boolean>;

  getFrontendType(): FrontendType {
    return this.frontendType;
  }

  async configure(config: Record<string, any>): Promise<boolean> {
    this.config = { ...this.config, ...config };
    return true;
  }

  async getConfiguration(): Promise<Record<string, any>> {
    return { ...this.config };
  }

  async shutdown(): Promise<boolean> {
    return true;
  }
}

/**
 * TUI前端服务基础实现
 */
export abstract class BaseTUIInteractionService extends BaseFrontendInteractionService implements ITUIInteractionService {
  constructor(config: Record<string, any> = {}) {
    super(FrontendType.TUI, config);
  }

  abstract setStyle(style: {
    promptStyle?: 'minimal' | 'highlight' | 'detailed';
    inputAreaHeight?: number;
    showTimer?: boolean;
    showHistory?: boolean;
  }): Promise<boolean>;

  abstract showHelp(): Promise<boolean>;

  abstract clearScreen(): Promise<boolean>;
}

/**
 * Web前端服务基础实现
 */
export abstract class BaseWebInteractionService extends BaseFrontendInteractionService implements IWebInteractionService {
  constructor(config: Record<string, any> = {}) {
    super(FrontendType.WEB, config);
  }

  abstract getConnectedClientsCount(): Promise<number>;

  abstract broadcast(message: any): Promise<boolean>;

  abstract sendToClient(clientId: string, message: any): Promise<boolean>;

  abstract disconnectClient(clientId: string): Promise<boolean>;
}

/**
 * API前端服务基础实现
 */
export abstract class BaseAPIInteractionService extends BaseFrontendInteractionService implements IAPIInteractionService {
  constructor(config: Record<string, any> = {}) {
    super(FrontendType.API, config);
  }

  abstract createInteractionSession(prompt: string): Promise<string>;

  abstract getInteractionSessionStatus(sessionId: string): Promise<{
    status: 'pending' | 'completed' | 'timeout' | 'error';
    response?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  abstract submitInteractionResponse(sessionId: string, response: string): Promise<boolean>;

  abstract cancelInteractionSession(sessionId: string): Promise<boolean>;
}