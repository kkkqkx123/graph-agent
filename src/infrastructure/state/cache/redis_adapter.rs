//! Redis cache adapter implementation

use std::sync::Arc;
use std::time::Duration;

/// Redis cache adapter
pub struct RedisCacheAdapter {
    client: Arc<redis::Client>,
    ttl: Duration,
}

impl RedisCacheAdapter {
    /// Create a new Redis cache adapter
    pub fn new(redis_url: &str, ttl: Duration) -> Result<Self, RedisCacheError> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;
        
        Ok(Self {
            client: Arc::new(client),
            ttl,
        })
    }

    /// Get a value from cache
    pub fn get(&self, key: &str) -> Result<Option<Vec<u8>>, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let result: Option<Vec<u8>> = redis::cmd("GET")
            .arg(key)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(result)
    }

    /// Set a value in cache
    pub fn set(&self, key: &str, value: &[u8], ttl: Option<Duration>) -> Result<(), RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let actual_ttl = ttl.unwrap_or(self.ttl);
        
        if actual_ttl.as_secs() > 0 {
            let _: () = redis::cmd("SETEX")
                .arg(key)
                .arg(actual_ttl.as_secs())
                .arg(value)
                .query(&mut connection)
                .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;
        } else {
            // No TTL, use SET without expiration
            let _: () = redis::cmd("SET")
                .arg(key)
                .arg(value)
                .query(&mut connection)
                .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;
        }

        Ok(())
    }

    /// Delete a value from cache
    pub fn delete(&self, key: &str) -> Result<(), RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let _: () = redis::cmd("DEL")
            .arg(key)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(())
    }

    /// Check if a key exists
    pub fn exists(&self, key: &str) -> Result<bool, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let result: bool = redis::cmd("EXISTS")
            .arg(key)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(result)
    }

    /// Get multiple values from cache
    pub fn mget(&self, keys: &[&str]) -> Result<Vec<Option<Vec<u8>>>, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let mut cmd = redis::cmd("MGET");
        for key in keys {
            cmd.arg(key);
        }

        let result: Vec<Option<Vec<u8>>> = cmd
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(result)
    }

    /// Set multiple values in cache
    pub fn mset(&self, key_values: &[(&str, &[u8])], ttl: Option<Duration>) -> Result<(), RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let actual_ttl = ttl.unwrap_or(self.ttl);
        
        if actual_ttl.as_secs() > 0 {
            // Use pipeline for multiple SETEX operations
            let mut pipe = redis::pipe();
            
            for (key, value) in key_values {
                pipe.cmd("SETEX")
                    .arg(key)
                    .arg(actual_ttl.as_secs())
                    .arg(value);
            }
            
            let _: () = pipe.query(&mut connection)
                .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;
        } else {
            // Use MSET for no TTL
            let mut cmd = redis::cmd("MSET");
            
            for (key, value) in key_values {
                cmd.arg(key).arg(value);
            }
            
            let _: () = cmd.query(&mut connection)
                .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;
        }

        Ok(())
    }

    /// Get TTL for a key
    pub fn ttl(&self, key: &str) -> Result<Option<Duration>, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let result: i64 = redis::cmd("TTL")
            .arg(key)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        match result {
            -2 => Ok(None), // Key doesn't exist
            -1 => Ok(Some(Duration::from_secs(0))), // No TTL
            secs if secs >= 0 => Ok(Some(Duration::from_secs(secs as u64))),
            _ => Err(RedisCacheError::OperationError("Invalid TTL value".to_string())),
        }
    }

    /// Extend TTL for a key
    pub fn expire(&self, key: &str, ttl: Duration) -> Result<bool, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let result: bool = redis::cmd("EXPIRE")
            .arg(key)
            .arg(ttl.as_secs())
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(result)
    }

    /// Clear all cache keys matching pattern
    pub fn clear_pattern(&self, pattern: &str) -> Result<usize, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(pattern)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        if keys.is_empty() {
            return Ok(0);
        }

        let deleted: usize = redis::cmd("DEL")
            .arg(&keys)
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        Ok(deleted)
    }

    /// Get cache statistics
    pub fn stats(&self) -> Result<CacheStats, RedisCacheError> {
        let mut connection = self.client.get_connection()
            .map_err(|e| RedisCacheError::ConnectionError(e.to_string()))?;

        let info: String = redis::cmd("INFO")
            .query(&mut connection)
            .map_err(|e| RedisCacheError::OperationError(e.to_string()))?;

        let mut stats = CacheStats::default();
        
        // Parse INFO output for basic statistics
        for line in info.lines() {
            if line.starts_with("used_memory:") {
                if let Some(value) = line.split(':').nth(1) {
                    stats.memory_used_bytes = value.trim().parse().unwrap_or(0);
                }
            } else if line.starts_with("connected_clients:") {
                if let Some(value) = line.split(':').nth(1) {
                    stats.connected_clients = value.trim().parse().unwrap_or(0);
                }
            } else if line.starts_with("keyspace_hits:") {
                if let Some(value) = line.split(':').nth(1) {
                    stats.keyspace_hits = value.trim().parse().unwrap_or(0);
                }
            } else if line.starts_with("keyspace_misses:") {
                if let Some(value) = line.split(':').nth(1) {
                    stats.keyspace_misses = value.trim().parse().unwrap_or(0);
                }
            }
        }

        Ok(stats)
    }
}

/// Cache statistics
#[derive(Debug, Clone, Default)]
pub struct CacheStats {
    pub memory_used_bytes: u64,
    pub connected_clients: u32,
    pub keyspace_hits: u64,
    pub keyspace_misses: u64,
}

impl CacheStats {
    /// Calculate hit ratio
    pub fn hit_ratio(&self) -> f64 {
        let total = self.keyspace_hits + self.keyspace_misses;
        if total == 0 {
            0.0
        } else {
            self.keyspace_hits as f64 / total as f64
        }
    }

    /// Calculate memory usage in MB
    pub fn memory_used_mb(&self) -> f64 {
        self.memory_used_bytes as f64 / 1024.0 / 1024.0
    }
}

/// Redis cache error
#[derive(Debug, thiserror::Error)]
pub enum RedisCacheError {
    #[error("Redis connection error: {0}")]
    ConnectionError(String),
    #[error("Redis operation error: {0}")]
    OperationError(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
}

impl crate::infrastructure::state::managers::state_manager::CacheAdapter for RedisCacheAdapter {
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