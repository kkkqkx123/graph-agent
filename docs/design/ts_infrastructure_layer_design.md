# TypeScript版本基础设施层(Infrastructure)设计

## 1. 基础设施层概述

基础设施层提供技术实现细节，包括数据持久化、外部服务集成、配置管理等。它实现了领域层定义的接口，为应用层提供技术支撑。基础设施层只依赖领域层，不依赖应用层。

## 2. 基础设施层结构

基于重新设计的层次化架构，基础设施层的结构如下：

```
src/infrastructure/
├── config/                # 配置管理
│   ├── managers/
│   │   ├── config-manager.ts
│   │   ├── env-config-manager.ts
│   │   └── file-config-manager.ts
│   ├── sources/
│   │   ├── file-source.ts
│   │   ├── env-source.ts
│   │   └── remote-source.ts
│   ├── processors/
│   │   ├── env-processor.ts
│   │   ├── inheritance-processor.ts
│   │   ├── validation-processor.ts
│   │   └── transformation-processor.ts
│   ├── validators/
│   │   ├── schema-validator.ts
│   │   ├── business-validator.ts
│   │   └── security-validator.ts
│   ├── cache/
│   │   ├── memory-cache.ts
│   │   ├── redis-cache.ts
│   │   └── cache-manager.ts
│   ├── watcher/
│   │   ├── file-watcher.ts
│   │   └── hot-reload-manager.ts
│   └── index.ts
├── database/              # 数据库相关
│   ├── connections/
│   │   ├── connection-pool.ts
│   │   ├── connection-manager.ts
│   │   └── transaction-manager.ts
│   ├── repositories/
│   │   ├── session/
│   │   │   ├── session-repository.ts
│   │   │   └── session-mapper.ts
│   │   ├── thread/
│   │   │   ├── thread-repository.ts
│   │   │   └── thread-mapper.ts
│   │   ├── workflow/
│   │   │   ├── workflow-repository.ts
│   │   │   └── workflow-mapper.ts
│   │   ├── graph/
│   │   │   ├── graph-repository.ts
│   │   │   ├── node-repository.ts
│   │   │   ├── edge-repository.ts
│   │   │   └── graph-mapper.ts
│   │   ├── llm/
│   │   │   ├── llm-repository.ts
│   │   │   └── llm-mapper.ts
│   │   ├── tools/
│   │   │   ├── tool-repository.ts
│   │   │   └── tool-mapper.ts
│   │   ├── history/
│   │   │   ├── history-repository.ts
│   │   │   └── history-mapper.ts
│   │   └── checkpoint/
│   │       ├── checkpoint-repository.ts
│   │       └── checkpoint-mapper.ts
│   ├── migrations/
│   │   ├── migration-runner.ts
│   │   ├── migration-001-initial.ts
│   │   ├── migration-002-sessions.ts
│   │   ├── migration-003-threads.ts
│   │   ├── migration-004-workflows.ts
│   │   ├── migration-005-graphs.ts
│   │   └── migration-006-history.ts
│   ├── models/
│   │   ├── session.model.ts
│   │   ├── thread.model.ts
│   │   ├── workflow.model.ts
│   │   ├── graph.model.ts
│   │   ├── node.model.ts
│   │   ├── edge.model.ts
│   │   ├── llm.model.ts
│   │   ├── tool.model.ts
│   │   ├── history.model.ts
│   │   └── checkpoint.model.ts
│   └── index.ts
├── messaging/             # 消息队列
│   ├── brokers/
│   │   ├── redis-broker.ts
│   │   ├── rabbitmq-broker.ts
│   │   └── memory-broker.ts
│   ├── publishers/
│   │   ├── event-publisher.ts
│   │   └── command-publisher.ts
│   ├── subscribers/
│   │   ├── event-subscriber.ts
│   │   └── command-subscriber.ts
│   ├── handlers/
│   │   ├── workflow-event-handler.ts
│   │   ├── session-event-handler.ts
│   │   └── thread-event-handler.ts
│   └── index.ts
├── external/              # 外部服务
│   ├── llm/
│   │   ├── clients/
│   │   │   ├── openai-client.ts
│   │   │   ├── anthropic-client.ts
│   │   │   ├── gemini-client.ts
│   │   │   └── mock-client.ts
│   │   ├── adapters/
│   │   │   ├── llm-adapter.ts
│   │   │   └── prompt-adapter.ts
│   │   └── rate-limiters/
│   │       ├── token-bucket-limiter.ts
│   │       └── sliding-window-limiter.ts
│   ├── tools/
│   │   ├── executors/
│   │   │   ├── builtin-executor.ts
│   │   │   ├── native-executor.ts
│   │   │   ├── rest-executor.ts
│   │   │   └── mcp-executor.ts
│   │   ├── adapters/
│   │   │   ├── tool-adapter.ts
│   │   │   └── parameter-adapter.ts
│   │   └── registries/
│   │       ├── tool-registry.ts
│   │       └── function-registry.ts
│   ├── storage/
│   │   ├── adapters/
│   │   │   ├── s3-adapter.ts
│   │   │   ├── minio-adapter.ts
│   │   │   └── local-adapter.ts
│   │   └── managers/
│   │       ├── file-manager.ts
│   │       └── backup-manager.ts
│   └── index.ts
├── workflow/              # 工作流执行引擎
│   ├── engine/
│   │   ├── graph-executor.ts
│   │   ├── execution-context.ts
│   │   ├── execution-planner.ts
│   │   └── state-manager.ts
│   ├── nodes/
│   │   ├── executors/
│   │   │   ├── llm-node-executor.ts
│   │   │   ├── tool-node-executor.ts
│   │   │   ├── condition-node-executor.ts
│   │   │   └── wait-node-executor.ts
│   │   ├── adapters/
│   │   │   ├── node-adapter.ts
│   │   │   └── state-adapter.ts
│   │   └── factories/
│   │       ├── node-factory.ts
│   │       └── executor-factory.ts
│   ├── edges/
│   │   ├── evaluators/
│   │   │   ├── condition-evaluator.ts
│   │   │   ├── expression-evaluator.ts
│   │   │   └── transition-evaluator.ts
│   │   └── adapters/
│   │       └── edge-adapter.ts
│   ├── strategies/
│   │   ├── execution-strategy.ts
│   │   ├── parallel-strategy.ts
│   │   ├── sequential-strategy.ts
│   │   └── conditional-strategy.ts
│   └── index.ts
├── monitoring/            # 监控和日志
│   ├── logging/
│   │   ├── logger.ts
│   │   ├── log-formatter.ts
│   │   ├── log-transport.ts
│   │   └── structured-logger.ts
│   ├── metrics/
│   │   ├── metrics-collector.ts
│   │   ├── performance-monitor.ts
│   │   ├── health-checker.ts
│   │   └── custom-metrics.ts
│   ├── tracing/
│   │   ├── tracer.ts
│   │   ├── span-manager.ts
│   │   └── context-propagator.ts
│   └── alerts/
│       ├── alert-manager.ts
│       ├── notification-sender.ts
│       └── threshold-monitor.ts
├── cache/                 # 缓存系统
│   ├── adapters/
│   │   ├── memory-adapter.ts
│   │   ├── redis-adapter.ts
│   │   └── multi-level-adapter.ts
│   ├── strategies/
│   │   ├── lru-strategy.ts
│   │   ├── ttl-strategy.ts
│   │   └── write-through-strategy.ts
│   ├── serializers/
│   │   ├── json-serializer.ts
│   │   ├── protobuf-serializer.ts
│   │   └── msgpack-serializer.ts
│   └── index.ts
├── security/              # 安全相关
│   ├── authentication/
│   │   ├── jwt-authenticator.ts
│   │   ├── api-key-authenticator.ts
│   │   └── oauth-authenticator.ts
│   ├── authorization/
│   │   ├── rbac-authorizer.ts
│   │   ├── permission-checker.ts
│   │   └── policy-enforcer.ts
│   ├── encryption/
│   │   ├── aes-encryptor.ts
│   │   ├── rsa-encryptor.ts
│   │   └── hash-manager.ts
│   └── validation/
│       ├── input-sanitizer.ts
│       ├── sql-injection-guard.ts
│       └── xss-protection.ts
├── common/                # 通用基础设施
│   ├── http/
│   │   ├── http-client.ts
│   │   ├── retry-handler.ts
│   │   ├── circuit-breaker.ts
│   │   └── rate-limiter.ts
│   ├── serialization/
│   │   ├── json-serializer.ts
│   │   ├── xml-serializer.ts
│   │   └── yaml-serializer.ts
│   ├── validation/
│   │   ├── schema-validator.ts
│   │   ├── type-validator.ts
│   │   └── business-validator.ts
│   ├── time/
│   │   ├── time-provider.ts
│   │   ├── scheduler.ts
│   │   └── timer.ts
│   └── index.ts
└── index.ts
```

