//! Cache errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CacheError {
    #[error("Cache operation failed: {0}")]
    OperationError(String),
    
    #[error("Cache miss")]
    CacheMiss,
}
