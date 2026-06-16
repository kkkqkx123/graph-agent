/**
 * Generic storage utilities - Module-level functions for entity persistence.
 *
 * Eliminates 6 nearly-identical storage utility files by providing
 * generic persist/remove/load/initialize functions parameterized by
 * entity-specific metadata builders.
 *
 * Dependencies (storage adapter) are passed as function parameters.
 */

import type { BaseStorageAdapter } from "@wf-agent/storage";
import { createContextualLogger } from "../../../utils/contextual-logger.js";
import { getErrorMessage } from "@wf-agent/common-utils";

const logger = createContextualLogger();

/**
 * Entity descriptor for generic storage operations.
 * Encapsulates all entity-specific knowledge needed for persistence.
 */
export interface StorageEntityInfo<T> {
  /** Extract the unique identifier from an entity */
  getId: (entity: T) => string;
  /** Build metadata object for storage indexing */
  buildMetadata: (entity: T) => Record<string, unknown>;
  /** Entity name for logging (singular, e.g. "tool", "script") */
  entityName: string;
}

/**
 * Persist an item to storage (write-through).
 * Serializes the item as JSON and saves via the adapter.
 *
 * @param item The item to persist
 * @param adapter Storage adapter (or null/undefined to skip)
 * @param info Entity descriptor for ID extraction, metadata, and logging
 */
export async function persistItem<T>(
  item: T,
  adapter: BaseStorageAdapter<Record<string, unknown>, void> | null | undefined,
  info: StorageEntityInfo<T>,
): Promise<void> {
  if (!adapter) {
    logger.debug(`No storage adapter configured, skipping ${info.entityName} persistence`);
    return;
  }

  const id = info.getId(item);

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(item));
    const metadata = info.buildMetadata(item);

    await adapter.save(id, data, metadata);
    logger.debug(`${capitalize(info.entityName)} persisted successfully`, { id });
  } catch (error) {
    logger.error(`Failed to persist ${info.entityName}`, {
      id,
      operation: "persist",
      storageType: adapter.constructor.name,
      error: getErrorMessage(error),
    });
    throw error;
  }
}

/**
 * Remove an item from storage.
 *
 * @param id Unique identifier of the item to remove
 * @param adapter Storage adapter (or null/undefined to skip)
 * @param entityName Entity name for logging
 */
export async function removeItem(
  id: string,
  adapter: BaseStorageAdapter<Record<string, unknown>, void> | null | undefined,
  entityName: string,
): Promise<void> {
  if (!adapter) {
    return;
  }

  try {
    await adapter.delete(id);
    logger.debug(`${capitalize(entityName)} removed from storage`, { id });
  } catch (error) {
    logger.error(`Failed to remove ${entityName} from storage`, {
      id,
      operation: "remove",
      storageType: adapter.constructor.name,
      error: getErrorMessage(error),
    });
  }
}

/**
 * Load an item from storage.
 * Deserializes the stored JSON back into the expected type.
 *
 * @param id Unique identifier of the item to load
 * @param adapter Storage adapter (or null/undefined to skip)
 * @param entityName Entity name for logging
 * @returns The deserialized item, or null if not found or on error
 */
export async function loadItem<T>(
  id: string,
  adapter: BaseStorageAdapter<Record<string, unknown>, void> | null | undefined,
  entityName: string,
): Promise<T | null> {
  if (!adapter) {
    return null;
  }

  try {
    const data = await adapter.load(id);
    if (!data) {
      return null;
    }

    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(`Failed to load ${entityName} from storage`, {
      id,
      operation: "load",
      storageType: adapter.constructor.name,
      error: getErrorMessage(error),
    });
    return null;
  }
}

/**
 * Initialize an items collection from storage.
 * Loads all persisted items into the provided collection.
 *
 * @param adapter Storage adapter (or null to skip)
 * @param items Mutable collection to populate (must support set/has/size)
 * @param info Entity descriptor for ID extraction, metadata, and logging
 */
export async function initializeFromStorage<T>(
  adapter: BaseStorageAdapter<Record<string, unknown>, void> | null,
  items: { set: (key: string, value: T) => void; has: (key: string) => boolean; size: number },
  info: StorageEntityInfo<T>,
): Promise<void> {
  if (!adapter) {
    logger.debug(
      `No storage adapter configured, skipping ${info.entityName} initialization from storage`,
    );
    return;
  }

  try {
    const ids = await adapter.list();

    logger.info(`Initializing ${info.entityName}s from storage`, {
      count: ids.length,
      storageType: adapter.constructor.name,
    });

    for (const id of ids) {
      try {
        const item = await loadItem<T>(id, adapter, info.entityName);
        if (item) {
          items.set(id, item);
        }
      } catch (error) {
        logger.error(`Failed to load ${info.entityName} from storage`, {
          id,
          error: getErrorMessage(error),
        });
      }
    }

    logger.info(`${capitalize(info.entityName)} initialization complete`, {
      loadedCount: items.size,
    });
  } catch (error) {
    logger.error(`Failed to initialize ${info.entityName}s from storage`, {
      error: getErrorMessage(error),
      storageType: adapter.constructor.name,
      operation: "initializeFromStorage",
    });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
