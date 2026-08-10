import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, map, Observable } from 'rxjs';

import {
  AdminCollections,
  AdminDashboardData,
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
  BrandRequest,
  CategoryRequest,
  CouponRequest,
  CouponType,
  OrderStatus,
  ProductRequest,
} from '../../core/models/admin.models';
import { BrandDto, CategoryDto, ProductDto } from '../../core/models/product.models';
import { UserDto } from '../../core/models/user.models';
import { CouponDto } from '../../core/models/admin.models';
import { OrderDto } from '../../core/models/order.models';
import { PageResponse } from '../../core/models/page.model';
import { AdminApiService } from '../../core/services/admin-api.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../core/validators/form.validators';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type AdminTab = 'overview' | 'products' | 'categories' | 'brands' | 'coupons' | 'orders' | 'users';
type AdminCollectionTab = Exclude<AdminTab, 'overview'>;
type Mutable<T> = { -readonly [Property in keyof T]: T[Property] };

interface AdminTableState {
  readonly page: number;
  readonly size: number;
  readonly sortBy: string;
  readonly sortDir: 'asc' | 'desc';
}

interface AdminPageMeta {
  readonly number: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

interface AdminSortOption {
  readonly label: string;
  readonly value: string;
}

interface ProductForm {
  sku: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryId: number | null;
  brandId: number | null;
  basePrice: number;
  stockQuantity: number;
  reorderThreshold: number;
  isActive: boolean;
  isOnSale: boolean;
  isNewArrival: boolean;
  specifications: Readonly<Record<string, unknown>> | null;
  imageUrls: string;
}

@Component({
  selector: 'app-admin-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, NgTemplateOutlet, TranslatePipe],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {
  private readonly adminApiService = inject(AdminApiService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<AdminTab>('overview');
  protected readonly dashboard = signal<AdminDashboardData | null>(null);
  protected readonly collections = signal<AdminCollections>({
    products: [],
    categories: [],
    brands: [],
    coupons: [],
    orders: [],
    users: [],
  });
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly adminSearch = signal('');
  protected readonly adminOrderStatus = signal<string>('all');
  protected readonly tableState = signal<Record<AdminCollectionTab, AdminTableState>>(createTableState());
  protected readonly pageMeta = signal<Record<AdminCollectionTab, AdminPageMeta>>(createPageMeta());
  protected readonly chartMax = computed(() =>
    Math.max(...(this.dashboard()?.salesChart.map((point) => Number(point.salesTotal)) ?? [0]), 1),
  );
  protected readonly lowStockProducts = computed(() =>
    this.dashboard()?.inventoryAlerts ?? [],
  );
  protected readonly filteredProducts = computed(() => this.collections().products);
  protected readonly filteredCategories = computed(() => this.collections().categories);
  protected readonly filteredBrands = computed(() => this.collections().brands);
  protected readonly filteredCoupons = computed(() => this.collections().coupons);
  protected readonly filteredOrders = computed(() => this.collections().orders);
  protected readonly filteredUsers = computed(() => this.collections().users);

  protected readonly orderStatuses: readonly OrderStatus[] = [
    'pending',
    'pending_verification',
    'confirmed',
    'processing',
    'out_for_delivery',
    'ready_for_pickup',
    'completed',
    'cancelled',
  ];
  protected readonly couponTypes: readonly CouponType[] = ['percentage', 'fixed_amount'];
  protected readonly activeSortOptions = computed(() => ADMIN_SORT_OPTIONS[this.activeCollectionTab() ?? 'products']);
  protected readonly activeTableState = computed(() => {
    const tab = this.activeCollectionTab();
    return tab ? this.tableState()[tab] : null;
  });

  protected productForm: ProductForm = createProductForm();
  protected categoryForm: Mutable<CategoryRequest> = { nameAr: '', nameEn: '' };
  protected brandForm: Mutable<BrandRequest> = { nameAr: '', nameEn: '' };
  protected couponForm: Mutable<CouponRequest> = createCouponForm();
  protected userForm: Mutable<AdminUserCreateRequest> = createUserForm();
  protected editingProductId: number | null = null;
  protected editingCategoryId: number | null = null;
  protected editingBrandId: number | null = null;
  protected editingCouponId: number | null = null;
  protected editingUserId: number | null = null;

  constructor() {
    this.loadAdminData();
  }

  protected setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, tab: AdminTab): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();
    const currentIndex = ADMIN_TABS.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? ADMIN_TABS.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % ADMIN_TABS.length
            : (currentIndex - 1 + ADMIN_TABS.length) % ADMIN_TABS.length;
    const nextTab = ADMIN_TABS[nextIndex];
    this.activeTab.set(nextTab);
    globalThis.document?.getElementById(this.tabId(nextTab))?.focus();
  }

  protected setAdminSearch(value: string): void {
    this.adminSearch.set(value);
    this.resetPages();
    this.loadAdminData({ clearSuccess: false });
  }

  protected setAdminOrderStatus(value: string): void {
    this.adminOrderStatus.set(value);
    this.updateTableState('orders', { page: 0 });
    this.loadAdminData({ clearSuccess: false });
  }

  protected setAdminSort(sortBy: string): void {
    const tab = this.activeCollectionTab();
    if (!tab) {
      return;
    }
    this.updateTableState(tab, { page: 0, sortBy });
    this.loadAdminData({ clearSuccess: false });
  }

  protected setAdminSortDirection(sortDir: string): void {
    const tab = this.activeCollectionTab();
    if (!tab) {
      return;
    }
    this.updateTableState(tab, { page: 0, sortDir: sortDir === 'asc' ? 'asc' : 'desc' });
    this.loadAdminData({ clearSuccess: false });
  }

  protected setAdminPageSize(size: string | number): void {
    const tab = this.activeCollectionTab();
    if (!tab) {
      return;
    }
    this.updateTableState(tab, { page: 0, size: Math.max(1, Math.min(100, Number(size) || 20)) });
    this.loadAdminData({ clearSuccess: false });
  }

  protected goToPage(tab: AdminCollectionTab, page: number): void {
    const meta = this.pageMeta()[tab];
    if (page < 0 || page >= meta.totalPages || page === meta.number) {
      return;
    }
    this.updateTableState(tab, { page });
    this.loadAdminData({ clearSuccess: false });
  }

  protected meta(tab: AdminCollectionTab): AdminPageMeta {
    return this.pageMeta()[tab];
  }

  protected loadAdminData(options: { readonly clearSuccess?: boolean } = {}): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    if (options.clearSuccess ?? true) {
      this.successMessage.set(null);
    }
    const search = this.adminSearch().trim() || undefined;
    const orderStatus = this.adminOrderStatus() === 'all' ? undefined : this.adminOrderStatus();
    const tableState = this.tableState();

    forkJoin({
      metrics: this.adminApiService.getDashboardMetrics().pipe(map((response) => response.data)),
      sales: this.adminApiService.getSalesStatistics().pipe(map((response) => response.data)),
      salesChart: this.adminApiService.getSalesChart().pipe(map((response) => response.data)),
      inventoryAlerts: this.adminApiService.getInventoryAlerts().pipe(map((response) => response.data.content)),
      recentOrders: this.adminApiService.getRecentOrders().pipe(map((response) => response.data)),
      topProducts: this.adminApiService.getTopProducts().pipe(map((response) => response.data)),
      bestCustomers: this.adminApiService.getBestCustomers().pipe(map((response) => response.data)),
      products: this.adminApiService
        .getProducts({ ...tableState.products, search })
        .pipe(map((response) => response.data)),
      categories: this.adminApiService.getCategories({ ...tableState.categories, search }).pipe(map((response) => response.data)),
      brands: this.adminApiService.getBrands({ ...tableState.brands, search }).pipe(map((response) => response.data)),
      coupons: this.adminApiService.getCoupons({ ...tableState.coupons, search }).pipe(map((response) => response.data)),
      orders: this.adminApiService.getOrders({ ...tableState.orders, search, status: orderStatus }).pipe(map((response) => response.data)),
      users: this.adminApiService.getUsers({ ...tableState.users, search }).pipe(map((response) => response.data)),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({
          metrics,
          sales,
          salesChart,
          inventoryAlerts,
          recentOrders,
          topProducts,
          bestCustomers,
          products,
          categories,
          brands,
          coupons,
          orders,
          users,
        }) => {
          this.dashboard.set({ metrics, sales, salesChart, inventoryAlerts, recentOrders, topProducts, bestCustomers });
          this.collections.set({
            products: products.content,
            categories: categories.content,
            brands: brands.content,
            coupons: coupons.content,
            orders: orders.content,
            users: users.content,
          });
          this.pageMeta.set({
            products: toPageMeta(products),
            categories: toPageMeta(categories),
            brands: toPageMeta(brands),
            coupons: toPageMeta(coupons),
            orders: toPageMeta(orders),
            users: toPageMeta(users),
          });
          this.isLoading.set(false);
        },
        error: (error: unknown) => this.handleError(error),
      });
  }

