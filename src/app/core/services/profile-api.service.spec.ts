import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { AddressRequest, UpdateProfileRequest } from '../models/user.models';
import { ProfileApiService } from './profile-api.service';

describe('ProfileApiService', () => {
  let service: ProfileApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig({
          baseUrl: 'https://api.example.test/api',
        }),
      ],
    });

    service = TestBed.inject(ProfileApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('loads the authenticated profile from the backend auth contract', () => {
    service.getProfile().subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/auth/me');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: null });
  });

  it('updates the authenticated profile using the profile endpoint', () => {
    const body: UpdateProfileRequest = {
      name: 'Customer User',
      phone: '+970599000000',
      preferredLanguage: 'en',
    };

    service.updateProfile(body).subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/profile');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'Updated', data: null });
  });

  it('creates, updates, defaults, and deletes profile addresses using the real routes', () => {
    const body: AddressRequest = {
      label: 'Home',
      city: 'Ramallah',
      zone: 'Al-Bireh',
      addressLine: 'Main Street',
      isDefault: true,
    };

    service.createAddress(body).subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/addresses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'Created', data: null });

    service.updateAddress(7, body).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/addresses/7');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'Updated', data: null });

    service.setDefaultAddress(7).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/addresses/7/default');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    request.flush({ success: true, message: 'Default updated', data: null });

    service.deleteAddress(7).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/addresses/7');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true, message: 'Deleted', data: null });
  });

  it('uploads and deletes avatars using the real multipart profile routes', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    service.uploadAvatar({ file }).subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/avatar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    request.flush({ success: true, message: 'Uploaded', data: null });

    service.removeAvatar().subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/profile/avatar');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true, message: 'Deleted', data: null });
  });
});
