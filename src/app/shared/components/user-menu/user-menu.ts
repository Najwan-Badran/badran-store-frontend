import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-user-menu',
  imports: [RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, TranslatePipe],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenu {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;
  protected readonly displayName = computed(() => this.user()?.name || this.user()?.email || 'Account');

  protected logout(): void {
    this.authService
      .logoutCurrentDevice()
      .pipe(take(1))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        error: () => {
          this.authService.clearSession();
          void this.router.navigateByUrl('/home');
        },
      });
  }

  protected logoutAll(): void {
    this.authService
      .logoutAllDevices()
      .pipe(take(1))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        error: () => {
          this.authService.clearSession();
          void this.router.navigateByUrl('/home');
        },
      });
  }
}
