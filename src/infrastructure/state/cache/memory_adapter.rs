//! Memory cache adapter implementation

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

/// Memory cache entry
#[derive(Debug, Clone)]
struct CacheEntry {
    value: Vec<u8>,
    expires_at: Option<Instant>,
}

/// Memory cache adapter
pub struct MemoryCacheAdapter {
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    default_ttl: Duration,
}

impl MemoryCacheAdapter {
    /// Create a new memory cache adapter
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl,
        }
    }

    /// Get a value from cache
    pub fn get(&self, key: &str) -> Result<Option<Vec<u8>>, MemoryCacheError> {
        let cache = self.cache.read()
            .map_err(|_| MemoryCacheError::LockError)?;

        if let Some(entry) = cache.get(key) {
            // Check if entry is expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    // Entry is expired, return None
                    return Ok(None);
                }
            }
            
            Ok(Some(entry.value.clone()))
        } else {
            Ok(None)
        }
    }

    /// Set a value in cache
    pub fn set(&self, key: &str, value: &[u8], ttl: Option<Duration>) -> Result<(), MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        let actual_ttl = ttl.unwrap_or(self.default_ttl);
        let expires_at = if actual_ttl.as_secs() > 0 {
            Some(Instant::now() + actual_ttl)
        } else {
            None
        };

        let entry = CacheEntry {
            value: value.to_vec(),
            expires_at,
        };

        cache.insert(key.to_string(), entry);
        Ok(())
    }

    /// Delete a value from cache
    pub fn delete(&self, key: &str) -> Result<(), MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        cache.remove(key);
        Ok(())
    }

    /// Check if a key exists
    pub fn exists(&self, key: &str) -> Result<bool, MemoryCacheError> {
        let cache = self.cache.read()
            .map_err(|_| MemoryCacheError::LockError)?;

        if let Some(entry) = cache.get(key) {
            // Check if entry is expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    // Entry is expired
                    return Ok(false);
                }
            }
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Get multiple values from cache
    pub fn mget(&self, keys: &[&str]) -> Result<Vec<Option<Vec<u8>>>, MemoryCacheError> {
        let cache = self.cache.read()
            .map_err(|_| MemoryCacheError::LockError)?;

        let mut results = Vec::new();
        
        for key in keys {
            if let Some(entry) = cache.get(*key) {
                // Check if entry is expired
                if let Some(expires_at) = entry.expires_at {
                    if Instant::now() > expires_at {
                        // Entry is expired
                        results.push(None);
                        continue;
                    }
                }
                results.push(Some(entry.value.clone()));
            } else {
                results.push(None);
            }
        }

        Ok(results)
    }

    /// Set multiple values in cache
    pub fn mset(&self, key_values: &[(&str, &[u8])], ttl: Option<Duration>) -> Result<(), MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        let actual_ttl = ttl.unwrap_or(self.default_ttl);
        let expires_at = if actual_ttl.as_secs() > 0 {
            Some(Instant::now() + actual_ttl)
        } else {
            None
        };

        for (key, value) in key_values {
            let entry = CacheEntry {
                value: value.to_vec(),
                expires_at,
            };
            cache.insert(key.to_string(), entry);
        }

        Ok(())
    }

    /// Get TTL for a key
    pub fn ttl(&self, key: &str) -> Result<Option<Duration>, MemoryCacheError> {
        let cache = self.cache.read()
            .map_err(|_| MemoryCacheError::LockError)?;

        if let Some(entry) = cache.get(key) {
            if let Some(expires_at) = entry.expires_at {
                let now = Instant::now();
                if now > expires_at {
                    // Entry is expired
                    return Ok(None);
                }
                let remaining = expires_at.duration_since(now);
                return Ok(Some(remaining));
            }
            Ok(Some(Duration::from_secs(0))) // No TTL
        } else {
            Ok(None) // Key doesn't exist
        }
    }

    /// Extend TTL for a key
    pub fn expire(&self, key: &str, ttl: Duration) -> Result<bool, MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;
    
        if let Some(entry) = cache.get_mut(key) {
            entry.expires_at = Some(Instant::now() + ttl);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Clear all cache keys matching pattern
    pub fn clear_pattern(&self, pattern: &str) -> Result<usize, MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        let keys_to_remove: Vec<String> = cache
            .keys()
            .filter(|key| key.contains(pattern))
            .cloned()
            .collect();

        let count = keys_to_remove.len();
        
        for key in keys_to_remove {
            cache.remove(&key);
        }

        Ok(count)
    }

    /// Clear all cache entries
    pub fn clear_all(&self) -> Result<(), MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        cache.clear();
        Ok(())
    }

    /// Get cache statistics
    pub fn stats(&self) -> Result<CacheStats, MemoryCacheError> {
        let cache = self.cache.read()
            .map_err(|_| MemoryCacheError::LockError)?;

        let now = Instant::now();
        let mut stats = CacheStats::default();
        
        for entry in cache.values() {
            // Only count non-expired entries
            if let Some(expires_at) = entry.expires_at {
                if now <= expires_at {
                    stats.entry_count += 1;
                    stats.memory_used_bytes += entry.value.len() as u64;
                }
            } else {
                stats.entry_count += 1;
                stats.memory_used_bytes += entry.value.len() as u64;
            }
        }

        Ok(stats)
    }

    /// Clean up expired entries
    pub fn cleanup_expired(&self) -> Result<usize, MemoryCacheError> {
        let mut cache = self.cache.write()
            .map_err(|_| MemoryCacheError::LockError)?;

        let now = Instant::now();
        let expired_keys: Vec<String> = cache
            .iter()
            .filter(|(_, entry)| {
                if let Some(expires_at) = entry.expires_at {
                    now > expires_at
                } else {
                    false
                }
            })
            .map(|(key, _)| key.clone())
            .collect();

        let count = expired_keys.len();
        
        for key in expired_keys {
            cache.remove(&key);
        }

        Ok(count)
    }
}

/// Cache statistics
#[derive(Debug, Clone, Default)]
pub struct CacheStats {
    pub entry_count: usize,
    pub memory_used_bytes: u64,
}

impl CacheStats {
    /// Calculate memory usage in MB
    pub fn memory_used_mb(&self) -> f64 {
        self.memory_used_bytes as f64 / 1024.0 / 1024.0
    }
}

/// Memory cache error
#[derive(Debug, thiserror::Error)]
pub enum MemoryCacheError {
    #[error("Cache lock error")]
    LockError,
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
}

impl crate::infrastructure::state::managers::state_manager::CacheAdapter for MemoryCacheAdapter {
    fn get(&self, key: &str) -> Result<Option<Vec<u8>>, crate::infrastructure::state::managers::state_manager::CacheError> {
        self.get(key)
            .map_err(|e| crate::infrastructure::state::managers::state_manager::CacheError::OperationError(e.to_string()))
    }

    fn set(&self, key: &str, value: &[u8], ttl: Option<std::time::Duration>) -> Result<(), crate::infrastructure::state::managers::state_manager::CacheError> {
        self.set(key, value, ttl)
            .map_err(|e| crate::infrastructure::state::managers::state_manager::CacheError::OperationError(e.to_string()))
    }

    fn delete(&self, key: &str) -> Result<(), crate::infrastructure::state::managers::state_manager::CacheError> {
        self.delete(key)
            .map_err(|e| crate::infrastructure::state::managers::state_manager::CacheError::OperationError(e.to_string()))
    }
}