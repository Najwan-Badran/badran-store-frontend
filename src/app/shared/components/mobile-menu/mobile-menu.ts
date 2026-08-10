import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';
import { Navigation } from '../navigation/navigation';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-mobile-menu',
  imports: [RouterLink, MatButtonModule, MatDividerModule, MatIconModule, Navigation, TranslatePipe],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMenu {
  readonly navigated = output<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly displayName = computed(() => this.user()?.name || this.user()?.email || 'Account');

  protected close(): void {
    this.navigated.emit();
  }

  protected logout(): void {
    this.authService
      .logoutCurrentDevice()
      .pipe(take(1))
      .subscribe({
        next: () => this.finishLogout(),
        error: () => {
          this.authService.clearSession();
          this.finishLogout();
        },
      });
  }

  protected logoutAll(): void {
    this.authService
      .logoutAllDevices()
      .pipe(take(1))
      .subscribe({
        next: () => this.finishLogout(),
        error: () => {
          this.authService.clearSession();
          this.finishLogout();
        },
      });
  }

  private finishLogout(): void {
    this.close();
    void this.router.navigateByUrl('/home');
  }
}
