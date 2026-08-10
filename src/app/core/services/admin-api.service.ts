import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
  BestCustomerDto,
  BrandRequest,
  CategoryRequest,
  CouponDto,
  CouponRequest,
  DashboardMetricsDto,
  OrderStatus,
  ProductRequest,
  SalesChartPointDto,
  SalesStatisticsDto,
  TopProductDto,
} from '../models/admin.models';
import { ApiResponse } from '../models/api-response.model';
import { OrderDto } from '../models/order.models';
import { PageResponse } from '../models/page.model';
import { BrandDto, CategoryDto, ProductDto } from '../models/product.models';
import { UserDto } from '../models/user.models';
import { BaseApiService } from './base-api.service';

interface AdminListQuery {
  readonly search?: string;
  readonly active?: boolean;
  readonly roleName?: string;
  readonly status?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDir?: 'asc' | 'desc';
}

interface AdminProductQuery extends AdminListQuery {
  readonly categoryId?: number;
  readonly brandId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminApiService extends BaseApiService {
  getDashboardMetrics(): Observable<ApiResponse<DashboardMetricsDto>> {
    return this.get<ApiResponse<DashboardMetricsDto>>('v1/admin/dashboard/metrics');
  }

  getSalesStatistics(): Observable<ApiResponse<SalesStatisticsDto>> {
    return this.get<ApiResponse<SalesStatisticsDto>>('v1/admin/reports/sales');
  }

  getSalesChart(): Observable<ApiResponse<readonly SalesChartPointDto[]>> {
    return this.get<ApiResponse<readonly SalesChartPointDto[]>>('v1/admin/reports/sales/chart');
  }

  getTopProducts(limit = 10): Observable<ApiResponse<readonly TopProductDto[]>> {
    return this.get<ApiResponse<readonly TopProductDto[]>>('v1/admin/reports/top-products', {
      params: { limit },
    });
  }

  getBestCustomers(limit = 10): Observable<ApiResponse<readonly BestCustomerDto[]>> {
    return this.get<ApiResponse<readonly BestCustomerDto[]>>('v1/admin/reports/best-customers', {
      params: { limit },
    });
  }

  getProducts(query: AdminProductQuery): Observable<ApiResponse<PageResponse<ProductDto>>> {
    return this.get<ApiResponse<PageResponse<ProductDto>>>('v1/admin/products', {
      params: compactParams(query),
    });
  }

  createProduct(request: ProductRequest): Observable<ApiResponse<ProductDto>> {
    return this.post<ApiResponse<ProductDto>, ProductRequest>('v1/admin/products', request);
  }

  updateProduct(productId: number, request: ProductRequest): Observable<ApiResponse<ProductDto>> {
    return this.put<ApiResponse<ProductDto>, ProductRequest>(`v1/admin/products/${productId}`, request);
  }

  deleteProduct(productId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/admin/products/${productId}`);
  }

  getInventoryAlerts(): Observable<ApiResponse<PageResponse<ProductDto>>> {
    return this.get<ApiResponse<PageResponse<ProductDto>>>('v1/admin/products/inventory-alerts', {
      params: { page: 0, size: 100, sortBy: 'stockQuantity', sortDir: 'asc' },
    });
  }

  getCategories(query: AdminListQuery = {}): Observable<ApiResponse<PageResponse<CategoryDto>>> {
    return this.get<ApiResponse<PageResponse<CategoryDto>>>('v1/categories', {
      params: compactAdminParams({ page: 0, size: 100, sortBy: 'categoryId', sortDir: 'asc', ...query }),
    });
  }

  getCategory(categoryId: number): Observable<ApiResponse<CategoryDto>> {
    return this.get<ApiResponse<CategoryDto>>(`v1/categories/${categoryId}`);
  }

  createCategory(request: CategoryRequest): Observable<ApiResponse<CategoryDto>> {
    return this.post<ApiResponse<CategoryDto>, CategoryRequest>('v1/categories', request);
  }

  updateCategory(categoryId: number, request: CategoryRequest): Observable<ApiResponse<CategoryDto>> {
    return this.put<ApiResponse<CategoryDto>, CategoryRequest>(`v1/categories/${categoryId}`, request);
  }

  deleteCategory(categoryId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/categories/${categoryId}`);
  }

