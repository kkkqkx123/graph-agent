//! Workflow registry domain entities

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::domain::common::timestamp::Timestamp;
use super::entities::WorkflowId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TemplateId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRegistry {
    pub workflows: HashMap<WorkflowId, WorkflowMetadata>,
    pub templates: HashMap<TemplateId, WorkflowTemplate>,
}

impl WorkflowRegistry {
    pub fn new() -> Self {
        Self {
            workflows: HashMap::new(),
            templates: HashMap::new(),
        }
    }

    pub fn register_workflow(&mut self, metadata: WorkflowMetadata) {
        self.workflows.insert(metadata.id.clone(), metadata);
    }

    pub fn unregister_workflow(&mut self, workflow_id: &WorkflowId) -> Option<WorkflowMetadata> {
        self.workflows.remove(workflow_id)
    }

    pub fn get_workflow(&self, workflow_id: &WorkflowId) -> Option<&WorkflowMetadata> {
        self.workflows.get(workflow_id)
    }

    pub fn list_workflows(&self) -> Vec<&WorkflowMetadata> {
        self.workflows.values().collect()
    }

    pub fn register_template(&mut self, template: WorkflowTemplate) {
        self.templates.insert(template.id.clone(), template);
    }

    pub fn get_template(&self, template_id: &TemplateId) -> Option<&WorkflowTemplate> {
        self.templates.get(template_id)
    }

    pub fn list_templates(&self) -> Vec<&WorkflowTemplate> {
        self.templates.values().collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowMetadata {
    pub id: WorkflowId,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub tags: Vec<String>,
    pub category: Option<String>,
}

impl WorkflowMetadata {
    pub fn new(name: String, version: String) -> Self {
        let now = Timestamp::now();
        Self {
            id: WorkflowId(Uuid::new_v4()),
            name,
            version,
            description: None,
            created_at: now.clone(),
            updated_at: now,
            tags: Vec::new(),
            category: None,
        }
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn with_category(mut self, category: String) -> Self {
        self.category = Some(category);
        self
    }

    pub fn update_timestamp(&mut self) {
        self.updated_at = Timestamp::now();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTemplate {
    pub id: TemplateId,
    pub name: String,
    pub description: Option<String>,
    pub template_data: serde_json::Value,
    pub parameters: Vec<TemplateParameter>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl WorkflowTemplate {
    pub fn new(name: String, template_data: serde_json::Value) -> Self {
        let now = Timestamp::now();
        Self {
            id: TemplateId(Uuid::new_v4()),
            name,
            description: None,
            template_data,
            parameters: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    pub fn with_parameters(mut self, parameters: Vec<TemplateParameter>) -> Self {
        self.parameters = parameters;
        self
    }

    pub fn update_timestamp(&mut self) {
        self.updated_at = Timestamp::now();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    pub name: String,
    pub parameter_type: ParameterType,
    pub required: bool,
    pub default_value: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterType {
    String,
    Number,
    Boolean,
    Array,
    Object,
}