  protected saveProduct(): void {
    if (!this.validateProductForm()) {
      return;
    }
    const request = this.toProductRequest();
    const action = this.editingProductId
      ? this.adminApiService.updateProduct(this.editingProductId, request)
      : this.adminApiService.createProduct(request);
    this.runAction(action.pipe(map((response) => response.data)), 'Product saved successfully', () => {
      this.productForm = createProductForm();
      this.editingProductId = null;
    });
  }

  protected editProduct(product: ProductDto): void {
    this.editingProductId = product.productId;
    this.productForm = {
      sku: product.sku,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      descriptionAr: product.descriptionAr ?? '',
      descriptionEn: product.descriptionEn ?? '',
      categoryId: product.category.categoryId,
      brandId: product.brand?.brandId ?? null,
      basePrice: Number(product.basePrice),
      stockQuantity: product.stockQuantity,
      reorderThreshold: product.reorderThreshold,
      isActive: product.isActive,
      isOnSale: product.isOnSale,
      isNewArrival: product.isNewArrival,
      specifications: product.specifications,
      imageUrls: product.images.map((image) => image.url).join('\n'),
    };
  }

  protected deleteProduct(productId: number): void {
    this.confirmAndRun(
      'Deactivate product?',
      'This product will be hidden from active catalog workflows.',
      'Deactivate',
      this.adminApiService.deleteProduct(productId),
      'Product deactivated successfully',
    );
  }

