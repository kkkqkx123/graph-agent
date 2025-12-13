//! CLI command implementations

use clap::Parser;

#[derive(Parser)]
pub struct Cli {
    #[arg(short, long)]
    pub verbose: bool,
}

impl Cli {
    pub fn new() -> Self {
        Self { verbose: false }
    }
}