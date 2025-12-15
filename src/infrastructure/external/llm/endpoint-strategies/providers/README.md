# OpenAI Responses API 端点策略

## 概述

`OpenAIResponsesEndpointStrategy` 是专门为 OpenAI Responses API (GPT-5) 设计的端点策略实现。它提供了完全配置驱动的端点构建、请求头管理和认证处理，支持链式思考、改进的推理控制和更高效的参数组织。

## 特性

- ✅ **完全配置驱动**：无硬编码限制，支持任意自定义配置
- ✅ **灵活的端点路径**：支持自定义端点路径和绝对路径
- ✅ **多种认证方式**：支持 Bearer token、请求体认证、查询参数认证
- ✅ **自定义请求头**：完全可配置的请求头构建
- ✅ **OpenAI 特定功能**：支持组织 ID、项目 ID、Beta 版本等
- ✅ **全面的功能支持**：流式响应、多模态输入、工具调用、链式思考

## 基本使用

```typescript
import { OpenAIResponsesEndpointStrategy } from './openai-responses-endpoint-strategy';
import { ProviderConfigBuilder } from '../../parameter-mappers/interfaces/provider-config.interface';
import { ApiType } from '../../parameter-mappers/interfaces/provider-config.interface';

// 创建端点策略
const strategy = new OpenAIResponsesEndpointStrategy();

// 创建配置
const config = new ProviderConfigBuilder()
  .name('openai-responses')
  .apiType(ApiType.OPENAI_COMPATIBLE)
  .baseURL('https://api.openai.com')
  .apiKey('sk-your-api-key-here')
  .endpointStrategy(strategy)
  .parameterMapper(yourParameterMapper)
  .featureSupport(yourFeatureSupport)
  .extraConfig({
    endpointPath: 'v1/responses',
    authType: 'Bearer',
    enableBeta: true,
    betaVersion: 'responses=v1'
  })
  .build();
```

## 配置选项

### 端点配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `endpointPath` | string | `'responses'` | 端点路径，支持相对路径和绝对路径。注意：不包含版本号，因为 baseURL 通常已经包含 |

### 认证配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `authType` | string | `'Bearer'` | 认证类型（Bearer、Token 等） |
| `customAuth` | object | - | 自定义认证配置 |

#### 自定义认证配置

```typescript
// 请求体认证
customAuth: {
  type: 'body',
  field: 'api_key'
}

// 查询参数认证
customAuth: {
  type: 'query',
  param: 'api_key'
}

// 自定义头部认证
customAuth: {
  type: 'header',
  header: 'X-API-Key'
}
```

### OpenAI 特定配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `enableBeta` | boolean | `true` | 是否启用 Beta 功能 |
| `betaVersion` | string | `'responses=v1'` | Beta 版本标识 |
| `organization` | string | - | OpenAI 组织 ID |
| `project` | string | - | OpenAI 项目 ID |
| `apiVersion` | string | - | API 版本 |

### 请求头配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `defaultHeaders` | object | - | 默认请求头 |

```typescript
defaultHeaders: {
  'Content-Type': 'application/json',
  'User-Agent': 'MyApp/1.0',
  'X-Custom-Header': 'custom-value'
}
```

## 使用示例

### 基础配置

```typescript
const basicConfig = new ProviderConfigBuilder()
  .name('openai-responses')
  .apiType(ApiType.OPENAI_COMPATIBLE)
  .baseURL('https://api.openai.com/v1')  // 注意：baseURL 包含版本号
  .apiKey('sk-your-api-key')
  .endpointStrategy(new OpenAIResponsesEndpointStrategy())
  .parameterMapper(parameterMapper)
  .featureSupport(featureSupport)
  .extraConfig({
    endpointPath: 'responses',  // 注意：不包含版本号
    authType: 'Bearer',
    enableBeta: true
  })
  .build();
```

### 自定义端点

