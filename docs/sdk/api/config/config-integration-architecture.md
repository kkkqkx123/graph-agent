# 外部配置源集成架构设计方案

## 背景分析

通过对SDK核心目录的深入分析，发现当前架构具有以下特点：

### 现有配置集成机制
1. **节点模板系统**：通过`nodeTemplateRegistry`支持节点定义的复用和配置覆盖
2. **触发器模板系统**：通过`triggerTemplateRegistry`支持触发器定义的复用
3. **工作流变量系统**：通过`WorkflowVariable`定义工作流级别的变量声明
4. **配置覆盖机制**：在`WorkflowBuilder`中支持从模板添加节点时进行配置覆盖

### 架构分层
- **Core层**：负责工作流执行、图构建、验证等核心逻辑
- **API层**：提供统一的外部接口，包含builders、resources、operations等模块
- **应用层**：使用SDK的应用程序

## 方案1：API层配置解析模块设计

### 设计原则
1. **职责分离**：配置解析属于外部接口职责，应放在API层
2. **向后兼容**：保持现有API不变，新增配置解析功能
3. **格式支持**：支持TOML（主配置文件）和JSON（反序列化数据）
4. **类型安全**：提供完整的TypeScript类型定义

### 模块架构

```
sdk/api/
├── config/
│   ├── config-parser.ts          # 配置解析器主类
│   ├── toml-parser.ts           # TOML解析器
│   ├── json-parser.ts           # JSON解析器
│   ├── config-validator.ts      # 配置验证器
│   ├── config-transformer.ts    # 配置转换器（TOML/JSON → WorkflowDefinition）
│   └── types.ts                 # 配置相关类型定义
└── builders/
    └── workflow-builder.ts      # 扩展支持配置文件加载
```

### 核心接口设计

#### 1. ConfigParser 接口

```typescript
interface ConfigParser {
  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式 ('toml' | 'json')
   * @returns 解析后的配置对象
   */
  parse(content: string, format: 'toml' | 'json'): ParsedConfig;
  
  /**
   * 从文件路径加载并解析配置
   * @param filePath 文件路径
   * @returns 解析后的配置对象
   */
  loadFromFile(filePath: string): Promise<ParsedConfig>;
  
  /**
   * 验证配置的有效性
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate(config: ParsedConfig): ValidationResult;
}
```

#### 2. 配置类型定义

```typescript
// sdk/api/config/types.ts
interface WorkflowConfigFile {
  workflow: {
    id: string;
    name: string;
    description?: string;
    version: string;
    type?: 'base' | 'feature' | 'business';
    parameters?: Record<string, ParameterDefinition>;
    nodes: NodeConfigFile[];
    edges: EdgeConfigFile[];
    variables?: WorkflowVariable[];
    triggers?: (WorkflowTrigger | TriggerReference)[];
    config?: WorkflowConfig;
    metadata?: WorkflowMetadata;
  };
}

interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  required?: boolean;
  description?: string;
}

interface NodeConfigFile {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
}
```

#### 3. 配置转换器

```typescript
// sdk/api/config/config-transformer.ts
class ConfigTransformer {
  /**
   * 将配置文件格式转换为WorkflowDefinition
   * @param configFile 解析后的配置文件
   * @param parameters 运行时参数（用于模板替换）
   * @returns WorkflowDefinition
   */
  transformToWorkflow(
    configFile: WorkflowConfigFile,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    // 1. 处理参数替换（{{parameters.xxx}} → 实际值）
    const processedConfig = this.processParameters(configFile, parameters);
    
    // 2. 转换节点配置
    const nodes = processedConfig.workflow.nodes.map(node => 
      this.transformNode(node)
    );
    
    // 3. 转换边配置
    const edges = processedConfig.workflow.edges.map(edge => 
      this.transformEdge(edge)
    );
    
    // 4. 构建完整的WorkflowDefinition
    return {
      id: processedConfig.workflow.id,
      name: processedConfig.workflow.name,
      description: processedConfig.workflow.description,
      version: processedConfig.workflow.version,
      nodes,
      edges,
      variables: processedConfig.workflow.variables,
      triggers: processedConfig.workflow.triggers,
      config: processedConfig.workflow.config,
      metadata: processedConfig.workflow.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
}
```

### API集成方案

