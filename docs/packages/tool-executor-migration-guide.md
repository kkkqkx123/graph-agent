# 工具执行器迁移指南

## 迁移原则

基于REST工具执行器的重构经验，其他工具执行器也应遵循相同的分层架构原则：

- **SDK层**：提供最小化的基础执行器，只包含核心协议支持
- **Packages层**：提供增强的工具包装器，实现高级功能
- **应用层**：配置和使用packages提供的工具

---

## 各工具执行器迁移方案

### 1. StatelessToolExecutor（无状态工具执行器）

#### 当前状态分析

```ts
// sdk/core/tools/executors/stateless.ts
export class StatelessToolExecutor extends BaseToolExecutor {
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
  ): Promise<any> {
    const config = tool.config as StatelessToolConfig;
    if (!config || !config.execute) {
      throw new ToolError(/* ... */);
    }
    
    // 直接调用执行函数
    const result = await config.execute(parameters);
    return result;
  }
}


当前问题：

功能过于简单，仅作为函数调用包装
缺少参数转换、结果处理等扩展点
无法添加日志、监控、缓存等横切关注点
迁移方案
SDK层（保持简洁）：

// sdk/core/tools/executors/stateless.ts（保持不变）
export class StatelessToolExecutor extends BaseToolExecutor {
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
  ): Promise<any> {
    const config = tool.config as StatelessToolConfig;
    
    // 基础验证
    if (!config?.execute) {
      throw new ToolError(
        `Tool '${tool.name}' does not have an execute function`,
        tool.name,
        'STATELESS'
      );
    }
    
    // 直接执行，不包含任何增强逻辑
    return await config.execute(parameters);
  }
}

Packages层（创建增强模块）：

// packages/stateless-tools/src/enhanced-stateless-tool.ts
export interface StatelessToolEnhancementConfig {
  /** 参数转换器 */
  parameterTransformer?: ParameterTransformer;
  /** 结果转换器 */
  resultTransformer?: ResultTransformer;
  /** 执行拦截器 */
  interceptor?: ExecutionInterceptor;
  /** 缓存策略 */
  cacheStrategy?: CacheStrategy;
  /** 监控配置 */
  monitoring?: MonitoringConfig;
}

export class EnhancedStatelessTool {
  constructor(
    private baseExecutor: StatelessToolExecutor,
    private config: StatelessToolEnhancementConfig
  ) {}

  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 参数转换
      if (this.config.parameterTransformer) {
        parameters = await this.config.parameterTransformer.transform(parameters);
      }

      // 2. 执行前拦截
      if (this.config.interceptor?.beforeExecute) {
        await this.config.interceptor.beforeExecute(tool, parameters);
      }

      // 3. 检查缓存
      let result: any;
      const cacheKey = this.config.cacheStrategy?.getCacheKey(tool, parameters);
      
      if (cacheKey && this.config.cacheStrategy) {
        const cached = await this.config.cacheStrategy.get(cacheKey);
        if (cached !== undefined) {
          result = cached;
        } else {
          // 4. 执行基础工具
          const executionResult = await this.baseExecutor.execute(tool, parameters, options);
          
          if (!executionResult.success) {
            throw new Error(executionResult.error);
          }
          
          result = executionResult.result;
          
          // 5. 缓存结果
          await this.config.cacheStrategy.set(cacheKey, result);
        }
      } else {
        // 无缓存，直接执行
        const executionResult = await this.baseExecutor.execute(tool, parameters, options);
        
        if (!executionResult.success) {
          throw new Error(executionResult.error);
        }
        
        result = executionResult.result;
      }

      // 6. 结果转换
      if (this.config.resultTransformer) {
        result = await this.config.resultTransformer.transform(result);
      }

      // 7. 执行后拦截
      if (this.config.interceptor?.afterExecute) {
        await this.config.interceptor.afterExecute(tool, parameters, result);
      }

      // 8. 监控记录
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, true);
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        retryCount: 0
      };
    } catch (error) {
      // 错误处理和监控
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, false);
      }
      
      throw error;
    }
  }

  private async recordMetrics(toolName: string, startTime: number, success: boolean) {
    // 实现监控逻辑
  }
}


增强功能示例：

// packages/stateless-tools/src/transformers/parameter-transformer.ts
export interface ParameterTransformer {
  transform(parameters: Record<string, any>): Promise<Record<string, any>>;
}

// 示例：参数验证转换器
export class ValidationTransformer implements ParameterTransformer {
  constructor(private schema: z.ZodSchema) {}

  async transform(parameters: Record<string, any>): Promise<Record<string, any>> {
    return this.schema.parse(parameters);
  }
}

// 示例：参数日志转换器
export class LoggingTransformer implements ParameterTransformer {
  async transform(parameters: Record<string, any>): Promise<Record<string, any>> {
    console.log('Executing with parameters:', JSON.stringify(parameters, null, 2));
    return parameters;
  }
}

// packages/stateless-tools/src/cache/cache-strategy.ts
export interface CacheStrategy {
  getCacheKey(tool: Tool, parameters: Record<string, any>): string;
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

// 示例：内存缓存
export class MemoryCacheStrategy implements CacheStrategy {
  private cache = new Map<string, any>();

  getCacheKey(tool: Tool, parameters: Record<string, any>): string {
    return `${tool.name}:${JSON.stringify(parameters)}`;
  }

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }
}

2. StatefulToolExecutor（有状态工具执行器）
当前状态分析
// sdk/core/tools/executors/stateful.ts
export class StatefulToolExecutor extends BaseToolExecutor {
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    // 1. 验证ThreadContext
    if (!threadContext) {
      throw new ToolError(/* ... */);
    }

    // 2. 获取工厂函数
    const config = tool.config as StatefulToolConfig;
    
    // 3. 注册并获取实例
    threadContext.registerStatefulTool(tool.name, config.factory);
    const instance = threadContext.getStatefulTool(tool.name);

    // 4. 调用实例方法
    if (typeof instance.execute !== 'function') {
      throw new ToolError(/* ... */);
    }

    return await instance.execute(parameters);
  }
}

当前问题：

实例生命周期管理简单
缺少实例池化、复用策略
无法监控实例状态和资源使用
缺少实例初始化和清理钩子
迁移方案
SDK层（保持简洁）：

// sdk/core/tools/executors/stateful.ts（保持不变）
export class StatefulToolExecutor extends BaseToolExecutor {
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    // 基础验证
    if (!threadContext) {
      throw new ToolError(
        `ThreadContext is required for stateful tool '${tool.name}'`,
        tool.name,
        'STATEFUL'
      );
    }

    const config = tool.config as StatefulToolConfig;
    
    if (!config?.factory) {
      throw new ToolError(
        `Tool '${tool.name}' does not have a factory function`,
        tool.name,
        'STATEFUL'
      );
    }

    // 基础实例管理
    threadContext.registerStatefulTool(tool.name, config.factory);
    const instance = threadContext.getStatefulTool(tool.name);

    if (typeof instance.execute !== 'function') {
      throw new ToolError(
        `Tool instance for '${tool.name}' does not have an execute method`,
        tool.name,
        'STATEFUL'
      );
    }

    // 直接执行，不包含增强逻辑
    return await instance.execute(parameters);
  }
}


Packages层（创建增强模块）：

// packages/stateful-tools/src/enhanced-stateful-tool.ts
export interface StatefulToolEnhancementConfig {
  /** 实例池配置 */
  poolConfig?: InstancePoolConfig;
  /** 生命周期钩子 */
  lifecycleHooks?: LifecycleHooks;
  /** 资源限制 */
  resourceLimits?: ResourceLimits;
  /** 监控配置 */
  monitoring?: MonitoringConfig;
  /** 状态持久化 */
  statePersistence?: StatePersistence;
}

export class EnhancedStatefulTool {
  private instancePool: InstancePool;
  private lifecycleManager: LifecycleManager;

  constructor(
    private baseExecutor: StatefulToolExecutor,
    private config: StatefulToolEnhancementConfig
  ) {
    this.instancePool = new InstancePool(config.poolConfig);
    this.lifecycleManager = new LifecycleManager(config.lifecycleHooks);
  }

  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    let instance: any;

    try {
      // 1. 获取或创建实例
      instance = await this.instancePool.acquire(tool, threadContext);

      // 2. 执行初始化钩子
      await this.lifecycleManager.executeInitHook(instance, parameters);

      // 3. 执行工具
      const result = await this.baseExecutor.execute(
        tool,
        parameters,
        options,
        threadContext
      );

      // 4. 执行清理钩子
      await this.lifecycleManager.executeCleanupHook(instance);

      // 5. 释放实例
      await this.instancePool.release(tool, instance);

      // 6. 监控记录
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, true);
      }

      return result;
    } catch (error) {
      // 错误处理
      if (instance) {
        await this.instancePool.release(tool, instance);
      }
      
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, false);
      }
      
      throw error;
    }
  }
}


增强功能示例：

// packages/stateful-tools/src/pool/instance-pool.ts
export interface InstancePoolConfig {
  /** 最大实例数 */
  maxInstances?: number;
  /** 实例空闲超时（毫秒） */
  idleTimeout?: number;
  /** 实例生命周期（毫秒） */
  maxLifetime?: number;
}

export class InstancePool {
  private instances = new Map<string, PooledInstance[]>();
  private activeCount = new Map<string, number>();

  constructor(private config: InstancePoolConfig = {}) {}

  async acquire(tool: Tool, threadContext?: ThreadContext): Promise<any> {
    const toolName = tool.name;
    const available = this.instances.get(toolName) || [];
    
    // 查找可用实例
    for (const pooled of available) {
      if (!pooled.inUse && this.isInstanceValid(pooled)) {
        pooled.inUse = true;
        pooled.lastUsed = Date.now();
        return pooled.instance;
      }
    }

    // 创建新实例
    if (this.canCreateInstance(toolName)) {
      const instance = await this.createInstance(tool, threadContext);
      this.activeCount.set(toolName, (this.activeCount.get(toolName) || 0) + 1);
      
      return instance;
    }

    // 等待可用实例
    return await this.waitForInstance(toolName);
  }

  async release(tool: Tool, instance: any): Promise<void> {
    // 实现实例释放逻辑
  }

  private isInstanceValid(pooled: PooledInstance): boolean {
    const now = Date.now();
    const lifetime = this.config.maxLifetime || 300000; // 5分钟
    
    return (now - pooled.created) < lifetime &&
           (now - pooled.lastUsed) < (this.config.idleTimeout || 60000);
  }

  private canCreateInstance(toolName: string): boolean {
    const maxInstances = this.config.maxInstances || 10;
    const currentCount = this.activeCount.get(toolName) || 0;
    
    return currentCount < maxInstances;
  }

  private async createInstance(tool: Tool, threadContext?: ThreadContext): Promise<any> {
    // 创建新实例逻辑
  }

  private async waitForInstance(toolName: string): Promise<any> {
    // 等待逻辑
  }
}

interface PooledInstance {
  instance: any;
  inUse: boolean;
  created: number;
  lastUsed: number;
}


// packages/stateful-tools/src/lifecycle/lifecycle-hooks.ts
export interface LifecycleHooks {
  /** 初始化钩子 */
  onInit?: (instance: any, parameters: Record<string, any>) => Promise<void>;
  /** 执行前钩子 */
  beforeExecute?: (instance: any, parameters: Record<string, any>) => Promise<void>;
  /** 执行后钩子 */
  afterExecute?: (instance: any, parameters: Record<string, any>, result: any) => Promise<void>;
  /** 清理钩子 */
  onCleanup?: (instance: any) => Promise<void>;
}

export class LifecycleManager {
  constructor(private hooks: LifecycleHooks = {}) {}

  async executeInitHook(instance: any, parameters: Record<string, any>): Promise<void> {
    if (this.hooks.onInit) {
      await this.hooks.onInit(instance, parameters);
    }
  }

  async executeCleanupHook(instance: any): Promise<void> {
    if (this.hooks.onCleanup) {
      await this.hooks.onCleanup(instance);
    }
  }
}


3. McpToolExecutor（MCP协议工具执行器）
当前状态分析
// sdk/core/tools/executors/mcp.ts
export class McpToolExecutor extends BaseToolExecutor {
  private transports: Map<string, StdioTransport> = new Map();

  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    const config = tool.config as McpToolConfig;
    const serverName = config?.serverName;
    
    // 获取或创建transport
    const transport = await this.getOrCreateTransport(serverName, config);
    
    // 调用MCP工具
    const result = await transport.execute(mcpToolName, { query: parameters });
    
    return {
      serverName,
      toolName: mcpToolName,
      result,
      sessionStatus: transport.getSessionStatus()
    };
  }
}

当前问题：

连接管理简单，缺少连接池
不支持多种传输协议（只支持stdio）
缺少工具发现和动态注册
会话管理功能有限
迁移方案
SDK层（保持简洁）：

// sdk/core/tools/executors/mcp.ts（简化）
export class McpToolExecutor extends BaseToolExecutor {
  private transports: Map<string, McpTransport> = new Map();

  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    const config = tool.config as McpToolConfig;
    const serverName = config?.serverName;
    
    if (!serverName) {
      throw new ConfigurationError(
        `Tool '${tool.name}' does not have a serverName in config`,
        'serverName'
      );
    }

    // 获取transport
    const transport = await this.getOrCreateTransport(serverName, config);
    
    // 基础调用
    const result = await transport.execute(tool.name, { query: parameters });
    
    return {
      serverName,
      toolName: tool.name,
      result
    };
  }

  private async getOrCreateTransport(serverName: string, config: McpToolConfig): Promise<McpTransport> {
    if (this.transports.has(serverName)) {
      return this.transports.get(serverName)!;
    }

    // 创建基础transport
    const transport = this.createTransport(config);
    this.transports.set(serverName, transport);
    
    return transport;
  }

  protected createTransport(config: McpToolConfig): McpTransport {
    // 基础transport创建逻辑
    return new StdioTransport(config);
  }
}


Packages层（创建增强模块）：

// packages/mcp-tools/src/enhanced-mcp-tool.ts
export interface McpToolEnhancementConfig {
  /** 连接池配置 */
  connectionPool?: ConnectionPoolConfig;
  /** 传输协议配置 */
  transportConfig?: TransportConfig;
  /** 工具发现配置 */
  discoveryConfig?: DiscoveryConfig;
  /** 会话管理配置 */
  sessionConfig?: SessionConfig;
  /** 监控配置 */
  monitoring?: MonitoringConfig;
}

export class EnhancedMcpTool {
  private connectionPool: ConnectionPool;
  private toolRegistry: ToolRegistry;
  private sessionManager: SessionManager;

  constructor(
    private baseExecutor: McpToolExecutor,
    private config: McpToolEnhancementConfig
  ) {
    this.connectionPool = new ConnectionPool(config.connectionPool);
    this.toolRegistry = new ToolRegistry();
    this.sessionManager = new SessionManager(config.sessionConfig);
  }

  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    let connection: McpConnection;

    try {
      // 1. 获取连接
      connection = await this.connectionPool.acquire(tool.config as McpToolConfig);

      // 2. 确保会话
      await this.sessionManager.ensureSession(connection);

      // 3. 工具发现（如果需要）
      if (this.config.discoveryConfig?.autoDiscover) {
        await this.discoverTools(connection);
      }

      // 4. 执行基础工具
      const result = await this.baseExecutor.execute(
        tool,
        parameters,
        options,
        threadContext
      );

      // 5. 释放连接
      await this.connectionPool.release(connection);

      // 6. 监控记录
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, true);
      }

      return result;
    } catch (error) {
      // 错误处理
      if (connection) {
        await this.connectionPool.release(connection);
      }
      
      if (this.config.monitoring) {
        await this.recordMetrics(tool.name, startTime, false);
      }
      
      throw error;
    }
  }

  private async discoverTools(connection: McpConnection): Promise<void> {
    // 工具发现逻辑
  }

  private async recordMetrics(toolName: string, startTime: number, success: boolean): Promise<void> {
    // 监控逻辑
  }
}


增强功能示例：

// packages/mcp-tools/src/transport/transport-manager.ts
export interface TransportConfig {
  /** 传输协议类型 */
  type: 'stdio' | 'http' | 'websocket';
  /** 协议特定配置 */
  protocolConfig: Record<string, any>;
}

export class TransportManager {
  private transports = new Map<string, McpTransport>();

  async createTransport(config: TransportConfig): Promise<McpTransport> {
    switch (config.type) {
      case 'stdio':
        return new StdioTransport(config.protocolConfig);
      case 'http':
        return new HttpTransport(config.protocolConfig);
      case 'websocket':
        return new WebSocketTransport(config.protocolConfig);
      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }
}

// packages/mcp-tools/src/discovery/tool-discovery.ts
export interface DiscoveryConfig {
  /** 自动发现 */
  autoDiscover?: boolean;
  /** 发现间隔（毫秒） */
  discoveryInterval?: number;
  /** 缓存发现结果 */
  cacheDiscovery?: boolean;
}

export class ToolDiscovery {
  private discoveredTools = new Map<string, McpToolDefinition[]>();

  async discoverTools(connection: McpConnection): Promise<McpToolDefinition[]> {
    // 实现工具发现逻辑
  }

  getDiscoveredTools(serverName: string): McpToolDefinition[] {
    return this.discoveredTools.get(serverName) || [];
  }
}
```

