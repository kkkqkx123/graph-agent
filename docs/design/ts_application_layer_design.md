# TypeScript版本应用层(Application)设计

## 1. 应用层概述

应用层负责协调领域对象，提供业务流程编排，处理应用程序的业务逻辑。它不包含业务规则，而是通过调用领域层的服务来完成业务操作。应用层是领域层和基础设施层之间的桥梁。

## 2. 应用层结构

基于重新设计的层次化架构，应用层的结构如下：

```
src/application/
├── session/               # 会话应用服务
│   ├── services/
│   │   ├── session-service.ts
│   │   ├── interaction-service.ts
│   │   └── session-coordinator.ts
│   ├── commands/
│   │   ├── create-session.command.ts
│   │   ├── add-thread.command.ts
│   │   ├── process-interaction.command.ts
│   │   └── close-session.command.ts
│   ├── queries/
│   │   ├── get-session.query.ts
│   │   ├── get-session-history.query.ts
│   │   └── list-sessions.query.ts
│   ├── dto/
│   │   ├── session.dto.ts
│   │   ├── interaction.dto.ts
│   │   └── session-summary.dto.ts
│   ├── events/
│   │   ├── session-created.event.ts
│   │   ├── interaction-processed.event.ts
│   │   └── session-closed.event.ts
│   └── index.ts
├── thread/                # 线程应用服务
│   ├── services/
│   │   ├── thread-service.ts
│   │   ├── execution-service.ts
│   │   └── checkpoint-service.ts
│   ├── commands/
│   │   ├── create-thread.command.ts
│   │   ├── start-thread.command.ts
│   │   ├── pause-thread.command.ts
│   │   ├── resume-thread.command.ts
│   │   └── create-checkpoint.command.ts
│   ├── queries/
│   │   ├── get-thread.query.ts
│   │   ├── get-thread-status.query.ts
│   │   └── list-threads.query.ts
│   ├── dto/
│   │   ├── thread.dto.ts
│   │   ├── thread-status.dto.ts
│   │   └── checkpoint.dto.ts
│   ├── events/
│   │   ├── thread-created.event.ts
│   │   ├── thread-started.event.ts
│   │   ├── thread-completed.event.ts
│   │   └── checkpoint-created.event.ts
│   └── index.ts
├── workflow/              # 工作流应用服务
│   ├── services/
│   │   ├── workflow-service.ts
│   │   ├── workflow-orchestrator.ts
│   │   └── workflow-validator.ts
│   ├── commands/
│   │   ├── create-workflow.command.ts
│   │   ├── activate-workflow.command.ts
│   │   ├── update-workflow.command.ts
│   │   └── execute-workflow.command.ts
│   ├── queries/
│   │   ├── get-workflow.query.ts
│   │   ├── list-workflows.query.ts
│   │   └── get-workflow-status.query.ts
│   ├── dto/
│   │   ├── workflow.dto.ts
│   │   ├── workflow-summary.dto.ts
│   │   └── execution-result.dto.ts
│   ├── events/
│   │   ├── workflow-created.event.ts
│   │   ├── workflow-activated.event.ts
│   │   └── workflow-executed.event.ts
│   └── index.ts
├── graph/                 # 图应用服务
│   ├── services/
│   │   ├── graph-service.ts
│   │   ├── graph-executor.ts
│   │   └── node-coordinator.ts
│   ├── commands/
│   │   ├── create-graph.command.ts
│   │   ├── add-node.command.ts
│   │   ├── add-edge.command.ts
│   │   └── execute-graph.command.ts
│   ├── queries/
│   │   ├── get-graph.query.ts
│   │   ├── get-execution-path.query.ts
│   │   └── get-node-status.query.ts
│   ├── dto/
│   │   ├── graph.dto.ts
│   │   ├── node.dto.ts
│   │   ├── edge.dto.ts
│   │   └── execution-plan.dto.ts
│   ├── events/
│   │   ├── graph-created.event.ts
│   │   ├── node-executed.event.ts
│   │   └── graph-completed.event.ts
│   └── index.ts
├── llm/                   # LLM应用服务
│   ├── services/
│   │   ├── llm-service.ts
│   │   ├── prompt-service.ts
│   │   └── token-calculator.ts
│   ├── commands/
│   │   ├── send-request.command.ts
│   │   ├── create-prompt.command.ts
│   │   └── calculate-tokens.command.ts
│   ├── queries/
│   │   ├── get-model-info.query.ts
│   │   ├── get-usage-statistics.query.ts
│   │   └── get-request-history.query.ts
│   ├── dto/
│   │   ├── llm-request.dto.ts
│   │   ├── llm-response.dto.ts
│   │   ├── prompt-template.dto.ts
│   │   └── token-usage.dto.ts
│   ├── events/
│   │   ├── request-sent.event.ts
│   │   ├── response-received.event.ts
│   │   └── tokens-calculated.event.ts
│   └── index.ts
├── tools/                 # 工具应用服务
│   ├── services/
│   │   ├── tool-service.ts
│   │   ├── tool-registry.ts
│   │   └── tool-executor.ts
│   ├── commands/
│   │   ├── register-tool.command.ts
│   │   ├── execute-tool.command.ts
│   │   └── update-tool.command.ts
│   ├── queries/
│   │   ├── get-tool.query.ts
│   │   ├── list-tools.query.ts
│   │   └── get-execution-history.query.ts
│   ├── dto/
│   │   ├── tool.dto.ts
│   │   ├── tool-config.dto.ts
│   │   ├── execution-result.dto.ts
│   │   └── tool-summary.dto.ts
│   ├── events/
│   │   ├── tool-registered.event.ts
│   │   ├── tool-executed.event.ts
│   │   └── tool-failed.event.ts
│   └── index.ts
├── history/               # 历史应用服务
│   ├── services/
│   │   ├── history-service.ts
│   │   ├── audit-service.ts
│   │   └── statistics-service.ts
│   ├── commands/
│   │   ├── record-event.command.ts
│   │   ├── create-audit-log.command.ts
│   │   └── calculate-statistics.command.ts
│   ├── queries/
│   │   ├── get-history.query.ts
│   │   ├── get-audit-log.query.ts
│   │   └── get-statistics.query.ts
│   ├── dto/
│   │   ├── history-record.dto.ts
│   │   ├── audit-log.dto.ts
│   │   ├── usage-statistics.dto.ts
│   │   └── history-summary.dto.ts
│   ├── events/
│   │   ├── history-recorded.event.ts
│   │   ├── audit-logged.event.ts
│   │   └── statistics-calculated.event.ts
│   └── index.ts
├── checkpoint/            # 检查点应用服务
│   ├── services/
│   │   ├── checkpoint-service.ts
│   │   ├── snapshot-service.ts
│   │   └── restore-service.ts
│   ├── commands/
│   │   ├── create-checkpoint.command.ts
│   │   ├── restore-checkpoint.command.ts
│   │   └── delete-checkpoint.command.ts
│   ├── queries/
│   │   ├── get-checkpoint.query.ts
│   │   ├── list-checkpoints.query.ts
│   │   └── get-restore-status.query.ts
│   ├── dto/
│   │   ├── checkpoint.dto.ts
│   │   ├── snapshot.dto.ts
│   │   ├── restore-result.dto.ts
│   │   └── checkpoint-summary.dto.ts
│   ├── events/
│   │   ├── checkpoint-created.event.ts
│   │   ├── checkpoint-restored.event.ts
│   │   └── snapshot-taken.event.ts
│   └── index.ts
├── common/                # 通用应用服务
│   ├── services/
│   │   ├── event-bus.service.ts
│   │   ├── command-bus.service.ts
│   │   ├── query-bus.service.ts
│   │   └── validation.service.ts
│   ├── decorators/
│   │   ├── command-handler.decorator.ts
│   │   ├── query-handler.decorator.ts
│   │   └── event-handler.decorator.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── validation.interceptor.ts
│   │   └── transaction.interceptor.ts
│   ├── exceptions/
│   │   ├── application-error.ts
│   │   ├── not-found-error.ts
│   │   └── validation-error.ts
│   └── index.ts
└── index.ts
```

