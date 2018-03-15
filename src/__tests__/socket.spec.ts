import compose from 'koa-compose';
import * as WebSocket from 'ws';
import Socket from '../socket';
import { SocketContext } from '../index';
import { EventEmitter } from 'events';

describe('Socket', () => {
  let mockWebSocket: EventEmitter;

  beforeEach(async () => {
    jest.useRealTimers();
    mockWebSocket = new EventEmitter();
  });

  describe('event listeners', () => {
    let socket: Socket;
    let handler: any;
    const context: any = {};
    let steps: string[] = [];
    let handlerPromise: Promise<void>;

    beforeEach(async () => {
      steps = [];

      handlerPromise = new Promise(resolve => {
        handler = async (ctx: SocketContext, next: Function) => {
          setTimeout(() => {
            steps.push('[handler]');
            resolve();
          }, 10);
          return handlerPromise;
        };
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
          middleware = compose([
            (ctx, next) => firstMiddleware(ctx, next).then(resolve),
          ]);
        });

        socket = new Socket(
          mockWebSocket as WebSocket,
          null as any,
          [] as any,
          middleware
        );
        socket.on('message', handler);
      });

      it('invokes the handler in correct order', async () => {
        mockWebSocket.emit('message', 'message');
        await middlewarePromise;

        expect(steps).toEqual(['[before]', '[handler]', '[after]']);
      });
    });

    describe('Socket is created with no middleware', () => {
      beforeEach(async () => {
        socket = new Socket(
          mockWebSocket as WebSocket,
          null as any,
          [] as any,
          compose([])
        );
        socket.on('message', handler);
      });

      it('invokes the handler correctly', async () => {
        mockWebSocket.emit('message', 'message');
        await handlerPromise;

        expect(steps).toEqual(['[handler]']);
      });
    });
  });
});
