//! State domain events

use serde::{Deserialize, Serialize};
use crate::domain::state::entities::StateId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateCreatedEvent {
    pub state_id: StateId,
}