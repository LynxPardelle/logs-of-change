import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiHealthStore } from './api-health.store';

@Component({
  selector: 'app-health-page',
  providers: [ApiHealthStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health-page.html',
  styleUrl: './health-page.css',
})
export class HealthPage {
  protected readonly store = inject(ApiHealthStore);
}
