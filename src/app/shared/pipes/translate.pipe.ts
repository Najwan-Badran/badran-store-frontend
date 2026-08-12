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
  private static readonly failed = new Set<string>();
  private static readonly dictionaryVersion = signal(0);

  transform(key: string): string {
    TranslatePipe.dictionaryVersion();
    const language = this.preferences.language();
    this.load(language);
    return this.dictionaryFor(language)?.[key] ?? DEFAULT_LABELS[key] ?? key;
  }

  private load(language: string): void {
    if (
      TranslatePipe.dictionaries.has(language) ||
      TranslatePipe.loading.has(language) ||
      TranslatePipe.failed.has(language)
    ) {
      return;
    }

    const path = `assets/i18n/${language}.json`;
    TranslatePipe.loading.add(language);
    this.http.get<TranslationMap>(path).subscribe({
      next: (dictionary) => {
        TranslatePipe.dictionaries.set(language, dictionary);
        TranslatePipe.loading.delete(language);
        TranslatePipe.dictionaryVersion.update((version) => version + 1);
        this.changeDetector.detectChanges();
      },
      error: () => {
        console.warn(`Unable to load translations for language "${language}" from "${path}".`);
        TranslatePipe.loading.delete(language);
        TranslatePipe.failed.add(language);
        TranslatePipe.dictionaryVersion.update((version) => version + 1);
        this.changeDetector.detectChanges();
      },
    });
  }

  private dictionaryFor(language: string): TranslationMap | undefined {
    return TranslatePipe.dictionaries.get(language) ?? TranslatePipe.dictionaries.get('en');
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
