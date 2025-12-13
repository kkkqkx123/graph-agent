# TypeScript版本配置驱动实现方案

## 1. 配置驱动概述

配置驱动是本框架的核心特性，允许系统通过配置文件动态调整行为，而无需修改代码。TypeScript版本将充分利用其动态特性，提供灵活、类型安全、高性能的配置管理系统。

## 2. 配置系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    配置系统架构                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  配置源         │  │  配置处理器      │  │  配置验证器   │ │
│  │  - 文件        │  │  - 环境变量      │  │  - Schema     │ │
│  │  - 环境变量    │  │  - 继承        │  │  - 业务规则   │ │
│  │  - 远程配置    │  │  - 转换        │  │  - 安全性     │ │
│  │  - 命令行参数  │  │  - 验证        │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  配置缓存       │  │  配置监控       │  │  配置注册表   │ │
│  │  - 内存缓存     │  │  - 文件监控     │  │  - 服务发现   │ │
│  │  - Redis缓存    │  │  - 热更新       │  │  - 动态加载   │ │
│  │  - 多级缓存     │  │  - 变更通知     │  │  - 版本管理   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 3. 配置源设计

### 3.1 配置源接口

```typescript
// src/infrastructure/config/sources/config-source.interface.ts
export interface IConfigSource {
  load(path?: string): Promise<Record<string, any>>;
  watch(path: string, callback: (config: Record<string, any>) => void): void;
  unwatch(path: string): void;
  exists(path: string): Promise<boolean>;
}

// src/infrastructure/config/sources/file-source.ts
import { IConfigSource } from './config-source.interface';
import { readFile, watch } from 'fs/promises';
import { watch as fsWatch } from 'fs';
import { parse } from 'yaml';
import { parse as parseToml } from '@iarna/toml';

export class FileConfigSource implements IConfigSource {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  async load(path?: string): Promise<Record<string, any>> {
    const configPath = path || this.getDefaultConfigPath();
    
    try {
      const content = await readFile(configPath, 'utf-8');
      return this.parseContent(content, configPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {}; // Return empty config if file doesn't exist
      }
      throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
  }

  watch(path: string, callback: (config: Record<string, any>) => void): void {
    if (this.watchers.has(path)) {
      return; // Already watching
    }

    const watcher = fsWatch(path, async (eventType) => {
      if (eventType === 'change') {
        try {
          const config = await this.load(path);
          callback(config);
        } catch (error) {
          console.error(`Error reloading config from ${path}:`, error);
        }
      }
    });

    this.watchers.set(path, watcher);
  }

  unwatch(path: string): void {
    const watcher = this.watchers.get(path);
    if (watcher) {
      watcher.close();
      this.watchers.delete(path);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await readFile(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  private parseContent(content: string, path: string): Record<string, any> {
    const ext = path.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
      case 'yml':
        return parse(content);
      case 'toml':
        return parseToml(content);
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  private getDefaultConfigPath(): string {
    const possiblePaths = [
      'config.yml',
      'config.yaml',
      'config.json',
      'config/default.yml',
      'config/default.yaml',
      'config/default.json'
    ];

    for (const path of possiblePaths) {
      if (this.exists(path)) {
        return path;
      }
    }

    return 'config.yml'; // Default fallback
  }
}

// src/infrastructure/config/sources/env-source.ts
import { IConfigSource } from './config-source.interface';

export class EnvironmentConfigSource implements IConfigSource {
  private prefix: string;

  constructor(prefix: string = 'APP_') {
    this.prefix = prefix;
  }

  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix)) {
        const configKey = key.substring(this.prefix.length).toLowerCase();
        config[configKey] = this.parseValue(value);
      }
    }

    return config;
  }

  watch(path: string, callback: (config: Record<string, any>) => void): void {
    // Environment variables don't change during runtime
    // This is a no-op
  }

  unwatch(path: string): void {
    // No-op
  }

  async exists(path: string): Promise<boolean> {
    return true; // Environment source always exists
  }

  private parseValue(value: string): any {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Try to parse as boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num)) return num;
      
      // Return as string
      return value;
    }
  }
}

// src/infrastructure/config/sources/remote-source.ts
import { IConfigSource } from './config-source.interface';
import { HttpClient } from '../../common/http/http-client';

export class RemoteConfigSource implements IConfigSource {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
    private apiKey?: string
  ) {}

  async load(path?: string): Promise<Record<string, any>> {
    const url = `${this.baseUrl}/config${path ? '/' + path : ''}`;
    
    try {
      const response = await this.httpClient.get(url, {
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load remote config: ${error.message}`);
    }
  }

  watch(path: string, callback: (config: Record<string, any>) => void): void {
    // Implement polling for remote config changes
    const interval = setInterval(async () => {
      try {
        const config = await this.load(path);
        callback(config);
      } catch (error) {
        console.error(`Error polling remote config:`, error);
      }
    }, 30000); // Poll every 30 seconds

    // Store interval for cleanup
    (this as any).pollingIntervals = (this as any).pollingIntervals || [];
    (this as any).pollingIntervals.push(interval);
  }

  unwatch(path: string): void {
    // Clear polling interval
    if ((this as any).pollingIntervals) {
      (this as any).pollingIntervals.forEach(clearInterval);
      (this as any).pollingIntervals = [];
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.httpClient.head(`${this.baseUrl}/config/${path}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}
```

## 4. 配置处理器设计

### 4.1 环境变量处理器

```typescript
// src/infrastructure/config/processors/env-processor.ts
import { IConfigProcessor } from '../interfaces/config-processor.interface';

export class EnvironmentProcessor implements IConfigProcessor {
  async process(config: Record<string, any>): Promise<Record<string, any>> {
    return this.replaceEnvironmentVariables(config);
  }

  private replaceEnvironmentVariables(obj: any): any {
    if (typeof obj === 'string') {
      return this.replaceInString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvironmentVariables(item));
    } else if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvironmentVariables(value);
      }
      return result;
    }
    return obj;
  }

  private replaceInString(str: string): string {
    // Replace ${VAR:default} patterns
    return str.replace(/\$\{([^}]+)\}/g, (match, varSpec) => {
      const [varName, defaultValue] = varSpec.split(':');
      const envValue = process.env[varName.trim()];
      return envValue !== undefined ? envValue : (defaultValue || '');
    });
  }
}
```

### 4.2 继承处理器

```typescript
// src/infrastructure/config/processors/inheritance-processor.ts
import { IConfigProcessor } from '../interfaces/config-processor.interface';

export class InheritanceProcessor implements IConfigProcessor {
  async process(config: Record<string, any>): Promise<Record<string, any>> {
    return this.resolveInheritance(config);
  }

  private resolveInheritance(obj: any, visited: Set<string> = new Set()): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    // Check for circular inheritance
    if (visited.has(JSON.stringify(obj))) {
      throw new Error('Circular inheritance detected');
    }
    visited.add(JSON.stringify(obj));

    const result: Record<string, any> = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '_extends' && typeof value === 'string') {
        // Handle inheritance
        const parentConfig = this.loadParentConfig(value);
        const merged = this.mergeConfigs(parentConfig, obj);
        return this.resolveInheritance(merged, visited);
      } else if (typeof value === 'object') {
        result[key] = this.resolveInheritance(value, visited);
      } else {
        result[key] = value;
      }
    }

    visited.delete(JSON.stringify(obj));
    return result;
  }

  private loadParentConfig(parentPath: string): Record<string, any> {
    // This would integrate with the config source to load parent config
    // For now, return empty object
    return {};
  }

  private mergeConfigs(parent: Record<string, any>, child: Record<string, any>): Record<string, any> {
    const result = { ...parent };
    
    for (const [key, value] of Object.entries(child)) {
      if (key === '_extends') {
        continue; // Skip inheritance marker
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = { ...parent[key], ...value };
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}
```

### 4.3 验证处理器

```typescript
// src/infrastructure/config/processors/validation-processor.ts
import { IConfigProcessor } from '../interfaces/config-processor.interface';
import { IConfigValidator } from '../interfaces/config-validator.interface';

export class ValidationProcessor implements IConfigProcessor {
  constructor(private validator: IConfigValidator) {}

  async process(config: Record<string, any>): Promise<Record<string, any>> {
    await this.validator.validate(config);
    return config;
  }
}
```

## 5. 配置验证器设计

### 5.1 Schema验证器

```typescript
// src/infrastructure/config/validators/schema-validator.ts
import { IConfigValidator } from '../interfaces/config-validator.interface';
import { Ajv } from 'ajv';

export class SchemaValidator implements IConfigValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async validate(config: Record<string, any>): Promise<void> {
    const schema = this.getSchema();
    const validate = this.ajv.compile(schema);
    
    if (!validate(config)) {
      const errors = validate.errors || [];
      throw new Error(`Configuration validation failed: ${this.formatErrors(errors)}`);
    }
  }

  private getSchema(): object {
    return {
      type: 'object',
      properties: {
        server: {
          type: 'object',
          properties: {
            port: { type: 'number', minimum: 1, maximum: 65535 },
            host: { type: 'string' },
            cors: { type: 'boolean' }
          },
          required: ['port']
        },
        database: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['postgres', 'mysql', 'sqlite'] },
            host: { type: 'string' },
            port: { type: 'number' },
            database: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' }
          },
          required: ['type', 'database']
        },
        llm: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['openai', 'anthropic', 'gemini'] },
            apiKey: { type: 'string' },
            model: { type: 'string' },
            maxTokens: { type: 'number', minimum: 1 }
          },
          required: ['provider', 'apiKey', 'model']
        },
        logging: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
            format: { type: 'string', enum: ['json', 'text'] }
          }
        }
      },
      required: ['server']
    };
  }

  private formatErrors(errors: any[]): string {
    return errors.map(error => {
      const path = error.instancePath || error.dataPath || 'root';
      return `${path}: ${error.message}`;
    }).join(', ');
  }
}
```

### 5.2 业务规则验证器

```typescript
// src/infrastructure/config/validators/business-validator.ts
import { IConfigValidator } from '../interfaces/config-validator.interface';

export class BusinessValidator implements IConfigValidator {
  async validate(config: Record<string, any>): Promise<void> {
    this.validateDatabaseConfig(config.database);
    this.validateLLMConfig(config.llm);
    this.validateSecurityConfig(config.security);
  }

  private validateDatabaseConfig(dbConfig: any): void {
    if (!dbConfig) return;

    if (dbConfig.type === 'sqlite' && !dbConfig.filename) {
      throw new Error('SQLite database requires filename configuration');
    }

    if (dbConfig.type !== 'sqlite' && (!dbConfig.host || !dbConfig.port)) {
      throw new Error('Database requires host and port configuration');
    }
  }

  private validateLLMConfig(llmConfig: any): void {
    if (!llmConfig) return;

    if (llmConfig.provider === 'openai' && !llmConfig.apiKey) {
      throw new Error('OpenAI provider requires API key');
    }

    if (llmConfig.maxTokens && llmConfig.maxTokens > 4096) {
      throw new Error('Max tokens cannot exceed 4096 for most models');
    }
  }

  private validateSecurityConfig(securityConfig: any): void {
    if (!securityConfig) return;

    if (securityConfig.jwt && !securityConfig.jwt.secret) {
      throw new Error('JWT configuration requires secret');
    }

    if (securityConfig.jwt && securityConfig.jwt.secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters');
    }
  }
}
```

## 6. 配置缓存设计

### 6.1 多级缓存

```typescript
// src/infrastructure/config/cache/multi-level-cache.ts
import { IConfigCache } from '../interfaces/config-cache.interface';
import { MemoryCache } from './memory-cache';
import { RedisCache } from './redis-cache';

export class MultiLevelCache implements IConfigCache {
  private l1Cache: MemoryCache;
  private l2Cache: RedisCache;

  constructor(l1Cache: MemoryCache, l2Cache: RedisCache) {
    this.l1Cache = l1Cache;
    this.l2Cache = l2Cache;
  }

  async get<T>(key: string): Promise<T | undefined> {
    // Try L1 cache first
    let value = await this.l1Cache.get<T>(key);
    if (value !== undefined) {
      return value;
    }

    // Try L2 cache
    value = await this.l2Cache.get<T>(key);
    if (value !== undefined) {
      // Promote to L1 cache
      await this.l1Cache.set(key, value);
      return value;
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.l1Cache.set(key, value, ttl),
      this.l2Cache.set(key, value, ttl)
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.l1Cache.delete(key),
      this.l2Cache.delete(key)
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear()
    ]);
  }
}

// src/infrastructure/config/cache/memory-cache.ts
import { IConfigCache } from '../interfaces/config-cache.interface';

export class MemoryCache implements IConfigCache {
  private cache: Map<string, { value: any; expiry?: number }> = new Map();

  async get<T>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
```

## 7. 配置监控设计

### 7.1 文件监控

```typescript
// src/infrastructure/config/watcher/file-watcher.ts
import { watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  watch(path: string, debounceMs: number = 1000): void {
    if (this.watchers.has(path)) {
      return; // Already watching
    }

    const watcher = watch(path, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        this.debounceChange(path, debounceMs);
      }
    });

    this.watchers.set(path, watcher);
  }

  unwatch(path: string): void {
    const watcher = this.watchers.get(path);
    if (watcher) {
      watcher.close();
      this.watchers.delete(path);
    }

    const timer = this.debounceTimers.get(path);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(path);
    }
  }

  private debounceChange(path: string, debounceMs: number): void {
    const timer = this.debounceTimers.get(path);
    if (timer) {
      clearTimeout(timer);
    }

    const newTimer = setTimeout(() => {
      this.emit('change', path);
      this.debounceTimers.delete(path);
    }, debounceMs);

    this.debounceTimers.set(path, newTimer);
  }

  close(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}
```

### 7.2 热更新管理器

```typescript
// src/infrastructure/config/watcher/hot-reload-manager.ts
import { EventEmitter } from 'events';
import { FileWatcher } from './file-watcher';
import { ConfigManager } from '../managers/config-manager';

export class HotReloadManager extends EventEmitter {
  private fileWatcher: FileWatcher;
  private configManager: ConfigManager;
  private isEnabled: boolean = false;

  constructor(configManager: ConfigManager) {
    super();
    this.configManager = configManager;
    this.fileWatcher = new FileWatcher();
    
    this.fileWatcher.on('change', this.handleFileChange.bind(this));
  }

  enable(configPaths: string[]): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    
    for (const path of configPaths) {
      this.fileWatcher.watch(path);
    }

    console.log('Hot reload enabled for config files:', configPaths);
  }

  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    this.fileWatcher.close();
    
    console.log('Hot reload disabled');
  }

  private async handleFileChange(path: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      console.log(`Config file changed: ${path}`);
      
      // Reload configuration
      await this.configManager.reloadConfig();
      
      // Emit reload event
      this.emit('reloaded', path);
      
      console.log('Configuration reloaded successfully');
    } catch (error) {
      console.error('Failed to reload configuration:', error);
      this.emit('error', error);
    }
  }
}
```

## 8. 配置管理器集成

### 8.1 主配置管理器

```typescript
// src/infrastructure/config/managers/config-manager.ts
import { injectable, inject } from 'inversify';
import { IConfigSource } from '../sources/config-source.interface';
import { IConfigProcessor } from '../interfaces/config-processor.interface';
import { IConfigValidator } from '../interfaces/config-validator.interface';
import { IConfigCache } from '../interfaces/config-cache.interface';
import { FileConfigSource } from '../sources/file-source';
import { EnvironmentConfigSource } from '../sources/env-source';
import { RemoteConfigSource } from '../sources/remote-source';
import { EnvironmentProcessor } from '../processors/env-processor';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { ValidationProcessor } from '../processors/validation-processor';
import { SchemaValidator } from '../validators/schema-validator';
import { BusinessValidator } from '../validators/business-validator';
import { MultiLevelCache } from '../cache/multi-level-cache';
import { MemoryCache } from '../cache/memory-cache';
import { RedisCache } from '../cache/redis-cache';
import { HotReloadManager } from '../watcher/hot-reload-manager';

@injectable()
export class ConfigManager {
  private config: Record<string, any> = {};
  private sources: IConfigSource[] = [];
  private processors: IConfigProcessor[] = [];
  private validators: IConfigValidator[] = [];
  private cache: IConfigCache;
  private hotReloadManager: HotReloadManager;

  constructor(
    @inject('HttpClient') httpClient?: any,
    @inject('RedisClient') redisClient?: any
  ) {
    this.setupSources(httpClient);
    this.setupProcessors();
    this.setupValidators();
    this.setupCache(redisClient);
    this.setupHotReload();
  }

  async load(configPath?: string): Promise<void> {
    try {
      // Try to get from cache first
      const cacheKey = configPath || 'default';
      let config = await this.cache.get(cacheKey);
      
      if (!config) {
        // Load from sources
        config = await this.loadFromSources(configPath);
        
        // Process configuration
        config = await this.processConfiguration(config);
        
        // Validate configuration
        await this.validateConfiguration(config);
        
        // Cache the configuration
        await this.cache.set(cacheKey, config);
      }
      
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    if (value !== undefined) {
      return value;
    }
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw new Error(`Configuration key '${key}' not found`);
  }

  async set(key: string, value: any): Promise<void> {
    this.setNestedValue(this.config, key, value);
    await this.cache.set('default', this.config);
  }

  async reload(): Promise<void> {
    this.cache.clear();
    await this.load();
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }

  async validate(): Promise<void> {
    await this.validateConfiguration(this.config);
  }

  private setupSources(httpClient?: any): void {
    this.sources = [
      new FileConfigSource(),
      new EnvironmentConfigSource()
    ];

    if (httpClient) {
      this.sources.push(new RemoteConfigSource(
        httpClient,
        process.env.REMOTE_CONFIG_URL || 'http://localhost:3000',
        process.env.REMOTE_CONFIG_API_KEY
      ));
    }
  }

  private setupProcessors(): void {
    this.processors = [
      new EnvironmentProcessor(),
      new InheritanceProcessor()
    ];
  }

  private setupValidators(): void {
    this.validators = [
      new SchemaValidator(),
      new BusinessValidator()
    ];
  }

  private setupCache(redisClient?: any): void {
    const memoryCache = new MemoryCache();
    
    if (redisClient) {
      const redisCache = new RedisCache(redisClient);
      this.cache = new MultiLevelCache(memoryCache, redisCache);
    } else {
      this.cache = memoryCache;
    }
  }

  private setupHotReload(): void {
    this.hotReloadManager = new HotReloadManager(this);
    
    if (this.get('feature.hotReload', false)) {
      const configPaths = this.get('hotReload.paths', ['config.yml']);
      this.hotReloadManager.enable(configPaths);
    }
  }

  private async loadFromSources(configPath?: string): Promise<Record<string, any>> {
    let mergedConfig: Record<string, any> = {};
    
    for (const source of this.sources) {
      try {
        const config = await source.load(configPath);
        mergedConfig = this.mergeConfigs(mergedConfig, config);
      } catch (error) {
        console.warn(`Failed to load from source: ${error.message}`);
      }
    }
    
    return mergedConfig;
  }

  private async processConfiguration(config: Record<string, any>): Promise<Record<string, any>> {
    let processedConfig = config;
    
    for (const processor of this.processors) {
      processedConfig = await processor.process(processedConfig);
    }
    
    return processedConfig;
  }

  private async validateConfiguration(config: Record<string, any>): Promise<void> {
    for (const validator of this.validators) {
      await validator.validate(config);
    }
  }

  private mergeConfigs(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    return { ...base, ...override };
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, prop) => {
      if (!current[prop]) {
        current[prop] = {};
      }
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }

  async dispose(): Promise<void> {
    this.hotReloadManager?.disable();
    await this.cache.clear();
  }
}
```

## 9. 配置文件示例

### 9.1 主配置文件

```yaml
# config.yml
server:
  port: ${PORT:3000}
  host: ${HOST:localhost}
  cors: true

database:
  type: ${DB_TYPE:postgres}
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5432}
  database: ${DB_NAME:graph_agent}
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD:password}
  ssl: ${DB_SSL:false}
  pool:
    min: ${DB_POOL_MIN:2}
    max: ${DB_POOL_MAX:10}

llm:
  provider: ${LLM_PROVIDER:openai}
  apiKey: ${LLM_API_KEY}
  model: ${LLM_MODEL:gpt-3.5-turbo}
  maxTokens: ${LLM_MAX_TOKENS:1000}
  temperature: ${LLM_TEMPERATURE:0.7}
  timeout: ${LLM_TIMEOUT:30000}

logging:
  level: ${LOG_LEVEL:info}
  format: ${LOG_FORMAT:json}
  transports:
    console: true
    file: ${LOG_FILE:logs/app.log}

feature:
  hotReload: ${HOT_RELOAD:true}
  metrics: ${METRICS:true}
  tracing: ${TRACING:false}

security:
  jwt:
    secret: ${JWT_SECRET}
    expiresIn: ${JWT_EXPIRES_IN:24h}
  rateLimit:
    windowMs: ${RATE_LIMIT_WINDOW:60000}
    max: ${RATE_LIMIT_MAX:100}

hotReload:
  paths:
    - config.yml
    - config/development.yml
    - config/local.yml
```

### 9.2 环境特定配置

```yaml
# config/development.yml
server:
  port: 3000

database:
  type: sqlite
  filename: ./data/dev.db

logging:
  level: debug
  format: text

feature:
  hotReload: true
  metrics: false
```

### 9.3 生产环境配置

```yaml
# config/production.yml
server:
  port: 80

database:
  type: postgres
  host: ${DB_HOST}
  port: 5432
  database: ${DB_NAME}
  username: ${DB_USER}
  password: ${DB_PASSWORD}
  ssl: true
  pool:
    min: 5
    max: 20

logging:
  level: warn
  format: json
  transports:
    console: false
    file: /var/log/graph-agent/app.log

feature:
  hotReload: false
  metrics: true
  tracing: true

security:
  jwt:
    secret: ${JWT_SECRET}
    expiresIn: 1h
  rateLimit:
    windowMs: 60000
    max: 1000
```

这个配置驱动实现方案提供了完整的配置管理功能，包括多源配置、环境变量替换、继承、验证、缓存和热更新等特性。它充分利用了TypeScript的类型系统，确保了配置的类型安全和可靠性。