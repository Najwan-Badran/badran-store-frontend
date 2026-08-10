import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';

import { Footer } from '../../shared/components/footer/footer';
import { Header } from '../../shared/components/header/header';
import { MobileMenu } from '../../shared/components/mobile-menu/mobile-menu';
import { OfflineBanner } from '../../shared/components/offline-banner/offline-banner';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, MatSidenavModule, Header, MobileMenu, OfflineBanner, Footer],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  protected readonly uiPreferences = inject(UiPreferencesService);
}
