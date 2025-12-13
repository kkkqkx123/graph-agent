# TypeScript版本接口层(Interface)设计

## 1. 接口层概述

接口层负责处理外部请求，提供系统的外部接口。它包括HTTP API、GraphQL API、CLI接口等，是系统与外部世界交互的入口点。接口层只依赖应用层，不直接访问领域层或基础设施层。

先仅使用HTTP API与CLI接口作为示例，后续将添加其他接口形式。

## 2. 接口层结构

```
src/interfaces/
├── http/                  # HTTP接口
│   ├── controllers/
│   │   ├── session.controller.ts
│   │   ├── thread.controller.ts
│   │   ├── workflow.controller.ts
│   │   ├── graph.controller.ts
│   │   ├── llm.controller.ts
│   │   ├── tools.controller.ts
│   │   ├── history.controller.ts
│   │   └── health.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── session.routes.ts
│   │   ├── thread.routes.ts
│   │   ├── workflow.routes.ts
│   │   ├── graph.routes.ts
│   │   ├── llm.routes.ts
│   │   ├── tools.routes.ts
│   │   ├── history.routes.ts
│   │   └── health.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── cors.middleware.ts
│   ├── validators/
│   │   ├── session.validator.ts
│   │   ├── thread.validator.ts
│   │   ├── workflow.validator.ts
│   │   ├── graph.validator.ts
│   │   ├── llm.validator.ts
│   │   └── tools.validator.ts
│   ├── dto/
│   │   ├── requests/
│   │   │   ├── session-request.dto.ts
│   │   │   ├── thread-request.dto.ts
│   │   │   ├── workflow-request.dto.ts
│   │   │   ├── graph-request.dto.ts
│   │   │   ├── llm-request.dto.ts
│   │   │   └── tools-request.dto.ts
│   │   ├── responses/
│   │   │   ├── session-response.dto.ts
│   │   │   ├── thread-response.dto.ts
│   │   │   ├── workflow-response.dto.ts
│   │   │   ├── graph-response.dto.ts
│   │   │   ├── llm-response.dto.ts
│   │   │   └── tools-response.dto.ts
│   │   └── common/
│   │       ├── api-response.dto.ts
│   │       ├── error-response.dto.ts
│   │       └── pagination.dto.ts
│   ├── server/
│   │   ├── express-server.ts
│   │   ├── fastify-server.ts
│   │   └── server-config.ts
│   └── index.ts
├── graphql/               # GraphQL接口
│   ├── resolvers/
│   │   ├── session.resolver.ts
│   │   ├── thread.resolver.ts
│   │   ├── workflow.resolver.ts
│   │   ├── graph.resolver.ts
│   │   ├── llm.resolver.ts
│   │   ├── tools.resolver.ts
│   │   └── history.resolver.ts
│   ├── schema/
│   │   ├── type-defs/
│   │   │   ├── session.type.ts
│   │   │   ├── thread.type.ts
│   │   │   ├── workflow.type.ts
│   │   │   ├── graph.type.ts
│   │   │   ├── llm.type.ts
│   │   │   ├── tools.type.ts
│   │   │   └── history.type.ts
│   │   ├── input-types/
│   │   │   ├── session-input.type.ts
│   │   │   ├── thread-input.type.ts
│   │   │   ├── workflow-input.type.ts
│   │   │   ├── graph-input.type.ts
│   │   │   ├── llm-input.type.ts
│   │   │   └── tools-input.type.ts
│   │   └── index.ts
│   ├── server/
│   │   ├── apollo-server.ts
│   │   └── server-config.ts
│   ├── context/
│   │   ├── graphql-context.ts
│   │   └── auth-context.ts
│   └── index.ts
├── cli/                   # 命令行接口
│   ├── commands/
│   │   ├── session/
│   │   │   ├── create-session.command.ts
│   │   │   ├── list-sessions.command.ts
│   │   │   └── delete-session.command.ts
│   │   ├── workflow/
│   │   │   ├── create-workflow.command.ts
│   │   │   ├── list-workflows.command.ts
│   │   │   ├── execute-workflow.command.ts
│   │   │   └── delete-workflow.command.ts
│   │   ├── config/
│   │   │   ├── show-config.command.ts
│   │   │   ├── set-config.command.ts
│   │   │   └── validate-config.command.ts
│   │   └── system/
│   │       ├── health.command.ts
│   │       ├── status.command.ts
│   │       └── logs.command.ts
│   ├── utils/
│   │   ├── command-runner.ts
│   │   ├── output-formatter.ts
│   │   └── progress-indicator.ts
│   ├── config/
│   │   ├── cli-config.ts
│   │   └── command-config.ts
│   └── index.ts
├── websocket/             # WebSocket接口
│   ├── handlers/
│   │   ├── session-handler.ts
│   │   ├── thread-handler.ts
│   │   └── workflow-handler.ts
│   ├── events/
│   │   ├── connection.event.ts
│   │   ├── message.event.ts
│   │   └── disconnection.event.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── server/
│   │   ├── websocket-server.ts
│   │   └── server-config.ts
│   └── index.ts
├── grpc/                  # gRPC接口
│   ├── proto/
│   │   ├── session.proto
│   │   ├── workflow.proto
│   │   └── graph.proto
│   ├── generated/
│   │   ├── session_grpc_pb.ts
│   │   ├── workflow_grpc_pb.ts
│   │   └── graph_grpc_pb.ts
│   ├── services/
│   │   ├── session-service.ts
│   │   ├── workflow-service.ts
│   │   └── graph-service.ts
│   ├── server/
│   │   ├── grpc-server.ts
│   │   └── server-config.ts
│   └── index.ts
├── common/                # 通用接口组件
│   ├── decorators/
│   │   ├── route.decorator.ts
│   │   ├── auth.decorator.ts
│   │   ├── validate.decorator.ts
│   │   └── cache.decorator.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── validation.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   ├── validation.filter.ts
│   │   └── error.filter.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── throttle.guard.ts
│   ├── pipes/
│   │   ├── validation.pipe.ts
│   │   ├── transform.pipe.ts
│   │   └── parse-uuid.pipe.ts
│   └── index.ts
└── index.ts
```

