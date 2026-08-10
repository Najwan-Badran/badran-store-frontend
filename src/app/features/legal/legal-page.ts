import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly page = computed(() => {
    const type = this.route.snapshot.data['type'];

    if (type === 'terms') {
      return {
        eyebrow: 'Terms',
        title: 'Terms of service',
        body: 'Use Badran Store for lawful purchases, accurate account information, and responsible order activity. Product availability, pricing, payment, and fulfillment remain subject to backend confirmation at checkout.',
      };
    }

    return {
      eyebrow: 'Privacy Policy',
      title: 'Privacy policy',
      body: 'Badran Store uses account, order, delivery, and contact details to operate shopping, checkout, support, and account workflows. Keep your credentials private and contact support for account or data requests.',
    };
  });
}
