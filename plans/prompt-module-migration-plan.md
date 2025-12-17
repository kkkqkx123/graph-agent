# Prompt模块迁移到新架构的设计方案

## 1. 旧架构分析总结

### 核心功能组件
- **PromptRegistry**: 提示词注册表，管理提示词的注册、查找、版本管理
- **PromptLoader**: 提示词加载器，从文件系统加载提示词内容
- **PromptInjector**: 提示词注入器，将提示词注入到工作流状态
- **PromptConfigManager**: 配置管理器
- **PromptTypeRegistry**: 类型注册表

### 提示词类型系统
- **SystemPromptType**: 系统提示词
- **RulesPromptType**: 规则提示词
- **UserCommandPromptType**: 用户指令

### 配置结构
```
configs/prompts/
├── system/
│   ├── assistant.md
│   └── coder/
│       ├── index.md
│       └── 01_code_style.md
├── rules/
│   ├── safety.md
│   └── format.md
└── user_commands/
    ├── code_review.md
    └── data_analysis.md
```

## 2. 新架构设计原则

### 分层架构约束
- **Domain层**: 纯业务逻辑，定义prompt相关的实体、接口、值对象
- **Application层**: 业务服务，协调domain组件
- **Infrastructure层**: 技术实现，依赖domain层
- **Interface层**: 外部接口，依赖application层

### 配置集中管理
- 使用统一的配置加载模块
- 支持TOML格式配置文件
- 环境变量注入支持
- 模块化配置加载器

## 3. Prompt模块分层设计

### Domain层设计

#### 实体定义
```typescript
// src/domain/prompts/entities/prompt.ts
export interface Prompt {
  id: PromptId;
  name: string;
  type: PromptType;
  content: string;
  category: string;
  metadata: PromptMetadata;
  version: string;
  status: PromptStatus;
}

// src/domain/prompts/entities/prompt-config.ts
export interface PromptConfig {
  systemPrompt?: string;
  rules: string[];
  userCommand?: string;
  context?: string[];
  examples?: string[];
  constraints?: string[];
  format?: string;
}
```

#### 值对象
```typescript
// src/domain/prompts/value-objects/prompt-id.ts
export class PromptId {
  constructor(private readonly value: string) {}
  
  static create(category: string, name: string): PromptId {
    return new PromptId(`${category}.${name}`);
  }
}

// src/domain/prompts/value-objects/prompt-type.ts
export enum PromptType {
  SYSTEM = 'system',
  RULES = 'rules',
  USER_COMMAND = 'user_command',
  CONTEXT = 'context',
  EXAMPLES = 'examples',
  CONSTRAINTS = 'constraints',
  FORMAT = 'format'
}
```

#### 接口定义
```typescript
// src/domain/prompts/interfaces/prompt-repository.interface.ts
export interface IPromptRepository {
  findById(id: PromptId): Promise<Prompt | null>;
  findByCategory(category: string): Promise<Prompt[]>;
  save(prompt: Prompt): Promise<void>;
  delete(id: PromptId): Promise<void>;
}

// src/domain/prompts/interfaces/prompt-loader.interface.ts
export interface IPromptLoader {
  loadPrompt(category: string, name: string): Promise<string>;
  loadPrompts(category: string): Promise<Record<string, string>>;
  listPrompts(category?: string): Promise<string[]>;
}

// src/domain/prompts/interfaces/prompt-injector.interface.ts
export interface IPromptInjector {
  injectPrompts(state: IWorkflowState, config: PromptConfig): Promise<IWorkflowState>;
}
```

### Application层设计

#### 服务定义
```typescript
// src/application/prompts/services/prompt-service.ts
export class PromptService {
  constructor(
    private readonly promptRepository: IPromptRepository,
    private readonly promptLoader: IPromptLoader,
    private readonly promptInjector: IPromptInjector
  ) {}
  
  async getPrompt(id: PromptId): Promise<Prompt> {
    const prompt = await this.promptRepository.findById(id);
    if (!prompt) {
      throw new Error(`Prompt ${id.value} not found`);
    }
    return prompt;
  }
  
  async injectPromptsIntoWorkflow(
    workflowState: IWorkflowState,
    config: PromptConfig
  ): Promise<IWorkflowState> {
    return this.promptInjector.injectPrompts(workflowState, config);
  }
}
```

#### 工厂服务
```typescript
// src/application/prompts/services/prompt-system-factory.ts
export class PromptSystemFactory {
  static async createPromptSystem(
    configManager: IConfigManager,
    promptsDirectory: string = 'configs/prompts'
  ): Promise<{
    repository: IPromptRepository;
    loader: IPromptLoader;
    injector: IPromptInjector;
    service: PromptService;
  }> {
    // 实现创建prompt系统的逻辑
  }
}
```

### Infrastructure层设计

