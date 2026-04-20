import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reservation } from '../models/reservation.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private reservationsSubject = new BehaviorSubject<Reservation[]>([]);
  private currentModelId: string | null = null;

  readonly reservations$: Observable<Reservation[]> = this.reservationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadForModel(modelId: string): Promise<void> {
    this.currentModelId = modelId;
    return firstValueFrom(
      this.http.get<Reservation[]>(`${API}/reservations`, {
        params: new HttpParams().set('model_id', modelId)
      }).pipe(
        tap((list: Reservation[]) => this.reservationsSubject.next(list))
      )
    ).then(() => void 0);
  }

  loadAll(): Promise<void> {
    this.currentModelId = null;
    return firstValueFrom(
      this.http.get<Reservation[]>(`${API}/reservations`).pipe(
        tap((list: Reservation[]) => this.reservationsSubject.next(list))
      )
    ).then(() => void 0);
  }

  getAll(): Reservation[] { return this.reservationsSubject.value; }

  getReservationsForDay(modelId: string, dateStr: string): Reservation[] {
    return this.reservationsSubject.value.filter(
      (r: Reservation) => r.modelId === modelId && r.date === dateStr && r.status !== 'cancelled'
    );
  }

  getReservationsForModel(modelId: string): Reservation[] {
    return this.reservationsSubject.value.filter(
      (r: Reservation) => r.modelId === modelId && r.status !== 'cancelled'
    );
  }

  getAllActive(): Reservation[] {
    return this.reservationsSubject.value.filter((r: Reservation) => r.status !== 'cancelled');
  }

  addReservation(data: Omit<Reservation, 'id' | 'createdAt' | 'status'>): Observable<Reservation> {
    const body = this.toSnakeCase(data as Record<string, unknown>);
    return this.http.post<Reservation>(`${API}/reservations`, body).pipe(
      tap((created: Reservation) => {
        const list = [...this.reservationsSubject.value, created];
        this.reservationsSubject.next(list);
      })
    );
  }

  cancelReservation(id: string): Observable<Reservation> {
    return this.http.delete<Reservation>(`${API}/reservations/${id}`).pipe(
      tap((updated: Reservation) => this.replaceInCache(updated))
    );
  }

  updateReservation(
    id: string,
    changes: Partial<Pick<Reservation, 'date' | 'isFullDay' | 'startTime' | 'endTime'>>
  ): Observable<Reservation> {
    const body = this.toSnakeCase(changes as Record<string, unknown>);
    return this.http.patch<Reservation>(`${API}/reservations/${id}`, body).pipe(
      tap((updated: Reservation) => this.replaceInCache(updated))
    );
  }

  getStats(): Observable<{ total: number; confirmed: number; today: number; by_model: Record<string, number> }> {
    return this.http.get<{ total: number; confirmed: number; today: number; by_model: Record<string, number> }>(
      `${API}/reservations/stats/summary`
    );
  }

  private replaceInCache(updated: Reservation): void {
    const list = this.reservationsSubject.value.map((r: Reservation) =>
      r.id === updated.id ? updated : r
    );
    this.reservationsSubject.next(list);
  }

  private toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const snake = key.replace(/([A-Z])/g, (m: string) => '_' + m.toLowerCase());
      result[snake] = obj[key];
    }
    return result;
  }
}