## 3. 核心应用服务设计

### 3.1 会话应用服务

```typescript
// src/application/session/services/session-service.ts
import { injectable, inject } from 'inversify';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { HistoryManager } from '../../../domain/session/submodules/history/services/history-manager';
import { Session } from '../../../domain/session/entities/session';
import { SessionId } from '../../../domain/session/value-objects/session-id';
import { UserId } from '../../../domain/session/value-objects/user-id';
import { SessionContext } from '../../../domain/session/value-objects/session-context';
import { CreateSessionCommand } from '../commands/create-session.command';
import { AddThreadCommand } from '../commands/add-thread.command';
import { ProcessInteractionCommand } from '../commands/process-interaction.command';
import { CloseSessionCommand } from '../commands/close-session.command';
import { SessionDto } from '../dto/session.dto';
import { ApplicationError } from '../../common/exceptions/application-error';

@injectable()
export class SessionService {
  constructor(
    @inject('SessionRepository') private sessionRepository: SessionRepository,
    @inject('ThreadRepository') private threadRepository: ThreadRepository,
    @inject('HistoryManager') private historyManager: HistoryManager
  ) {}

  async createSession(command: CreateSessionCommand): Promise<SessionDto> {
    // Validate command
    await this.validateCreateSessionCommand(command);

    // Create session
    const sessionId = SessionId.generate();
    const userId = command.userId ? new UserId(command.userId) : null;
    const context = new SessionContext(command.metadata || {});
    
    const session = new Session(sessionId, userId, context, this.historyManager);

    // Save session
    await this.sessionRepository.save(session);

    // Return DTO
    return this.toSessionDto(session);
  }

  async addThread(command: AddThreadCommand): Promise<void> {
    // Get session
    const session = await this.getSessionById(command.sessionId);
    
    // Validate thread exists
    const threadExists = await this.threadRepository.exists(command.threadId);
    if (!threadExists) {
      throw new ApplicationError(`Thread ${command.threadId} not found`);
    }

    // Add thread to session
    session.addThread(command.threadId);

    // Save session
    await this.sessionRepository.save(session);
  }

  async processInteraction(command: ProcessInteractionCommand): Promise<void> {
    // Get session
    const session = await this.getSessionById(command.sessionId);
    
    // Create interaction
    const interaction = new UserInteraction(
      command.interactionId,
      command.sessionId,
      command.type,
      command.content,
      command.timestamp
    );

    // Process interaction
    session.processInteraction(interaction);

    // Save session
    await this.sessionRepository.save(session);
  }

  async closeSession(command: CloseSessionCommand): Promise<void> {
    // Get session
    const session = await this.getSessionById(command.sessionId);
    
    // Close session
    session.close();

    // Save session
    await this.sessionRepository.save(session);
  }

  async getSessionById(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findById(new SessionId(sessionId));
    if (!session) {
      throw new ApplicationError(`Session ${sessionId} not found`);
    }
    return session;
  }

  private async validateCreateSessionCommand(command: CreateSessionCommand): Promise<void> {
    // Add validation logic here
    if (command.userId && !this.isValidUserId(command.userId)) {
      throw new ApplicationError('Invalid user ID');
    }
  }

  private isValidUserId(userId: string): boolean {
    // Add user ID validation logic
    return userId.length > 0;
  }

  private toSessionDto(session: Session): SessionDto {
    return {
      id: session.id.value,
      userId: session.userId?.value,
      threadIds: session.threadIds.map(id => id.value),
      state: session.state.value,
      context: session.context.toJSON(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }
}
```

