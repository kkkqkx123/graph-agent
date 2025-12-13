//! State application DTOs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDto {
    pub id: String,
    pub name: String,
}