## 3. 核心基础设施组件设计

### 3.1 配置管理器

```typescript
// src/infrastructure/config/managers/config-manager.ts
import { injectable, inject } from 'inversify';
import { IConfigLoader } from '../../../domain/config/interfaces/config-loader.interface';
import { IConfigProcessor } from '../../../domain/config/interfaces/config-processor.interface';
import { IConfigValidator } from '../../../domain/config/interfaces/config-validator.interface';
import { IConfigCache } from '../../../domain/config/interfaces/config-cache.interface';
import { ConfigSource } from '../sources/config-source';
import { EnvironmentProcessor } from '../processors/env-processor';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { ValidationProcessor } from '../processors/validation-processor';
import { SchemaValidator } from '../validators/schema-validator';
import { MemoryCache } from '../cache/memory-cache';
import { FileWatcher } from '../watcher/file-watcher';

@injectable()
export class ConfigManager {
  private config: Map<string, any> = new Map();
  private watchers: Map<string, FileWatcher> = new Map();

  constructor(
    @inject('ConfigSource') private configSource: ConfigSource,
    @inject('EnvironmentProcessor') private envProcessor: EnvironmentProcessor,
    @inject('InheritanceProcessor') private inheritanceProcessor: InheritanceProcessor,
    @inject('ValidationProcessor') private validationProcessor: ValidationProcessor,
    @inject('SchemaValidator') private schemaValidator: SchemaValidator,
    @inject('MemoryCache') private cache: MemoryCache
  ) {}

  async loadConfig(configPath?: string): Promise<void> {
    try {
      // Load raw configuration
      let rawConfig = await this.configSource.load(configPath);
      
      // Apply processors in order
      let processedConfig = await this.envProcessor.process(rawConfig);
      processedConfig = await this.inheritanceProcessor.process(processedConfig);
      processedConfig = await this.validationProcessor.process(processedConfig);
      
      // Validate against schema
      await this.schemaValidator.validate(processedConfig);
      
      // Cache the configuration
      this.cache.set('main', processedConfig);
      
      // Store in memory
      this.config.set('main', processedConfig);
      
      // Setup file watching if enabled
      if (configPath && this.isHotReloadEnabled()) {
        this.setupFileWatcher(configPath);
      }
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    // Try cache first
    const cached = this.cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Try memory
    const value = this.getNestedValue(this.config.get('main'), key);
    if (value !== undefined) {
      this.cache.set(key, value);
      return value;
    }
    
    // Return default value
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw new Error(`Configuration key '${key}' not found`);
  }

  async reloadConfig(): Promise<void> {
    // Clear cache
    this.cache.clear();
    
    // Reload configuration
    await this.loadConfig();
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }

  private isHotReloadEnabled(): boolean {
    return this.get('feature.hotReload', false);
  }

  private setupFileWatcher(configPath: string): void {
    const watcher = new FileWatcher(configPath);
    watcher.on('change', async () => {
      try {
        await this.reloadConfig();
        console.log('Configuration reloaded successfully');
      } catch (error) {
        console.error('Failed to reload configuration:', error);
      }
    });
    
    this.watchers.set(configPath, watcher);
    watcher.start();
  }

  async dispose(): Promise<void> {
    // Stop all file watchers
    for (const watcher of this.watchers.values()) {
      watcher.stop();
    }
    this.watchers.clear();
    
    // Clear cache
    this.cache.clear();
  }
}
```

