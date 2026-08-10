export interface ApiErrorResponse {
  readonly success: false;
  readonly status: number;
  readonly error: string;
  readonly message: string;
  readonly errors?: Readonly<Record<string, string>>;
  readonly path?: string;
  readonly timestamp?: string;
}
