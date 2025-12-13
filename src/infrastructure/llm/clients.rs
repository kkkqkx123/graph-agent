//! LLM client implementations

use async_trait::async_trait;

#[async_trait]
pub trait LLMClient: Send + Sync {
    async fn generate(&self, request: &str) -> Result<String, LLMError>;
}

#[derive(Debug, thiserror::Error)]
pub enum LLMError {
    #[error("API error: {0}")]
    ApiError(String),
}