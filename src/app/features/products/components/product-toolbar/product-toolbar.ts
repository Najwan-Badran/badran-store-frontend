import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ProductSortValue, SORT_OPTIONS } from '../../product-list-state';
import { ProductFilterPatch } from '../../product-list-state';
import { BrandDto, CategoryDto } from '../../../../core/models/product.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-product-toolbar',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, TranslatePipe],
  templateUrl: './product-toolbar.html',
  styleUrl: './product-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductToolbar {
  readonly search = input('');
  readonly sort = input<ProductSortValue>('productId:desc');
  readonly totalElements = input(0);
  readonly loading = input(false);
  readonly suggestions = input<readonly string[]>([]);
  readonly recentSearches = input<readonly string[]>([]);
  readonly categories = input<readonly CategoryDto[]>([]);
  readonly brands = input<readonly BrandDto[]>([]);
  readonly categoryId = input<number | null>(null);
  readonly brandId = input<number | null>(null);
  readonly filterOptionsLoading = input(false);
  readonly filterOptionsError = input<string | null>(null);
  readonly searchChanged = output<string>();
  readonly searchInput = output<string>();
  readonly suggestionSelected = output<string>();
  readonly sortChanged = output<ProductSortValue>();
  readonly filtersChanged = output<ProductFilterPatch>();
  readonly retryOptions = output<void>();
  readonly clearRequested = output<void>();

  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly searchFocused = signal(false);

  constructor() {
    effect(() => {
      const nextSearch = this.search();
      if (this.searchControl.value !== nextSearch) {
        this.searchControl.setValue(nextSearch, { emitEvent: false });
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchChanged.emit(value));
  }

  protected onSearchInput(value: string): void {
    this.searchInput.emit(value);
  }

  protected selectSuggestion(value: string): void {
    this.searchControl.setValue(value);
    this.suggestionSelected.emit(value);
    this.searchFocused.set(false);
  }

  protected highlightParts(value: string): readonly { text: string; match: boolean }[] {
    const term = this.searchControl.value.trim();
    if (!term) {
      return [{ text: value, match: false }];
    }

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = value.split(new RegExp(`(${escaped})`, 'ig'));
    return parts.filter(Boolean).map((text) => ({ text, match: text.toLowerCase() === term.toLowerCase() }));
  }

  protected closeSearchSoon(): void {
    setTimeout(() => this.searchFocused.set(false), 120);
  }
}
