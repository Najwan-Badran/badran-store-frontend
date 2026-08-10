import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { RouteFocusService } from './core/services/route-focus.service';
import { UiPreferencesService } from './core/services/ui-preferences.service';
import { GlobalLoadingBar } from './shared/components/global-loading-bar/global-loading-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoadingBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly routeFocusService = inject(RouteFocusService);
  private readonly uiPreferences = inject(UiPreferencesService);
}
