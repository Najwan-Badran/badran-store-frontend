export interface AddressDto {
  readonly addressId: number;
  readonly label: string | null;
  readonly city: string;
  readonly zone: string;
  readonly addressLine: string;
  readonly isDefault: boolean;
}

export interface UserDto {
  readonly userId: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly avatarUrl?: string | null;
  readonly roleName: string;
  readonly preferredLanguage: string;
  readonly isActive: boolean;
  readonly addresses: readonly AddressDto[];
}

export interface UpdateProfileRequest {
  readonly name: string;
  readonly phone?: string;
  readonly preferredLanguage?: string;
}

export interface AddressRequest {
  readonly label?: string;
  readonly city: string;
  readonly zone: string;
  readonly addressLine: string;
  readonly isDefault?: boolean;
}

export interface AvatarUploadRequest {
  readonly file: File;
}