  getBrands(query: AdminListQuery = {}): Observable<ApiResponse<PageResponse<BrandDto>>> {
    return this.get<ApiResponse<PageResponse<BrandDto>>>('v1/brands', {
      params: compactAdminParams({ page: 0, size: 100, sortBy: 'brandId', sortDir: 'asc', ...query }),
    });
  }

  getBrand(brandId: number): Observable<ApiResponse<BrandDto>> {
    return this.get<ApiResponse<BrandDto>>(`v1/brands/${brandId}`);
  }

  createBrand(request: BrandRequest): Observable<ApiResponse<BrandDto>> {
    return this.post<ApiResponse<BrandDto>, BrandRequest>('v1/brands', request);
  }

  updateBrand(brandId: number, request: BrandRequest): Observable<ApiResponse<BrandDto>> {
    return this.put<ApiResponse<BrandDto>, BrandRequest>(`v1/brands/${brandId}`, request);
  }

  deleteBrand(brandId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/brands/${brandId}`);
  }

  getCoupons(query: AdminListQuery = {}): Observable<ApiResponse<PageResponse<CouponDto>>> {
    return this.get<ApiResponse<PageResponse<CouponDto>>>('v1/admin/coupons', {
      params: compactAdminParams({ page: 0, size: 100, sortBy: 'couponId', sortDir: 'desc', ...query }),
    });
  }

  getCoupon(couponId: number): Observable<ApiResponse<CouponDto>> {
    return this.get<ApiResponse<CouponDto>>(`v1/admin/coupons/${couponId}`);
  }

  createCoupon(request: CouponRequest): Observable<ApiResponse<CouponDto>> {
    return this.post<ApiResponse<CouponDto>, CouponRequest>('v1/admin/coupons', request);
  }

  updateCoupon(couponId: number, request: CouponRequest): Observable<ApiResponse<CouponDto>> {
    return this.put<ApiResponse<CouponDto>, CouponRequest>(`v1/admin/coupons/${couponId}`, request);
  }

  deleteCoupon(couponId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/admin/coupons/${couponId}`);
  }

  getOrders(query: AdminListQuery = {}): Observable<ApiResponse<PageResponse<OrderDto>>> {
    return this.get<ApiResponse<PageResponse<OrderDto>>>('v1/admin/orders', {
      params: compactAdminParams({ page: 0, size: 100, sortBy: 'createdAt', sortDir: 'desc', ...query }),
    });
  }

  getRecentOrders(): Observable<ApiResponse<readonly OrderDto[]>> {
    return this.get<ApiResponse<readonly OrderDto[]>>('v1/admin/orders/recent');
  }

  getOrder(orderId: number): Observable<ApiResponse<OrderDto>> {
    return this.get<ApiResponse<OrderDto>>(`v1/admin/orders/${orderId}`);
  }

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<ApiResponse<OrderDto>> {
    return this.put<ApiResponse<OrderDto>, { readonly status: OrderStatus }>(`v1/admin/orders/${orderId}/status`, {
      status,
    });
  }

  getUsers(query: AdminListQuery = {}): Observable<ApiResponse<PageResponse<UserDto>>> {
    return this.get<ApiResponse<PageResponse<UserDto>>>('v1/admin/users', {
      params: compactAdminParams({ page: 0, size: 100, sortBy: 'userId', sortDir: 'desc', ...query }),
    });
  }

  getUser(userId: number): Observable<ApiResponse<UserDto>> {
    return this.get<ApiResponse<UserDto>>(`v1/admin/users/${userId}`);
  }

  createUser(request: AdminUserCreateRequest): Observable<ApiResponse<UserDto>> {
    return this.post<ApiResponse<UserDto>, AdminUserCreateRequest>('v1/admin/users', request);
  }

  updateUser(userId: number, request: AdminUserUpdateRequest): Observable<ApiResponse<UserDto>> {
    return this.put<ApiResponse<UserDto>, AdminUserUpdateRequest>(`v1/admin/users/${userId}`, request);
  }

  deleteUser(userId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/admin/users/${userId}`);
  }
}

function compactParams(params: AdminProductQuery): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | number | boolean>;
}

function compactAdminParams(params: AdminListQuery): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== 'all'),
  ) as Record<string, string | number | boolean>;
}
