# 接口层架构指导

## 接口层职责

接口层（Interface Layer）作为系统与外部世界的连接点：

1. **外部协议适配** - HTTP/gRPC 请求响应转换
2. **DTO 定义与转换** - 为外部接口设计数据结构
3. **输入验证与授权** - HTTP 中间件、权限检查
4. **应用服务调用** - 调用应用层服务编排业务逻辑
5. **错误响应格式** - 统一的 HTTP 错误应答

## 目录结构

```
src/interfaces/
├── http/
│   ├── sessions/
│   │   ├── dtos/
│   │   │   ├── session.dto.ts           # HTTP 请求/响应 DTO
│   │   │   └── session-converter.ts     # 领域对象 ↔ HTTP DTO
│   │   ├── controllers/
│   │   │   └── session.controller.ts    # HTTP 路由处理
│   │   ├── middleware/
│   │   │   └── session-validation.ts    # HTTP 验证中间件
│   │   └── routes.ts                    # 路由定义
│   │
│   ├── threads/
│   │   ├── dtos/
│   │   ├── controllers/
│   │   └── routes.ts
│   │
│   └── index.ts                         # 接口层导出
│
├── grpc/                                # 可选：gRPC 接口
│   └── sessions/
│       ├── protos/
│       ├── services/
│       └── converters/
│
└── __analysis__/                        # 分析文档
    ├── dto-architecture-analysis.md
    ├── refactoring-plan.md
    └── interface-layer-architecture.md
```

## 关键规则

### 依赖方向
```
HTTP Request
    ↓
Controller (接口层)
    ↓
Converter (接口层) ← 从Domain转换
    ↓
ApplicationService (应用层) ← 返回Domain对象
    ↓
Domain & Infrastructure
    ↓
HTTP Response (DTO)
```

### DTO 的生命周期
```
来自客户端 → 验证 → 应用服务 → 返回Domain对象 → 转换 → 发送给客户端
        (接口层)           (应用层)              (接口层)
```

### 不在接口层做的事
❌ 业务逻辑编排（应在应用层）
❌ 访问数据库（应在基础设施层）
❌ 直接返回领域对象（应转为 DTO）
❌ 验证业务规则（应在领域层）

## 实现示例

**创建会话流程：**
```typescript
// 1. HTTP 请求到达 Controller
POST /sessions { userId: "...", title: "..." }

// 2. Controller 调用应用服务
const sessionId = await sessionService.createSession(req.body);

// 3. 应用服务返回会话 ID（基本值）
// 4. Controller 获取完整的会话对象
const session = await sessionService.getSessionInfo(sessionId);

// 5. Converter 将 Session 转为 DTO
const converter = new SessionConverter();
const dto = converter.toDto(session);

// 6. 返回 HTTP 响应
res.status(201).json(dto);
```

## 与应用层的边界

| 层级 | 持有者 | 例外 |
|------|-------|------|
| 应用层持有 DTO 验证 | ApplicationService | ✓ 保留内部验证 DTO |
| 应用层持有转换器 | 不应该 | ✗ 删除 SessionConverter 依赖 |
| 应用层返回 DTO | 不应该 | ✗ 只返回领域对象 |
| 接口层持有 Converter | ✓ 应该 | 所有外部协议的转换 |
| 接口层持有 HTTP DTO | ✓ 应该 | 定义所有响应格式 |