### 3.2 线程应用服务

```typescript
// src/application/thread/services/thread-service.ts
import { injectable, inject } from 'inversify';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { CheckpointManager } from '../../../domain/thread/submodules/checkpoint/services/checkpoint-manager';
import { Thread } from '../../../domain/thread/entities/thread';
import { ThreadId } from '../../../domain/thread/value-objects/thread-id';
import { SessionId } from '../../../domain/thread/value-objects/session-id';
import { WorkflowId } from '../../../domain/thread/value-objects/workflow-id';
import { ThreadContext } from '../../../domain/thread/value-objects/thread-context';
import { CreateThreadCommand } from '../commands/create-thread.command';
import { StartThreadCommand } from '../commands/start-thread.command';
import { PauseThreadCommand } from '../commands/pause-thread.command';
import { ResumeThreadCommand } from '../commands/resume-thread.command';
import { CreateCheckpointCommand } from '../commands/create-checkpoint.command';
import { ThreadDto } from '../dto/thread.dto';
import { ApplicationError } from '../../common/exceptions/application-error';

@injectable()
export class ThreadService {
  constructor(
    @inject('ThreadRepository') private threadRepository: ThreadRepository,
    @inject('SessionRepository') private sessionRepository: SessionRepository,
    @inject('WorkflowRepository') private workflowRepository: WorkflowRepository,
    @inject('CheckpointManager') private checkpointManager: CheckpointManager
  ) {}

  async createThread(command: CreateThreadCommand): Promise<ThreadDto> {
    // Validate command
    await this.validateCreateThreadCommand(command);

    // Create thread
    const threadId = ThreadId.generate();
    const sessionId = new SessionId(command.sessionId);
    const workflowId = new WorkflowId(command.workflowId);
    const context = new ThreadContext(command.metadata || {});
    
    const thread = new Thread(threadId, sessionId, workflowId, context, this.checkpointManager);

    // Save thread
    await this.threadRepository.save(thread);

    // Add thread to session
    const session = await this.sessionRepository.findById(sessionId);
    if (session) {
      session.addThread(threadId);
      await this.sessionRepository.save(session);
    }

    // Return DTO
    return this.toThreadDto(thread);
  }

  async startThread(command: StartThreadCommand): Promise<void> {
    // Get thread
    const thread = await this.getThreadById(command.threadId);
    
    // Start thread
    thread.start();

    // Save thread
    await this.threadRepository.save(thread);
  }

  async pauseThread(command: PauseThreadCommand): Promise<void> {
    // Get thread
    const thread = await this.getThreadById(command.threadId);
    
    // Pause thread
    thread.pause();

    // Save thread
    await this.threadRepository.save(thread);
  }

  async resumeThread(command: ResumeThreadCommand): Promise<void> {
    // Get thread
    const thread = await this.getThreadById(command.threadId);
    
    // Resume thread
    thread.resume();

    // Save thread
    await this.threadRepository.save(thread);
  }

  async createCheckpoint(command: CreateCheckpointCommand): Promise<string> {
    // Get thread
    const thread = await this.getThreadById(command.threadId);
    
    // Create checkpoint
    const checkpointId = thread.createCheckpoint(command.type, command.data);

    // Save thread
    await this.threadRepository.save(thread);

    return checkpointId;
  }

  async getThreadById(threadId: string): Promise<Thread> {
    const thread = await this.threadRepository.findById(new ThreadId(threadId));
    if (!thread) {
      throw new ApplicationError(`Thread ${threadId} not found`);
    }
    return thread;
  }

  private async validateCreateThreadCommand(command: CreateThreadCommand): Promise<void> {
    // Validate session exists
    const sessionExists = await this.sessionRepository.exists(new SessionId(command.sessionId));
    if (!sessionExists) {
      throw new ApplicationError(`Session ${command.sessionId} not found`);
    }

    // Validate workflow exists
    const workflowExists = await this.workflowRepository.exists(new WorkflowId(command.workflowId));
    if (!workflowExists) {
      throw new ApplicationError(`Workflow ${command.workflowId} not found`);
    }
  }

  private toThreadDto(thread: Thread): ThreadDto {
    return {
      id: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      state: thread.state.value,
      context: thread.context.toJSON(),
      currentCheckpoint: thread.currentCheckpoint,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString()
    };
  }
}
```

