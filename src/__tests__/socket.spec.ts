import Socket from '../socket';
const compose = require('koa-compose');

describe('Socket', () => {
  let MockWebSocket: any;

  beforeEach(async () => {
    jest.useRealTimers();
    MockWebSocket = {
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  });

  describe('invokeHandler()', () => {
    let socket: Socket;
    let handler: any;
    let context: any;

    beforeEach(async () => {
      context = { state: '' };

      handler = jest.fn(async (ctx, next) => {
        return new Promise(resolve => {
          setTimeout(() => {
            ctx.state += '[handler]';
            resolve();
          }, 100);
        });
      });
    });

    describe('Socket is created with one middleware', () => {
      let middleware;

      beforeEach(async () => {
        middleware = compose([
          async (ctx, next) => {
            ctx.state += '[before]';
            await next(ctx);
            ctx.state += '[after]';
          },
        ]);

        socket = new Socket(MockWebSocket, null as any, [] as any, middleware);
      });

      it('invokes handler once', async () => {
        await socket.invokeHandler(handler, context, 'message');
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('invokes the handler in correct order', async () => {
        await socket.invokeHandler(handler, context, 'message');

        expect(context).toEqual({ state: '[before][handler][after]' });
      });
    });

    describe('Socket is created with no middleware', () => {
      beforeEach(async () => {
        socket = new Socket(MockWebSocket, null as any, [] as any, compose([]));
      });

      it('invokes the handler correctly', async () => {
        await socket.invokeHandler(handler, context, 'message');

        expect(context).toEqual({ state: '[handler]' });
      });
    });
  });
});