```typescript
const customEndpointConfig = new ProviderConfigBuilder()
  .name('openai-responses-custom')
  .apiType(ApiType.CUSTOM)
  .baseURL('https://custom-api.example.com/v1')  // 假设自定义 API 也包含版本
  .apiKey('custom-api-key')
  .endpointStrategy(new OpenAIResponsesEndpointStrategy())
  .parameterMapper(parameterMapper)
  .featureSupport(featureSupport)
  .extraConfig({
    endpointPath: 'custom-responses',  // 不包含版本号
    customAuth: {
      type: 'header',
      header: 'X-API-Key'
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value'
    }
  })
  .build();
```

### 完整配置

```typescript
const fullConfig = new ProviderConfigBuilder()
  .name('openai-responses-full')
  .apiType(ApiType.OPENAI_COMPATIBLE)
  .baseURL('https://api.openai.com/v1')  // 包含版本号
  .apiKey('sk-your-api-key')
  .endpointStrategy(new OpenAIResponsesEndpointStrategy())
  .parameterMapper(parameterMapper)
  .featureSupport(featureSupport)
  .defaultModel('gpt-5.1')
  .supportedModels(['gpt-5.1', 'gpt-5', 'gpt-5-mini'])
  .timeout(30000)
  .retryCount(3)
  .retryDelay(1000)
  .extraConfig({
    endpointPath: 'responses',  // 不包含版本号
    authType: 'Bearer',
    enableBeta: true,
    betaVersion: 'responses=v1',
    organization: 'org-your-organization-id',
    project: 'proj_your_project_id',
    defaultHeaders: {
      'Content-Type': 'application/json',
      'User-Agent': 'MyApp/1.0',
      'X-Request-ID': () => generateRequestId(),
      'X-Client-Version': '2.1.0'
    }
  })
  .build();
```

## API 参考

### 方法

#### `buildEndpoint(config: ProviderConfig, request: ProviderRequest): string`

构建端点 URL。

**参数：**
- `config`: 提供商配置
- `request`: 提供商请求

**返回：** 端点 URL 字符串

#### `buildHeaders(config: ProviderConfig): Record<string, string>`

构建请求头。

**参数：**
- `config`: 提供商配置

**返回：** 请求头对象

#### `handleAuthentication(request: any, config: ProviderConfig): any`

处理认证。

**参数：**
- `request`: 请求对象
- `config`: 提供商配置

**返回：** 处理后的请求对象

#### `validateConfig(config: ProviderConfig): { isValid: boolean; errors: string[] }`

验证配置。

**参数：**
- `config`: 提供商配置

**返回：** 验证结果

#### `getDefaultConfig(): Record<string, any>`

获取默认配置建议。

**返回：** 默认配置对象

### 功能支持方法

- `supportsStreaming(): boolean` - 是否支持流式响应
- `supportsMultimodal(): boolean` - 是否支持多模态输入
- `supportsTools(): boolean` - 是否支持工具调用
- `supportsChainOfThought(): boolean` - 是否支持链式思考

## 测试

运行测试：

```bash
npm test -- openai-responses-endpoint-strategy.test.ts
```

测试覆盖了以下场景：
- 基本功能测试
- 端点 URL 构建
- 请求头构建
- 认证处理
- 配置验证
- 集成测试

## 与 Python 实现的对比

这个 TypeScript 实现遵循了 Python 实现的设计原则：

1. **配置驱动**：所有行为都通过配置控制，无硬编码限制
2. **灵活性**：支持多种认证方式和自定义配置
3. **可扩展性**：易于添加新功能和自定义行为
4. **类型安全**：充分利用 TypeScript 的类型系统

## 注意事项

1. **无模型限制**：实现不包含任何硬编码的模型检查，完全依赖配置
2. **配置验证**：只验证配置的结构和必需字段，不限制具体值
3. **向后兼容**：保持与现有接口的完全兼容性
4. **错误处理**：提供详细的错误信息以便调试

## 相关文件

- `openai-responses-endpoint-strategy.ts` - 主要实现
- `openai-responses-endpoint-strategy.test.ts` - 测试文件
- `openai-responses-config-example.ts` - 配置示例
- `base-endpoint-strategy.ts` - 基础类
- `endpoint-strategy.interface.ts` - 接口定义