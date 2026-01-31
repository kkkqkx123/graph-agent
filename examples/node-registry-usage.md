# 节点注册功能使用示例

本文档展示如何使用SDK的节点注册功能来创建和管理节点模板。

## 概述

节点注册功能允许您预定义节点配置模板，并在工作流中通过名称引用这些模板。这样可以：
- 减少重复配置
- 提高工作流配置的可维护性
- 实现节点配置的标准化和复用

## 基本用法

### 1. 注册节点模板

```typescript
import { SDK } from '@your-org/sdk';
import { NodeType } from '@your-org/sdk/types';

const sdk = new SDK();

// 定义一个HTTP请求节点模板
const httpRequestTemplate = {
  name: 'http-request',
  type: NodeType.CODE,
  description: '发送HTTP请求并返回响应',
  config: {
    scriptName: 'http-request',
    scriptType: 'javascript',
    risk: 'medium',
    timeout: 30
  },
  metadata: {
    category: 'network',
    tags: ['http', 'api', 'network'],
    author: 'developer'
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 注册节点模板
await sdk.nodeTemplates.registerTemplate(httpRequestTemplate);
```

### 2. 在工作流中使用节点引用

```typescript
import { NodeType } from '@your-org/sdk/types';

const workflow = {
  id: 'example-workflow',
  name: 'Example Workflow',
  nodes: [
    {
      id: 'start',
      type: NodeType.START,
      name: 'Start',
      config: {},
      outgoingEdgeIds: ['edge1'],
      incomingEdgeIds: []
    },
    {
      id: 'http-call',
      type: NodeType.CODE, // 使用实际的节点类型
      name: 'Make HTTP Call',
      config: {
        templateName: 'http-request', // 引用节点模板
        nodeId: 'http-call', // 节点ID
        nodeName: 'Make HTTP Call', // 可选：覆盖节点名称
        configOverride: { // 可选：配置覆盖
          timeout: 60
        }
      },
      outgoingEdgeIds: ['edge2'],
      incomingEdgeIds: ['edge1']
    },
    {
      id: 'end',
      type: NodeType.END,
      name: 'End',
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: ['edge2']
    }
  ],
  edges: [
    { id: 'edge1', sourceNodeId: 'start', targetNodeId: 'http-call' },
    { id: 'edge2', sourceNodeId: 'http-call', targetNodeId: 'end' }
  ],
  version: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 注册工作流（节点引用会在预处理阶段自动展开）
await sdk.workflows.registerWorkflow(workflow);
```

## 高级用法

### 1. 批量注册节点模板

```typescript
const templates = [
  {
    name: 'http-get',
    type: NodeType.CODE,
    description: '发送GET请求',
    config: {
      scriptName: 'http-get',
      scriptType: 'javascript',
      risk: 'low',
      timeout: 30
    },
    metadata: {
      category: 'network',
      tags: ['http', 'get']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: 'http-post',
    type: NodeType.CODE,
    description: '发送POST请求',
    config: {
      scriptName: 'http-post',
      scriptType: 'javascript',
      risk: 'medium',
      timeout: 30
    },
    metadata: {
      category: 'network',
      tags: ['http', 'post']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

await sdk.nodeTemplates.registerTemplates(templates);
```

### 2. 查询节点模板

```typescript
// 获取所有节点模板
const allTemplates = await sdk.nodeTemplates.getTemplates();

// 按类型过滤
const codeTemplates = await sdk.nodeTemplates.getTemplatesByType('CODE');

// 按分类过滤
const networkTemplates = await sdk.nodeTemplates.getTemplatesByCategory('network');

// 按标签过滤
const httpTemplates = await sdk.nodeTemplates.getTemplatesByTags(['http']);

// 搜索节点模板
const searchResults = await sdk.nodeTemplates.searchTemplates('http');

// 获取节点模板摘要
const summaries = await sdk.nodeTemplates.getTemplateSummaries();
```

### 3. 更新节点模板

```typescript
// 更新节点模板
await sdk.nodeTemplates.updateTemplate('http-request', {
  description: '发送HTTP请求并返回响应（更新版）',
  config: {
    scriptName: 'http-request',
    scriptType: 'javascript',
    risk: 'low', // 降低风险等级
    timeout: 60  // 增加超时时间
  },
  updatedAt: Date.now()
});
```

### 4. 删除节点模板

```typescript
// 删除单个节点模板
await sdk.nodeTemplates.deleteTemplate('http-request');

// 批量删除节点模板
await sdk.nodeTemplates.clearTemplates();
```

### 5. 导入和导出节点模板

```typescript
// 导出节点模板
const json = await sdk.nodeTemplates.exportTemplate('http-request');
console.log(json);

// 导入节点模板
const templateName = await sdk.nodeTemplates.importTemplate(json);
console.log(`Imported template: ${templateName}`);
```

### 6. 验证节点模板

