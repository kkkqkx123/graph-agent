# Resources 目录结构分析

## 当前结构及问题

### 现状
```
resources/
├── dynamic/
│   └── prompts/
│       ├── fragments/
│       │   ├── composer.ts
│       │   ├── environment.ts
│       │   ├── available-tools.ts
│       │   ├── current-time.ts
│       │   └── index.ts
│       ├── context.ts              ← 核心业务逻辑（混合了两层）
│       └── index.ts
├── predefined/
│   ├── prompts/                    ← 静态模板（明确的用途）
│   │   ├── system/
│   │   ├── user-commands/
│   │   └── fragments/
│   ├── tools/
│   ├── prompt-templates/
│   └── index.ts
└── index.ts                         ← 统一导出点
```

### 核心问题

#### 1️⃣ 命名混淆（Category Confusion）
```
dynamic/prompts/     ← "prompts" 是什么意思？
predefined/prompts/  ← 同样叫 "prompts"，但完全不同的东西
```

**问题**：
- `dynamic/prompts/` = **运行时生成的动态上下文注入**（新设计的两层）
- `predefined/prompts/` = **静态的系统提示模板**（旧设计）
- 名字相同但职责完全不同，容易混淆

#### 2️⃣ 层级混合（Layer Mixing）

`context.ts` 中混合了三个层级：
```typescript
// 层级 1: 核心业务接口
export async function buildDynamicPromptInjection(
  context: DynamicPromptContext,
  config?: DynamicContextConfig,
): Promise<DynamicPromptInjection>

// 层级 2: 辅助函数（不该公开）
export function buildDynamicContextText(...)
export function buildEnvironmentPrompt()  
export function buildCompletePrompt(...)

// 层级 3: 内部工具（完全是实现细节）
export function setEnvironmentInfo()
export function resetEnvironmentInfo()
export function getEnvironmentInfo()
```

**问题**：
- 没有明确的公开 API vs 内部实现的分离
- 应用层不知道调用哪个才对
- 导出了太多实现细节

#### 3️⃣ 导出结构不对称

```
resources/
├── dynamic/
│   └── prompts/          ← 直接导出 prompts 中的东西
│                           （缺少 dynamic/index.ts 的抽象）
├── predefined/
│   ├── prompts/
│   ├── tools/
│   └── index.ts          ← 有统一的导出点
└── index.ts
```

**问题**：
- `dynamic/` 缺少 `index.ts`（中间层）
- 直接暴露 `prompts/` 给外部
- 与 `predefined/` 的结构不对称

#### 4️⃣ 新设计与旧实现的边界不清

现在有两种概念在混合：
- **新设计**：`DynamicPromptContext` → `DynamicPromptInjection`（两层注入）
- **旧实现**：`DynamicRuntimeContext` + `buildDynamicContextMessages()`（消息生成）

目录结构没有体现这个转变。

---

## 建议的重新划分方案

### 方案：按职责分离（Type-Based Separation）

```
resources/
├── dynamic/
│   ├── system-context/           ← 动态系统提示（稳定）
│   │   ├── fragments/
│   │   │   ├── environment.ts
│   │   │   ├── current-time.ts
│   │   │   └── index.ts
│   │   ├── builder.ts            ← 构建稳定系统提示
│   │   └── index.ts
│   │
│   ├── user-context/             ← 动态用户上下文（变化）
│   │   ├── fragments/
│   │   │   ├── todo-list.ts      (TODO: 待实现)
│   │   │   ├── pinned-files.ts   (TODO: 待实现)
│   │   │   └── index.ts
│   │   ├── builder.ts            ← 构建变化用户上下文
│   │   └── index.ts
│   │
│   ├── injection.ts              ← 统一的注入接口（核心 API）
│   └── index.ts                  ← 统一导出点
│
├── predefined/
│   ├── prompts/
│   ├── tools/
│   └── index.ts
│
└── index.ts
```

### 模块职责划分

#### 1. `dynamic/system-context/` - 系统级提示（稳定）

```typescript
// dynamic/system-context/builder.ts
export async function buildSystemContextPrompt(
  config: DynamicContextConfig,
): Promise<string>;
// 内容：时间、环境、工具文档等
// 特点：注入后基本不变
```

**内部结构**：
- `fragments/environment.ts` - 环境信息
- `fragments/current-time.ts` - 当前时间
- `fragments/available-tools.ts` - 工具文档
- `builder.ts` - 组合这些片段

#### 2. `dynamic/user-context/` - 用户级上下文（变化）

```typescript
// dynamic/user-context/builder.ts
export async function buildUserContextContent(
  context: DynamicRuntimeContext,
): Promise<string>;
// 内容：TODO、固定文件、任务状态等
// 特点：频繁变化，不影响系统消息缓存
```

**内部结构**：
- `fragments/todo-list.ts` - TODO 项（待实现）
- `fragments/pinned-files.ts` - 固定文件（待实现）
- `builder.ts` - 组合这些片段

#### 3. `dynamic/injection.ts` - 统一的注入接口（核心 API）

