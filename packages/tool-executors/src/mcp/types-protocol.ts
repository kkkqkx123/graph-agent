/**
 * MCP 协议类型定义
 * 精简版 - 只包含核心功能所需的类型
 * 基于 @modelcontextprotocol/typescript-sdk v1.27.0
 */

// ============================================================================
// 协议版本常量
// ============================================================================

export const LATEST_PROTOCOL_VERSION = '2025-11-25';
export const DEFAULT_NEGOTIATED_PROTOCOL_VERSION = '2025-03-26';
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
  '2024-10-07'
];

export const JSONRPC_VERSION = '2.0';

// ============================================================================
// JSON-RPC 基础类型
// ============================================================================

export type RequestId = string | number;

export interface RequestMeta {
  /** 进度令牌 */
  progressToken?: ProgressToken;
}

export interface RequestParams {
  _meta?: RequestMeta;
  [key: string]: unknown;
}

export interface Request {
  method: string;
  params?: RequestParams;
}

export interface NotificationParams {
  _meta?: RequestMeta;
  [key: string]: unknown;
}

export interface Notification {
  method: string;
  params?: NotificationParams;
}

export interface Result {
  _meta?: RequestMeta;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: RequestId;
  method: string;
  params?: any;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JSONRPCResultResponse {
  jsonrpc: '2.0';
  id: RequestId;
  result: Result;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: RequestId;
  error: JSONRPCError;
}

export type JSONRPCResponse = JSONRPCResultResponse | JSONRPCErrorResponse;
export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

export type ProgressToken = string | number;
export type Cursor = string;

// ============================================================================
// 错误代码
// ============================================================================

export enum ErrorCode {
  // SDK 错误代码
  ConnectionClosed = -32000,
  RequestTimeout = -32001,

  // 标准 JSON-RPC 错误代码
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // MCP 特定错误代码
  InvalidRequestSchema = -32701,
  MethodNotSupported = -32604,
  ServerNotInitialized = -32002,
  UnknownSession = -32003,
}

// ============================================================================
// 基础类型
// ============================================================================

export interface Icon {
  dataURI?: string;
  url?: string;
}

export interface BaseMetadata {
  name: string;
  title?: string;
  description?: string;
}

export interface Annotations {
  audience?: string[];
  priority?: number;
  lastModified?: string;
}

export interface Implementation {
  name: string;
  version: string;
  author?: string;
}

export type LoggingLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

// ============================================================================
// 初始化类型
// ============================================================================

export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: LoggingLevel;
  };
}

export interface InitializeRequestParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: Implementation;
}

export interface InitializeRequest extends JSONRPCRequest {
  method: 'initialize';
  params: InitializeRequestParams;
}

export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: LoggingLevel;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;
}

export interface InitializedNotification extends JSONRPCNotification {
  method: 'notifications/initialized';
  params?: {};
}

// ============================================================================
// 工具类型
// ============================================================================

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolExecution {
  progressive?: boolean;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: ToolAnnotations;
  execution?: ToolExecution;
}

export interface ListToolsRequest extends JSONRPCRequest {
  method: 'tools/list';
  params?: {
    cursor?: Cursor;
  };
}

export interface ListToolsResult {
  tools: Tool[];
  nextCursor?: Cursor;
}

export interface CallToolRequestParams {
  name: string;
  arguments?: Record<string, unknown>;
  _meta?: RequestMeta;
}