#### 配置加载器
```typescript
// src/infrastructure/config/loading/loaders/prompt-loader.ts
export class PromptLoader extends BaseModuleLoader {
  readonly moduleType = 'prompts';
  
  protected async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    // 根据文件路径调整优先级
    const processedFiles = files.map(file => {
      if (file.path.includes('system/')) {
        file.priority += 1000;
      } else if (file.path.includes('rules/')) {
        file.priority += 800;
      } else if (file.path.includes('user_commands/')) {
        file.priority += 600;
      }
      return file;
    });
    return processedFiles;
  }
  
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    // 合并prompt配置的逻辑
    const result: Record<string, any> = {};
    
    // 按类别分组
    const promptsByCategory: Record<string, Record<string, string>> = {};
    
    for (const config of configs) {
      const category = this.extractCategory(config.path);
      const name = this.extractName(config.path);
      
      if (!promptsByCategory[category]) {
        promptsByCategory[category] = {};
      }
      
      promptsByCategory[category][name] = config.content;
    }
    
    result.prompts = promptsByCategory;
    return result;
  }
}
```

#### 存储实现
```typescript
// src/infrastructure/prompts/repositories/prompt-repository.ts
export class PromptRepository implements IPromptRepository {
  constructor(private readonly configManager: IConfigManager) {}
  
  async findById(id: PromptId): Promise<Prompt | null> {
    const [category, name] = id.value.split('.');
    const content = this.configManager.get(`prompts.${category}.${name}`);
    
    if (!content) {
      return null;
    }
    
    return {
      id,
      name,
      type: this.determineType(category),
      content,
      category,
      metadata: {},
      version: '1.0.0',
      status: PromptStatus.ACTIVE
    };
  }
}
```

#### 注入器实现
```typescript
// src/infrastructure/prompts/services/prompt-injector.ts
export class PromptInjector implements IPromptInjector {
  constructor(private readonly promptLoader: IPromptLoader) {}
  
  async injectPrompts(state: IWorkflowState, config: PromptConfig): Promise<IWorkflowState> {
    const builder = new WorkflowStateBuilder();
    
    // 注入系统提示词
    if (config.systemPrompt) {
      const content = await this.promptLoader.loadPrompt('system', config.systemPrompt);
      builder.addMessage({ role: 'system', content });
    }
    
    // 注入规则提示词
    for (const rule of config.rules) {
      const content = await this.promptLoader.loadPrompt('rules', rule);
      builder.addMessage({ role: 'system', content });
    }
    
    // 注入用户指令
    if (config.userCommand) {
      const content = await this.promptLoader.loadPrompt('user_commands', config.userCommand);
      builder.addMessage({ role: 'user', content });
    }
    
    return builder.build();
  }
}
```

## 4. 配置管理集成

### Prompt配置模块注册
```typescript
// 在配置模块初始化时注册prompt加载器
const configLoadingModule = new ConfigLoadingModule(logger);
configLoadingModule.registerModuleRule({
  moduleType: 'prompts',
  loader: new PromptLoader(logger),
  schema: {
    type: 'object',
    properties: {
      prompts: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    }
  }
});
```

### 配置文件结构
```toml
# configs/prompts/__registry__.toml
[metadata]
name = "prompts_registry"
version = "1.0.0"
description = "提示词配置注册表"

[prompts]
# 系统提示词配置
system = {}
# 规则提示词配置
rules = {}
# 用户指令配置
user_commands = {}
```

## 5. 迁移实施计划

### 第一阶段：Domain层迁移
1. 创建prompt相关的实体、值对象、接口
2. 定义prompt类型系统和状态枚举
3. 创建领域服务接口

### 第二阶段：Infrastructure层迁移
1. 实现PromptLoader配置加载器
2. 实现PromptRepository存储
3. 实现PromptInjector注入器
4. 集成到配置管理模块

### 第三阶段：Application层迁移
1. 实现PromptService业务服务
2. 实现PromptSystemFactory工厂
3. 创建命令/查询处理器

### 第四阶段：Interface层集成
1. 创建REST API接口
2. 集成到工作流系统
3. 提供CLI工具

## 6. 测试策略

### 单元测试
- Domain层实体和值对象的验证
- Application层服务的业务逻辑测试
- Infrastructure层组件的技术实现测试

### 集成测试
- 配置加载模块的集成测试
- Prompt系统与工作流系统的集成测试
- 端到端的提示词注入流程测试

### 性能测试
- 大量提示词的加载性能
- 并发访问下的缓存效率
- 配置变更的响应时间

## 7. 关键设计决策

### 配置集中化
- 利用新架构的统一配置管理
- 避免重复的配置加载逻辑
- 支持环境变量注入

### 类型安全
- 使用TypeScript确保类型安全
- 明确的接口定义和实现分离
- 编译时错误检测

### 可扩展性
- 支持新的提示词类型
- 可插拔的加载器和注入器
- 模块化的配置结构

## 8. 风险评估与缓解

### 风险：配置兼容性问题
- **缓解**：提供配置迁移工具
- **缓解**：保持向后兼容性

### 风险：性能下降
- **缓解**：实现高效的缓存机制
- **缓解**：优化配置加载顺序

### 风险：功能缺失
- **缓解**：分阶段迁移，确保功能完整性
- **缓解**：充分的测试覆盖