```typescript
// dynamic/injection.ts - 这是应用层应该直接导入的
import { buildSystemContextPrompt } from "./system-context/index.js";
import { buildUserContextContent } from "./user-context/index.js";

export async function buildDynamicPromptInjection(
  context: DynamicPromptContext,
  config?: DynamicContextConfig,
): Promise<DynamicPromptInjection> {
  // 集成两层构建
  const staticSystem = await buildSystemContextPrompt(config);
  const dynamicUserContext = context.runtimeContext
    ? await buildUserContextContent(context.runtimeContext)
    : undefined;

  return { staticSystem, dynamicUserContext };
}
```

#### 4. `dynamic/index.ts` - 统一导出

```typescript
// dynamic/index.ts
// 只导出核心 API，隐藏实现细节
export { buildDynamicPromptInjection } from "./injection.js";

// 可选：导出类型
export type { DynamicPromptContext, DynamicPromptInjection } from "@wf-agent/types";
```

---

## 迁移步骤

### Phase 1: 创建新的目录结构

```bash
# 创建新目录
mkdir -p sdk/resources/dynamic/system-context/fragments
mkdir -p sdk/resources/dynamic/user-context/fragments

# 移动文件
mv sdk/resources/dynamic/prompts/fragments/environment.ts \
   sdk/resources/dynamic/system-context/fragments/

mv sdk/resources/dynamic/prompts/fragments/current-time.ts \
   sdk/resources/dynamic/system-context/fragments/

mv sdk/resources/dynamic/prompts/fragments/available-tools.ts \
   sdk/resources/dynamic/system-context/fragments/
```

### Phase 2: 创建新的构建函数

```typescript
// dynamic/system-context/builder.ts
export async function buildSystemContextPrompt(
  config?: DynamicContextConfig,
): Promise<string> {
  const environmentPrompt = buildEnvironmentPrompt();
  const contentText = buildDynamicContextText(config);
  return [environmentPrompt, contentText].filter(Boolean).join("\n\n");
}

// dynamic/user-context/builder.ts  (stub for now)
export async function buildUserContextContent(
  context: DynamicRuntimeContext,
): Promise<string> {
  // TODO: 实现 TODO 列表、固定文件等的注入
  return "";
}
```

### Phase 3: 创建统一接口

```typescript
// dynamic/injection.ts
export async function buildDynamicPromptInjection(
  context: DynamicPromptContext,
  config?: DynamicContextConfig,
): Promise<DynamicPromptInjection> {
  const staticSystem = await buildSystemContextPrompt(config);
  const dynamicUserContext = await buildUserContextContent(context);
  
  return { staticSystem, dynamicUserContext };
}
```

### Phase 4: 更新导出

```typescript
// dynamic/index.ts (新建)
export { buildDynamicPromptInjection } from "./injection.js";

// resources/index.ts
export * from "./predefined/index.js";
export * from "./dynamic/index.js";  // 改为从 dynamic/ 导出
```

### Phase 5: 删除旧代码

- 删除 `dynamic/prompts/` 目录
- 更新所有导入语句
- 更新测试

---

## 对比：重构前后

### 重构前（混合）
```
应用层
  ↓
buildDynamicPromptInjection() (context.ts)
  ├─ buildEnvironmentPrompt()
  ├─ buildDynamicContextText()
  └─ buildCompletePrompt()  ← 还有旧的生成方式混在一起
```

### 重构后（清晰）
```
应用层
  ↓
buildDynamicPromptInjection() (injection.ts) ← 单一入口
  ├─ buildSystemContextPrompt() (system-context/builder.ts)
  │   ├─ generateEnvironmentSection()
  │   ├─ generateToolDocumentation()
  │   └─ generateCurrentTimeSection()
  └─ buildUserContextContent() (user-context/builder.ts)
      ├─ buildTodoList()          (待实现)
      └─ buildPinnedFilesContext() (待实现)
```

---

## 优势总结

✅ **清晰的职责分离**：稳定 vs 变化的内容分开  
✅ **对称的模块结构**：与 predefined/ 一致  
✅ **隐藏实现细节**：只暴露核心 API  
✅ **易于扩展**：新的动态内容类型易于添加  
✅ **支持新设计**：充分体现两层注入的架构  
✅ **消除歧义**：不再与 predefined/prompts 混淆  

---

## 立即可做的改进（不需要大规模重构）

如果暂时不想做完整重构，可以先做这些：

1. 创建 `dynamic/index.ts`
   ```typescript
   export { buildDynamicPromptInjection } from "./prompts/index.js";
   ```

2. 在 `dynamic/prompts/context.ts` 顶部添加注释
   ```typescript
   /**
    * Dynamic Prompt Injection Module
    * 
    * 核心 API：buildDynamicPromptInjection()
    * 
    * 返回两层动态提示：
    * - staticSystem: 注入到系统消息（稳定，可缓存）
    * - dynamicUserContext: 附加到用户消息（变化，不缓存）
    */
   ```

3. 在 `resources/index.ts` 中添加文档
   ```typescript
   // Dynamic context injection (generated at runtime)
   export * from "./dynamic/index.js";
   
   // Predefined static content (templates, tools, etc.)
   export * from "./predefined/index.js";
   ```

4. 更新应用层导入
   ```typescript
   // ✅ 推荐
   import { buildDynamicPromptInjection } from "@wf-agent/sdk/resources";
   
   // ❌ 不推荐（实现细节）
   import { buildEnvironmentPrompt } from "@wf-agent/sdk/resources/dynamic/prompts";
   ```

