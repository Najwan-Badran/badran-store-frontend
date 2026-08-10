import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CategoryDto } from '../../../core/models/product.models';

@Component({
  selector: 'app-category-circle',
  imports: [RouterLink],
  templateUrl: './category-circle.html',
  styleUrl: './category-circle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCircle {
  readonly category = input.required<CategoryDto>();

  protected readonly icon = computed(() => getCategoryIcon(this.category().nameEn));
}

function getCategoryIcon(name: string): string {
  const normalized = name.toLowerCase();

  if (normalized.includes('shampoo') || normalized.includes('soap') || normalized.includes('clean')) {
    return 'soap';
  }

  if (normalized.includes('fresh') || normalized.includes('scent')) {
    return 'air_freshener';
  }

  if (normalized.includes('mat') || normalized.includes('seat')) {
    return 'airline_seat_recline_normal';
  }

  if (normalized.includes('key') || normalized.includes('accessor')) {
    return 'key';
  }

  if (normalized.includes('brush') || normalized.includes('detail')) {
    return 'cleaning_services';
  }

  return 'directions_car';
}
