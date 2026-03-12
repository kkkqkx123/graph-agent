/**
 * Tool Approval Types
 * Types for tool approval coordination
 */

import type { LLMToolCall } from '../message/index.js';

/**
 * Tool Approval Options
 * Options for tool approval coordinator
 * Note: This is different from ToolApprovalConfig in workflow/config.ts
 * which is used for workflow-level configuration
 */
export interface ToolApprovalOptions {
  /** List of auto-approved tool IDs/names */
  autoApprovedTools?: string[];
  /** Approval timeout in milliseconds (0 = no timeout) */
  approvalTimeout?: number;
}

/**
 * Tool Approval Request
 * Request for tool approval
 */
export interface ToolApprovalRequest {
  /** Tool call to approve */
  toolCall: LLMToolCall;
  /** Tool description */
  toolDescription?: string;
  /** Context ID (thread ID, session ID, etc.) */
  contextId: string;
  /** Node ID (optional) */
  nodeId?: string;
  /** Interaction ID for tracking */
  interactionId: string;
}

/**
 * Tool Approval Result
 * Result of tool approval process
 */
export interface ToolApprovalResult {
  /** Whether the tool call is approved */
  approved: boolean;
  /** Tool call ID */
  toolCallId: string;
  /** Edited parameters (if user modified them) */
  editedParameters?: Record<string, any>;
  /** User instruction (optional additional context) */
  userInstruction?: string;
  /** Rejection reason (if not approved) */
  rejectionReason?: string;
}

/**
 * Tool Approval Handler
 * Interface for handling tool approval requests
 */
export interface ToolApprovalHandler {
  /**
   * Request tool approval
   * @param request Approval request
   * @returns Approval result
   */
  requestApproval(request: ToolApprovalRequest): Promise<ToolApprovalResult>;
}

/**
 * Tool Approval Coordinator Params
 * Parameters for tool approval coordinator
 */
export interface ToolApprovalCoordinatorParams {
  /** Tool call to process */
  toolCall: LLMToolCall;
  /** Approval options */
  options?: ToolApprovalOptions;
  /** Context ID */
  contextId: string;
  /** Node ID (optional) */
  nodeId?: string;
  /** Tool description (optional) */
  toolDescription?: string;
  /** Approval handler */
  approvalHandler: ToolApprovalHandler;
}