### 3.3 工作流应用服务

```typescript
// src/application/workflow/services/workflow-service.ts
import { injectable, inject } from 'inversify';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { GraphRepository } from '../../../domain/workflow/submodules/graph/repositories/graph-repository';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowId } from '../../../domain/workflow/value-objects/workflow-id';
import { GraphId } from '../../../domain/workflow/value-objects/graph-id';
import { WorkflowMetadata } from '../../../domain/workflow/value-objects/workflow-metadata';
import { CreateWorkflowCommand } from '../commands/create-workflow.command';
import { ActivateWorkflowCommand } from '../commands/activate-workflow.command';
import { UpdateWorkflowCommand } from '../commands/update-workflow.command';
import { ExecuteWorkflowCommand } from '../commands/execute-workflow.command';
import { WorkflowDto } from '../dto/workflow.dto';
import { ApplicationError } from '../../common/exceptions/application-error';

@injectable()
export class WorkflowService {
  constructor(
    @inject('WorkflowRepository') private workflowRepository: WorkflowRepository,
    @inject('GraphRepository') private graphRepository: GraphRepository
  ) {}

  async createWorkflow(command: CreateWorkflowCommand): Promise<WorkflowDto> {
    // Validate command
    await this.validateCreateWorkflowCommand(command);

    // Create workflow
    const workflowId = WorkflowId.generate();
    const graphId = new GraphId(command.graphId);
    const metadata = new WorkflowMetadata(command.metadata || {});
    
    const workflow = new Workflow(
      workflowId,
      command.name,
      command.description || '',
      graphId,
      metadata
    );

    // Save workflow
    await this.workflowRepository.save(workflow);

    // Return DTO
    return this.toWorkflowDto(workflow);
  }

  async activateWorkflow(command: ActivateWorkflowCommand): Promise<void> {
    // Get workflow
    const workflow = await this.getWorkflowById(command.workflowId);
    
    // Activate workflow
    workflow.activate();

    // Save workflow
    await this.workflowRepository.save(workflow);
  }

  async updateWorkflow(command: UpdateWorkflowCommand): Promise<void> {
    // Get workflow
    const workflow = await this.getWorkflowById(command.workflowId);
    
    // Update workflow
    if (command.name) {
      workflow.updateName(command.name);
    }
    
    if (command.description !== undefined) {
      workflow.updateDescription(command.description);
    }
    
    if (command.metadata) {
      const metadata = new WorkflowMetadata(command.metadata);
      workflow.updateMetadata(metadata);
    }

    // Save workflow
    await this.workflowRepository.save(workflow);
  }

  async executeWorkflow(command: ExecuteWorkflowCommand): Promise<any> {
    // Get workflow
    const workflow = await this.getWorkflowById(command.workflowId);
    
    // Get graph
    const graph = await this.graphRepository.findById(workflow.graphId);
    if (!graph) {
      throw new ApplicationError(`Graph ${workflow.graphId.value} not found`);
    }

    // Execute workflow (this would be handled by a workflow orchestrator)
    // For now, return a placeholder
    return {
      workflowId: workflow.id.value,
      executionId: 'exec_' + Date.now(),
      status: 'started'
    };
  }

  async getWorkflowById(workflowId: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(new WorkflowId(workflowId));
    if (!workflow) {
      throw new ApplicationError(`Workflow ${workflowId} not found`);
    }
    return workflow;
  }

  private async validateCreateWorkflowCommand(command: CreateWorkflowCommand): Promise<void> {
    // Validate graph exists
    const graphExists = await this.graphRepository.exists(new GraphId(command.graphId));
    if (!graphExists) {
      throw new ApplicationError(`Graph ${command.graphId} not found`);
    }

    // Validate workflow name
    if (!command.name || command.name.trim().length === 0) {
      throw new ApplicationError('Workflow name is required');
    }
  }

  private toWorkflowDto(workflow: Workflow): WorkflowDto {
    return {
      id: workflow.id.value,
      name: workflow.name,
      description: workflow.description,
      graphId: workflow.graphId.value,
      state: workflow.state.value,
      metadata: workflow.metadata.toJSON(),
      version: workflow.version.value,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString()
    };
  }
}
```

