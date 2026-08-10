import { ChangeDetectorRef, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

type TranslationMap = Record<string, string>;

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(UiPreferencesService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private static readonly dictionaries = new Map<string, TranslationMap>();
  private static readonly loading = new Set<string>();
  private static readonly dictionaryVersion = signal(0);

  transform(key: string): string {
    TranslatePipe.dictionaryVersion();
    const language = this.preferences.language();
    this.load(language);
    return TranslatePipe.dictionaries.get(language)?.[key] ?? DEFAULT_LABELS[key] ?? key;
  }

  private load(language: string): void {
    if (TranslatePipe.dictionaries.has(language) || TranslatePipe.loading.has(language)) {
      return;
    }

    TranslatePipe.loading.add(language);
    this.http.get<TranslationMap>(`assets/i18n/${language}.json`).subscribe({
      next: (dictionary) => {
        TranslatePipe.dictionaries.set(language, dictionary);
        TranslatePipe.loading.delete(language);
        TranslatePipe.dictionaryVersion.update((version) => version + 1);
        this.changeDetector.detectChanges();
      },
      error: () => TranslatePipe.loading.delete(language),
    });
  }
}

// Keeps first paint and isolated component tests readable while the JSON
// dictionary is loading. The complete dictionary still comes from assets/i18n.
const DEFAULT_LABELS: TranslationMap = {
  'nav.home': 'Home',
  'nav.products': 'Products',
  'nav.cart': 'Cart',
  'nav.admin': 'Admin Dashboard',
  'auth.login': 'Sign in',
  'auth.register': 'Create account',
};
