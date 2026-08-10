import { OrderDto } from './order.models';
import { BrandDto, CategoryDto, ProductDto } from './product.models';
import { UserDto } from './user.models';

export interface ProductImageRequest {
  readonly url: string;
  readonly sortOrder: number;
}

export interface ProductRequest {
  readonly sku: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr?: string;
  readonly descriptionEn?: string;
  readonly categoryId: number;
  readonly brandId?: number;
  readonly basePrice: number;
  readonly stockQuantity: number;
  readonly reorderThreshold: number;
  readonly isActive: boolean;
  readonly isOnSale: boolean;
  readonly isNewArrival: boolean;
  readonly specifications?: Readonly<Record<string, unknown>>;
  readonly images: readonly ProductImageRequest[];
}

export interface CategoryRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly parentCategoryId?: number;
}

export interface BrandRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly logoUrl?: string;
}

export interface CouponDto {
  readonly couponId: number;
  readonly code: string;
  readonly type: CouponType;
  readonly value: number;
  readonly validFrom: string;
  readonly validTo: string;
  readonly isActive: boolean;
}

export type CouponType = 'percentage' | 'fixed_amount';

export interface CouponRequest {
  readonly code: string;
  readonly type: CouponType;
  readonly value: number;
  readonly validFrom: string;
  readonly validTo: string;
  readonly usageLimit?: number;
  readonly isActive: boolean;
}

export interface AdminUserCreateRequest {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly password: string;
  readonly roleName: 'admin' | 'customer';
  readonly preferredLanguage: string;
  readonly isActive: boolean;
}

export interface AdminUserUpdateRequest {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly roleName: 'admin' | 'customer';
  readonly preferredLanguage: string;
  readonly isActive: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'pending_verification'
  | 'confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export interface DashboardMetricsDto {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly lowStockProducts: number;
  readonly totalOrders: number;
  readonly pendingOrders: number;
  readonly completedOrders: number;
  readonly activeCoupons: number;
  readonly totalRevenue: number;
}

export interface SalesStatisticsDto {
  readonly from: string | null;
  readonly to: string | null;
  readonly status: string;
  readonly orderCount: number;
  readonly itemCount: number;
  readonly grossSales: number;
  readonly discountTotal: number;
  readonly deliveryFees: number;
  readonly netSales: number;
  readonly averageOrderValue: number;
}

export interface SalesChartPointDto {
  readonly date: string;
  readonly orderCount: number;
  readonly salesTotal: number;
}

export interface TopProductDto {
  readonly productId: number;
  readonly sku: string | null;
  readonly nameEn: string | null;
  readonly unitsSold: number;
  readonly revenue: number;
}

export interface BestCustomerDto {
  readonly userId: number;
  readonly name: string | null;
  readonly email: string | null;
  readonly orderCount: number;
  readonly totalSpent: number;
}

export interface AdminDashboardData {
  readonly metrics: DashboardMetricsDto;
  readonly sales: SalesStatisticsDto;
  readonly salesChart: readonly SalesChartPointDto[];
  readonly inventoryAlerts: readonly ProductDto[];
  readonly recentOrders: readonly OrderDto[];
  readonly topProducts: readonly TopProductDto[];
  readonly bestCustomers: readonly BestCustomerDto[];
}

export interface AdminCollections {
  readonly products: readonly ProductDto[];
  readonly categories: readonly CategoryDto[];
  readonly brands: readonly BrandDto[];
  readonly coupons: readonly CouponDto[];
  readonly orders: readonly OrderDto[];
  readonly users: readonly UserDto[];
}