  protected saveCategory(): void {
    if (!hasText(this.categoryForm.nameEn) || !hasText(this.categoryForm.nameAr)) {
      this.errorMessage.set('English and Arabic category names are required.');
      return;
    }

    const action = this.editingCategoryId
      ? this.adminApiService.updateCategory(this.editingCategoryId, toTrimmedCategoryRequest(this.categoryForm))
      : this.adminApiService.createCategory(toTrimmedCategoryRequest(this.categoryForm));
    this.runAction(action, 'Category saved successfully', () => {
      this.categoryForm = { nameAr: '', nameEn: '' };
      this.editingCategoryId = null;
    });
  }

  protected editCategory(category: CategoryDto): void {
    this.editingCategoryId = category.categoryId;
    this.categoryForm = {
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      parentCategoryId: category.parentCategoryId ?? undefined,
    };
  }

  protected deleteCategory(categoryId: number): void {
    this.confirmAndRun(
      'Delete category?',
      'Products linked to this category may prevent deletion.',
      'Delete',
      this.adminApiService.deleteCategory(categoryId),
      'Category deleted successfully',
    );
  }

  protected saveBrand(): void {
    if (!hasText(this.brandForm.nameEn) || !hasText(this.brandForm.nameAr)) {
      this.errorMessage.set('English and Arabic brand names are required.');
      return;
    }

    const action = this.editingBrandId
      ? this.adminApiService.updateBrand(this.editingBrandId, toTrimmedBrandRequest(this.brandForm))
      : this.adminApiService.createBrand(toTrimmedBrandRequest(this.brandForm));
    this.runAction(action, 'Brand saved successfully', () => {
      this.brandForm = { nameAr: '', nameEn: '' };
      this.editingBrandId = null;
    });
  }

  protected editBrand(brand: BrandDto): void {
    this.editingBrandId = brand.brandId;
    this.brandForm = { nameAr: brand.nameAr, nameEn: brand.nameEn, logoUrl: brand.logoUrl ?? undefined };
  }

