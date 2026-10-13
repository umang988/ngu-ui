import { mergeApplicationConfig, type ApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes, type ServerRoute } from '@angular/ssr';
import { appConfig } from './app.config';

/** Every page is rendered at build time, the way a static host serves them. */
const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];

export const serverConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
});
