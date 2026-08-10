import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { APP_CONSTANTS } from '../../../core/config/app.constants';
import { AuthService } from '../../../core/services/auth.service';
import { Navigation } from '../navigation/navigation';
import { UserMenu } from '../user-menu/user-menu';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UiPreferencesService } from '../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule, Navigation, UserMenu, TranslatePipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly menuOpened = output<void>();

  private readonly authService = inject(AuthService);
  protected readonly uiPreferences = inject(UiPreferencesService);

  protected readonly appName = APP_CONSTANTS.name;
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  protected openMenu(): void {
    this.menuOpened.emit();
  }

  protected toggleLanguage(): void {
    this.uiPreferences.toggleLanguage();
  }

  protected toggleTheme(): void {
    this.uiPreferences.toggleTheme();
  }
}
