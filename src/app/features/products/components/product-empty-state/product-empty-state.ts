import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-empty-state',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './product-empty-state.html',
  styleUrl: './product-empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEmptyState {
  readonly icon = input('inventory_2');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly alert = input(false);
  readonly action = output<void>();
}
