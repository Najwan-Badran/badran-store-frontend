import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NetworkStatusService } from '../../core/services/network-status.service';

@Component({
  selector: 'app-offline-page',
  imports: [RouterLink],
  templateUrl: './offline-page.html',
  styleUrl: './error-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflinePage {
  protected readonly online = inject(NetworkStatusService).online;
}
