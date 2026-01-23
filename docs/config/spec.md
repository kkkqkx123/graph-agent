# 配置获取代码规范

## 一、架构原则

### 1.1 分层约束
- Domain层：只包含业务实体
- Infrastructure层：定义配置接口，实现配置加载
- Services层：通过`IConfigManager`接口使用配置
- Application层：使用Services层配置服务

### 1.2 依赖倒置
Services层必须依赖`IConfigManager`接口，禁止直接依赖具体实现类。

### 1.3 配置分类
基于生命周期：
- 启动时配置：应用启动加载，运行时不变
- 运行时配置：运行时可修改，支持热更新
- 会话级配置：会话独立，会话结束清理

## 二、配置获取

### 2.1 统一接口
所有配置通过`IConfigManager`获取：
```typescript
export class MyService {
  constructor(@inject(TYPES.ConfigManager) private configManager: IConfigManager) {}
  
  getConfig() {
    return this.configManager.get('module.config_key', defaultValue);
  }
}
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

### 4.1 监听机制
```typescript
const unsubscribe = configManager.watch('key', (newValue) => {
  // 处理变更
});
unsubscribe();
```

### 4.2 变更处理
- 配置变更不应导致服务中断
- 监听器避免执行耗时操作
- 支持批量变更处理

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
必须通过`IConfigManager`接口获取配置。

### 6.2 禁止硬编码配置
必须从配置源读取配置值。注意：类别枚举等可以硬编码，这些本身就是固定的。但具体配置选项不能硬编码。

### 6.3 禁止违反分层
Services层禁止直接依赖Infrastructure具体类。
