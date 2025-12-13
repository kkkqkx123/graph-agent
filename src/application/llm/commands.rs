//! LLM application commands

#[derive(Debug, Clone)]
pub struct GenerateCommand {
    pub prompt: String,
}