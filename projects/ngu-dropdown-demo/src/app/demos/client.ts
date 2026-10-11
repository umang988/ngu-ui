import { Component, computed, signal } from '@angular/core';
import { NguDropdown, type NguDropdownItem } from 'ngu-dropdown';

@Component({
  selector: 'demo-dropdown-client',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="country">Country</label>
        <!-- { value, label } items need no optionValue or optionLabel. -->
        <ngu-dropdown
          inputId="country"
          [options]="countries"
          [(value)]="country"
          placeholder="Choose a country"
        />
      </div>
    </div>
  `,
})
export class DropdownClientDemo {
  readonly countries: NguDropdownItem[] = [
    ['ar', 'Argentina'],
    ['au', 'Australia'],
    ['at', 'Österreich'],
    ['be', 'Belgium'],
    ['br', 'Brazil'],
    ['ca', 'Canada'],
    ['cl', 'Chile'],
    ['cn', 'China'],
    ['co', 'Colombia'],
    ['dk', 'Denmark'],
    ['eg', 'Egypt'],
    ['fi', 'Finland'],
    ['fr', 'France'],
    ['de', 'Germany'],
    ['gr', 'Greece'],
    ['in', 'India'],
    ['id', 'Indonesia'],
    ['ie', 'Ireland'],
    ['it', 'Italy'],
    ['jp', 'Japan'],
    ['ke', 'Kenya'],
    ['mx', 'México'],
    ['nl', 'Netherlands'],
    ['nz', 'New Zealand'],
    ['ng', 'Nigeria'],
    ['no', 'Norway'],
    ['pl', 'Poland'],
    ['pt', 'Portugal'],
    ['sa', 'Saudi Arabia'],
    ['sg', 'Singapore'],
    ['za', 'South Africa'],
    ['es', 'España'],
    ['se', 'Sweden'],
    ['ch', 'Switzerland'],
    ['tr', 'Türkiye'],
    ['ae', 'United Arab Emirates'],
    ['gb', 'United Kingdom'],
    ['us', 'United States'],
    ['vn', 'Việt Nam'],
  ].map(([value, label]) => ({ value, label }));

  readonly country = signal<string | null>('in');
  readonly value = computed(() => ({ country: this.country() }));
}
