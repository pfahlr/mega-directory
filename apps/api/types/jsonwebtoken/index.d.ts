declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [claim: string]: unknown;
    sub?: string;
    role?: string;
    type?: string;
  }

  export interface SignOptions {
    issuer?: string;
    audience?: string;
    expiresIn?: string | number;
  }

  export interface VerifyOptions {
    issuer?: string | string[];
    audience?: string | string[];
  }

  export function sign(payload: string | object, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string, options?: VerifyOptions): JwtPayload | string;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };

  export default jwt;
}
