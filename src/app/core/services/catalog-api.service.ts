import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page.model';
import { AddReviewRequest, BrandDto, CategoryDto, ProductDto, ProductQuery, ReviewDto } from '../models/product.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService extends BaseApiService {
  getProducts(query: ProductQuery): Observable<ApiResponse<PageResponse<ProductDto>>> {
    return this.get<ApiResponse<PageResponse<ProductDto>>>('v1/products', {
      params: compactParams({
        categoryId: query.categoryId,
        brandId: query.brandId,
        search: query.search,
        page: query.page,
        size: query.size,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      }),
    }).pipe(map(normalizePageApiResponse));
  }

  getFeaturedProducts(query: Pick<ProductQuery, 'page' | 'size' | 'sortBy' | 'sortDir'>): Observable<ApiResponse<PageResponse<ProductDto>>> {
    return this.get<ApiResponse<PageResponse<ProductDto>>>('v1/products/featured', {
      params: compactParams({
        page: query.page,
        size: query.size,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      }),
    }).pipe(map(normalizePageApiResponse));
  }

  getProduct(productId: number): Observable<ApiResponse<ProductDto>> {
    return this.get<ApiResponse<ProductDto>>(`v1/products/${productId}`);
  }

  getCategories(): Observable<ApiResponse<PageResponse<CategoryDto>>> {
    return this.getAllCatalogReferences<CategoryDto>('v1/categories', 'categoryId');
  }

  getCategory(categoryId: number): Observable<ApiResponse<CategoryDto>> {
    return this.get<ApiResponse<CategoryDto>>(`v1/categories/${categoryId}`);
  }

  getBrands(): Observable<ApiResponse<PageResponse<BrandDto>>> {
    return this.getAllCatalogReferences<BrandDto>('v1/brands', 'brandId');
  }

  getBrand(brandId: number): Observable<ApiResponse<BrandDto>> {
    return this.get<ApiResponse<BrandDto>>(`v1/brands/${brandId}`);
  }

  getProductReviews(productId: number): Observable<ApiResponse<readonly ReviewDto[]>> {
    return this.get<ApiResponse<readonly ReviewDto[]>>(`v1/reviews/product/${productId}`);
  }

  addReview(productId: number, request: AddReviewRequest): Observable<ApiResponse<ReviewDto>> {
    return this.post<ApiResponse<ReviewDto>, null>(`v1/reviews/product/${productId}`, null, {
      params: compactParams({
        orderId: request.orderId,
        rating: request.rating,
        comment: request.comment,
      }),
    });
  }

  private getAllCatalogReferences<T>(path: string, sortBy: string): Observable<ApiResponse<PageResponse<T>>> {
    return this.getCatalogReferencePage<T>(path, sortBy, 0).pipe(
      switchMap((firstPage) => {
        const remainingPageCount = Math.max(0, firstPage.data.totalPages - 1);

        if (remainingPageCount === 0) {
          return of(firstPage);
        }

        const remainingPages = Array.from({ length: remainingPageCount }, (_, index) =>
          this.getCatalogReferencePage<T>(path, sortBy, index + 1),
        );

        return forkJoin(remainingPages).pipe(
          map((pages) => mergeCatalogReferencePages(firstPage, pages)),
        );
      }),
    );
  }

  private getCatalogReferencePage<T>(path: string, sortBy: string, page: number): Observable<ApiResponse<PageResponse<T>>> {
    return this.get<ApiResponse<PageResponse<T>>>(path, {
      params: { page, size: 100, sortBy, sortDir: 'asc' },
    }).pipe(map(normalizePageApiResponse));
  }
}

function compactParams(params: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | number | boolean>;
}

interface SpringPageMetadata {
  readonly size?: number;
  readonly number?: number;
  readonly totalElements?: number;
  readonly totalPages?: number;
}

interface PageLike<T> extends Partial<PageResponse<T>> {
  readonly content?: readonly T[];
  readonly page?: SpringPageMetadata;
}

function normalizePageApiResponse<T>(response: ApiResponse<PageResponse<T>>): ApiResponse<PageResponse<T>> {
  return {
    ...response,
    data: normalizePage(response.data),
  };
}

function normalizePage<T>(page: PageLike<T>): PageResponse<T> {
  const content = Array.isArray(page.content) ? page.content : [];
  const pageMetadata = page.page;
  const totalElements = toNumber(page.totalElements ?? pageMetadata?.totalElements, content.length);
  const size = toNumber(page.size ?? pageMetadata?.size, content.length);
  const number = toNumber(page.number ?? pageMetadata?.number, 0);
  const totalPages = toNumber(page.totalPages ?? pageMetadata?.totalPages, size > 0 ? Math.ceil(totalElements / size) : 0);

  return {
    content,
    totalElements,
    totalPages,
    size,
    number,
    first: page.first ?? number <= 0,
    last: page.last ?? (totalPages === 0 || number >= totalPages - 1),
    numberOfElements: page.numberOfElements ?? content.length,
    empty: page.empty ?? content.length === 0,
  };
}

function mergeCatalogReferencePages<T>(
  firstPage: ApiResponse<PageResponse<T>>,
  remainingPages: readonly ApiResponse<PageResponse<T>>[],
): ApiResponse<PageResponse<T>> {
  const content = [firstPage, ...remainingPages].flatMap((response) => [...response.data.content]);

  return {
    ...firstPage,
    data: {
      ...firstPage.data,
      content,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      size: content.length,
      number: 0,
      first: true,
      last: true,
      numberOfElements: content.length,
      empty: content.length === 0,
    },
  };
}

function toNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}
