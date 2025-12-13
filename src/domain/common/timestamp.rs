//! Common domain timestamp utilities

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Timestamp(pub DateTime<Utc>);

impl Hash for Timestamp {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.timestamp().hash(state);
    }
}

impl PartialOrd for Timestamp {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Timestamp {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.cmp(&other.0)
    }
}

impl std::ops::Add<std::time::Duration> for Timestamp {
    type Output = Timestamp;

    fn add(self, rhs: std::time::Duration) -> Self::Output {
        Timestamp(self.0 + chrono::Duration::from_std(rhs).unwrap())
    }
}

impl Timestamp {
    pub fn now() -> Self {
        Self(Utc::now())
    }
}

impl Default for Timestamp {
    fn default() -> Self {
        Self::now()
    }
}