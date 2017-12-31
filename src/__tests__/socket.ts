import Socket from '../socket';
const compose = require('koa-compose');

describe('Socket', () => {
  let MockWebSocket: any;

  beforeEach(async () => {
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
        ctx.state += '[handler]';
      });
    });

    describe('Socket is created with at one middleware', () => {
      let middleware;

      beforeEach(async () => {
        context = { state: '' };

        middleware = compose([
          jest.fn(async (ctx, next) => {
            ctx.state += '[before]';
            next(ctx);
            ctx.state += '[after]';
          }),
        ]);

        socket = new Socket(MockWebSocket, null as any, [] as any, middleware);
      });

      it('invokes handler once', () => {
        socket.invokeHandler(handler, context, 'message');
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('invokes the handler in correct order', () => {
        socket.invokeHandler(handler, context, 'message');

        expect(context).toEqual({ state: '[before][handler][after]' });
      });
    });

    describe('Socket is created with no middleware', () => {
      beforeEach(async () => {
        socket = new Socket(MockWebSocket, null as any, [] as any, compose([]));
      });

      it('invokes the handler correctly', () => {
        socket.invokeHandler(handler, context, 'message');

        expect(context).toEqual({ state: '[handler]' });
      });
    });
  });
});
