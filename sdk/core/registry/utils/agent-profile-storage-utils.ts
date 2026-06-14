/**
 * Agent profile storage utilities - Module-level functions for agent profile persistence.
 * Delegates to generic-storage-utils with AgentProfileMeta-specific metadata builders.
 */

import type { AgentProfileStorageAdapter } from "@wf-agent/storage";
import type { AgentProfileMeta } from "../agent-profile-registry.js";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const agentProfileInfo: StorageEntityInfo<AgentProfileMeta> = {
  getId: (profile) => profile.id,
  buildMetadata: (profile) => ({
    profileId: profile.id,
    name: profile.name,
    description: profile.description || "",
  }),
  entityName: "agent profile",
};

/** Persist agent profile to storage (write-through) */
export async function persistAgentProfile(
  profile: AgentProfileMeta,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<void> {
  return persistItem(profile, adapter, agentProfileInfo);
}

/** Remove agent profile from storage */
export async function removeAgentProfile(
  profileId: string,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<void> {
  return removeItem(profileId, adapter, "agent profile");
}

/** Load agent profile from storage */
export async function loadAgentProfile(
  profileId: string,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<AgentProfileMeta | null> {
  return loadItem<AgentProfileMeta>(profileId, adapter, "agent profile");
}

/** Initialize agent profiles collection from storage */
export async function initializeAgentProfilesFromStorage(
  adapter: AgentProfileStorageAdapter | null,
  profiles: {
    set: (key: string, value: AgentProfileMeta) => void;
    has: (key: string) => boolean;
    size: number;
  },
): Promise<void> {
  return initializeFromStorage(adapter, profiles, agentProfileInfo);
}
