//! Token calculator for LLM

pub struct TokenCalculator;

impl TokenCalculator {
    pub fn new() -> Self {
        Self
    }
    
    pub fn calculate_tokens(&self, text: &str) -> u32 {
        // Simple estimation: 4 characters = 1 token
        (text.len() as f32 / 4.0).ceil() as u32
    }
}