## 4. 命令查询职责分离(CQRS)设计

### 4.1 命令处理器

```typescript
// src/application/common/services/command-bus.service.ts
import { injectable, inject } from 'inversify';
import { reflect } from 'reflect-metadata';
import { CommandHandler } from '../decorators/command-handler.decorator';

@injectable()
export class CommandBus {
  private handlers: Map<string, any> = new Map();

  registerHandler(commandType: string, handler: any): void {
    this.handlers.set(commandType, handler);
  }

  async execute<T>(command: T): Promise<any> {
    const commandType = command.constructor.name;
    const handler = this.handlers.get(commandType);
    
    if (!handler) {
      throw new Error(`No handler registered for command type: ${commandType}`);
    }

    return handler.handle(command);
  }
}

// src/application/common/decorators/command-handler.decorator.ts
export function CommandHandler(commandType: string) {
  return function (target: any) {
    reflect.defineMetadata('commandType', commandType, target);
  };
}
```

### 4.2 查询处理器

```typescript
// src/application/common/services/query-bus.service.ts
import { injectable, inject } from 'inversify';
import { reflect } from 'reflect-metadata';
import { QueryHandler } from '../decorators/query-handler.decorator';

@injectable()
export class QueryBus {
  private handlers: Map<string, any> = new Map();

  registerHandler(queryType: string, handler: any): void {
    this.handlers.set(queryType, handler);
  }

  async execute<T, R>(query: T): Promise<R> {
    const queryType = query.constructor.name;
    const handler = this.handlers.get(queryType);
    
    if (!handler) {
      throw new Error(`No handler registered for query type: ${queryType}`);
    }

    return handler.handle(query);
  }
}

// src/application/common/decorators/query-handler.decorator.ts
export function QueryHandler(queryType: string) {
  return function (target: any) {
    reflect.defineMetadata('queryType', queryType, target);
  };
}
```

