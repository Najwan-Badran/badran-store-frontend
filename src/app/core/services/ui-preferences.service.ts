import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { LocalStorageService } from './local-storage.service';

export type AppLanguage = 'en' | 'ar';
export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly localStorage = inject(LocalStorageService);
  private readonly languageKey = 'badran_store_language';
  private readonly themeKey = 'badran_store_theme';

  readonly language = signal<AppLanguage>(this.readLanguage());
  readonly theme = signal<AppTheme>(this.readTheme());
  readonly direction = computed<'ltr' | 'rtl'>(() => (this.language() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    effect(() => {
      const language = this.language();
      const theme = this.theme();
      const direction = language === 'ar' ? 'rtl' : 'ltr';

      this.localStorage.setItem(this.languageKey, language);
      this.localStorage.setItem(this.themeKey, theme);
      this.document.documentElement.lang = language;
      this.document.documentElement.dir = direction;
      this.document.documentElement.dataset['theme'] = theme;
      this.document.body.dir = direction;
    });
  }

  toggleLanguage(): void {
    this.language.update((language) => (language === 'en' ? 'ar' : 'en'));
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
  }

  toggleTheme(): void {
    this.theme.update((theme) => (theme === 'light' ? 'dark' : 'light'));
  }

  private readLanguage(): AppLanguage {
    return this.localStorage.getItem(this.languageKey) === 'ar' ? 'ar' : 'en';
  }

  private readTheme(): AppTheme {
    const stored = this.localStorage.getItem(this.themeKey);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}
