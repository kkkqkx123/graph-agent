# DTO 架构重构方案

## 实施步骤

### 第一阶段：调整应用层

**修改 SessionService 返回值**

```typescript
// 改前
async getSessionInfo(sessionId: string): Promise<SessionInfo | null>
async listSessions(): Promise<SessionInfo[]>

// 改后
async getSessionInfo(sessionId: string): Promise<Session | null>
async listSessions(): Promise<Session[]>
```

**删除以下导入**
```typescript
// 删除
import { SessionInfo, SessionConverter } from '../dtos';

// 保留与业务相关的导入
import { Session } from '../../../domain/sessions/entities/session';
```

**删除以下方法中的转换逻辑**
- `getSessionInfo()` L106 的 `toDto()` 调用
- `listSessions()` L155 的 `toDtoList()` 调用  
- 所有 `activateSession/suspendSession/terminateSession` 中的 `toDto()` 调用
- `updateSessionConfig()` L309 的 `toDto()` 调用
- `addMessageToSession()` L346 的 `toDto()` 调用

**保留工厂方法使用**
```typescript
// 保留这部分，因为涉及请求参数解析
const { userId, title, config } = SessionConverter.fromCreateRequest(validatedRequest);
```

### 第二阶段：创建接口层结构

```
src/interfaces/http/
  └── sessions/
      ├── dtos/
      │   ├── session.dto.ts           # 复制自应用层
      │   └── session-converter.ts     # 复制自应用层
      └── controllers/
          └── session.controller.ts    # 待开发
```

### 第三阶段：实现 HTTP 控制器

```typescript
// src/interfaces/http/sessions/controllers/session.controller.ts
export class SessionController {
  constructor(private sessionService: SessionService) {}

  async getSession(req: Request, res: Response) {
    const session = await this.sessionService.getSessionInfo(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const converter = new SessionConverter();
    const dto = converter.toDto(session);
    res.json(dto);
  }

  async listSessions(req: Request, res: Response) {
    const sessions = await this.sessionService.listSessions();
    const converter = new SessionConverter();
    const dtos = converter.toDtoList(sessions);
    res.json(dtos);
  }
}
```

### 第四阶段：清理应用层

- 删除 `src/application/sessions/dtos/` 目录
- 更新 `src/application/sessions/index.ts` 中的导出

## 依赖更新

**应用层保持纯净**
```typescript
// SessionService 仅依赖
- Domain (Session, SessionRepository, etc.)
- Application (DtoValidationError)
- Logger
```

**接口层完全负责**
```typescript
// HTTP Controller 依赖
- Application (SessionService)
- Interface.dtos (SessionConverter, SessionInfo DTO)
```

## 风险评估

| 项 | 风险 | 缓解 |
|-----|------|------|
| SessionService 返回值变更 | 其他消费方受影响 | 仅 HTTP 接口消费，接口层未开发 |
| 测试更新 | 需修改单元测试 | 单元测试应测试领域对象 |
| 逐步迁移 | 过渡期混乱 | 一次性完成迁移 |
