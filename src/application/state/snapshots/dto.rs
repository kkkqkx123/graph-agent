//! State snapshots DTOs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSnapshotRequest {
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotResponse {
    pub id: String,
    pub state_id: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub metadata: SnapshotMetadataDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotMetadataDto {
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub size_bytes: u64,
}