### 3.2 数据库仓储实现

```typescript
// src/infrastructure/database/repositories/session/session-repository.ts
import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../../domain/session/repositories/session-repository';
import { Session } from '../../../../domain/session/entities/session';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { UserId } from '../../../../domain/session/value-objects/user-id';
import { ConnectionManager } from '../../connections/connection-manager';
import { SessionMapper } from './session-mapper';
import { SessionModel } from '../../models/session.model';

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('SessionMapper') private mapper: SessionMapper
  ) {}

  async save(session: Session): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = this.mapper.toModel(session);
    await repository.save(model);
  }

  async findById(id: SessionId): Promise<Session | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find();
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(id: SessionId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.delete({ id: id.value });
  }

  async exists(id: SessionId): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findByUserId(userId: UserId): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({ where: { userId: userId.value } });
    return models.map(model => this.mapper.toEntity(model));
  }
}
```

### 3.3 工作流执行引擎

```typescript
// src/infrastructure/workflow/engine/graph-executor.ts
import { injectable, inject } from 'inversify';
import { Graph } from '../../../../domain/workflow/submodules/graph/entities/graph';
import { Node } from '../../../../domain/workflow/submodules/graph/entities/node';
import { Edge } from '../../../../domain/workflow/submodules/graph/entities/edge';
import { ExecutionContext } from './execution-context';
import { StateManager } from './state-manager';
import { NodeExecutorFactory } from '../nodes/factories/node-executor-factory';
import { ConditionEvaluator } from '../edges/evaluators/condition-evaluator';
import { ExecutionStrategy } from '../strategies/execution-strategy';
import { ParallelStrategy } from '../strategies/parallel-strategy';
import { SequentialStrategy } from '../strategies/sequential-strategy';

@injectable()
export class GraphExecutor {
  constructor(
    @inject('NodeExecutorFactory') private nodeExecutorFactory: NodeExecutorFactory,
    @inject('ConditionEvaluator') private conditionEvaluator: ConditionEvaluator,
    @inject('StateManager') private stateManager: StateManager
  ) {}

  async execute(graph: Graph, input: any): Promise<any> {
    // Create execution context
    const context = new ExecutionContext(graph, input);
    
    // Initialize state
    await this.stateManager.initialize(context);
    
    try {
      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(graph);
      
      // Execute graph
      const result = await strategy.execute(context, this);
      
      // Save final state
      await this.stateManager.saveFinalState(context, result);
      
      return result;
    } catch (error) {
      // Save error state
      await this.stateManager.saveErrorState(context, error);
      throw error;
    }
  }

  async executeNode(node: Node, context: ExecutionContext): Promise<any> {
    // Get node executor
    const executor = this.nodeExecutorFactory.createExecutor(node.type);
    
    // Execute node
    const result = await executor.execute(node, context);
    
    // Update state
    await this.stateManager.updateNodeState(context, node.id, result);
    
    return result;
  }

  async evaluateEdge(edge: Edge, context: ExecutionContext): Promise<boolean> {
    // Evaluate condition
    const result = await this.conditionEvaluator.evaluate(edge, context);
    
    // Update state
    await this.stateManager.updateEdgeState(context, edge.id, result);
    
    return result;
  }

  private determineExecutionStrategy(graph: Graph): ExecutionStrategy {
    // Check if graph has parallel execution nodes
    const hasParallelNodes = this.hasParallelExecutionNodes(graph);
    
    if (hasParallelNodes) {
      return new ParallelStrategy();
    } else {
      return new SequentialStrategy();
    }
  }

  private hasParallelExecutionNodes(graph: Graph): boolean {
    // Check if any node has parallel execution configuration
    for (const node of graph.nodes.values()) {
      if (node.metadata.parallel === true) {
        return true;
      }
    }
    return false;
  }
}
```

