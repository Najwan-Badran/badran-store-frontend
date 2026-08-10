import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface NavigationItem {
  readonly key: string;
  readonly path: string;
  readonly icon: string;
  readonly exact: boolean;
}

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navigation {
  readonly orientation = input<'desktop' | 'mobile'>('desktop');
  readonly navigated = output<void>();

  private readonly authService = inject(AuthService);

  private readonly primaryItems: readonly NavigationItem[] = [
    { key: 'nav.home', path: '/home', icon: 'home', exact: true },
    { key: 'nav.products', path: '/products', icon: 'inventory_2', exact: false },
    { key: 'nav.wishlist', path: '/wishlist', icon: 'favorite', exact: false },
    { key: 'nav.cart', path: '/cart', icon: 'shopping_cart', exact: false },
    { key: 'nav.orders', path: '/orders', icon: 'receipt_long', exact: false },
    { key: 'nav.profile', path: '/profile', icon: 'person', exact: false },
  ];
  private readonly adminItem: NavigationItem = {
    key: 'nav.admin',
    path: '/admin',
    icon: 'admin_panel_settings',
    exact: false,
  };

  protected readonly navigationItems = computed(() =>
    this.authService.user()?.role.toLowerCase() === 'admin'
      ? [...this.primaryItems, this.adminItem]
      : this.primaryItems,
  );
  protected onNavigated(): void {
    this.navigated.emit();
  }
}