## 3. HTTP接口设计

### 3.1 会话控制器

```typescript
// src/interfaces/http/controllers/session.controller.ts
import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { SessionService } from '../../../application/session/services/session-service';
import { CreateSessionCommand } from '../../../application/session/commands/create-session.command';
import { AddThreadCommand } from '../../../application/session/commands/add-thread.command';
import { ProcessInteractionCommand } from '../../../application/session/commands/process-interaction.command';
import { CloseSessionCommand } from '../../../application/session/commands/close-session.command';
import { SessionRequestDto } from '../dto/requests/session-request.dto';
import { SessionResponseDto } from '../dto/responses/session-response.dto';
import { ApiResponseDto } from '../dto/common/api-response.dto';
import { validateDto } from '../utils/validation';

@injectable()
export class SessionController {
  constructor(
    @inject('SessionService') private sessionService: SessionService
  ) {}

  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const requestDto = await validateDto(SessionRequestDto, req.body);
      
      // Create command
      const command = new CreateSessionCommand(
        requestDto.userId,
        requestDto.metadata
      );

      // Execute command
      const session = await this.sessionService.createSession(command);

      // Return response
      const response = ApiResponseDto.success<SessionResponseDto>({
        id: session.id,
        userId: session.userId,
        threadIds: session.threadIds,
        state: session.state,
        context: session.context,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const session = await this.sessionService.getSessionById(sessionId);

      const response = ApiResponseDto.success<SessionResponseDto>({
        id: session.id,
        userId: session.userId,
        threadIds: session.threadIds,
        state: session.state,
        context: session.context,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async addThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { threadId } = req.body;
      
      const command = new AddThreadCommand(sessionId, threadId);
      await this.sessionService.addThread(command);

      const response = ApiResponseDto.success({ message: 'Thread added successfully' });
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async processInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const interactionData = req.body;
      
      const command = new ProcessInteractionCommand(
        sessionId,
        interactionData.interactionId,
        interactionData.type,
        interactionData.content,
        new Date(interactionData.timestamp)
      );

      await this.sessionService.processInteraction(command);

      const response = ApiResponseDto.success({ message: 'Interaction processed successfully' });
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async closeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const command = new CloseSessionCommand(sessionId);
      await this.sessionService.closeSession(command);

      const response = ApiResponseDto.success({ message: 'Session closed successfully' });
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, state, page = 1, limit = 10 } = req.query;
      
      const sessions = await this.sessionService.listSessions({
        userId: userId as string,
        state: state as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      const response = ApiResponseDto.success({
        sessions: sessions.map(session => ({
          id: session.id,
          userId: session.userId,
          threadIds: session.threadIds,
          state: session.state,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: sessions.length
        }
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
```

