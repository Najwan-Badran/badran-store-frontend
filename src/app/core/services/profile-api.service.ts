import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import {
  AddressDto,
  AddressRequest,
  AvatarUploadRequest,
  UpdateProfileRequest,
  UserDto,
} from '../models/user.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService extends BaseApiService {
  getProfile(): Observable<ApiResponse<UserDto>> {
    return this.get<ApiResponse<UserDto>>('v1/auth/me');
  }

  updateProfile(request: UpdateProfileRequest): Observable<ApiResponse<UserDto>> {
    return this.put<ApiResponse<UserDto>, UpdateProfileRequest>('v1/profile', request);
  }

  getAddresses(): Observable<ApiResponse<readonly AddressDto[]>> {
    return this.get<ApiResponse<readonly AddressDto[]>>('v1/profile/addresses');
  }

  createAddress(request: AddressRequest): Observable<ApiResponse<AddressDto>> {
    return this.post<ApiResponse<AddressDto>, AddressRequest>('v1/profile/addresses', request);
  }

  updateAddress(addressId: number, request: AddressRequest): Observable<ApiResponse<AddressDto>> {
    return this.put<ApiResponse<AddressDto>, AddressRequest>(`v1/profile/addresses/${addressId}`, request);
  }

  setDefaultAddress(addressId: number): Observable<ApiResponse<AddressDto>> {
    return this.put<ApiResponse<AddressDto>, null>(`v1/profile/addresses/${addressId}/default`, null);
  }

  deleteAddress(addressId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/profile/addresses/${addressId}`);
  }

  uploadAvatar(request: AvatarUploadRequest): Observable<ApiResponse<UserDto>> {
    const formData = new FormData();
    formData.append('file', request.file);

    return this.post<ApiResponse<UserDto>, FormData>('v1/profile/avatar', formData);
  }

  removeAvatar(): Observable<ApiResponse<UserDto>> {
    return this.delete<ApiResponse<UserDto>>('v1/profile/avatar');
  }
}
