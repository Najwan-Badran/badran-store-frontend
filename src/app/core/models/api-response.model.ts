export interface ApiResponse<TData> {
  readonly success: boolean;
  readonly message: string;
  readonly data: TData;
  readonly timestamp: string;
}