### 3.2 路由定义

```typescript
// src/interfaces/http/routes/session.routes.ts
import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

export function createSessionRoutes(sessionController: SessionController): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({ windowMs: 60000, max: 100 }));

  // POST /api/sessions - Create session
  router.post(
    '/',
    validationMiddleware('createSession'),
    sessionController.createSession.bind(sessionController)
  );

  // GET /api/sessions/:sessionId - Get session
  router.get(
    '/:sessionId',
    sessionController.getSession.bind(sessionController)
  );

  // POST /api/sessions/:sessionId/threads - Add thread to session
  router.post(
    '/:sessionId/threads',
    validationMiddleware('addThread'),
    sessionController.addThread.bind(sessionController)
  );

  // POST /api/sessions/:sessionId/interactions - Process interaction
  router.post(
    '/:sessionId/interactions',
    validationMiddleware('processInteraction'),
    sessionController.processInteraction.bind(sessionController)
  );

  // POST /api/sessions/:sessionId/close - Close session
  router.post(
    '/:sessionId/close',
    sessionController.closeSession.bind(sessionController)
  );

  // GET /api/sessions - List sessions
  router.get(
    '/',
    sessionController.listSessions.bind(sessionController)
  );

  return router;
}
```

### 3.3 中间件

```typescript
// src/interfaces/http/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { JwtAuthenticator } from '../../../infrastructure/security/authentication/jwt-authenticator';

@injectable()
export class authMiddleware {
  constructor(
    @inject('JwtAuthenticator') private authenticator: JwtAuthenticator
  ) {}

  handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const payload = await this.authenticator.verifyToken(token);
      req.user = payload;
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication token' });
    }
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }
}

// src/interfaces/http/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export function validationMiddleware(dtoClass: any, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = plainToClass(dtoClass, req[source]);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        const errorMessages = errors.map(error => Object.values(error.constraints || {})).flat();
        res.status(400).json({
          error: 'Validation failed',
          details: errorMessages
        });
        return;
      }
      
      req[source] = dto;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Validation error' });
    }
  };
}

// src/interfaces/http/middleware/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../../../application/common/exceptions/application-error';

export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ApplicationError) {
    res.status(400).json({
      error: error.message,
      code: error.code,
      details: error.details
    });
  } else {
    console.error('Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}
```

## 4. GraphQL接口设计

### 4.1 会话解析器

