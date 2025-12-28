/**
 * HumanRelay配置值对象
 * 
 * 封装HumanRelay的所有配置选项
 */

import { ValueObject } from '../../common/value-objects';
import { HumanRelayMode } from './human-relay-mode';

/**
 * 前端配置接口
 */
export interface FrontendConfig {
  /**
   * 前端类型
   */
  type: 'tui' | 'web' | 'api';
  
  /**
   * 是否自动检测可用前端
   */
  autoDetect?: boolean;
  
  /**
   * 前端回退顺序
   */
  fallbackOrder?: string[];
  
  /**
   * TUI特定配置
   */
  tui?: TUIConfig;
  
  /**
   * Web特定配置
   */
  web?: WebConfig;
  
  /**
   * API特定配置
   */
  api?: APIConfig;
}

/**
 * TUI配置接口
 */
export interface TUIConfig {
  /**
   * 提示样式
   */
  promptStyle: 'minimal' | 'highlight' | 'detailed';
  
  /**
   * 输入区域高度
   */
  inputAreaHeight: number;
  
  /**
   * 是否显示计时器
   */
  showTimer: boolean;
  
  /**
   * 是否显示历史记录
   */
  showHistory: boolean;
  
  /**
   * 历史格式
   */
  historyFormat: 'compact' | 'detailed';
  
  /**
   * 是否自动保存
   */
  autoSave: boolean;
}

/**
 * Web配置接口
 */
export interface WebConfig {
  /**
   * WebSocket端口
   */
  port: number;
  
  /**
   * 绑定主机
   */
  host: string;
  
  /**
   * WebSocket路径
   */
  path: string;
  
  /**
   * 是否启用CORS
   */
  corsEnabled: boolean;
  
  /**
   * 允许的源
   */
  corsOrigins: string[];
  
  /**
   * 最大连接数
   */
  maxConnections: number;
  
  /**
   * 心跳间隔（秒）
   */
  heartbeatInterval: number;
  
  /**
   * 是否启用SSL
   */
  sslEnabled?: boolean;
  
  /**
   * SSL证书路径
   */
  sslCert?: string;
  
  /**
   * SSL私钥路径
   */
  sslKey?: string;
}

/**
 * API配置接口
 */
export interface APIConfig {
  /**
   * API端点
   */
  endpoint: string;
  
  /**
   * 是否需要认证
   */
  authRequired: boolean;
  
  /**
   * 认证方式
   */
  authMethod: 'bearer' | 'basic' | 'apikey';
  
  /**
   * API超时时间
   */
  timeout: number;
  
  /**
   * 速率限制（请求/分钟）
   */
  rateLimit: number;
}

/**
 * 模板配置接口
 */
export interface TemplateConfig {
  /**
   * 单轮模式模板
   */
  single: string;
  
  /**
   * 多轮模式模板
   */
  multi: string;
}

/**
 * 功能配置接口
 */
export interface FeatureConfig {
  /**
   * 是否支持对话历史
   */
  conversationHistory: boolean;
  
  /**
   * 是否支持自定义模板
   */
  customTemplates: boolean;
  
  /**
   * 是否支持超时控制
   */
  timeoutControl: boolean;
  
  /**
   * 是否支持取消交互
   */
  cancelInteraction: boolean;
  
  /**
   * 是否支持会话持久化
   */
  sessionPersistence?: boolean;
  
  /**
   * 是否支持历史导出
   */
  exportHistory?: boolean;
  
  /**
   * 是否支持自动保存
   */
  autoSave?: boolean;
  
  /**
   * 是否支持语音输入（实验性）
   */
  voiceInput?: boolean;
}

/**
 * 错误处理配置接口
 */
export interface ErrorHandlingConfig {
  /**
   * 超时是否重试
   */
  retryOnTimeout: boolean;
  
  /**
   * 最大重试次数
   */
  maxRetries: number;
  
  /**
   * 重试延迟（秒）
   */
  retryDelay: number;
  
  /**
   * 退避倍数
   */
  retryBackoff: number;
  
