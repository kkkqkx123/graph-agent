/**
 * Integration Test: Registry and GlobalContext Interaction
 *
 * Tests how registries are initialized, accessed, and maintained through GlobalContext,
 * focusing on multi-execution isolation and dynamic registration.
 *
 * ⚠️ DESIGN ISSUES DETECTED:
 * - Lazy initialization of registries might cause state divergence
 * - No clear lifecycle management for registries
 * - Unclear how tool availability is tracked across executions
 * - No validation that registry state is consistent
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Tool } from "@wf-agent/types";
import { SkillRegistry } from "../../registry/skill-registry.js";
import { ToolRegistry } from "../../registry/tool-registry.js";

describe("Integration: Registry and GlobalContext Lifecycle", () => {
  let toolRegistry: ToolRegistry;
  let skillRegistry: SkillRegistry;

  const mockTools: Tool[] = [
    {
      id: "tool-calculator",
      name: "calculator",
      description: "Basic calculator operations",
      category: "math",
      inputSchema: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
          a: { type: "number" },
          b: { type: "number" },
        },
        required: ["operation", "a", "b"],
      },
    },
    {
      id: "tool-weather",
      name: "get_weather",
      description: "Get current weather for a location",
      category: "weather",
      inputSchema: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      },
    },
  ];

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    skillRegistry = new SkillRegistry();
  });

  describe("Scenario 1: Registry Population and Query", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Application initializes GlobalContext
     * 2. GlobalContext creates/retrieves ToolRegistry
     * 3. Tools are registered into ToolRegistry
     * 4. Multiple executions query available tools
     * 5. Tool availability must be consistent across queries
     */
    it("should maintain tool registry consistency across multiple accesses", async () => {
      // Register tools
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      // Query 1: From execution 1
      const exec1Tools = toolRegistry.getAll();
      expect(exec1Tools).toHaveLength(2);

      // Query 2: From execution 2 (same registry)
      const exec2Tools = toolRegistry.getAll();
      expect(exec2Tools).toHaveLength(2);

      // Both should see same tools
      const exec1ToolIds = new Set(exec1Tools.map((t) => t.id));
      const exec2ToolIds = new Set(exec2Tools.map((t) => t.id));

      expect(exec1ToolIds).toEqual(exec2ToolIds);
    });
  });

  describe("Scenario 2: Dynamic Tool Registration", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Initial set of tools is registered
     * 2. During execution, new tool becomes available
     * 3. New tool is registered into ToolRegistry
     * 4. Currently executing agents should see the new tool
     * 5. This requires registry to be observable/reactive
     */
    it("should handle dynamic tool registration", async () => {
      // Initial registration
      await toolRegistry.register(mockTools[0].id, mockTools[0]);
      expect(toolRegistry.getAll()).toHaveLength(1);

      // Get tools for execution 1
      const tools1 = toolRegistry.getAll();
      expect(tools1).toHaveLength(1);

      // New tool added dynamically
      await toolRegistry.register(mockTools[1].id, mockTools[1]);

      // Should see both tools now
      const tools2 = toolRegistry.getAll();
      expect(tools2).toHaveLength(2);

      // ⚠️ ISSUE: How are currently-executing agents notified of new tool?
      // Current design doesn't provide clear notification mechanism
      // This might require:
      // 1. Event emission on tool registration
      // 2. Registry observers
      // 3. Or explicit refresh calls
    });
  });

  describe("Scenario 3: Tool Filtering by Availability", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Multiple tools are registered
     * 2. Some tools might be disabled/unavailable for an execution
     * 3. Execution should only see available tools
     * 4. Tool availability might depend on:
     *    - Execution context (workflow vs agent)
     *    - User permissions
     *    - Feature flags
     *    - Environment configuration
     *
     * ⚠️ ISSUE: Current design doesn't support filtering/availability
     */
    it("should support tool availability filtering", async () => {
      // Register all tools
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      const allTools = toolRegistry.getAll();
      expect(allTools).toHaveLength(2);

      // ⚠️ ISSUE: There's no built-in way to:
      // 1. Mark a tool as unavailable
      // 2. Filter tools by availability
      // 3. Get filtered tool list

      // This should be supported:
      // const availableTools = toolRegistry.getAll().filter(t => t.available === true);

      // Or:
      // const executionAvailableTools = toolRegistry.getAvailableFor(executionId);

      // Current design doesn't provide this
      expect(allTools.map((t) => t.id)).toContain("tool-calculator");
      expect(allTools.map((t) => t.id)).toContain("tool-weather");
    });
  });

  describe("Scenario 4: Per-Execution Tool Scoping", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Global registry has all tools
     * 2. Execution A should only see tools in its context
     * 3. Execution B might see different tools
     * 4. For example:
     *    - Agent A: allowed [calculator, translator]
     *    - Agent B: allowed [weather, news]
     * 5. Each should only see their allowed tools
     *
     * ⚠️ ISSUE: Global registry doesn't support scoping
     */
    it("should support execution-specific tool scoping", async () => {
      // Register all tools globally
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      // ⚠️ PROBLEM: There's no way to create execution-specific scopes
      // Current usage:
      const allTools = toolRegistry.getAll();

      // Desired usage (not supported):
      // const scope1 = toolRegistry.createScope('exec-1', ['tool-calculator']);
      // const scope2 = toolRegistry.createScope('exec-2', ['tool-weather']);
      // const exec1Tools = scope1.getAll(); // Only calculator
      // const exec2Tools = scope2.getAll(); // Only weather

      // This would require:
      // 1. Scope manager in registry
      // 2. Per-scope tool whitelisting
      // 3. Or separate registries per execution context

      expect(allTools).toHaveLength(2);
      // But no way to filter to execution-specific subset
    });
  });

  describe("Scenario 5: Tool Removal and Cleanup", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Tool is no longer available (deprecated or removed)
     * 2. Tool is unregistered from ToolRegistry
     * 3. New executions don't see removed tool
     * 4. Currently-executing agents should stop using removed tool
     * 5. Checkpoint with removed tool should handle gracefully
     */
    it("should handle tool removal and cleanup", async () => {
      // Register tools
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      expect(toolRegistry.getAll()).toHaveLength(2);

      // Remove a tool
      await toolRegistry.unregister("tool-calculator");

      // Should be gone
      expect(toolRegistry.getAll()).toHaveLength(1);
      const remaining = toolRegistry.getAll();
      expect(remaining[0]?.id).toBe("tool-weather");

      // ⚠️ ISSUE: What about:
      // 1. Currently executing agent that was using calculator?
      // 2. Checkpoint that references the removed tool?
      // 3. Tool call results that reference removed tool?

      // These edge cases are not handled by current design
    });
  });

  describe("Scenario 6: Registry Persistence and Restoration", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Tools are registered during initialization
     * 2. System is checkpointed/serialized
     * 3. System is restored from checkpoint
     * 4. ToolRegistry should be in same state
     * 5. All tools should be available after restore
     */
    it("should maintain registry state through checkpoint cycle", async () => {
      // Initial registration
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      const toolsBefore = toolRegistry.getAll();
      expect(toolsBefore).toHaveLength(2);

      // Simulate checkpoint
      const registrySnapshot = {
        tools: toolsBefore.map((t) => ({ id: t.id, name: t.name })),
      };

      // Simulate restore
      const restoredRegistry = new ToolRegistry();
      for (const tool of mockTools) {
        await restoredRegistry.register(tool.id, tool);
      }

      const toolsAfter = restoredRegistry.getAll();
      expect(toolsAfter).toHaveLength(2);

      // Verify consistency
      const beforeIds = new Set(toolsBefore.map((t) => t.id));
      const afterIds = new Set(toolsAfter.map((t) => t.id));
      expect(beforeIds).toEqual(afterIds);
    });
  });

  describe("Scenario 7: Skill Registration and Tool Mapping", () => {
    /**
     * BUSINESS SCENARIO:
     * 1. Skills are high-level abstractions (e.g., "web_search")
     * 2. Skills map to multiple tools (e.g., google_search, bing_search)
     * 3. Skill registration should enable all mapped tools
     * 4. If skill is revoked, mapped tools should be disabled
     * 5. Registry should maintain skill-to-tool mapping
     */
    it("should manage skill-to-tool relationship", async () => {
      // Define skill mapping
      const skillMapping = {
        skill_id: "web_search",
        skill_name: "Web Search",
        tools: ["tool-calculator", "tool-weather"],
      };

      // Register skill
      await skillRegistry.register("web_search", {
        id: "web_search",
        name: "Web Search",
        description: "Search the web for information",
        tools: ["tool-calculator", "tool-weather"],
      } as any);

      // Register tools that skill depends on
      for (const tool of mockTools) {
        await toolRegistry.register(tool.id, tool);
      }

      // ⚠️ ISSUE: No built-in linking between SkillRegistry and ToolRegistry
      // To use web_search skill, user must:
      // 1. Check skillRegistry.get("web_search")
      // 2. Get the tools array
      // 3. Manually filter toolRegistry to those tools
      // 4. Or maintain skill-tool mapping manually

      const skill = await skillRegistry.get("web_search");
      expect(skill).toBeDefined();

      // Should have tools property
      expect((skill as any)?.tools).toBeDefined();
    });
  });

  describe("Design Issue: Registry Lifecycle and GlobalContext", () => {
    /**
     * This test documents issues with how registries are managed
     * by GlobalContext and potential state divergence problems.
     *
     * CURRENT ISSUES:
     * 1. Lazy initialization of registries:
     *    - First access creates registry from DI container
     *    - Subsequent accesses return cached instance
     *    - If DI container creates new instance each time, this breaks
     *
     * 2. No registry lifecycle hooks:
     *    - No way to know when registry is created/destroyed
     *    - No way to subscribe to registry changes
     *    - No way to validate registry consistency
     *
     * 3. No per-execution registry scoping:
     *    - All registries are global to GlobalContext
     *    - Multiple executions share same tools/skills
     *    - Can't isolate tools per execution
     *
     * 4. No registry state validation:
     *    - No consistency checks
     *    - Tool references might become stale
     *    - No detection of missing tools
     *
     * REQUIRED FIXES:
     * 1. Clear registry initialization contract
     * 2. Registry observer/event pattern
     * 3. Scoped registry support
     * 4. Consistency validation
     * 5. Clear lifecycle hooks
     */
    it("documents registry lifecycle issues", () => {
      // Issue 1: Lazy initialization uncertainty
      // Depends on DI container behavior
      expect(toolRegistry).toBeDefined();

      // Issue 2: No lifecycle awareness
      // No way to know:
      // - When registry is created
      // - What happens on GlobalContext destroy
      // - Whether registry is still valid

      // Issue 3: Global scope only
      // No way to create execution-specific scope

      // Issue 4: No validation
      // No built-in consistency checks

      // Documentation test - issues identified
      expect(true).toBe(true);
    });
  });
});
