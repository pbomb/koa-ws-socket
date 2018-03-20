import compose from 'koa-compose';
import * as WebSocket from 'ws';
import Socket from '../socket';
import { SocketContext, EventHandler } from '../index';
import { EventEmitter } from 'events';

describe('Socket', () => {
  let mockWebSocket: EventEmitter;
  let socket: Socket;
  let handler: any;
  let steps: string[] = [];
  let handlerPromise: Promise<void>;
  let listeners: Map<string, EventHandler[]>;

  beforeEach(async () => {
    jest.useRealTimers();
    mockWebSocket = new EventEmitter();
    steps = [];

    handlerPromise = new Promise(resolve => {
      handler = jest.fn(async (ctx: SocketContext, next: Function) => {
        setTimeout(() => {
          steps.push(`[${ctx.event}]`);
          resolve();
        }, 10);
        return handlerPromise;
      });
      listeners = new Map();
      listeners.set('message', [handler]);
      listeners.set('close', [handler]);
    });
  });

  describe('Socket is created with one middleware', () => {
    let middleware: compose.ComposedMiddleware<SocketContext>;
    let middlewarePromise: Promise<void>;

    beforeEach(async () => {
      const firstMiddleware = async (ctx: SocketContext, next: Function) => {
        steps.push('[before]');
        await next(ctx);
        steps.push('[after]');
      };

      middlewarePromise = new Promise(resolve => {
        middleware = jest.fn(
          compose([(ctx, next) => firstMiddleware(ctx, next).then(resolve)])
        );
      });

      socket = new Socket(
        mockWebSocket as WebSocket,
        null as any,
        listeners,
        middleware
      );
      socket.update(listeners, middleware);
    });

    it('invokes the handler in correct order', async () => {
      mockWebSocket.emit('message', 'message');
      await middlewarePromise;

      expect(steps).toEqual(['[before]', '[message]', '[after]']);
    });

    it('invokes only the handler and not middleware for close event', async () => {
      mockWebSocket.emit('close', 'message');
      await handlerPromise;

      expect(middleware).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(steps).toEqual(['[close]']);
    });
  });

  describe('Socket is created with no middleware', () => {
    beforeEach(async () => {
      socket = new Socket(
        mockWebSocket as WebSocket,
        null as any,
        listeners,
        compose([])
      );
    });

    it('invokes the handler correctly', async () => {
      mockWebSocket.emit('message', 'message');
      await handlerPromise;

      expect(steps).toEqual(['[message]']);
    });
  });
});
