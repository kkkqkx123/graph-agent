//! State snapshots value objects

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnapshotVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

impl SnapshotVersion {
    pub fn new(major: u32, minor: u32, patch: u32) -> Self {
        Self { major, minor, patch }
    }
}
