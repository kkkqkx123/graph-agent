/**
 * 会话HTTP控制器
 * 负责处理HTTP请求和响应，直接返回领域对象
 */

import { Request, Response } from 'express';
import { SessionService } from '../../../../application/sessions/services/session-service';

/**
 * 会话控制器
 */
export class SessionController {
  constructor(private sessionService: SessionService) {}

  /**
   * 获取会话信息
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.getSessionInfo(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 列出所有会话
   */
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await this.sessionService.listSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 创建会话
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const session = await this.sessionService.createSession(
        req.body.userId,
        req.body.title,
        req.body.config
      );
      
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 激活会话
   */
  async activateSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.activateSession(
        sessionId,
        req.body.userId
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 暂停会话
   */
  async suspendSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.suspendSession(
        sessionId,
        req.body.userId,
        req.body.reason
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 终止会话
   */
  async terminateSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.terminateSession(
        sessionId,
        req.body.userId,
        req.body.reason
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 更新会话配置
   */
  async updateSessionConfig(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.updateSessionConfig(
        sessionId,
        req.body.config
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 添加消息到会话
   */
  async addMessageToSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const session = await this.sessionService.addMessageToSession(
        sessionId,
        req.body.userId
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params['id'] as string;
      const success = await this.sessionService.deleteSession(sessionId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}