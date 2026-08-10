import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-product-skeleton-loader',
  templateUrl: './product-skeleton-loader.html',
  styleUrl: './product-skeleton-loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSkeletonLoader {
  readonly count = input(8);
  protected readonly placeholders = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
