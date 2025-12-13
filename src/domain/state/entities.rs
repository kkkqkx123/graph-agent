//! State domain entities

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    pub id: StateId,
    pub data: serde_json::Value,
}

impl State {
    pub fn new() -> Self {
        Self {
            id: StateId(Uuid::new_v4()),
            data: serde_json::Value::Object(Default::default()),
        }
    }
}