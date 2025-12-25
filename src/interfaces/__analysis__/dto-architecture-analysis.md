# DTO 架构分析报告

## 问题诊断

### 当前错误的位置
```
src/application/sessions/dtos/
  ├── session.dto.ts          ❌ 应在接口层
  └── session-converter.ts    ❌ 应在接口层
```

### 职责混乱
- **SessionService** (应用层) 直接使用 SessionConverter，违反分层原则
- SessionService 返回 DTO (SessionInfo)，而非领域对象 (Session)
- 接口层尚未开发，无处适配 HTTP 请求/响应

### 分层规则冲突
| 层级 | SessionService 现状 | 应有状态 |
|------|------------------|--------|
| Domain | 依赖正常 ✓ | 依赖正常 ✓ |
| Application | 返回 DTO ❌ | 返回领域对象 |
| Interface | 不存在 | 应在此处理 DTO 转换 |

## 影响范围

**直接使用 SessionConverter 的位置：**
- `SessionService.getSessionInfo()` (L106)
- `SessionService.listSessions()` (L155)
- `SessionService.activateSession()` (L191, L207)
- `SessionService.suspendSession()` (L229, L245)
- `SessionService.terminateSession()` (L267, L275)
- `SessionService.updateSessionConfig()` (L309)
- `SessionService.addMessageToSession()` (L346)

## 核心问题

1. **DTO 定义位置** - 应在接口层，现在在应用层
2. **转换时机** - 应在接口层处理，现在在应用层
3. **应用层返回值** - 应返回领域对象，现在返回 DTO
4. **架构耦合** - 应用层被迫关心外部表现形式
