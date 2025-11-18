declare module 'express' {
  export interface Request {
    [key: string]: any;
    method: string;
    body?: any;
    headers?: Record<string, string | undefined>;
    cookies?: Record<string, string>;
    get(name: string): string | undefined;
    header(name: string): string | undefined;
    originalUrl?: string;
    url?: string;
  }

  export interface Response {
    statusCode: number;
    status(code: number): this;
    json(body: any): this;
    send(body: any): this;
    set(field: string, value: string): this;
    setHeader(name: string, value: string | number | string[]): this;
    cookie(name: string, value: string, options?: any): this;
    clearCookie(name: string, options?: any): this;
    redirect(url: string): void;
    redirect(status: number, url: string): void;
    on(event: string, handler: (...args: any[]) => void): this;
  }

  export type NextFunction = (err?: any) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;
  export type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => any;

  export interface Router {
    use(...handlers: (RequestHandler | Router)[]): this;
    use(path: string, ...handlers: (RequestHandler | Router)[]): this;
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    patch(path: string, ...handlers: RequestHandler[]): this;
  }

  export interface Express {
    locals: Record<string, unknown>;
    use(...handlers: (RequestHandler | ErrorRequestHandler | Router)[]): this;
    use(path: string, ...handlers: (RequestHandler | ErrorRequestHandler | Router)[]): this;
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    listen(port: number, callback?: () => void): { close(): void };
  }

  function e(): Express;

  namespace e {
    export function json(): RequestHandler;
    export function Router(): Router;
  }

  export = e;
}