### 3.4 LLM客户端实现

```typescript
// src/infrastructure/external/llm/clients/openai-client.ts
import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { HttpClient } from '../../../common/http/http-client';
import { RateLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../utils/token-calculator';

@injectable()
export class OpenAIClient implements ILLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('RateLimiter') private rateLimiter: RateLimiter,
    @inject('TokenCalculator') private tokenCalculator: TokenCalculator,
    @inject('ConfigManager') private configManager: any
  ) {
    this.apiKey = this.configManager.get('llm.openai.apiKey');
    this.baseURL = this.configManager.get('llm.openai.baseURL', 'https://api.openai.com/v1');
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      // Prepare request
      const openaiRequest = this.prepareRequest(request);
      
      // Make API call
      const response = await this.httpClient.post(`${this.baseURL}/chat/completions`, openaiRequest, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Parse response
      const openaiResponse = response.data;
      
      // Convert to domain response
      return this.toLLMResponse(openaiResponse, request);
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async calculateTokens(request: LLMRequest): Promise<number> {
    return this.tokenCalculator.calculateTokens(request);
  }

  async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    const modelConfig = this.getModelConfig(request.model);
    const promptTokens = await this.calculateTokens(request);
    const completionTokens = response.tokenUsage?.completionTokens || 0;
    
    return (promptTokens * modelConfig.promptTokenPrice + 
            completionTokens * modelConfig.completionTokenPrice) / 1000;
  }

  private prepareRequest(request: LLMRequest): any {
    return {
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      stream: false
    };
  }

  private toLLMResponse(openaiResponse: any, request: LLMRequest): LLMResponse {
    const choice = openaiResponse.choices[0];
    const usage = openaiResponse.usage;

    return new LLMResponse(
      request.id,
      choice.message.content,
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      choice.finish_reason,
      new Date()
    );
  }

  private getModelConfig(model: string): ModelConfig {
    const configs = this.configManager.get('llm.openai.models', {});
    const config = configs[model];
    
    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return new ModelConfig(
      model,
      config.promptTokenPrice || 0.001,
      config.completionTokenPrice || 0.002,
      config.maxTokens || 4096
    );
  }
}
```