```typescript
// src/interfaces/graphql/resolvers/session.resolver.ts
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { SessionService } from '../../../application/session/services/session-service';
import { CreateSessionCommand } from '../../../application/session/commands/create-session.command';
import { AddThreadCommand } from '../../../application/session/commands/add-thread.command';
import { ProcessInteractionCommand } from '../../../application/session/commands/process-interaction.command';
import { CloseSessionCommand } from '../../../application/session/commands/close-session.command';
import { Session } from '../schema/type-defs/session.type';
import { CreateSessionInput } from '../schema/input-types/session-input.type';
import { AddThreadInput } from '../schema/input-types/session-input.type';
import { ProcessInteractionInput } from '../schema/input-types/session-input.type';

@Resolver(() => Session)
export class SessionResolver {
  constructor(
    private readonly sessionService: SessionService
  ) {}

  @Mutation(() => Session)
  async createSession(
    @Args('input') input: CreateSessionInput,
    @Context() context: any
  ): Promise<Session> {
    const command = new CreateSessionCommand(
      input.userId,
      input.metadata
    );

    const session = await this.sessionService.createSession(command);
    
    return {
      id: session.id,
      userId: session.userId,
      threadIds: session.threadIds,
      state: session.state,
      context: session.context,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  @Query(() => Session, { nullable: true })
  async session(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<Session | null> {
    const session = await this.sessionService.getSessionById(id);
    
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      threadIds: session.threadIds,
      state: session.state,
      context: session.context,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  @Mutation(() => Boolean)
  async addThread(
    @Args('input') input: AddThreadInput,
    @Context() context: any
  ): Promise<boolean> {
    const command = new AddThreadCommand(input.sessionId, input.threadId);
    await this.sessionService.addThread(command);
    return true;
  }

  @Mutation(() => Boolean)
  async processInteraction(
    @Args('input') input: ProcessInteractionInput,
    @Context() context: any
  ): Promise<boolean> {
    const command = new ProcessInteractionCommand(
      input.sessionId,
      input.interactionId,
      input.type,
      input.content,
      new Date(input.timestamp)
    );
    
    await this.sessionService.processInteraction(command);
    return true;
  }

  @Mutation(() => Boolean)
  async closeSession(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const command = new CloseSessionCommand(id);
    await this.sessionService.closeSession(command);
    return true;
  }

  @Query(() => [Session])
  async sessions(
    @Args('userId', { nullable: true }) userId?: string,
    @Args('state', { nullable: true }) state?: string,
    @Args('page', { defaultValue: 1 }) page?: number,
    @Args('limit', { defaultValue: 10 }) limit?: number,
    @Context() context: any
  ): Promise<Session[]> {
    const sessions = await this.sessionService.listSessions({
      userId,
      state,
      page,
      limit
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      threadIds: session.threadIds,
      state: session.state,
      context: session.context,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));
  }
}
```

### 4.2 GraphQL类型定义

```typescript
// src/interfaces/graphql/schema/type-defs/session.type.ts
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Session {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => [String])
  threadIds: string[];

  @Field()
  state: string;

  @Field()
  context: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class SessionConnection {
  @Field(() => [Session])
  edges: Session[];

  @Field()
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

@ObjectType()
export class SessionSummary {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  userId?: string;

  @Field()
  state: string;

  @Field()
  threadCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

## 5. CLI接口设计

### 5.1 会话命令

```typescript
// src/interfaces/cli/commands/session/create-session.command.ts
import { Command } from 'commander';
import { SessionService } from '../../../../application/session/services/session-service';
import { CreateSessionCommand } from '../../../../application/session/commands/create-session.command';
import { outputFormatter } from '../../utils/output-formatter';

export function createSessionCommand(sessionService: SessionService): Command {
  const command = new Command('create')
    .description('Create a new session')
    .option('-u, --user-id <userId>', 'User ID')
    .option('-m, --metadata <metadata>', 'Session metadata (JSON string)')
    .action(async (options) => {
      try {
        const metadata = options.metadata ? JSON.parse(options.metadata) : {};
        
        const command = new CreateSessionCommand(options.userId, metadata);
        const session = await sessionService.createSession(command);

        outputFormatter.success('Session created successfully', {
          id: session.id,
          userId: session.userId,
          state: session.state,
          createdAt: session.createdAt
        });
      } catch (error) {
        outputFormatter.error('Failed to create session', error.message);
      }
    });

  return command;
}

// src/interfaces/cli/commands/session/list-sessions.command.ts
import { Command } from 'commander';
import { SessionService } from '../../../../application/session/services/session-service';
import { outputFormatter } from '../../utils/output-formatter';

export function listSessionsCommand(sessionService: SessionService): Command {
  const command = new Command('list')
    .description('List sessions')
    .option('-u, --user-id <userId>', 'Filter by user ID')
    .option('-s, --state <state>', 'Filter by state')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-l, --limit <limit>', 'Items per page', '10')
    .option('--format <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const sessions = await sessionService.listSessions({
          userId: options.userId,
          state: options.state,
          page: parseInt(options.page),
          limit: parseInt(options.limit)
        });

        if (options.format === 'json') {
          outputFormatter.json(sessions);
        } else {
          outputFormatter.table(sessions, ['id', 'userId', 'state', 'threadCount', 'createdAt']);
        }
      } catch (error) {
        outputFormatter.error('Failed to list sessions', error.message);
      }
    });

  return command;
}
```

### 5.2 CLI配置

```typescript
// src/interfaces/cli/config/cli-config.ts
import { Command } from 'commander';
import { ConfigManager } from '../../../infrastructure/config/managers/config-manager';
import { outputFormatter } from '../utils/output-formatter';

