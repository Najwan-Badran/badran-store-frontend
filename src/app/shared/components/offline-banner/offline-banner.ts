import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NetworkStatusService } from '../../../core/services/network-status.service';

@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineBanner {
  private readonly networkStatusService = inject(NetworkStatusService);

  protected readonly online = this.networkStatusService.online;
}