  /**
   * 是否记录错误日志
   */
  logErrors: boolean;
  
  /**
   * 是否启用错误通知
   */
  errorNotification: boolean;
}

/**
 * 持久化配置接口
 */
export interface PersistenceConfig {
  /**
   * 是否启用持久化
   */
  enabled: boolean;
  
  /**
   * 存储类型
   */
  storageType: 'file' | 'database' | 'redis';
  
  /**
   * 存储路径
   */
  storagePath?: string;
  
  /**
   * 数据库连接字符串
   */
  connectionString?: string;
  
  /**
   * 自动保存间隔（秒）
   */
  autoSaveInterval: number;
  
  /**
   * 是否启用压缩
   */
  compression: boolean;
  
  /**
   * 是否启用加密
   */
  encryption: boolean;
  
  /**
   * 数据保留天数
   */
  retentionDays: number;
}

/**
 * HumanRelay配置属性接口
 */
export interface HumanRelayConfigProps {
  /**
   * 提供商名称
   */
  provider: string;
  
  /**
   * 模型类型
   */
  modelType: string;
  
  /**
   * 操作模式
   */
  mode: HumanRelayMode;
  
  /**
   * 默认超时时间（秒）
   */
  defaultTimeout: number;
  
  /**
   * 最大历史长度
   */
  maxHistoryLength: number;
  
  /**
   * 前端配置
   */
  frontendConfig: FrontendConfig;
  
  /**
   * 模板配置
   */
  templates: TemplateConfig;
  
  /**
   * 功能配置
   */
  features: FeatureConfig;
  
  /**
   * 错误处理配置
   */
  errorHandling: ErrorHandlingConfig;
  
  /**
   * 持久化配置
   */
  persistence?: PersistenceConfig;
  
  /**
   * 元数据
   */
  metadata: Record<string, any>;
}

/**
 * HumanRelay配置值对象
 */
export class HumanRelayConfig extends ValueObject<HumanRelayConfigProps> {
  constructor(props: HumanRelayConfigProps) {
    super(props);
  }

  // 基础属性访问器

  get provider(): string {
    return this.props.provider;
  }

  get modelType(): string {
    return this.props.modelType;
  }

  get mode(): HumanRelayMode {
    return this.props.mode;
  }

  get defaultTimeout(): number {
    return this.props.defaultTimeout;
  }

  get maxHistoryLength(): number {
    return this.props.maxHistoryLength;
  }

  get frontendConfig(): FrontendConfig {
    return { ...this.props.frontendConfig };
  }

  get templates(): TemplateConfig {
    return { ...this.props.templates };
  }

  get features(): FeatureConfig {
    return { ...this.props.features };
  }

  get errorHandling(): ErrorHandlingConfig {
    return { ...this.props.errorHandling };
  }

  get persistence(): PersistenceConfig | undefined {
    return this.props.persistence ? { ...this.props.persistence } : undefined;
  }

  get metadata(): Record<string, any> {
    return { ...this.props.metadata };
  }

  // 便利方法

  /**
   * 是否为多轮模式
   */
  public isMultiMode(): boolean {
    return this.props.mode === HumanRelayMode.MULTI;
  }

  /**
   * 是否为单轮模式
   */
  public isSingleMode(): boolean {
    return this.props.mode === HumanRelayMode.SINGLE;
  }

  /**
   * 是否支持特定功能
   */
  public supportsFeature(feature: keyof FeatureConfig): boolean {
    return this.props.features[feature] === true;
  }

  /**
   * 获取当前前端类型
   */
  public getCurrentFrontendType(): 'tui' | 'web' | 'api' {
    return this.props.frontendConfig.type;
  }

  /**
   * 获取当前模式的模板
   */
  public getCurrentTemplate(): string {
    return this.props.mode === HumanRelayMode.MULTI
      ? this.props.templates.multi
      : this.props.templates.single;
  }

  /**
   * 是否启用会话持久化
   */
  public isPersistenceEnabled(): boolean {
    return this.props.persistence?.enabled === true;
  }

