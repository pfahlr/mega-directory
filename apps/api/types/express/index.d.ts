declare module 'express' {
  export interface Request {
    [key: string]: any;
    method: string;
    body?: any;
    headers?: Record<string, string | undefined>;
    get(name: string): string | undefined;
    header(name: string): string | undefined;
    originalUrl?: string;
    url?: string;
  }

  export interface Response {
    statusCode: number;
    status(code: number): this;
    json(body: any): this;
    set(field: string, value: string): this;
    on(event: string, handler: (...args: any[]) => void): this;
  }

  export type NextFunction = () => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;

  export interface Express {
    locals: Record<string, unknown>;
    use(...handlers: RequestHandler[]): this;
    use(path: string, ...handlers: RequestHandler[]): this;
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    listen(port: number, callback?: () => void): { close(): void };
  }

  interface ExpressFactory {
    (): Express;
    json(): RequestHandler;
  }

  const express: ExpressFactory;
  export default express;
}
