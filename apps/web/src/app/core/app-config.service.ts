import { Injectable } from '@angular/core';

export type AppConfig = {
  apiBaseUrl: string;
  appName: string;
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private static _apiBaseUrl = 'http://localhost:4000/api';

  static get apiBaseUrl(): string {
    return AppConfigService._apiBaseUrl;
  }

  get apiBaseUrl(): string {
    return AppConfigService._apiBaseUrl;
  }

  get appName(): string {
    return 'Shalvinat HMS';
  }

  async load(): Promise<void> {
    try {
      const response = await fetch('/config.json', { cache: 'no-cache' });
      if (response.ok) {
        const cfg = await response.json();
        AppConfigService._apiBaseUrl = cfg.apiBaseUrl || AppConfigService._apiBaseUrl;
      }
    } catch {
      // fall back to default localhost
    }
  }
}