  protected deleteBrand(brandId: number): void {
    this.confirmAndRun(
      'Delete brand?',
      'Products linked to this brand may prevent deletion.',
      'Delete',
      this.adminApiService.deleteBrand(brandId),
      'Brand deleted successfully',
    );
  }

  protected saveCoupon(): void {
    if (!hasText(this.couponForm.code) || this.couponForm.value <= 0 || !this.couponForm.validFrom || !this.couponForm.validTo) {
      this.errorMessage.set('Coupon code, value, and validity dates are required.');
      return;
    }

    const action = this.editingCouponId
      ? this.adminApiService.updateCoupon(this.editingCouponId, toTrimmedCouponRequest(this.couponForm))
      : this.adminApiService.createCoupon(toTrimmedCouponRequest(this.couponForm));
    this.runAction(action, 'Coupon saved successfully', () => {
      this.couponForm = createCouponForm();
      this.editingCouponId = null;
    });
  }

  protected editCoupon(coupon: CouponDto): void {
    this.editingCouponId = coupon.couponId;
    this.couponForm = {
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      isActive: coupon.isActive,
    };
  }

  protected deleteCoupon(couponId: number): void {
    this.confirmAndRun(
      'Delete coupon?',
      'This coupon will no longer be available for checkout.',
      'Delete',
      this.adminApiService.deleteCoupon(couponId),
      'Coupon deleted successfully',
    );
  }

  protected saveUser(): void {
    if (!this.validateUserForm()) {
      return;
    }

    const action = this.editingUserId
      ? this.adminApiService.updateUser(this.editingUserId, this.toUserUpdateRequest())
      : this.adminApiService.createUser(toTrimmedUserCreateRequest(this.userForm));
    this.runAction(action, 'User saved successfully', () => {
      this.userForm = createUserForm();
      this.editingUserId = null;
    });
  }

  protected editUser(user: UserDto): void {
    this.editingUserId = user.userId;
    this.userForm = {
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      password: '',
      roleName: user.roleName === 'admin' ? 'admin' : 'customer',
      preferredLanguage: user.preferredLanguage,
      isActive: user.isActive,
    };
  }

  protected deleteUser(userId: number): void {
    this.confirmAndRun(
      'Deactivate user?',
      'This user will no longer be able to sign in.',
      'Deactivate',
      this.adminApiService.deleteUser(userId),
      'User deactivated successfully',
    );
  }

  protected updateOrderStatus(order: OrderDto, status: string): void {
    this.runAction(
      this.adminApiService.updateOrderStatus(order.orderId, status as OrderStatus),
      'Order status updated successfully',
    );
  }

  protected tabId(tab: AdminTab): string {
    return `admin-tab-${tab}`;
  }

  protected panelId(tab: AdminTab): string {
    return `admin-panel-${tab}`;
  }

  protected barHeight(pointTotal: number): string {
    return `${Math.max((Number(pointTotal) / this.chartMax()) * 100, 4)}%`;
  }

  protected categoryName(categoryId: number | null | undefined): string {
    return this.collections().categories.find((category) => category.categoryId === categoryId)?.nameEn ?? 'None';
  }

  private activeCollectionTab(): AdminCollectionTab | null {
    const tab = this.activeTab();
    return tab === 'overview' ? null : tab;
  }

  private resetPages(): void {
    this.tableState.update((state) => ({
      products: { ...state.products, page: 0 },
      categories: { ...state.categories, page: 0 },
      brands: { ...state.brands, page: 0 },
      coupons: { ...state.coupons, page: 0 },
      orders: { ...state.orders, page: 0 },
      users: { ...state.users, page: 0 },
    }));
  }

  private updateTableState(tab: AdminCollectionTab, patch: Partial<AdminTableState>): void {
    this.tableState.update((state) => ({
      ...state,
      [tab]: {
        ...state[tab],
        ...patch,
      },
    }));
  }

