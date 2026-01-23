# 配置获取代码规范

## 一、架构原则

### 1.1 分层约束
- Domain层：只包含业务实体
- Infrastructure层：实现配置加载和函数式接口
- Services层：通过函数式接口读取配置
- Application层：使用Services层配置服务

### 1.2 函数式接口
Services层使用函数式接口读取配置，无需依赖注入：
```typescript
import { getConfig } from '../../infrastructure/config/config';

export class MyService {
  getConfig() {
    return getConfig('module.config_key', defaultValue);
  }
}
```

### 1.3 配置分类
基于生命周期：
- 启动时配置：应用启动加载，运行时不变
- 运行时配置：运行时可修改，支持热更新
- 会话级配置：会话独立，会话结束清理

## 二、配置获取

### 2.1 函数式接口
所有配置通过`getConfig()`函数获取：
```typescript
import { getConfig } from '../../infrastructure/config/config';

export class MyService {
  getLLMConfig() {
    const apiKey = getConfig('llm.openai.apiKey');
    const defaultModel = getConfig('llm.openai.defaultModel', 'gpt-4');
    return { apiKey, defaultModel };
  }
}
```

### 2.2 配置初始化
配置初始化在应用启动时进行，由基础设施层负责：
```typescript
import { initConfig } from '../../infrastructure/config/config';

// 应用启动时调用
await initConfig('./configs', logger);
```

### 2.2 配置键规范
- 格式：`模块.子模块.配置项`
- 示例：`llms.pools.default_pool`
- 规则：小写字母、下划线分隔、点号分隔层级

### 2.3 特殊场景
- 单元测试：允许通过参数传入配置
- 临时调试：允许环境变量覆盖配置

## 三、配置验证

### 3.1 验证时机
- 启动时验证：应用初始化验证
- 加载时验证：配置文件加载验证
- 使用时验证：配置使用时验证

### 3.2 验证层级
- 语法验证：TOML语法正确性
- 结构验证：配置结构符合Schema
- 业务验证：配置值符合业务约束

### 3.3 错误处理
- 配置不存在：使用默认值或抛出错误
- 格式错误：记录错误并拒绝加载
- 加载失败：捕获异常，提供错误信息

## 四、配置热更新

### 4.1 刷新机制
```typescript
import { refreshConfig } from '../../infrastructure/config/config';

// 刷新配置
await refreshConfig();
```

### 4.2 变更处理
- 配置刷新会重新加载所有配置文件
- 刷新后通过`getConfig()`获取的值会自动更新
- 刷新操作不应导致服务中断

## 五、文件组织

### 5.1 目录结构
```
configs/
├── global.toml
├── llms/
├── tools/
└── workflows/
```

### 5.2 文件命名
- 小写字母和下划线
- 有意义名称
- `.toml`扩展名

## 六、禁止行为

### 6.1 禁止直接解析文件
必须通过`getConfig()`函数获取配置。

### 6.2 禁止硬编码配置
必须从配置源读取配置值。注意：类别枚举等可以硬编码，这些本身就是固定的。但具体配置选项不能硬编码。

### 6.3 禁止在服务层初始化配置
Services层禁止调用`initConfig()`或`refreshConfig()`，这些操作只能在应用启动时进行。

### 6.4 禁止依赖注入配置管理器
Services层禁止使用`@inject(TYPES.ConfigManager)`，必须使用函数式接口。
