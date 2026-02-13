import { InterruptionManager } from '../interruption-manager';
import { ThreadInterruptedException } from '@modular-agent/types/errors';

describe('InterruptionManager', () => {
  let interruptionManager: InterruptionManager;
  const threadId = 'thread-123';
  const nodeId = 'node-456';

  beforeEach(() => {
    interruptionManager = new InterruptionManager(threadId, nodeId);
  });

  describe('constructor', () => {
    it('should create instance with threadId and nodeId', () => {
      expect(interruptionManager).toBeDefined();
      expect(interruptionManager.getThreadId()).toBe(threadId);
      expect(interruptionManager.getNodeId()).toBe(nodeId);
    });

    it('should initialize with no interruption', () => {
      expect(interruptionManager.shouldInterrupt()).toBe(false);
      expect(interruptionManager.getInterruptionType()).toBe(null);
      expect(interruptionManager.isAborted()).toBe(false);
    });
  });

  describe('requestPause', () => {
    it('should set interruption type to PAUSE', () => {
      interruptionManager.requestPause();
      
      expect(interruptionManager.shouldInterrupt()).toBe(true);
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
    });

    it('should abort the signal with ThreadInterruptedException', () => {
      interruptionManager.requestPause();
      
      expect(interruptionManager.isAborted()).toBe(true);
      const reason = interruptionManager.getAbortReason();
      expect(reason).toBeInstanceOf(ThreadInterruptedException);
      expect(reason?.interruptionType).toBe('PAUSE');
      expect(reason?.message).toBe('Thread paused');
    });

    it('should include threadId and nodeId in abort reason', () => {
      interruptionManager.requestPause();
      
      const reason = interruptionManager.getAbortReason();
      expect(reason?.threadId).toBe(threadId);
      expect(reason?.nodeId).toBe(nodeId);
    });

    it('should be idempotent - calling multiple times should not change state', () => {
      interruptionManager.requestPause();
      const firstSignal = interruptionManager.getAbortSignal();
      
      interruptionManager.requestPause();
      const secondSignal = interruptionManager.getAbortSignal();
      
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
      expect(firstSignal).toBe(secondSignal);
    });
  });

  describe('requestStop', () => {
    it('should set interruption type to STOP', () => {
      interruptionManager.requestStop();
      
      expect(interruptionManager.shouldInterrupt()).toBe(true);
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
    });

    it('should abort the signal with ThreadInterruptedException', () => {
      interruptionManager.requestStop();
      
      expect(interruptionManager.isAborted()).toBe(true);
      const reason = interruptionManager.getAbortReason();
      expect(reason).toBeInstanceOf(ThreadInterruptedException);
      expect(reason?.interruptionType).toBe('STOP');
      expect(reason?.message).toBe('Thread stopped');
    });

    it('should include threadId and nodeId in abort reason', () => {
      interruptionManager.requestStop();
      
      const reason = interruptionManager.getAbortReason();
      expect(reason?.threadId).toBe(threadId);
      expect(reason?.nodeId).toBe(nodeId);
    });

    it('should be idempotent - calling multiple times should not change state', () => {
      interruptionManager.requestStop();
      const firstSignal = interruptionManager.getAbortSignal();
      
      interruptionManager.requestStop();
      const secondSignal = interruptionManager.getAbortSignal();
      
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
      expect(firstSignal).toBe(secondSignal);
    });
  });

  describe('resume', () => {
    it('should clear interruption type', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      expect(interruptionManager.shouldInterrupt()).toBe(false);
      expect(interruptionManager.getInterruptionType()).toBe(null);
    });

    it('should reset AbortController', () => {
      interruptionManager.requestPause();
      const abortedSignal = interruptionManager.getAbortSignal();
      
      interruptionManager.resume();
      const newSignal = interruptionManager.getAbortSignal();
      
      expect(abortedSignal.aborted).toBe(true);
      expect(newSignal.aborted).toBe(false);
      expect(newSignal).not.toBe(abortedSignal);
    });

    it('should clear abort reason', () => {
      interruptionManager.requestStop();
      interruptionManager.resume();
      
      expect(interruptionManager.isAborted()).toBe(false);
      expect(interruptionManager.getAbortReason()).toBeUndefined();
    });

    it('should be safe to call when not interrupted', () => {
      interruptionManager.resume();
      
      expect(interruptionManager.shouldInterrupt()).toBe(false);
      expect(interruptionManager.isAborted()).toBe(false);
    });
  });

  describe('shouldInterrupt', () => {
    it('should return false when no interruption', () => {
      expect(interruptionManager.shouldInterrupt()).toBe(false);
    });

    it('should return true when paused', () => {
      interruptionManager.requestPause();
      expect(interruptionManager.shouldInterrupt()).toBe(true);
    });

    it('should return true when stopped', () => {
      interruptionManager.requestStop();
      expect(interruptionManager.shouldInterrupt()).toBe(true);
    });

    it('should return false after resume', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      expect(interruptionManager.shouldInterrupt()).toBe(false);
    });
  });

  describe('getInterruptionType', () => {
    it('should return null when no interruption', () => {
      expect(interruptionManager.getInterruptionType()).toBe(null);
    });

    it('should return PAUSE when paused', () => {
      interruptionManager.requestPause();
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
    });

    it('should return STOP when stopped', () => {
      interruptionManager.requestStop();
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
    });

    it('should return null after resume', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      expect(interruptionManager.getInterruptionType()).toBe(null);
    });
  });

  describe('getAbortSignal', () => {
    it('should return a valid AbortSignal', () => {
      const signal = interruptionManager.getAbortSignal();
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should return aborted signal after pause', () => {
      interruptionManager.requestPause();
      const signal = interruptionManager.getAbortSignal();
      
      expect(signal.aborted).toBe(true);
    });

    it('should return aborted signal after stop', () => {
      interruptionManager.requestStop();
      const signal = interruptionManager.getAbortSignal();
      
      expect(signal.aborted).toBe(true);
    });

    it('should return new non-aborted signal after resume', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      const signal = interruptionManager.getAbortSignal();
      
      expect(signal.aborted).toBe(false);
    });
  });

  describe('isAborted', () => {
    it('should return false when not interrupted', () => {
      expect(interruptionManager.isAborted()).toBe(false);
    });

    it('should return true after pause', () => {
      interruptionManager.requestPause();
      expect(interruptionManager.isAborted()).toBe(true);
    });

    it('should return true after stop', () => {
      interruptionManager.requestStop();
      expect(interruptionManager.isAborted()).toBe(true);
    });

    it('should return false after resume', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      expect(interruptionManager.isAborted()).toBe(false);
    });
  });

  describe('getAbortReason', () => {
    it('should return undefined when not interrupted', () => {
      expect(interruptionManager.getAbortReason()).toBeUndefined();
    });

    it('should return ThreadInterruptedException with PAUSE type', () => {
      interruptionManager.requestPause();
      const reason = interruptionManager.getAbortReason();
      
      expect(reason).toBeInstanceOf(ThreadInterruptedException);
      expect(reason?.interruptionType).toBe('PAUSE');
      expect(reason?.message).toBe('Thread paused');
    });

    it('should return ThreadInterruptedException with STOP type', () => {
      interruptionManager.requestStop();
      const reason = interruptionManager.getAbortReason();
      
      expect(reason).toBeInstanceOf(ThreadInterruptedException);
      expect(reason?.interruptionType).toBe('STOP');
      expect(reason?.message).toBe('Thread stopped');
    });

    it('should return undefined after resume', () => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      expect(interruptionManager.getAbortReason()).toBeUndefined();
    });
  });

  describe('updateNodeId', () => {
    it('should update the nodeId', () => {
      const newNodeId = 'node-789';
      interruptionManager.updateNodeId(newNodeId);
      
      expect(interruptionManager.getNodeId()).toBe(newNodeId);
    });

    it('should reflect updated nodeId in abort reason', () => {
      const newNodeId = 'node-789';
      interruptionManager.updateNodeId(newNodeId);
      interruptionManager.requestPause();
      
      const reason = interruptionManager.getAbortReason();
      expect(reason?.nodeId).toBe(newNodeId);
    });
  });

  describe('getThreadId', () => {
    it('should return the threadId', () => {
      expect(interruptionManager.getThreadId()).toBe(threadId);
    });
  });

  describe('getNodeId', () => {
    it('should return the nodeId', () => {
      expect(interruptionManager.getNodeId()).toBe(nodeId);
    });

    it('should return updated nodeId after updateNodeId', () => {
      const newNodeId = 'node-789';
      interruptionManager.updateNodeId(newNodeId);
      
      expect(interruptionManager.getNodeId()).toBe(newNodeId);
    });
  });

  describe('state transitions', () => {
    it('should transition from pause to stop', () => {
      interruptionManager.requestPause();
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
      
      interruptionManager.requestStop();
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
    });

    it('should transition from stop to pause', () => {
      interruptionManager.requestStop();
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
      
      interruptionManager.requestPause();
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
    });

    it('should transition from pause to resume to pause', () => {
      interruptionManager.requestPause();
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
      
      interruptionManager.resume();
      expect(interruptionManager.getInterruptionType()).toBe(null);
      
      interruptionManager.requestPause();
      expect(interruptionManager.getInterruptionType()).toBe('PAUSE');
    });

    it('should transition from stop to resume to stop', () => {
      interruptionManager.requestStop();
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
      
      interruptionManager.resume();
      expect(interruptionManager.getInterruptionType()).toBe(null);
      
      interruptionManager.requestStop();
      expect(interruptionManager.getInterruptionType()).toBe('STOP');
    });
  });

  describe('AbortSignal behavior', () => {
    it('should trigger abort event when paused', (done) => {
      const signal = interruptionManager.getAbortSignal();
      
      signal.addEventListener('abort', () => {
        expect(signal.aborted).toBe(true);
        done();
      });
      
      interruptionManager.requestPause();
    });

    it('should trigger abort event when stopped', (done) => {
      const signal = interruptionManager.getAbortSignal();
      
      signal.addEventListener('abort', () => {
        expect(signal.aborted).toBe(true);
        done();
      });
      
      interruptionManager.requestStop();
    });

    it('should not trigger abort event on new signal after resume', (done) => {
      interruptionManager.requestPause();
      interruptionManager.resume();
      
      const newSignal = interruptionManager.getAbortSignal();
      let eventTriggered = false;
      
      newSignal.addEventListener('abort', () => {
        eventTriggered = true;
      });
      
      // Wait a bit to ensure event doesn't fire
      setTimeout(() => {
        expect(eventTriggered).toBe(false);
        expect(newSignal.aborted).toBe(false);
        done();
      }, 10);
    });
  });
});