export function createConfigCommands(configManager: ConfigManager): Command {
  const configCommand = new Command('config')
    .description('Configuration management');

  // Show config
  configCommand
    .command('show')
    .description('Show current configuration')
    .option('-k, --key <key>', 'Show specific configuration key')
    .action(async (options) => {
      try {
        if (options.key) {
          const value = configManager.get(options.key);
          outputFormatter.success(`Configuration ${options.key}`, value);
        } else {
          const config = configManager.getAll();
          outputFormatter.json(config);
        }
      } catch (error) {
        outputFormatter.error('Failed to show configuration', error.message);
      }
    });

  // Set config
  configCommand
    .command('set')
    .description('Set configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action(async (key, value) => {
      try {
        // Parse value based on key
        let parsedValue = value;
        if (value.startsWith('{') || value.startsWith('[')) {
          parsedValue = JSON.parse(value);
        } else if (value === 'true' || value === 'false') {
          parsedValue = value === 'true';
        } else if (!isNaN(Number(value))) {
          parsedValue = Number(value);
        }

        configManager.set(key, parsedValue);
        outputFormatter.success(`Configuration ${key} set to`, parsedValue);
      } catch (error) {
        outputFormatter.error('Failed to set configuration', error.message);
      }
    });

  // Validate config
  configCommand
    .command('validate')
    .description('Validate configuration')
    .action(async () => {
      try {
        await configManager.validate();
        outputFormatter.success('Configuration is valid');
      } catch (error) {
        outputFormatter.error('Configuration validation failed', error.message);
      }
    });

  return configCommand;
}
```

## 6. WebSocket接口设计

### 6.1 会话处理器

```typescript
// src/interfaces/websocket/handlers/session-handler.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../../../application/session/services/session-service';
import { ProcessInteractionCommand } from '../../../application/session/commands/process-interaction.command';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SessionGateway {
  constructor(
    private readonly sessionService: SessionService
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      // Validate session exists
      const session = await this.sessionService.getSessionById(data.sessionId);
      if (!session) {
        client.emit('error', { message: 'Session not found' });
        return;
      }

      // Join session room
      client.join(data.sessionId);
      client.emit('joined-session', { sessionId: data.sessionId });
      
      // Notify other clients
      client.to(data.sessionId).emit('user-joined', { userId: client.handshake.auth.userId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('send-interaction')
  async handleSendInteraction(
    @MessageBody() data: {
      sessionId: string;
      interactionId: string;
      type: string;
      content: any;
    },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const command = new ProcessInteractionCommand(
        data.sessionId,
        data.interactionId,
        data.type,
        data.content,
        new Date()
      );

      await this.sessionService.processInteraction(command);

      // Broadcast to session room
      this.server.to(data.sessionId).emit('interaction-processed', {
        sessionId: data.sessionId,
        interactionId: data.interactionId,
        type: data.type,
        content: data.content,
        timestamp: new Date()
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    client.leave(data.sessionId);
    client.emit('left-session', { sessionId: data.sessionId });
    
    // Notify other clients
    client.to(data.sessionId).emit('user-left', { userId: client.handshake.auth.userId });
  }

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }
}
```

## 7. 通用接口组件

### 7.1 装饰器

```typescript
// src/interfaces/common/decorators/route.decorator.ts
import { RequestMethod } from '@nestjs/common';

export function Route(path: string, method: RequestMethod) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('route', { path, method }, target, propertyKey);
  };
}

// src/interfaces/common/decorators/auth.decorator.ts
export function Auth(roles?: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('auth', { roles }, target, propertyKey);
  };
}

// src/interfaces/common/decorators/validate.decorator.ts
export function Validate(dto: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('validate', { dto }, target, propertyKey);
  };
}
```

### 7.2 异常过滤器

```typescript
// src/interfaces/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: exceptionResponse['message'] || exception.message,
      details: exceptionResponse['details'] || null
    });
  }
}
```

这个接口层设计提供了完整的外部接口实现，包括HTTP REST API、GraphQL、CLI、WebSocket和gRPC等多种接口形式。所有接口都遵循统一的错误处理、验证和认证机制，确保了系统的一致性和安全性。