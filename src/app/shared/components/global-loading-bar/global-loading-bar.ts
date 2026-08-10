import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-loading-bar',
  imports: [MatProgressBarModule],
  templateUrl: './global-loading-bar.html',
  styleUrl: './global-loading-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalLoadingBar {
  protected readonly isLoading = inject(LoadingService).isLoading;
}