  private runAction<T>(action: Observable<T>, message: string, reset?: () => void): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        reset?.();
        this.successMessage.set(message);
        this.isSaving.set(false);
        this.loadAdminData({ clearSuccess: false });
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.handleError(error);
      },
    });
  }

  private confirmAndRun<T>(
    title: string,
    message: string,
    confirmLabel: string,
    action: Observable<T>,
    successMessage: string,
  ): void {
    this.dialog
      .open(ConfirmationDialog, {
        autoFocus: 'dialog',
        restoreFocus: true,
        data: { title, message, confirmLabel },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.runAction(action, successMessage);
        }
      });
  }

  private handleError(error: unknown): void {
    this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message);
    this.successMessage.set(null);
    this.isLoading.set(false);
  }

  private validateProductForm(): boolean {
    if (!hasText(this.productForm.sku) || !hasText(this.productForm.nameEn) || !hasText(this.productForm.nameAr)) {
      this.errorMessage.set('SKU, English name, and Arabic name are required.');
      return false;
    }

    if (!this.productForm.categoryId) {
      this.errorMessage.set('Category is required.');
      return false;
    }

    if (this.productForm.basePrice < 0 || this.productForm.stockQuantity < 0 || this.productForm.reorderThreshold < 0) {
      this.errorMessage.set('Price, stock, and reorder threshold cannot be negative.');
      return false;
    }

    return true;
  }

  private validateUserForm(): boolean {
    if (!hasText(this.userForm.name) || !hasText(this.userForm.email) || !hasText(this.userForm.preferredLanguage)) {
      this.errorMessage.set('User name, email, and preferred language are required.');
      return false;
    }

    if (!isValidEmail(this.userForm.email)) {
      this.errorMessage.set('Enter a valid user email address.');
      return false;
    }

    if (hasText(this.userForm.phone) && !isValidPhoneNumber(this.userForm.phone ?? '')) {
      this.errorMessage.set('Phone must use +9705XXXXXXXX, 059XXXXXXX, 056XXXXXXX, or a valid international format.');
      return false;
    }

    if (!this.editingUserId && !isStrongPassword(this.userForm.password)) {
      this.errorMessage.set('New admin-created users require 8+ characters with uppercase, lowercase, number, and special character.');
      return false;
    }

    return true;
  }

  private toProductRequest(): ProductRequest {
    if (!this.productForm.categoryId) {
      throw new Error('Category is required');
    }
    return {
      sku: this.productForm.sku.trim(),
      nameAr: this.productForm.nameAr.trim(),
      nameEn: this.productForm.nameEn.trim(),
      descriptionAr: this.productForm.descriptionAr.trim() || undefined,
      descriptionEn: this.productForm.descriptionEn.trim() || undefined,
      categoryId: Number(this.productForm.categoryId),
      brandId: this.productForm.brandId ? Number(this.productForm.brandId) : undefined,
      basePrice: Number(this.productForm.basePrice),
      stockQuantity: Number(this.productForm.stockQuantity),
      reorderThreshold: Number(this.productForm.reorderThreshold),
      isActive: this.productForm.isActive,
      isOnSale: this.productForm.isOnSale,
      isNewArrival: this.productForm.isNewArrival,
      specifications: this.productForm.specifications ?? undefined,
      images: this.productForm.imageUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, sortOrder) => ({ url, sortOrder })),
    };
  }

  private toUserUpdateRequest(): AdminUserUpdateRequest {
    return {
      name: this.userForm.name.trim(),
      email: this.userForm.email.trim(),
      phone: normalizePhoneNumber(this.userForm.phone),
      roleName: this.userForm.roleName,
      preferredLanguage: this.userForm.preferredLanguage.trim(),
      isActive: this.userForm.isActive,
    };
  }
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function toTrimmedCategoryRequest(request: Mutable<CategoryRequest>): CategoryRequest {
  return {
    nameAr: request.nameAr.trim(),
    nameEn: request.nameEn.trim(),
    parentCategoryId: request.parentCategoryId,
  };
}

function toTrimmedBrandRequest(request: Mutable<BrandRequest>): BrandRequest {
  return {
    nameAr: request.nameAr.trim(),
    nameEn: request.nameEn.trim(),
    logoUrl: request.logoUrl?.trim() || undefined,
  };
}

