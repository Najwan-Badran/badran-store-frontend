export interface CategoryDto {
  readonly categoryId: number;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly parentCategoryId: number | null;
}

export interface BrandDto {
  readonly brandId: number;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly logoUrl: string | null;
}

export interface ProductImageDto {
  readonly imageId: number;
  readonly productId: number;
  readonly url: string;
  readonly sortOrder: number;
}

export interface ProductDto {
  readonly productId: number;
  readonly sku: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string | null;
  readonly descriptionEn: string | null;
  readonly category: CategoryDto;
  readonly brand: BrandDto | null;
  readonly basePrice: number;
  readonly discountPrice?: number | null;
  readonly salePrice?: number | null;
  readonly stockQuantity: number;
  readonly reorderThreshold: number;
  readonly isActive: boolean;
  readonly isOnSale: boolean;
  readonly isNewArrival: boolean;
  readonly avgRating: number;
  readonly reviewCount: number;
  readonly specifications: Readonly<Record<string, unknown>> | null;
  readonly images: readonly ProductImageDto[];
}

export interface ReviewDto {
  readonly reviewId: number;
  readonly productId: number;
  readonly userId: number | null;
  readonly orderId: number;
  readonly rating: number;
  readonly comment: string | null;
  readonly status: string;
  readonly createdAt: string;
}

export interface AddReviewRequest {
  readonly orderId: number;
  readonly rating: number;
  readonly comment?: string;
}

export interface ProductQuery {
  readonly categoryId?: number;
  readonly brandId?: number;
  readonly search?: string;
  readonly page: number;
  readonly size: number;
  readonly sortBy: ProductSortField;
  readonly sortDir: SortDirection;
}

export type ProductSortField = 'productId' | 'nameEn' | 'basePrice' | 'stockQuantity' | 'avgRating';
export type SortDirection = 'asc' | 'desc';
