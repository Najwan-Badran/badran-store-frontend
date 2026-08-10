import { ParamMap } from '@angular/router';

import { ProductQuery, ProductSortField, SortDirection } from '../../core/models/product.models';

export type ProductSortValue = `${ProductSortField}:${SortDirection}`;

export interface ProductListState {
  readonly page: number;
  readonly size: number;
  readonly search: string;
  readonly categoryId: number | null;
  readonly brandId: number | null;
  readonly sort: ProductSortValue;
}

export type ProductFilterPatch = Partial<
  Pick<ProductListState, 'categoryId' | 'brandId'>
>;

export interface ProductSortOption {
  readonly label: string;
  readonly value: ProductSortValue;
}

export const DEFAULT_PRODUCT_LIST_STATE: ProductListState = {
  page: 0,
  size: 12,
  search: '',
  categoryId: null,
  brandId: null,
  sort: 'productId:desc',
};

export const SORT_OPTIONS: readonly ProductSortOption[] = [
  { label: 'Newest', value: 'productId:desc' },
  { label: 'Price low to high', value: 'basePrice:asc' },
  { label: 'Price high to low', value: 'basePrice:desc' },
  { label: 'Rating', value: 'avgRating:desc' },
  { label: 'Name', value: 'nameEn:asc' },
];

export function parseProductListState(params: ParamMap): ProductListState {
  const sort = parseSortValue(params.get('sort'));

  return {
    page: Math.max(0, parseNumber(params.get('page'), 1) - 1),
    size: clamp(parseNumber(params.get('size'), DEFAULT_PRODUCT_LIST_STATE.size), 1, 48),
    search: params.get('search')?.trim() ?? '',
    categoryId: parseOptionalNumber(params.get('category') ?? params.get('categoryId')),
    brandId: parseOptionalNumber(params.get('brand') ?? params.get('brandId')),
    sort,
  };
}

export function toProductQuery(state: ProductListState): ProductQuery {
  const [sortBy, sortDir] = state.sort.split(':') as [ProductSortField, SortDirection];

  return {
    categoryId: state.categoryId ?? undefined,
    brandId: state.brandId ?? undefined,
    search: state.search || undefined,
    page: state.page,
    size: state.size,
    sortBy,
    sortDir,
  };
}

export function toQueryParams(state: ProductListState): Record<string, string | number | boolean | null> {
  return {
    page: state.page > 0 ? state.page + 1 : null,
    size: state.size !== DEFAULT_PRODUCT_LIST_STATE.size ? state.size : null,
    search: state.search || null,
    category: state.categoryId,
    brand: state.brandId,
    sort: state.sort !== DEFAULT_PRODUCT_LIST_STATE.sort ? state.sort : null,
  };
}

export function productListStatesEqual(first: ProductListState, second: ProductListState): boolean {
  return (
    first.page === second.page &&
    first.size === second.size &&
    first.search === second.search &&
    first.categoryId === second.categoryId &&
    first.brandId === second.brandId &&
    first.sort === second.sort
  );
}

function parseSortValue(value: string | null): ProductSortValue {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ProductSortValue)
    : DEFAULT_PRODUCT_LIST_STATE.sort;
}

function parseOptionalNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseNumber(value: string | null, fallback: number): number {
  return parseOptionalNumber(value) ?? fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}