### 3.5 工具执行器

```typescript
// src/infrastructure/external/tools/executors/rest-tool-executor.ts
import { injectable, inject } from 'inversify';
import { IToolExecutor } from '../../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../../domain/tools/entities/tool-result';
import { HttpClient } from '../../../common/http/http-client';
import { ParameterAdapter } from '../adapters/parameter-adapter';

@injectable()
export class RestToolExecutor implements IToolExecutor {
  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('ParameterAdapter') private parameterAdapter: ParameterAdapter
  ) {}

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      // Get tool configuration
      const config = tool.config;
      
      // Prepare request
      const request = this.prepareRequest(config, execution);
      
      // Make HTTP call
      const response = await this.httpClient.request(request);
      
      // Process response
      const result = this.processResponse(response);
      
      return new ToolResult(
        execution.id,
        true,
        result,
        null,
        Date.now() - execution.startedAt.getTime()
      );
    } catch (error) {
      return new ToolResult(
        execution.id,
        false,
        null,
        error.message,
        Date.now() - execution.startedAt.getTime()
      );
    }
  }

  private prepareRequest(config: any, execution: ToolExecution): any {
    const url = this.interpolateUrl(config.url, execution.parameters);
    const method = config.method || 'GET';
    const headers = config.headers || {};
    const body = this.prepareBody(config, execution.parameters);

    return {
      url,
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
      params: method === 'GET' ? execution.parameters : undefined
    };
  }

  private interpolateUrl(url: string, parameters: any): string {
    return url.replace(/\{(\w+)\}/g, (match, key) => {
      return parameters[key] || match;
    });
  }

  private prepareBody(config: any, parameters: any): any {
    if (!config.body) {
      return undefined;
    }

    if (typeof config.body === 'string') {
      return this.interpolateUrl(config.body, parameters);
    }

    return this.parameterAdapter.adaptParameters(config.body, parameters);
  }

  private processResponse(response: any): any {
    // Extract data based on response configuration
    if (response.data) {
      return response.data;
    }
    
    return response;
  }
}
```