```typescript
const template = {
  name: 'invalid-template',
  type: NodeType.CODE,
  description: '无效的节点模板',
  config: {
    // 缺少必需字段
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const validationResult = await sdk.nodeTemplates.validateTemplate(template);
if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
}
```

## 实际应用场景

### 场景1：API调用节点库

```typescript
// 注册常用的API调用节点模板
const apiTemplates = [
  {
    name: 'api-get-user',
    type: NodeType.CODE,
    description: '获取用户信息',
    config: {
      scriptName: 'api-get-user',
      scriptType: 'javascript',
      risk: 'low',
      timeout: 30
    },
    metadata: {
      category: 'api',
      tags: ['user', 'get', 'api']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: 'api-create-user',
    type: NodeType.CODE,
    description: '创建用户',
    config: {
      scriptName: 'api-create-user',
      scriptType: 'javascript',
      risk: 'medium',
      timeout: 30
    },
    metadata: {
      category: 'api',
      tags: ['user', 'create', 'api']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

await sdk.nodeTemplates.registerTemplates(apiTemplates);

// 在工作流中使用
const workflow = {
  id: 'user-management-workflow',
  name: 'User Management Workflow',
  nodes: [
    {
      id: 'get-user',
      type: NodeType.CODE,
      name: 'Get User',
      config: {
        templateName: 'api-get-user',
        nodeId: 'get-user',
        configOverride: {
          timeout: 60
        }
      },
      outgoingEdgeIds: ['edge1'],
      incomingEdgeIds: []
    },
    {
      id: 'create-user',
      type: NodeType.CODE,
      name: 'Create User',
      config: {
        templateName: 'api-create-user',
        nodeId: 'create-user'
      },
      outgoingEdgeIds: [],
      incomingEdgeIds: ['edge1']
    }
  ],
  edges: [
    { id: 'edge1', sourceNodeId: 'get-user', targetNodeId: 'create-user' }
  ],
  version: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now()
};
```

### 场景2：数据处理节点

```typescript
// 注册数据处理节点模板
const dataProcessingTemplates = [
  {
    name: 'data-transform',
    type: NodeType.CODE,
    description: '数据转换',
    config: {
      scriptName: 'data-transform',
      scriptType: 'javascript',
      risk: 'low',
      timeout: 30
    },
    metadata: {
      category: 'data',
      tags: ['transform', 'data']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: 'data-validate',
    type: NodeType.CODE,
    description: '数据验证',
    config: {
      scriptName: 'data-validate',
      scriptType: 'javascript',
      risk: 'low',
      timeout: 30
    },
    metadata: {
      category: 'data',
      tags: ['validate', 'data']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

await sdk.nodeTemplates.registerTemplates(dataProcessingTemplates);
```

## 最佳实践

### 1. 命名规范

使用清晰、描述性的名称：
- ✅ `http-get-user`
- ✅ `data-transform-json`
- ❌ `node1`
- ❌ `template`

### 2. 分类和标签

合理使用分类和标签：
```typescript
{
  name: 'api-get-user',
  type: NodeType.CODE,
  description: '获取用户信息',
  config: { /* ... */ },
  metadata: {
    category: 'api', // 主要分类
    tags: ['user', 'get', 'rest'], // 详细标签
    author: 'team-name', // 作者信息
    version: '1.0.0' // 版本信息
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

### 3. 配置覆盖

谨慎使用配置覆盖，确保覆盖的配置是有效的：
```typescript
{
  id: 'custom-http-call',
  type: NodeType.CODE,
  name: 'Custom HTTP Call',
  config: {
    templateName: 'http-request',
    nodeId: 'custom-http-call',
    configOverride: {
      timeout: 120, // 增加超时时间
      retries: 3    // 添加重试次数
    }
  },
  outgoingEdgeIds: [],
  incomingEdgeIds: []
}
```

### 4. 版本管理

在元数据中包含版本信息：
```typescript
{
  name: 'http-request',
  type: NodeType.CODE,
  description: '发送HTTP请求并返回响应',
  config: { /* ... */ },
  metadata: {
    version: '2.0.0',
    changelog: '增加了重试机制'
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

## 注意事项

1. **节点引用展开**：节点引用在工作流注册时的预处理阶段展开，不会影响执行性能
2. **配置验证**：节点模板在注册时会通过现有的验证函数进行验证
3. **向后兼容**：现有的工作流完全不受影响，节点引用是可选功能
4. **名称唯一性**：节点模板名称必须唯一，重复注册会抛出错误
5. **配置覆盖**：配置覆盖会合并到模板配置中，确保覆盖的配置是有效的

## 总结

节点注册功能提供了一种简单而强大的方式来管理和复用节点配置。通过预定义节点模板，您可以：
- 减少重复配置
- 提高工作流的可维护性
- 实现配置的标准化
- 简化工作流开发流程

开始使用节点注册功能，让您的SDK工作流更加高效和易于维护！