import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  templateUrl: './forbidden-page.html',
  styleUrl: './error-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}