#### 1. 扩展WorkflowBuilder

```typescript
// sdk/api/builders/workflow-builder.ts
class WorkflowBuilder {
  // 现有方法...
  
  /**
   * 从配置文件创建工作流
   * @param configFile 配置文件路径或内容
   * @param format 配置格式 ('toml' | 'json')
   * @param parameters 运行时参数
   * @returns WorkflowBuilder实例
   */
  static fromConfig(
    configFile: string,
    format: 'toml' | 'json' = 'toml',
    parameters?: Record<string, any>
  ): WorkflowBuilder {
    const parser = new ConfigParser();
    const parsedConfig = parser.parse(configFile, format);
    const workflowDef = new ConfigTransformer().transformToWorkflow(parsedConfig, parameters);
    
    const builder = new WorkflowBuilder(workflowDef.id);
    // 填充builder的内部状态
    Object.assign(builder.workflow, workflowDef);
    return builder;
  }
}
```

#### 2. 新增ConfigurationAPI

```typescript
// sdk/api/resources/configuration/configuration-api.ts
class ConfigurationAPI {
  private parser: ConfigParser;
  private transformer: ConfigTransformer;
  
  constructor() {
    this.parser = new ConfigParser();
    this.transformer = new ConfigTransformer();
  }
  
  /**
   * 加载并注册工作流配置
   * @param filePath 配置文件路径
   * @param parameters 运行时参数
   */
  async loadAndRegisterWorkflow(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    const content = await fs.readFile(filePath, 'utf8');
    const parsedConfig = this.parser.parse(content, this.detectFormat(filePath));
    const workflowDef = this.transformer.transformToWorkflow(parsedConfig, parameters);
    
    // 注册到工作流注册表
    const workflowAPI = sdk.workflows;
    await workflowAPI.create(workflowDef);
    
    return workflowDef.id;
  }
  
  private detectFormat(filePath: string): 'toml' | 'json' {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.json' ? 'json' : 'toml';
  }
}
```

### 优势分析

#### 1. 职责清晰
- **API层**：负责外部配置的解析、验证和转换
- **Core层**：专注于工作流执行和核心逻辑，不受配置格式影响

#### 2. 扩展性强
- 支持多种配置格式（TOML为主，JSON为辅）
- 易于添加新的配置格式支持
- 参数化配置支持动态工作流生成

#### 3. 向后兼容
- 现有代码无需修改
- 新功能以可选方式提供
- 保持现有的编程式API不变

#### 4. 开发体验优化
- 提供声明式的配置文件方式
- 支持IDE语法高亮和自动补全（TOML/JSON）
- 降低复杂工作流的编写门槛

### 实现优先级

1. **第一阶段**：实现基础的TOML/JSON解析和转换功能
2. **第二阶段**：添加参数替换和模板支持
3. **第三阶段**：集成到现有的WorkflowBuilder和WorkflowRegistryAPI
4. **第四阶段**：添加完整的验证和错误处理机制

### 与现有机制的协同

- **节点模板**：配置文件中的节点可以直接引用现有节点模板
- **触发器模板**：配置文件中的触发器可以直接引用现有触发器模板  
- **工作流变量**：配置文件可以定义工作流变量，与现有变量系统完全兼容
- **配置覆盖**：支持在配置文件中定义默认参数，在运行时进行覆盖

### 示例配置文件

```toml
# example-workflow.toml
[workflow]
id = "example-chat"
name = "示例聊天工作流"
description = "一个简单的聊天工作流示例"
version = "1.0.0"

[workflow.parameters.model]
type = "string"
default = "gpt-4o-mini"
description = "使用的LLM模型"

[[workflow.nodes]]
id = "start"
type = "start"
name = "开始"

[[workflow.nodes]]
id = "chat_llm"
type = "llm"
name = "聊天LLM"

[workflow.nodes.config]
profileId = "{{parameters.model}}"
prompt = "请回答用户的问题：{{input.message}}"

[[workflow.nodes]]
id = "end"
type = "end"
name = "结束"

[[workflow.edges]]
from = "start"
to = "chat_llm"

[[workflow.edges]]
from = "chat_llm" 
to = "end"
```

此设计方案充分利用了现有架构的优势，同时提供了灵活的外部配置集成能力，符合模块化和职责分离的设计原则。