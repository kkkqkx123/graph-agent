/**
 * Tool Approval Coordinator
 * Coordinates tool approval process
 *
 * Core Responsibilities:
 * 1. Check if tool requires approval
 * 2. Request user approval
 * 3. Process approval result
 * 4. Support parameter editing and user instructions
 *
 * Design Principles:
 * - Pure approval coordination logic
 * - No business-specific features (checkpoint, thread management)
 * - Reusable across modules (Graph, Agent, etc.)
 * - Layer-independent: uses generic event types from types package
 */

import type {
  LLMToolCall,
  ToolApprovalOptions,
  ToolApprovalResult,
  ToolApprovalHandler,
  ToolApprovalCoordinatorParams,
  ToolApprovalRequest
} from '@modular-agent/types';
import { generateId, now } from '@modular-agent/common-utils';
import type { EventManager } from '../services/event-manager.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';

const logger = createContextualLogger();

/**
 * Tool Approval Coordinator Class
 *
 * Responsibilities:
 * - Check if tool requires approval
 * - Request user approval
 * - Process approval result
 *
 * Design Principles:
 * - Pure coordination logic
 * - Reusable across modules
 */
export class ToolApprovalCoordinator {
  /**
   * Constructor
   *
   * @param eventManager Event manager for triggering events
   */
  constructor(private eventManager?: EventManager) { }

  /**
   * Process tool approval
   *
   * This method coordinates the complete tool approval process:
   * 1. Check if tool requires approval
   * 2. Request user approval (if required)
   * 3. Return approval result
   *
   * @param params Approval parameters
   * @returns Approval result
   */
  async processToolApproval(
    params: ToolApprovalCoordinatorParams
  ): Promise<ToolApprovalResult> {
    const {
      toolCall,
      options,
      contextId,
      nodeId,
      toolDescription,
      approvalHandler
    } = params;

    // Check if tool requires approval
    // LLMToolCall has function.name, not name directly
    const toolName = toolCall.function?.name || '';
    if (!this.requiresApproval(toolName, options)) {
      // Auto-approve
      return {
        approved: true,
        toolCallId: toolCall.id
      };
    }

    // Generate interaction ID
    const interactionId = generateId();

    // Create approval request
    const request: ToolApprovalRequest = {
      toolCall,
      toolDescription,
      contextId,
      nodeId,
      interactionId
    };

    try {
      // Trigger USER_INTERACTION_REQUESTED event
      if (this.eventManager) {
        await this.triggerApprovalRequestedEvent(request, options?.approvalTimeout || 0);
      }

      // Request approval
      const result = await approvalHandler.requestApproval(request);

      // Trigger USER_INTERACTION_PROCESSED event
      if (this.eventManager) {
        await this.triggerApprovalProcessedEvent(request, result);
      }

      return result;
    } catch (error) {
      // Return rejection on error
      return {
        approved: false,
        toolCallId: toolCall.id,
        rejectionReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if tool requires approval
   *
   * @param toolName Tool name
   * @param options Approval options
   * @returns Whether approval is required
   */
  requiresApproval(toolName: string, options?: ToolApprovalOptions): boolean {
    // If no options, no approval required
    if (!options) {
      return false;
    }

    // Check if tool is in auto-approved list
    const autoApproved = options.autoApprovedTools || [];
    return !autoApproved.includes(toolName);
  }

  /**
   * Trigger approval requested event
   */
  private async triggerApprovalRequestedEvent(
    request: ToolApprovalRequest,
    timeout: number
  ): Promise<void> {
    try {
      const event = {
        type: 'USER_INTERACTION_REQUESTED' as const,
        timestamp: now(),
        threadId: request.contextId || '',
        interactionId: request.interactionId,
        operationType: 'TOOL_APPROVAL' as const,
        prompt: `Approve tool call "${request.toolCall.function?.name ?? 'unknown'}"?`,
        timeout,
        contextData: {
          toolName: request.toolCall.function?.name,
          toolDescription: request.toolDescription,
          toolCall: request.toolCall
        }
      };
      await this.eventManager!.emit(event);
    } catch (error) {
      logger.warn('Failed to trigger approval requested event', {
        contextId: request.contextId,
        error
      });
    }
  }

  /**
   * Trigger approval processed event
   */
  private async triggerApprovalProcessedEvent(
    request: ToolApprovalRequest,
    result: ToolApprovalResult
  ): Promise<void> {
    try {
      const event = {
        type: 'USER_INTERACTION_PROCESSED' as const,
        timestamp: now(),
        threadId: request.contextId || '',
        interactionId: request.interactionId,
        operationType: 'TOOL_APPROVAL' as const,
        results: result
      };
      await this.eventManager!.emit(event);
    } catch (error) {
      logger.warn('Failed to trigger approval processed event', {
        contextId: request.contextId,
        error
      });
    }
  }
}
