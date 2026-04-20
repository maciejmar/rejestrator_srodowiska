import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AIModel } from '../../core/models/ai-model.model';
import { ModelService } from '../../core/services/model.service';

@Component({
  selector: 'app-user-view',
  templateUrl: './user-view.component.html',
  styleUrls: ['./user-view.component.scss']
})
export class UserViewComponent implements OnInit, OnDestroy {
  selectedModel: AIModel | null = null;
  private destroy$ = new Subject<void>();

  constructor(private modelService: ModelService) {}

  ngOnInit(): void {
    if (this.modelService.getModels().length === 0) {
      this.modelService.loadModels();
    }

    this.modelService.selectedModel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((model: AIModel | null) => this.selectedModel = model);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
