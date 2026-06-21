/**
 * DispatchEventCommand - Dispatch Event Command
 *
 * Category: Management
 * Cross-module event dispatching for Graph, Agent, and other modules
 */

import {
  ManagementCommand,
  CommandValidationResult,
  validationFailure,
  validationSuccess,
  type CommandMetadataDefinition,
} from "../../types/command.js";
import type { APIDependencyManager } from "../../core/sdk-dependencies.js";
import type { Event } from "@wf-agent/types";
import { emit } from "../../../../shared/utils/event/emit-event.js";

/**
 * Dispatch event parameters
 */
export interface DispatchEventParams {
  /** Event object to dispatch */
  event: Event;
}

/**
 * DispatchEventCommand - Dispatch Event
 * Sends an event to the event manager for distribution
 */
export class DispatchEventCommand extends ManagementCommand<void> {
  constructor(
    private readonly params: DispatchEventParams,
    private readonly dependencies: APIDependencyManager,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "DispatchEventCommand",
      description: "Dispatch an event to the event manager",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      idempotent: false,
    };
  }

  /**
   * Validate command parameters
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.event) {
      errors.push("Event object cannot be empty");
    } else if (!this.params.event.type) {
      errors.push("Event type cannot be empty");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  /**
   * Execute command - dispatch the event
   */
  protected async executeInternal(): Promise<void> {
    const eventManager = this.dependencies.getEventManager();
    await emit(eventManager, this.params.event);
  }
}
