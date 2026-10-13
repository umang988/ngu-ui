import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { LoginForm } from './form';

bootstrapApplication(LoginForm, { providers: [provideBrowserGlobalErrorListeners()] }).catch((err) => console.error(err));
