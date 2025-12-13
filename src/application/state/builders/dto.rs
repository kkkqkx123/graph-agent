//! State builder DTOs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStateRequest {
    pub state_type: String,
    pub initial_data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateResponse {
    pub id: String,
    pub state_type: String,
    pub data: serde_json::Value,
}
