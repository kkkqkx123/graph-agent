/**
 * 会话模块路由定义
 */

import { Router } from 'express';
import { SessionController } from './controllers/session.controller';

/**
 * 创建会话路由
 */
export function createSessionRoutes(sessionController: SessionController): Router {
  const router = Router();

  // 获取会话信息
  router.get('/:id', (req, res) => sessionController.getSession(req, res));

  // 列出所有会话
  router.get('/', (req, res) => sessionController.listSessions(req, res));

  // 创建会话
  router.post('/', (req, res) => sessionController.createSession(req, res));

  // 激活会话
  router.post('/:id/activate', (req, res) => sessionController.activateSession(req, res));

  // 暂停会话
  router.post('/:id/suspend', (req, res) => sessionController.suspendSession(req, res));

  // 终止会话
  router.post('/:id/terminate', (req, res) => sessionController.terminateSession(req, res));

  // 更新会话配置
  router.put('/:id/config', (req, res) => sessionController.updateSessionConfig(req, res));

  // 添加消息到会话
  router.post('/:id/messages', (req, res) => sessionController.addMessageToSession(req, res));

  // 删除会话
  router.delete('/:id', (req, res) => sessionController.deleteSession(req, res));

  return router;
}