## 迁移实施策略
阶段1：SDK层重构（1-2周）
简化所有执行器
移除具体业务逻辑
只保留核心协议支持
修复已知bug（如REST的HTTP方法问题）
保持现有接口不变
提供迁移指南
标记废弃功能

阶段2：Packages层建设（2-4周）
创建基础增强包
rest-tools：REST工具增强
stateless-tools：无状态工具增强
stateful-tools：有状态工具增强
mcp-tools：MCP工具增强
实现核心增强功能
认证策略
转换器
缓存策略
监控支持

阶段3：文档编写
编写使用指南
提供最佳实践
创建示例项目
优势分析
架构优势
清晰的分层架构
SDK层：稳定、通用、最小化
Packages层：灵活、可扩展、功能丰富
应用层：简单、直观、易于使用
高度的可扩展性

通过packages层可轻松添加新功能
支持插件化架构
各层可独立演进
优秀的可测试性

各层可独立测试
易于mock和stub
支持单元测试和集成测试
良好的维护性

职责清晰，易于理解和维护
修改高级功能不影响基础代码
支持渐进式重构
业务优势
快速开发

应用层可快速组合所需功能
丰富的packages库可供选择
减少重复代码
性能优化

支持连接池、实例池等优化
可配置缓存策略
监控和调优支持
安全可靠


解决当前问题：修复REST工具的功能缺陷，提升整体架构质量
提高扩展性：通过packages层支持丰富的扩展功能
改善可维护性：清晰的职责分离，降低维护成本
支持业务发展：为未来的功能扩展奠定良好基础
这种架构模式不仅适用于当前的工具执行器，也为整个框架的未来发展提供了可借鉴的经验。