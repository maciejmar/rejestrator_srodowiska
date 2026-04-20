import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
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
      this.http.get<AIModel[]>(`${API}/models`).pipe(
        tap((list: AIModel[]) => this.modelsSubject.next(list))
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
    return this.http.patch<AIModel>(`${API}/models/${modelId}/status`, { status }).pipe(
      tap((updated: AIModel) => {
        const list = this.modelsSubject.value.map((m: AIModel) =>
          m.id === modelId ? updated : m
        );
        this.modelsSubject.next(list);
      })
    );
  }
}
