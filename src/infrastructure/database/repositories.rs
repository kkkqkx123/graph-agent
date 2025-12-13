//! Database repositories

pub trait Repository<T, ID> {
    async fn save(&self, entity: &T) -> Result<(), RepositoryError>;
    async fn load(&self, id: &ID) -> Result<Option<T>, RepositoryError>;
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(String),
}