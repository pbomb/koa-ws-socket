import * as http from 'http';
import { TlsOptions } from 'tls';
import * as Koa from 'koa';
import compose from 'koa-compose';
import * as WebSocket from 'ws';
import Base64Id from 'base64id';
import Socket from './socket';

export interface SocketContext {
  data: any;
  event: string;
  request: http.ServerRequest;
  socket: WebSocket;
}
export type EventHandler = (ctx: SocketContext, data: any) => any;
export type Middleware = (ctx: SocketContext, next: () => Promise<any>) => any;

export class WsSocket {
  middleware: Middleware[] = [];
  composed: compose.ComposedMiddleware<SocketContext> | null = null;
  connections: Map<string, Socket> = new Map();
  listeners: Map<string, EventHandler[]> = new Map();
  wss: WebSocket.Server | null = null;

  attach(app: Koa, https: boolean = false, tlsOpts: TlsOptions = {}) {
    const enhancedApp = app as any;

    if (
      enhancedApp.server &&
      enhancedApp.server.constructor.name !== 'Server'
    ) {
      throw new Error("app.server already exists but it's not an http server");
    }

    if (!enhancedApp.server) {
      // Create a server if it doesn't already exists
      enhancedApp.server = https
        ? require('https').createServer(tlsOpts, enhancedApp.callback())
        : require('http').createServer(enhancedApp.callback());

      // Patch `app.listen()` to call `app.server.listen()`
      enhancedApp.listen = function listen() {
        enhancedApp.server.listen.apply(enhancedApp.server, arguments);
        return enhancedApp.server;
      };
    }
    this.wss = new WebSocket.Server({ server: enhancedApp.server });

    enhancedApp.ws = this;

    this.wss.on('connection', this.onConnection);
  }

  onConnection = (ws: WebSocket, request: http.IncomingMessage) => {
    const socketId = Base64Id.generateId();
    const socketInstance = new Socket(
      ws,
      request,
      this.listeners,
      this.composed
    );
    this.connections.set(socketId, socketInstance);
    ws.on('disconnect', () => {
      this.connections.delete(socketId);
    });

    const handlers = this.listeners.get('connection');
    if (handlers) {
      handlers.forEach(handler => {
        handler(
          {
            event: 'connection',
            data: socketInstance,
            request,
            socket: ws,
          },
          null
        );
      });
    }
  };

  /**
   * Pushes a middleware on to the stack
   * @param fn <Function> the middleware function to execute
   */
  use(fn: Middleware) {
    this.middleware.push(fn);
    this.composed = compose(this.middleware);

    this.updateConnections();

    return this;
  }

  /**
   * Adds a new listener to the stack
   * @param event <String> the event id
   * @param handler <Function> the callback to execute
   * @return this
   */
  on(event: string, handler: EventHandler) {
    const listeners = this.listeners.get(event);

    // If this is a new event then just set it
    if (!listeners) {
      this.listeners.set(event, [handler]);
      this.updateConnections();
      return this;
    }

    listeners.push(handler);
    this.listeners.set(event, listeners);
    this.updateConnections();
    return this;
  }

  /**
   * Removes a listener from the event
   * @param event <String> if omitted will remove all listeners
   * @param handler <Function> if omitted will remove all from the event
   * @return this
   */
  off(event: string, handler: EventHandler) {
    if (!event) {
      this.listeners = new Map();
      this.updateConnections();
      return this;
    }

    if (!handler) {
      this.listeners.delete(event);
      this.updateConnections();
      return this;
    }

    const listeners = this.listeners.get(event) || [];
    let i = listeners.length - 1;
    while (i) {
      if (listeners[i] === handler) {
        break;
      }
      i--;
    }
    listeners.splice(i, 1);

    this.updateConnections();
    return this;
  }

  /**
   * Updates all existing connections with current listeners and middleware
   * @private
   */
  updateConnections() {
    this.connections.forEach(connection =>
      connection.update(this.listeners, this.composed)
    );
  }
}
