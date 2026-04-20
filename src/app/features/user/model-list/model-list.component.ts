import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AIModel, ModelType } from '../../../core/models/ai-model.model';
import { ModelService } from '../../../core/services/model.service';

@Component({
  selector: 'app-model-list',
  templateUrl: './model-list.component.html',
  styleUrls: ['./model-list.component.scss']
})
export class ModelListComponent implements OnInit, OnDestroy {
  models: AIModel[] = [];
  selectedModel: AIModel | null = null;
  filterType: ModelType | 'all' = 'all';
  private destroy$ = new Subject<void>();

  readonly types: Array<{ value: ModelType | 'all'; label: string }> = [
    { value: 'all',       label: 'Wszystkie' },
    { value: 'LLM',       label: 'LLM' },
    { value: 'Code',      label: 'Kod' },
    { value: 'Embedding', label: 'Embedding' },
    { value: 'Multimodal',label: 'Multimodal' }
  ];

  constructor(private modelService: ModelService) {}

  ngOnInit(): void {
    this.models = this.modelService.getModels();
    this.modelService.selectedModel$
      .pipe(takeUntil(this.destroy$))
      .subscribe(m => this.selectedModel = m);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredModels(): AIModel[] {
    if (this.filterType === 'all') return this.models;
    return this.models.filter(m => m.type === this.filterType);
  }

  selectModel(model: AIModel): void {
    if (model.status === 'maintenance') return;
    if (this.selectedModel?.id === model.id) {
      this.modelService.deselectModel();
    } else {
      this.modelService.selectModel(model);
    }
  }

  isSelected(model: AIModel): boolean {
    return this.selectedModel?.id === model.id;
  }

  statusLabel(model: AIModel): string {
    const map: Record<string, string> = {
      available:   'Dostępny',
      busy:        'Zajęty',
      maintenance: 'Konserwacja'
    };
    return map[model.status] ?? model.status;
  }

  typeIcon(type: ModelType): string {
    const icons: Record<ModelType, string> = {
      LLM:        '🧠',
      Code:       '💻',
      Multimodal: '🖼️',
      Embedding:  '🔍',
      Image:      '🎨'
    };
    return icons[type] ?? '🤖';
  }
}
