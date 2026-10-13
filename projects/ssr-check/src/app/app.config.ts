import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes), provideClientHydration(withEventReplay(), withIncrementalHydration())],
};
