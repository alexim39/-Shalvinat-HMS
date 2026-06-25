import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AppConfigService } from './app/core/app-config.service';

(() => {
  const config = new AppConfigService();
  config.load().then(() => {
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  });
})();