## 4. 数据库模型设计

### 4.1 会话模型

```typescript
// src/infrastructure/database/models/session.model.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ThreadModel } from './thread.model';

@Entity('sessions')
export class SessionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column('simple-array')
  threadIds: string[];

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'closed'],
    default: 'active'
  })
  state: string;

  @Column('jsonb')
  context: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ThreadModel, thread => thread.session)
  threads: ThreadModel[];
}
```

### 4.2 工作流模型

```typescript
// src/infrastructure/database/models/workflow.model.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { GraphModel } from './graph.model';

@Entity('workflows')
export class WorkflowModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  graphId: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  })
  state: string;

  @Column('jsonb')
  metadata: any;

  @Column()
  version: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => GraphModel, graph => graph.workflow)
  @JoinColumn()
  graph: GraphModel;
}
```

## 5. 连接管理

### 5.1 连接池管理

```typescript
// src/infrastructure/database/connections/connection-pool.ts
import { injectable } from 'inversify';
import { createConnection, Connection, ConnectionOptions } from 'typeorm';
import { ConfigManager } from '../../config/managers/config-manager';

@injectable()
export class ConnectionPool {
  private connection: Connection | null = null;
  private config: ConnectionOptions;

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {
    this.config = this.buildConnectionConfig();
  }

  async getConnection(): Promise<Connection> {
    if (!this.connection || !this.connection.isConnected) {
      this.connection = await createConnection(this.config);
    }
    return this.connection;
  }

  async closeConnection(): Promise<void> {
    if (this.connection && this.connection.isConnected) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private buildConnectionConfig(): ConnectionOptions {
    const dbConfig = this.configManager.get('database');
    
    return {
      type: dbConfig.type || 'postgres',
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      username: dbConfig.username || 'postgres',
      password: dbConfig.password || 'password',
      database: dbConfig.database || 'graph_agent',
      entities: [__dirname + '/../models/*.model.ts'],
      synchronize: dbConfig.synchronize || false,
      logging: dbConfig.logging || false,
      ssl: dbConfig.ssl || false,
      extra: dbConfig.extra || {}
    };
  }
}
```

## 6. 监控和日志

### 6.1 结构化日志

```typescript
// src/infrastructure/monitoring/logging/structured-logger.ts
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { ConfigManager } from '../../config/managers/config-manager';

@injectable()
export class StructuredLogger {
  private logger: Logger;

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {
    this.logger = this.createLogger();
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, this.formatMeta(meta));
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, {
      ...this.formatMeta(meta),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, this.formatMeta(meta));
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, this.formatMeta(meta));
  }

  private formatMeta(meta?: any): any {
    if (!meta) {
      return {};
    }

    return {
      timestamp: new Date().toISOString(),
      service: 'graph-agent',
      version: process.env.APP_VERSION || '1.0.0',
      ...meta
    };
  }

  private createLogger(): Logger {
    const logConfig = this.configManager.get('logging', {});
    
    return new Logger({
      level: logConfig.level || 'info',
      format: logConfig.format || 'json',
      transports: [
        // Add transports based on configuration
      ]
    });
  }
}
```

这个基础设施层设计提供了完整的技术实现支撑，包括配置管理、数据持久化、外部服务集成、工作流执行引擎等。所有组件都实现了领域层定义的接口，确保了架构的清晰性和可测试性。