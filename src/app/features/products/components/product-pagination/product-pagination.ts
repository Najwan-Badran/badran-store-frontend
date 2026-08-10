import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-pagination',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './product-pagination.html',
  styleUrl: './product-pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPagination {
  readonly pageIndex = input(0);
  readonly totalPages = input(0);
  readonly totalElements = input(0);
  readonly pageChanged = output<number>();

  protected readonly pages = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = this.pageIndex();
    const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
    const end = Math.min(totalPages, start + 5);

    return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
  });
}
