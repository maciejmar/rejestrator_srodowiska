import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AIModel } from '../models/ai-model.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ModelService {
  private modelsSubject   = new BehaviorSubject<AIModel[]>([]);
  private selectedSubject = new BehaviorSubject<AIModel | null>(null);

  readonly models$        = this.modelsSubject.asObservable();
  readonly selectedModel$ = this.selectedSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadModels(): Promise<void> {
    return firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`${API}/models`).pipe(
        tap((list: Record<string, unknown>[]) => this.modelsSubject.next(list.map(m => this.fromApi(m))))
      )
    ).then(() => void 0);
  }

  getModels(): AIModel[] { return this.modelsSubject.value; }

  getModelById(id: string): AIModel | undefined {
    return this.modelsSubject.value.find((m: AIModel) => m.id === id);
  }

  selectModel(model: AIModel): void  { this.selectedSubject.next(model); }
  deselectModel(): void               { this.selectedSubject.next(null); }
  get currentModel(): AIModel | null  { return this.selectedSubject.value; }

  updateStatus(modelId: string, status: string): Observable<AIModel> {
    return this.http.patch<Record<string, unknown>>(`${API}/models/${modelId}/status`, { status }).pipe(
      map((raw: Record<string, unknown>) => this.fromApi(raw)),
      tap((updated: AIModel) => {
        const list = this.modelsSubject.value.map((m: AIModel) =>
          m.id === modelId ? updated : m
        );
        this.modelsSubject.next(list);
      })
    );
  }

  private fromApi(m: Record<string, unknown>): AIModel {
    return {
      id:                 m['id'] as string,
      name:               m['name'] as string,
      description:        m['description'] as string,
      type:               m['type'] as AIModel['type'],
      parameters:         m['parameters'] as string,
      status:             m['status'] as AIModel['status'],
      maxConcurrentUsers: m['max_concurrent_users'] as number,
      contextWindow:      m['context_window'] as string | undefined,
      vendor:             m['vendor'] as string | undefined,
    };
  }
}
