export interface BackendJwtPayload {
  readonly sub: string;
  readonly userId: number;
  readonly role: string;
  readonly iat: number;
  readonly exp: number;
}