## 5. 事件驱动设计

### 5.1 事件总线

```typescript
// src/application/common/services/event-bus.service.ts
import { injectable } from 'inversify';
import { DomainEvent } from '../../../domain/common/events/domain-event';
import { EventHandler } from '../decorators/event-handler.decorator';

@injectable()
export class EventBus {
  private handlers: Map<string, Function[]> = new Map();

  registerHandler(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType) || [];
    
    await Promise.all(
      handlers.map(handler => handler(event))
    );
  }
}

// src/application/common/decorators/event-handler.decorator.ts
export function EventHandler(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store event handler metadata
  };
}
```

## 6. 应用层异常处理

### 6.1 异常类型

```typescript
// src/application/common/exceptions/application-error.ts
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'APPLICATION_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

// src/application/common/exceptions/not-found-error.ts
export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND');
  }
}

// src/application/common/exceptions/validation-error.ts
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}
```

## 7. 依赖注入配置

### 7.1 容器配置

```typescript
// src/application/common/container.config.ts
import { Container } from 'inversify';
import { SessionService } from '../session/services/session-service';
import { ThreadService } from '../thread/services/thread-service';
import { WorkflowService } from '../workflow/services/workflow-service';
import { CommandBus } from './services/command-bus.service';
import { QueryBus } from './services/query-bus.service';
import { EventBus } from './services/event-bus.service';

export const configureApplicationContainer = (container: Container): void => {
  // Register services
  container.bind<SessionService>('SessionService').to(SessionService).inSingletonScope();
  container.bind<ThreadService>('ThreadService').to(ThreadService).inSingletonScope();
  container.bind<WorkflowService>('WorkflowService').to(WorkflowService).inSingletonScope();

  // Register buses
  container.bind<CommandBus>('CommandBus').to(CommandBus).inSingletonScope();
  container.bind<QueryBus>('QueryBus').to(QueryBus).inSingletonScope();
  container.bind<EventBus>('EventBus').to(EventBus).inSingletonScope();
};
```

这个应用层设计遵循了CQRS模式、事件驱动架构和依赖注入原则，提供了清晰的业务流程编排和应用程序接口。每个服务都有明确的职责，通过命令、查询和事件来处理不同的业务场景。