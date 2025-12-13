//! Logging infrastructure

use tracing::{info, warn, error};

pub struct LoggingService;

impl LoggingService {
    pub fn new() -> Self {
        Self
    }
    
    pub fn info(&self, message: &str) {
        info!("{}", message);
    }
    
    pub fn warn(&self, message: &str) {
        warn!("{}", message);
    }
    
    pub fn error(&self, message: &str) {
        error!("{}", message);
    }
}