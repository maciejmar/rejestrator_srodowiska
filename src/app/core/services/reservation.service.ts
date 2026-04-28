import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Reservation, ReservationStatus } from '../models/reservation.model';
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
      this.http.get<Record<string, unknown>[]>(`${API}/reservations`, {
        params: new HttpParams().set('model_id', modelId)
      }).pipe(
        tap((list: Record<string, unknown>[]) => this.reservationsSubject.next(list.map((r: Record<string, unknown>) => this.fromApi(r))))
      )
    ).then(() => void 0);
  }

  loadAll(): Promise<void> {
    this.currentModelId = null;
    return firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`${API}/reservations`).pipe(
        tap((list: Record<string, unknown>[]) => this.reservationsSubject.next(list.map((r: Record<string, unknown>) => this.fromApi(r))))
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
    return this.http.post<Record<string, unknown>>(`${API}/reservations`, body).pipe(
      map((r: Record<string, unknown>) => this.fromApi(r)),
      tap((created: Reservation) => {
        this.reservationsSubject.next([...this.reservationsSubject.value, created]);
      })
    );
  }

  cancelReservation(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/reservations/${id}`).pipe(
      tap(() => {
        const list = this.reservationsSubject.value.filter((r: Reservation) => r.id !== id);
        this.reservationsSubject.next(list);
      })
    );
  }

  updateReservation(
    id: string,
    changes: Partial<Pick<Reservation, 'date' | 'isFullDay' | 'startTime' | 'endTime'>>
  ): Observable<Reservation> {
    const body = this.toSnakeCase(changes as Record<string, unknown>);
    return this.http.patch<Record<string, unknown>>(`${API}/reservations/${id}`, body).pipe(
      map((r: Record<string, unknown>) => this.fromApi(r)),
      tap((updated: Reservation) => this.replaceInCache(updated))
    );
  }

  getStats(): Observable<{ total: number; confirmed: number; today: number; by_model: Record<string, number> }> {
    return this.http.get<{ total: number; confirmed: number; today: number; by_model: Record<string, number> }>(
      `${API}/reservations/stats/summary`
    );
  }

  private fromApi(r: Record<string, unknown>): Reservation {
    return {
      id:         r['id'] as string,
      modelId:    r['model_id'] as string,
      userEmail:  r['user_email'] as string,
      userName:   r['user_name'] as string,
      department: r['department'] as string,
      date:       r['date'] as string,
      isFullDay:  r['is_full_day'] as boolean,
      startTime:  r['start_time'] as string | undefined,
      endTime:    r['end_time'] as string | undefined,
      purpose:    r['purpose'] as string,
      status:     r['status'] as ReservationStatus,
      createdAt:  r['created_at'] as string,
    };
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
