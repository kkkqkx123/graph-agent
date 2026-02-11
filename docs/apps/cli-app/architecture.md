# CLI 应用架构设计

## 整体架构

CLI 应用将遵循单一职责原则，作为现有 SDK API 层的命令行前端。整体架构分为以下几个层次：

```
┌─────────────────┐
│   CLI Layer     │  ← Commander.js 命令定义和参数解析
├─────────────────┤
│  Adapter Layer  │  ← 将 CLI 参数转换为 SDK API 调用
├─────────────────┤
│   SDK Layer     │  ← 现有的 API、Core、Types、Utils 层
└─────────────────┘
```

## 目录结构

```
apps/cli-app/
├── src/
│   ├── commands/           # 各个命令实现
│   │   ├── workflow/       # 工作流相关命令
│   │   ├── thread/         # 线程相关命令
│   │   ├── checkpoint/     # 检查点相关命令
│   │   ├── template/       # 模板相关命令
│   │   └── common/         # 通用命令功能
│   ├── adapters/           # CLI 适配器层
│   │   ├── workflow-adapter.ts
│   │   ├── thread-adapter.ts
│   │   ├── checkpoint-adapter.ts
│   │   └── template-adapter.ts
│   ├── utils/              # CLI 专用工具函数
│   │   ├── logger.ts       # CLI 日志工具
│   │   ├── validator.ts    # 输入验证工具
│   │   └── formatter.ts    # 输出格式化工具
│   ├── types/              # CLI 专用类型定义
│   │   └── cli-types.ts
│   ├── config/             # 配置管理
│   │   └── config-loader.ts
│   └── index.ts            # CLI 入口文件
├── bin/
│   └── modular-agent       # 可执行文件链接
├── package.json
├── tsconfig.json
└── README.md
```

## 命令实现模式

每个命令都将遵循相同的实现模式：

```typescript
// 示例：src/commands/workflow/register.ts
import { Command } from 'commander';
import { WorkflowAdapter } from '../../adapters/workflow-adapter';
import { createLogger } from '../../utils/logger';
import { formatWorkflow } from '../../utils/formatter';

export function createWorkflowRegisterCommand(): Command {
  const command = new Command('register');
  
  command
    .description('从文件注册工作流')
    .argument('<file>', '工作流定义文件路径')
    .option('-n, --name <name>', '工作流名称')
    .option('-t, --tags <tags...>', '工作流标签')
    .option('-v, --verbose', '详细输出')
    .action(async (filePath, options) => {
      const logger = createLogger({ verbose: options.verbose });
      const adapter = new WorkflowAdapter();
      
      try {
        logger.info(`正在注册工作流: ${filePath}`);
        
        const result = await adapter.registerWorkflow(filePath, {
          name: options.name,
          tags: options.tags
        });
        
        logger.success('工作流注册成功');
        console.log(formatWorkflow(result, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册失败: ${(error as Error).message}`);
        process.exit(1);
      }
    });
    
  return command;
}
```

## 适配器层设计

适配器层负责将 CLI 参数转换为 SDK API 调用：

```typescript
// 示例：src/adapters/workflow-adapter.ts
import { 
  WorkflowRegistryAPI, 
  type WorkflowDefinition 
} from '@modular-agent/sdk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export class WorkflowAdapter {
  private api: WorkflowRegistryAPI;
  
  constructor() {
    // 从全局 SDK 实例获取 API
    this.api = /* 获取 WorkflowRegistryAPI 实例 */;
  }
  
  async registerWorkflow(
    filePath: string, 
    options?: { name?: string; tags?: string[] }
  ): Promise<WorkflowDefinition> {
    // 读取工作流定义文件
    const fullPath = resolve(process.cwd(), filePath);
    const content = await readFile(fullPath, 'utf-8');
    
    // 解析工作流定义
    const workflowDef = this.parseWorkflowDefinition(content);
    
    // 应用选项
    if (options?.name) {
      workflowDef.name = options.name;
    }
    
    if (options?.tags) {
      workflowDef.tags = [...(workflowDef.tags || []), ...options.tags];
    }
    
    // 调用 SDK API
    return await this.api.create(workflowDef);
  }
  
  private parseWorkflowDefinition(content: string): WorkflowDefinition {
    // 根据文件扩展名选择解析器
    if (content.trim().startsWith('{')) {
      // JSON
      return JSON.parse(content);
    } else if (content.includes('---')) {
      // TOML
      const toml = require('toml');
      return toml.parse(content);
    } else {
      // TOML
      const toml = require('@iarna/toml');
      return toml.parse(content);
    }
  }
}
```

## 错误处理策略

CLI 应用将实现统一的错误处理策略：

```typescript
// src/utils/error-handler.ts
import { createLogger } from './logger';