export interface CallToolRequest extends JSONRPCRequest {
  method: 'tools/call';
  params: CallToolRequestParams;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface ResourceContent {
  type: 'resource';
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

export type ContentBlock = TextContent | ImageContent | ResourceContent;

export interface CallToolResult {
  content: ContentBlock[];
  isError?: boolean;
  _meta?: RequestMeta;
}

export interface ToolListChangedNotification extends JSONRPCNotification {
  method: 'notifications/tools/list_changed';
  params?: {};
}

// ============================================================================
// 资源类型
// ============================================================================

export interface TextResourceContents {
  uri: string;
  mimeType?: string;
  text: string;
}

export interface BlobResourceContents {
  uri: string;
  mimeType: string;
  blob: string;
}

export type ResourceContents = TextResourceContents | BlobResourceContents;

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
}

export interface ListResourcesRequest extends JSONRPCRequest {
  method: 'resources/list';
  params?: {
    cursor?: Cursor;
  };
}

export interface ListResourcesResult {
  resources: Resource[];
  nextCursor?: Cursor;
}

export interface ListResourceTemplatesRequest extends JSONRPCRequest {
  method: 'resources/templates/list';
  params?: {
    cursor?: Cursor;
  };
}

export interface ListResourceTemplatesResult {
  resourceTemplates: ResourceTemplate[];
  nextCursor?: Cursor;
}

export interface ReadResourceRequest extends JSONRPCRequest {
  method: 'resources/read';
  params: {
    uri: string;
  };
}

export interface ReadResourceResult {
  contents: ResourceContents[];
}

export interface SubscribeRequest extends JSONRPCRequest {
  method: 'resources/subscribe';
  params: {
    uri: string;
  };
}

export interface UnsubscribeRequest extends JSONRPCRequest {
  method: 'resources/unsubscribe';
  params: {
    uri: string;
  };
}

export interface ResourceListChangedNotification extends JSONRPCNotification {
  method: 'notifications/resources/list_changed';
  params?: {};
}

export interface ResourceUpdatedNotification extends JSONRPCNotification {
  method: 'notifications/resources/updated';
  params: {
    uri: string;
  };
}

// ============================================================================
// 提示词类型
// ============================================================================

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface ListPromptsRequest extends JSONRPCRequest {
  method: 'prompts/list';
  params?: {
    cursor?: Cursor;
  };
}

export interface ListPromptsResult {
  prompts: Prompt[];
  nextCursor?: Cursor;
}

export interface GetPromptRequest extends JSONRPCRequest {
  method: 'prompts/get';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export interface GetPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: ContentBlock | ContentBlock[];
  }>;
}

export interface PromptListChangedNotification extends JSONRPCNotification {
  method: 'notifications/prompts/list_changed';
  params?: {};
}

// ============================================================================
// 日志类型
// ============================================================================

export interface SetLevelRequest extends JSONRPCRequest {
  method: 'logging/set_level';
  params: {
    level: LoggingLevel;
  };
}

export interface LoggingMessageNotification extends JSONRPCNotification {
  method: 'notifications/message';
  params: {
    level: LoggingLevel;
    logger: string;
    data: unknown;
  };
}

// ============================================================================
// 客户端消息类型
// ============================================================================

export type ClientRequest =
  | InitializeRequest
  | ListToolsRequest
  | CallToolRequest
  | ListResourcesRequest
  | ListResourceTemplatesRequest
  | ReadResourceRequest
  | SubscribeRequest
  | UnsubscribeRequest
  | ListPromptsRequest
  | GetPromptRequest
  | SetLevelRequest;

export type ClientNotification =
  | InitializedNotification
  | ToolListChangedNotification
  | ResourceListChangedNotification
  | ResourceUpdatedNotification
  | PromptListChangedNotification;

export type ClientResult =
  | InitializeResult
  | ListToolsResult
  | CallToolResult
  | ListResourcesResult
  | ListResourceTemplatesResult
  | ReadResourceResult
  | ListPromptsResult
  | GetPromptResult;

// ============================================================================
// 服务器消息类型
// ============================================================================

export type ServerRequest = never; // 客户端不需要处理服务器请求

export type ServerNotification =
  | LoggingMessageNotification;

export type ServerResult = never; // 客户端不需要处理服务器结果

// ============================================================================
// 工具函数
// ============================================================================

export function isJSONRPCRequest(value: unknown): value is JSONRPCRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    (value as any).jsonrpc === JSONRPC_VERSION &&
    'id' in value &&
    'method' in value
  );
}

export function isJSONRPCNotification(value: unknown): value is JSONRPCNotification {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    (value as any).jsonrpc === JSONRPC_VERSION &&
    'method' in value &&
    !('id' in value)
  );
}

export function isJSONRPCResultResponse(value: unknown): value is JSONRPCResultResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    (value as any).jsonrpc === JSONRPC_VERSION &&
    'id' in value &&
    'result' in value
  );
}

export function isJSONRPCErrorResponse(value: unknown): value is JSONRPCErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    (value as any).jsonrpc === JSONRPC_VERSION &&
    'id' in value &&
    'error' in value
  );
}

export function isJSONRPCResponse(value: unknown): value is JSONRPCResponse {
  return isJSONRPCResultResponse(value) || isJSONRPCErrorResponse(value);
}

export function isJSONRPCMessage(value: unknown): value is JSONRPCMessage {
  return isJSONRPCRequest(value) || isJSONRPCNotification(value) || isJSONRPCResponse(value);
}

// ============================================================================
// MCP 错误类
// ============================================================================

export class McpError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'McpError';
  }
}