  /**
   * 创建默认配置
   */
  public static createDefault(): HumanRelayConfig {
    return new HumanRelayConfig({
      provider: 'human-relay',
      modelType: 'human-relay',
      mode: HumanRelayMode.SINGLE,
      defaultTimeout: 300,
      maxHistoryLength: 50,
      frontendConfig: {
        type: 'tui',
        autoDetect: true,
        fallbackOrder: ['tui', 'web', 'api'],
        tui: {
          promptStyle: 'highlight',
          inputAreaHeight: 10,
          showTimer: true,
          showHistory: false,
          historyFormat: 'compact',
          autoSave: true
        },
        web: {
          port: 8080,
          host: 'localhost',
          path: '/human-relay',
          corsEnabled: true,
          corsOrigins: ['*'],
          maxConnections: 10,
          heartbeatInterval: 30
        },
        api: {
          endpoint: '/api/human-relay',
          authRequired: false,
          authMethod: 'bearer',
          timeout: 600,
          rateLimit: 100
        }
      },
      templates: {
        single: `请将以下提示词输入到Web LLM中，并将回复粘贴回来：

{prompt}

回复：`,
        multi: `请继续对话，将以下提示词输入到Web LLM中：

{incremental_prompt}

对话历史：
{conversation_history}

回复：`
      },
      features: {
        conversationHistory: true,
        customTemplates: true,
        timeoutControl: true,
        cancelInteraction: true,
        autoSave: true
      },
      errorHandling: {
        retryOnTimeout: false,
        maxRetries: 0,
        retryDelay: 5.0,
        retryBackoff: 1.5,
        logErrors: true,
        errorNotification: false
      },
      metadata: {
        version: '1.0',
        description: 'HumanRelay默认配置'
      }
    });
  }

  /**
   * 创建多轮模式配置
   */
  public static createMultiMode(): HumanRelayConfig {
    const config = this.createDefault();
    return new HumanRelayConfig({
      ...config.props,
      mode: HumanRelayMode.MULTI,
      defaultTimeout: 600,
      maxHistoryLength: 100,
      frontendConfig: {
        ...config.props.frontendConfig,
        tui: {
          ...config.props.frontendConfig.tui!,
          showHistory: true,
          historyFormat: 'detailed'
        }
      },
      features: {
        ...config.props.features,
        conversationHistory: true,
        sessionPersistence: true
      },
      persistence: {
        enabled: true,
        storageType: 'file',
        storagePath: './human-relay-sessions',
        autoSaveInterval: 60,
        compression: true,
        encryption: false,
        retentionDays: 30
      },
      metadata: {
        ...config.props.metadata,
        description: 'HumanRelay多轮模式配置'
      }
    });
  }

  /**
   * 验证配置的有效性
   */
  public override validate(): void {
    if (!this.props.provider || this.props.provider.trim() === '') {
      throw new Error('配置提供者不能为空');
    }
    if (!this.props.frontendConfig) {
      throw new Error('前端配置不能为空');
    }
  }

  /**
   * 克隆配置并修改部分属性
   */
  public clone(changes: Partial<HumanRelayConfigProps>): HumanRelayConfig {
    return new HumanRelayConfig({
      ...this.props,
      ...changes,
      // 深度合并嵌套对象
      frontendConfig: changes.frontendConfig 
        ? { ...this.props.frontendConfig, ...changes.frontendConfig }
        : this.props.frontendConfig,
      templates: changes.templates 
        ? { ...this.props.templates, ...changes.templates }
        : this.props.templates,
      features: changes.features 
        ? { ...this.props.features, ...changes.features }
        : this.props.features,
      errorHandling: changes.errorHandling 
        ? { ...this.props.errorHandling, ...changes.errorHandling }
        : this.props.errorHandling,
      persistence: changes.persistence 
        ? { ...this.props.persistence, ...changes.persistence }
        : this.props.persistence,
      metadata: changes.metadata 
        ? { ...this.props.metadata, ...changes.metadata }
        : this.props.metadata
    });
  }
  }