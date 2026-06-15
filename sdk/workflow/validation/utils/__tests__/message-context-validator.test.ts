/**
 * Message Context Validator Unit Tests
 * Tests for message-context-validator.ts functionality
 */

import { describe, it, expect } from "vitest";
import {
  validateAndMapMessageContexts,
  hasMessageContextConfig,
} from "../message-context-validator.js";
import type { StaticNode, SubgraphNodeConfig, WorkflowStartConfig } from "@wf-agent/types";

describe("validateAndMapMessageContexts", () => {
  describe("valid configurations", () => {
    it("should validate valid message context configuration", () => {
      const subgraphNode: StaticNode = {
        id: "subgraph-1",
        name: "Subgraph Node",
        type: "SUBGRAPH",
        config: {
          subgraphId: "child-workflow",
          messagePassing: {
            inputs: [
              {
                externalName: "parent-query",
                internalName: "query",
              },
            ],
            outputs: [
              {
                internalName: "result",
                externalName: "parent-result",
              },
            ],
          },
        } as SubgraphNodeConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const startNode: StaticNode = {
        id: "start-1",
        name: "Start Node",
        type: "START",
        config: {
          messageInputs: [
            {
              externalName: "parent-query",
              internalName: "query",
              type: "string",
            },
          ],
        } as WorkflowStartConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const result = validateAndMapMessageContexts(subgraphNode, startNode);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.inputMapping.get("parent-query")).toBe("query");
        expect(result.value.outputMapping.get("result")).toBe("parent-result");
      }
    });

    it("should validate configuration with only inputs", () => {
      const subgraphNode: StaticNode = {
        id: "subgraph-1",
        name: "Subgraph Node",
        type: "SUBGRAPH",
        config: {
          subgraphId: "child-workflow",
          messagePassing: {
            inputs: [
              {
                externalName: "parent-query",
                internalName: "query",
              },
            ],
          },
        } as SubgraphNodeConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const startNode: StaticNode = {
        id: "start-1",
        name: "Start Node",
        type: "START",
        config: {
          messageInputs: [
            {
              externalName: "parent-query",
              internalName: "query",
              type: "string",
            },
          ],
        } as WorkflowStartConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const result = validateAndMapMessageContexts(subgraphNode, startNode);
      expect(result.isOk()).toBe(true);
    });

    it("should validate configuration with only outputs", () => {
      const subgraphNode: StaticNode = {
        id: "subgraph-1",
        name: "Subgraph Node",
        type: "SUBGRAPH",
        config: {
          subgraphId: "child-workflow",
          messagePassing: {
            outputs: [
              {
                internalName: "result",
                externalName: "parent-result",
              },
            ],
          },
        } as SubgraphNodeConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const startNode: StaticNode = {
        id: "start-1",
        name: "Start Node",
        type: "START",
        config: {} as WorkflowStartConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const result = validateAndMapMessageContexts(subgraphNode, startNode);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("invalid configurations", () => {
    it("should fail when messagePassing is missing", () => {
      const subgraphNode: StaticNode = {
        id: "subgraph-1",
        name: "Subgraph Node",
        type: "SUBGRAPH",
        config: {
          subgraphId: "child-workflow",
        } as SubgraphNodeConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const startNode: StaticNode = {
        id: "start-1",
        name: "Start Node",
        type: "START",
        config: {} as WorkflowStartConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const result = validateAndMapMessageContexts(subgraphNode, startNode);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain("must configure messagePassing");
      }
    });

    it("should fail when input references non-existent internal name", () => {
      const subgraphNode: StaticNode = {
        id: "subgraph-1",
        name: "Subgraph Node",
        type: "SUBGRAPH",
        config: {
          subgraphId: "child-workflow",
          messagePassing: {
            inputs: [
              {
                externalName: "parent-query",
                internalName: "non-existent",
              },
            ],
          },
        } as SubgraphNodeConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const startNode: StaticNode = {
        id: "start-1",
        name: "Start Node",
        type: "START",
        config: {
          messageInputs: [
            {
              externalName: "parent-query",
              internalName: "query",
              type: "string",
            },
          ],
        } as WorkflowStartConfig,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      };

      const result = validateAndMapMessageContexts(subgraphNode, startNode);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain("does not accept input");
      }
    });
  });
});

describe("hasMessageContextConfig", () => {
  it("should return true when messagePassing has inputs", () => {
    const node: StaticNode = {
      id: "subgraph-1",
      name: "Subgraph Node",
      type: "SUBGRAPH",
      config: {
        subgraphId: "child-workflow",
        messagePassing: {
          inputs: [
            {
              externalName: "parent-query",
              internalName: "query",
            },
          ],
        },
      } as SubgraphNodeConfig,
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
    };

    expect(hasMessageContextConfig(node)).toBe(true);
  });

  it("should return true when messagePassing has outputs", () => {
    const node: StaticNode = {
      id: "subgraph-1",
      name: "Subgraph Node",
      type: "SUBGRAPH",
      config: {
        subgraphId: "child-workflow",
        messagePassing: {
          outputs: [
            {
              internalName: "result",
              externalName: "parent-result",
            },
          ],
        },
      } as SubgraphNodeConfig,
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
    };

    expect(hasMessageContextConfig(node)).toBe(true);
  });

  it("should return false when messagePassing is missing", () => {
    const node: StaticNode = {
      id: "subgraph-1",
      name: "Subgraph Node",
      type: "SUBGRAPH",
      config: {
        subgraphId: "child-workflow",
      } as SubgraphNodeConfig,
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
    };

    expect(hasMessageContextConfig(node)).toBe(false);
  });

  it("should return false when messagePassing has empty inputs and outputs", () => {
    const node: StaticNode = {
      id: "subgraph-1",
      name: "Subgraph Node",
      type: "SUBGRAPH",
      config: {
        subgraphId: "child-workflow",
        messagePassing: {
          inputs: [],
          outputs: [],
        },
      } as SubgraphNodeConfig,
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
    };

    expect(hasMessageContextConfig(node)).toBe(false);
  });
});