export class CLIErrorHandler {
  private logger = createLogger();
  
  handleError(error: unknown, context: string = ''): never {
    if (error instanceof Error) {
      this.logger.error(`${context ? context + ': ' : ''}${error.message}`);
      
      // 在详细模式下输出堆栈跟踪
      if (process.env.DEBUG || process.argv.includes('--verbose')) {
        console.error('\n' + error.stack);
      }
    } else {
      this.logger.error(`${context}: ${String(error)}`);
    }
    
    process.exit(1);
  }
}

// 在命令中使用
try {
  // 执行命令逻辑
} catch (error) {
  new CLIErrorHandler().handleError(error, 'Workflow Registration');
}
```

## 配置管理

CLI 应用将支持多种配置来源：

```typescript
// src/config/config-loader.ts
import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

// 定义配置模式
const ConfigSchema = z.object({
  apiUrl: z.string().optional(),
  apiKey: z.string().optional(),
  defaultTimeout: z.number().optional(),
  verbose: z.boolean().optional()
});

export type CLIConfig = z.infer<typeof ConfigSchema>;

export class ConfigLoader {
  private explorer = cosmiconfig('modular-agent');
  
  async load(): Promise<CLIConfig> {
    const result = await this.explorer.search();
    
    if (result?.config) {
      // 验证配置
      return ConfigSchema.parse(result.config);
    }
    
    return {}; // 返回默认配置
  }
}
```

## 输出格式化

CLI 应用将支持多种输出格式：

```typescript
// src/utils/formatter.ts
import { table } from 'table'; // 假设使用 table 包
import chalk from 'chalk';

export function formatWorkflow(workflow: any, options: { verbose?: boolean } = {}) {
  if (options.verbose) {
    // 详细输出
    return JSON.stringify(workflow, null, 2);
  } else {
    // 简洁输出
    return `${chalk.blue(workflow.name)} (${workflow.id}) - ${workflow.status}`;
  }
}

export function formatWorkflowList(workflows: any[], options: { table?: boolean } = {}) {
  if (options.table) {
    const data = [
      ['ID', 'Name', 'Status', 'Created'],
      ...workflows.map(w => [w.id, w.name, w.status, w.createdAt])
    ];
    return table(data);
  } else {
    return workflows.map(w => formatWorkflow(w)).join('\n');
  }
}
```

## 测试策略

CLI 应用将采用分层测试策略：

1. **单元测试**：测试适配器层和工具函数
2. **集成测试**：测试命令与适配器的集成
3. **端到端测试**：测试完整命令流程

```typescript
// 示例测试
describe('Workflow Register Command', () => {
  it('should register workflow from file', async () => {
    const mockAdapter = new MockWorkflowAdapter();
    const command = createWorkflowRegisterCommand(mockAdapter);
    
    // 模拟文件内容
    jest.spyOn(fs, 'readFile').mockResolvedValue(mockWorkflowContent);
    
    await command.parseAsync(['path/to/workflow.json']);
    
    expect(mockAdapter.registerWorkflow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object)
    );
  });
});
```

## 扩展性考虑

架构设计考虑了未来的扩展需求：

1. **插件系统**：预留插件接口，允许第三方扩展命令
2. **国际化**：支持多语言输出
3. **主题定制**：支持输出样式的自定义
4. **API 版本管理**：兼容不同版本的 SDK API

这种架构确保了 CLI 应用既能够充分利用现有 SDK 功能，又具有良好的可维护性和扩展性。