function toTrimmedCouponRequest(request: Mutable<CouponRequest>): CouponRequest {
  return {
    ...request,
    code: request.code.trim(),
  };
}

function toTrimmedUserCreateRequest(request: Mutable<AdminUserCreateRequest>): AdminUserCreateRequest {
  return {
    ...request,
    name: request.name.trim(),
    email: request.email.trim(),
    phone: normalizePhoneNumber(request.phone),
    password: request.password,
    preferredLanguage: request.preferredLanguage.trim(),
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function createProductForm(): ProductForm {
  return {
    sku: '',
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    categoryId: null,
    brandId: null,
    basePrice: 0,
    stockQuantity: 0,
    reorderThreshold: 0,
    isActive: true,
    isOnSale: false,
    isNewArrival: false,
    specifications: null,
    imageUrls: '',
  };
}

function createCouponForm(): Mutable<CouponRequest> {
  return {
    code: '',
    type: 'percentage',
    value: 0,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date().toISOString().slice(0, 10),
    isActive: true,
  };
}

function createUserForm(): Mutable<AdminUserCreateRequest> {
  return {
    name: '',
    email: '',
    phone: '',
    password: '',
    roleName: 'customer',
    preferredLanguage: 'en',
    isActive: true,
  };
}

const ADMIN_SORT_OPTIONS: Record<AdminCollectionTab, readonly AdminSortOption[]> = {
  products: [
    { label: 'Product ID', value: 'productId' },
    { label: 'SKU', value: 'sku' },
    { label: 'Name', value: 'nameEn' },
    { label: 'Price', value: 'basePrice' },
    { label: 'Stock', value: 'stockQuantity' },
    { label: 'Rating', value: 'avgRating' },
  ],
  categories: [
    { label: 'Category ID', value: 'categoryId' },
    { label: 'English name', value: 'nameEn' },
    { label: 'Arabic name', value: 'nameAr' },
  ],
  brands: [
    { label: 'Brand ID', value: 'brandId' },
    { label: 'English name', value: 'nameEn' },
    { label: 'Arabic name', value: 'nameAr' },
  ],
  coupons: [
    { label: 'Coupon ID', value: 'couponId' },
    { label: 'Code', value: 'code' },
    { label: 'Value', value: 'value' },
    { label: 'Valid from', value: 'validFrom' },
    { label: 'Valid to', value: 'validTo' },
  ],
  orders: [
    { label: 'Created date', value: 'createdAt' },
    { label: 'Order ID', value: 'orderId' },
    { label: 'Order number', value: 'orderNumber' },
    { label: 'Status', value: 'status' },
    { label: 'Total', value: 'total' },
  ],
  users: [
    { label: 'User ID', value: 'userId' },
    { label: 'Name', value: 'name' },
    { label: 'Email', value: 'email' },
    { label: 'Created date', value: 'createdAt' },
  ],
};

const ADMIN_TABS: readonly AdminTab[] = ['overview', 'products', 'categories', 'brands', 'coupons', 'orders', 'users'];

function createTableState(): Record<AdminCollectionTab, AdminTableState> {
  return {
    products: { page: 0, size: 20, sortBy: 'stockQuantity', sortDir: 'asc' },
    categories: { page: 0, size: 20, sortBy: 'categoryId', sortDir: 'asc' },
    brands: { page: 0, size: 20, sortBy: 'brandId', sortDir: 'asc' },
    coupons: { page: 0, size: 20, sortBy: 'couponId', sortDir: 'desc' },
    orders: { page: 0, size: 20, sortBy: 'createdAt', sortDir: 'desc' },
    users: { page: 0, size: 20, sortBy: 'userId', sortDir: 'desc' },
  };
}

function createPageMeta(): Record<AdminCollectionTab, AdminPageMeta> {
  const emptyMeta: AdminPageMeta = { number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true };
  return {
    products: emptyMeta,
    categories: emptyMeta,
    brands: emptyMeta,
    coupons: emptyMeta,
    orders: emptyMeta,
    users: emptyMeta,
  };
}

function toPageMeta<T>(page: PageResponse<T>): AdminPageMeta {
  return {
    number: page.number,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    first: page.first,
    last: page.last,
  };
}
