import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { LoginForm } from './form.plain';

bootstrapApplication(LoginForm, { providers: [provideBrowserGlobalErrorListeners()] }).catch((err) => console.error(err));
