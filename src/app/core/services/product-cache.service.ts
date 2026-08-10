import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { ProductDto } from '../models/product.models';
import { CatalogApiService } from './catalog-api.service';

@Injectable({
  providedIn: 'root',
})
export class ProductCacheService {
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly products = new Map<number, ProductDto>();

  remember(products: readonly ProductDto[]): void {
    products.forEach((product) => this.products.set(product.productId, product));
  }

  getCached(productId: number): ProductDto | null {
    return this.products.get(productId) ?? null;
  }

  getProduct(productId: number): Observable<ApiResponse<ProductDto>> {
    return this.catalogApiService
      .getProduct(productId)
      .pipe(tap((response) => this.products.set(response.data.productId, response.data)));
  }
}
