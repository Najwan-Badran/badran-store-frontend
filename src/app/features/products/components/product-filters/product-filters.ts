import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { BrandDto, CategoryDto } from '../../../../core/models/product.models';
import { ProductFilterPatch } from '../../product-list-state';

@Component({
  selector: 'app-product-filters',
  imports: [
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './product-filters.html',
  styleUrl: './product-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFilters {
  readonly categories = input.required<readonly CategoryDto[]>();
  readonly brands = input.required<readonly BrandDto[]>();
  readonly categoryId = input<number | null>(null);
  readonly brandId = input<number | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly filtersChanged = output<ProductFilterPatch>();
  readonly retryOptions = output<void>();

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.categoryId() !== null) count += 1;
    if (this.brandId() !== null) count += 1;
    return count;
  });
}
