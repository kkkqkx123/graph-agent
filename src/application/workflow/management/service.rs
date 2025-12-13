//! Workflow management service

use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::{
    entities::WorkflowId,
    registry::entities::*,
};

#[derive(Debug, Error)]
pub enum ManagementError {
    #[error("工作流启动失败: {0}")]
    StartFailed(String),
    #[error("工作流停止失败: {0}")]
    StopFailed(String),
    #[error("工作流不存在: {0:?}")]
    WorkflowNotFound(WorkflowId),
    #[error("生命周期管理错误: {0}")]
    LifecycleError(String),
    #[error("注册表错误: {0}")]
    RegistryError(String),
}

pub type ManagementResult<T> = Result<T, ManagementError>;

#[derive(Debug, Clone)]
pub struct ManagementService {
    lifecycle_manager: Arc<dyn LifecycleManager>,
    workflow_registry: Arc<dyn WorkflowRegistry>,
}

impl ManagementService {
    pub fn new(
        lifecycle_manager: Arc<dyn LifecycleManager>,
        workflow_registry: Arc<dyn WorkflowRegistry>,
    ) -> Self {
        Self {
            lifecycle_manager,
            workflow_registry,
        }
    }

    /// 启动工作流
    pub async fn start_workflow(&self, request: StartWorkflowRequest) -> ManagementResult<WorkflowInstance> {
        // 验证工作流是否存在
        let workflow_metadata = self.workflow_registry
            .get_workflow(&request.workflow_id)
            .await?
            .ok_or(ManagementError::WorkflowNotFound(request.workflow_id.clone()))?;

        // 创建工作流实例
        let instance = WorkflowInstance::new(
            request.workflow_id.clone(),
            workflow_metadata.name.clone(),
            request.initial_context,
        );

        // 启动工作流实例
        self.lifecycle_manager
            .start_instance(&instance.id, &request.workflow_id, &request.initial_context)
            .await?;

        // 注册实例
        self.workflow_registry
            .register_instance(instance.clone())
            .await?;

        Ok(instance)
    }

    /// 停止工作流
    pub async fn stop_workflow(&self, request: StopWorkflowRequest) -> ManagementResult<()> {
        // 验证工作流实例是否存在
        let instance = self.workflow_registry
            .get_instance(&request.instance_id)
            .await?
            .ok_or(ManagementError::LifecycleError(
                format!("工作流实例不存在: {:?}", request.instance_id)
            ))?;

        // 停止工作流实例
        self.lifecycle_manager
            .stop_instance(&instance.id)
            .await?;

        // 更新实例状态
        self.workflow_registry
            .update_instance_status(&instance.id, WorkflowInstanceStatus::Stopped)
            .await?;

        Ok(())
    }

