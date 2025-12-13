//! HTTP request handlers

use axum::response::Json;
use serde_json::Value;

pub async fn health_check() -> Json<Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now()
    }))
}