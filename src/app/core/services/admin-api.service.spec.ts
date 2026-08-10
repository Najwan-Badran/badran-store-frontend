import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { AdminUserCreateRequest, CouponRequest, ProductRequest } from '../models/admin.models';
import { AdminApiService } from './admin-api.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
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

    service = TestBed.inject(AdminApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('loads dashboard reporting data from real admin endpoints', () => {
    service.getDashboardMetrics().subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/dashboard/metrics');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: null });

    service.getSalesStatistics().subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/reports/sales');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: null });

    service.getSalesChart().subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/reports/sales/chart');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: [] });

    service.getTopProducts(5).subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/reports/top-products' &&
        candidate.params.get('limit') === '5',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: [] });

    service.getBestCustomers(3).subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/reports/best-customers' &&
        candidate.params.get('limit') === '3',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: [] });
  });

  it('uses paginated admin product endpoints for product management', () => {
    const query = {
      page: 1,
      size: 20,
      sortBy: 'nameEn',
      sortDir: 'asc' as const,
      search: 'wash',
    };
    const body: ProductRequest = {
      sku: 'SKU-1',
      nameAr: 'منتج',
      nameEn: 'Product',
      categoryId: 1,
      brandId: 2,
      basePrice: 10,
      stockQuantity: 8,
      reorderThreshold: 2,
      isActive: true,
      isOnSale: false,
      isNewArrival: true,
      images: [{ url: 'https://cdn.example.test/product.jpg', sortOrder: 0 }],
    };

    service.getProducts(query).subscribe();
    let request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/products' &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('size') === '20' &&
        candidate.params.get('sortBy') === 'nameEn' &&
        candidate.params.get('sortDir') === 'asc' &&
        candidate.params.get('search') === 'wash',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.createProduct(body).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'Created', data: null });

    service.updateProduct(11, body).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/products/11');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'Updated', data: null });

    service.deleteProduct(11).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/products/11');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true, message: 'Deleted', data: null });
  });

  it('uses catalog, coupon, order, and user admin routes', () => {
    const coupon: CouponRequest = {
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      validFrom: '2026-07-01',
      validTo: '2026-12-31',
      usageLimit: 100,
      isActive: true,
    };
    const user: AdminUserCreateRequest = {
      name: 'Admin User',
      email: 'admin@example.test',
      password: 'secret123',
      phone: '+970599000001',
      roleName: 'admin',
      preferredLanguage: 'en',
      isActive: true,
    };

    service.getCategories().subscribe();
    let request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/categories' &&
        candidate.params.get('size') === '100',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.getBrands().subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/brands' && candidate.params.get('size') === '100',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.getCoupons({ page: 2, size: 10, search: 'SAVE', sortBy: 'code', sortDir: 'asc' }).subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/coupons' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('size') === '10' &&
        candidate.params.get('search') === 'SAVE' &&
        candidate.params.get('sortBy') === 'code' &&
        candidate.params.get('sortDir') === 'asc',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.createCoupon(coupon).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/coupons');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(coupon);
    request.flush({ success: true, message: 'Created', data: null });

    service.getOrders({ page: 1, size: 20, status: 'pending', sortBy: 'createdAt', sortDir: 'desc' }).subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/orders' &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('status') === 'pending',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.updateOrderStatus(9, 'completed').subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/orders/9/status');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'completed' });
    request.flush({ success: true, message: 'Updated', data: null });

    service.getUsers({ page: 3, size: 50, search: 'admin', sortBy: 'email', sortDir: 'asc' }).subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/admin/users' &&
        candidate.params.get('page') === '3' &&
        candidate.params.get('size') === '50' &&
        candidate.params.get('search') === 'admin' &&
        candidate.params.get('sortBy') === 'email',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: { content: [] } });

    service.createUser(user).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/admin/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(user);
    request.flush({ success: true, message: 'Created', data: null });
  });
});
