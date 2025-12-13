//! State history value objects

use serde::{Deserialize, Serialize};
use crate::domain::common::timestamp::Timestamp;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HistoryMetadata {
    pub version: u32,
    pub description: String,
}

impl HistoryMetadata {
    pub fn new(version: u32, description: String) -> Self {
        Self { version, description }
    }
}