    /// 暂停工作流
    pub async fn pause_workflow(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()> {
        // 验证工作流实例是否存在
        let instance = self.workflow_registry
            .get_instance(instance_id)
            .await?
            .ok_or(ManagementError::LifecycleError(
                format!("工作流实例不存在: {:?}", instance_id)
            ))?;

        // 暂停工作流实例
        self.lifecycle_manager
            .pause_instance(&instance.id)
            .await?;

        // 更新实例状态
        self.workflow_registry
            .update_instance_status(&instance.id, WorkflowInstanceStatus::Paused)
            .await?;

        Ok(())
    }

    /// 恢复工作流
    pub async fn resume_workflow(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()> {
        // 验证工作流实例是否存在
        let instance = self.workflow_registry
            .get_instance(instance_id)
            .await?
            .ok_or(ManagementError::LifecycleError(
                format!("工作流实例不存在: {:?}", instance_id)
            ))?;

        // 恢复工作流实例
        self.lifecycle_manager
            .resume_instance(&instance.id)
            .await?;

        // 更新实例状态
        self.workflow_registry
            .update_instance_status(&instance.id, WorkflowInstanceStatus::Running)
            .await?;

        Ok(())
    }

    /// 获取工作流实例状态
    pub async fn get_workflow_status(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<WorkflowInstanceStatus> {
        let instance = self.workflow_registry
            .get_instance(instance_id)
            .await?
            .ok_or(ManagementError::LifecycleError(
                format!("工作流实例不存在: {:?}", instance_id)
            ))?;

        Ok(instance.status)
    }

    /// 列出所有工作流实例
    pub async fn list_workflow_instances(&self, workflow_id: Option<&WorkflowId>) -> ManagementResult<Vec<WorkflowInstance>> {
        self.workflow_registry.list_instances(workflow_id).await
    }

    /// 获取工作流实例详情
    pub async fn get_workflow_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<Option<WorkflowInstance>> {
        self.workflow_registry.get_instance(instance_id).await
    }

    /// 删除工作流实例
    pub async fn delete_workflow_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()> {
        // 验证工作流实例是否存在
        let instance = self.workflow_registry
            .get_instance(instance_id)
            .await?
            .ok_or(ManagementError::LifecycleError(
                format!("工作流实例不存在: {:?}", instance_id)
            ))?;

        // 只有已停止或已完成的工作流实例才能删除
        match instance.status {
            WorkflowInstanceStatus::Stopped | WorkflowInstanceStatus::Completed | WorkflowInstanceStatus::Failed => {
                // 删除实例
                self.workflow_registry
                    .unregister_instance(instance_id)
                    .await?;

                // 清理生命周期管理器中的实例
                self.lifecycle_manager
                    .cleanup_instance(instance_id)
                    .await?;

                Ok(())
            }
            _ => Err(ManagementError::LifecycleError(
                "只能删除已停止、已完成或失败的工作流实例".to_string()
            )),
        }
    }

    /// 获取工作流实例统计信息
    pub async fn get_workflow_statistics(&self, workflow_id: &WorkflowId) -> ManagementResult<WorkflowStatistics> {
        let instances = self.workflow_registry.list_instances(Some(workflow_id)).await?;
        
        let mut statistics = WorkflowStatistics::default();
        
        for instance in instances {
            match instance.status {
                WorkflowInstanceStatus::Running => statistics.running_count += 1,
                WorkflowInstanceStatus::Paused => statistics.paused_count += 1,
                WorkflowInstanceStatus::Completed => statistics.completed_count += 1,
                WorkflowInstanceStatus::Failed => statistics.failed_count += 1,
                WorkflowInstanceStatus::Stopped => statistics.stopped_count += 1,
            }
            
            statistics.total_count += 1;
        }

        Ok(statistics)
    }
}

#[derive(Debug, Clone)]
pub struct StartWorkflowRequest {
    pub workflow_id: WorkflowId,
    pub initial_context: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct StopWorkflowRequest {
    pub instance_id: WorkflowInstanceId,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct WorkflowInstanceId(pub uuid::Uuid);

#[derive(Debug, Clone)]
pub struct WorkflowInstance {
    pub id: WorkflowInstanceId,
    pub workflow_id: WorkflowId,
    pub name: String,
    pub status: WorkflowInstanceStatus,
    pub context: std::collections::HashMap<String, serde_json::Value>,
    pub created_at: crate::domain::common::timestamp::Timestamp,
    pub updated_at: crate::domain::common::timestamp::Timestamp,
}

impl WorkflowInstance {
    pub fn new(
        workflow_id: WorkflowId,
        name: String,
        context: std::collections::HashMap<String, serde_json::Value>,
    ) -> Self {
        let now = crate::domain::common::timestamp::Timestamp::now();
        Self {
            id: WorkflowInstanceId(uuid::Uuid::new_v4()),
            workflow_id,
            name,
            status: WorkflowInstanceStatus::Running,
            context,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn update_status(&mut self, status: WorkflowInstanceStatus) {
        self.status = status;
        self.updated_at = crate::domain::common::timestamp::Timestamp::now();
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum WorkflowInstanceStatus {
    Running,
    Paused,
    Completed,
    Failed,
    Stopped,
}

#[derive(Debug, Clone, Default)]
pub struct WorkflowStatistics {
    pub total_count: u32,
    pub running_count: u32,
    pub paused_count: u32,
    pub completed_count: u32,
    pub failed_count: u32,
    pub stopped_count: u32,
}

// 服务接口定义
#[async_trait::async_trait]
pub trait LifecycleManager: Send + Sync {
    async fn start_instance(
        &self,
        instance_id: &WorkflowInstanceId,
        workflow_id: &WorkflowId,
        context: &std::collections::HashMap<String, serde_json::Value>,
    ) -> ManagementResult<()>;
    
    async fn stop_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()>;
    
    async fn pause_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()>;
    
    async fn resume_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()>;
    
    async fn cleanup_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()>;
}

#[async_trait::async_trait]
pub trait WorkflowRegistry: Send + Sync {
    async fn get_workflow(&self, workflow_id: &WorkflowId) -> ManagementResult<Option<WorkflowMetadata>>;
    
    async fn register_instance(&self, instance: WorkflowInstance) -> ManagementResult<()>;
    
    async fn unregister_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<()>;
    
    async fn get_instance(&self, instance_id: &WorkflowInstanceId) -> ManagementResult<Option<WorkflowInstance>>;
    
    async fn list_instances(&self, workflow_id: Option<&WorkflowId>) -> ManagementResult<Vec<WorkflowInstance>>;
    
    async fn update_instance_status(
        &self,
        instance_id: &WorkflowInstanceId,
        status: WorkflowInstanceStatus,
    ) -> ManagementResult<()>;
}