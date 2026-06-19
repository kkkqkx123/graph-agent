/**
 * MCP Service Module
 *
 * The Model Context Protocol (MCP) service provides managed connections to MCP servers
 * with support for tool execution, resource access, and dynamic context generation.
 *
 * ## Architecture
 *
 * ```
 * mcp/
 * ├── core/              # Connection management and lifecycle
 * ├── features/          # High-level features (metadata, registration, approval, analytics)
 * ├── transport/         # Transport layer (stdio, SSE, HTTP)
 * └── config/            # Configuration management
 * ```
 *
 * ## Public API (Stable)
 *
 * Use these for primary integration points:
 * - `McpConnectionManager`: Manage server connections
 * - `McpServerRegistry`: Singleton access to connection manager
 * - Types from `types.ts`: Configuration and state types
 *
 * ## Feature APIs (Recommended for advanced use)
 *
 * Import from submodules based on your needs:
 * - `metadata/`: Dynamic context injection, tool discovery
 * - `registration/`: Dynamic tool registration
 * - `approval/`: Access control and rate limiting
 * - `analytics/`: Usage tracking
 *
 * ## Transport Layer (Internal)
 *
 * Generally not used directly; configured via server settings.
 */

// ============================================================================
// CORE API (Stable - Primary integration points)
// ============================================================================

export type {
  McpServerStatus,
  McpTransportType,
  McpServerSource,
  McpServerLifecycle,
  McpServerConfigBase,
  McpStdioConfig,
  McpSseConfig,
  McpStreamableHttpConfig,
  McpServerConfig,
  McpTool,
  McpResource,
  McpResourceTemplate,
  McpErrorEntry,
  McpServerState,
  McpToolCallResult,
  McpResourceReadResult,
  McpSettings,
  McpConnectionState,
  McpManagerOptions,
  McpEventType,
  McpEventHandler,
} from "./types.js";

// Core connection management
export { McpConnectionManager } from "./core/index.js";
export { McpClient } from "./core/index.js";
export { McpServerRegistry, getMcpManager, releaseMcpManager } from "./core/index.js";

// Connection state utilities
export {
  createInitialServerState,
  updateServerStatus,
  addErrorToHistory,
  clearErrorState,
  isConnectable,
  isConnected,
  isDisabled,
  getServerDisplayName,
  updateLastActivity,
  updateLastHealthCheck,
  isIdleBeyond,
} from "./core/index.js";

// Configuration
export {
  loadServerConfigs,
  createDefaultMcpSettings,
  mergeServerConfigs,
  resolveServerLifecycle,
} from "./config/index.js";
export type { ResolvedLifecycle } from "./config/index.js";

// ============================================================================
// FEATURE APIs (Advanced features - Optional)
// ============================================================================

// Metadata features: Context generation, caching, tool discovery
export {
  // Context provider
  McpToolsDynamicContextProvider,
  createMcpToolsContextProvider,
  // Metadata exporter
  McpToolMetadataExporter,
  // Metadata cache
  McpToolMetadataCache,
} from "./features/metadata/index.js";

export type {
  McpToolsContextOptions,
  GeneratedMcpToolsContext,
  McpToolInfo,
  McpServerMetadata,
  ExportedMcpToolsContext,
  McpToolMetadataCacheConfig,
} from "./features/metadata/index.js";

// Registration features: Dynamic tool registration
export {
  McpToolsRegistrar,
  createMcpToolsRegistrar,
} from "./features/registration/index.js";

export type {
  McpToolRegistrationOptions,
} from "./features/registration/index.js";

// Approval features: Access control and rate limiting
export {
  EnhancedMcpApprovalSystem,
} from "./features/approval/index.js";

export type {
  ParameterApprovalRule,
  RateLimitingRule,
  AccessControlRule,
  ToolCallApprovalContext,
  ResourceAccessApprovalContext,
  ApprovalResult,
} from "./features/approval/index.js";

// Analytics features: Usage tracking
export {
  McpToolsUsageAnalytics,
} from "./features/analytics/index.js";

export type {
  ToolExecutionStats,
  ToolAnalyticsEntry,
  AnalyticsReport,
} from "./features/analytics/index.js";

// ============================================================================
// TRANSPORT LAYER (Internal - use via config, not directly)
// ============================================================================

export {
  type IMcpTransport,
  type TransportConfig,
  type TransportEventHandlers,
  type TransportOptions,
  StdioTransport,
  SseTransport,
  StreamableHttpTransport,
  createTransport,
  isTransportTypeSupported,
} from "./transport/index.js";
