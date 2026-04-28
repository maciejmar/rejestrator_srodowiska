import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { AIModel } from '../../core/models/ai-model.model';
import { ReservationService } from '../../core/services/reservation.service';
import { ModelService } from '../../core/services/model.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  reservations: Reservation[] = [];
  models: AIModel[] = [];
  filterModelId = 'all';
  filterStatus  = 'all';
  searchQuery   = '';
  stats = { total: 0, confirmed: 0, today: 0, byModel: {} as Record<string, number> };
  loading = false;
  syncing = false;
  syncResult: number | null = null;

  rescheduleTarget: Reservation | null = null;

  showNewForm  = false;
  newForm: FormGroup;
  newSubmitted = false;
  newSuccess   = false;
  newSaving    = false;
  newMode: 'full-day' | 'hourly' = 'full-day';
  newSelectedSlots: string[] = [];

  readonly hours = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00','19:00'
  ];

  readonly minDate = new Date().toISOString().split('T')[0];

  constructor(
    private reservationService: ReservationService,
    private modelService: ModelService,
    public auth: AuthService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.newForm = this.fb.group({
      modelId:    ['', Validators.required],
      date:       ['', Validators.required],
      userName:   ['', [Validators.required, Validators.minLength(3)]],
      department: ['', Validators.required],
      purpose:    ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.models  = this.modelService.getModels();

    this.reservationService.loadAll().then(() => {
      this.reservations = this.reservationService.getAllActive();
      this.loading = false;
    }).catch(() => { this.loading = false; });

    this.reservationService.getStats().subscribe({
      next: (s: { total: number; confirmed: number; today: number; by_model: Record<string, number> }) => {
        this.stats = {
          total:     s.total,
          confirmed: s.confirmed,
          today:     s.today,
          byModel:   s.by_model
        };
      }
    });
  }

  get filteredReservations(): Reservation[] {
    return this.reservations.filter(r => {
      if (this.filterModelId !== 'all' && r.modelId !== this.filterModelId) return false;
      if (this.filterStatus  !== 'all' && r.status  !== this.filterStatus)  return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return r.userName.toLowerCase().includes(q)
          || r.department.toLowerCase().includes(q)
          || r.purpose.toLowerCase().includes(q);
      }
      return true;
    });
  }

  modelName(id: string): string {
    return this.modelService.getModelById(id)?.name ?? id;
  }

  dateLabel(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pl-PL', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  timeLabel(r: Reservation): string {
    return r.isFullDay ? 'Cały dzień' : `${r.startTime} – ${r.endTime}`;
  }

  cancel(r: Reservation): void {
    if (!confirm(`Anulować rezerwację użytkownika ${r.userName}?`)) return;
    this.reservationService.cancelReservation(r.id).subscribe({
      next: () => this.refresh(),
      error: () => this.refresh()
    });
  }

  openReschedule(r: Reservation): void { this.rescheduleTarget = r; }

  onRescheduleUpdated(): void {
    this.rescheduleTarget = null;
    this.refresh();
  }

  onRescheduleClosed(): void { this.rescheduleTarget = null; }

  toggleNewForm(): void {
    this.showNewForm = !this.showNewForm;
    if (!this.showNewForm) { this.resetNewForm(); }
  }

  resetNewForm(): void {
    this.newForm.reset();
    this.newSubmitted    = false;
    this.newSuccess      = false;
    this.newSaving       = false;
    this.newMode         = 'full-day';
    this.newSelectedSlots = [];
  }

  setNewMode(m: 'full-day' | 'hourly'): void {
    this.newMode = m;
    this.newSelectedSlots = [];
  }

  toggleNewSlot(h: string): void {
    const i = this.newSelectedSlots.indexOf(h);
    i === -1 ? this.newSelectedSlots.push(h) : this.newSelectedSlots.splice(i, 1);
  }

  isNewSlotSelected(h: string): boolean { return this.newSelectedSlots.includes(h); }

  get newTakenSlots(): Set<string> {
    const modelId = this.newForm.get('modelId')?.value as string;
    const date    = this.newForm.get('date')?.value    as string;
    if (!modelId || !date) return new Set();
    const taken = new Set<string>();
    this.reservationService.getReservationsForDay(modelId, date).forEach(r => {
      if (r.isFullDay) this.hours.forEach(h => taken.add(h));
      else if (r.startTime) taken.add(r.startTime);
    });
    return taken;
  }

  get canSubmitNew(): boolean {
    if (!this.newForm.valid) return false;
    if (this.newMode === 'full-day') return this.newTakenSlots.size === 0;
    return this.newSelectedSlots.length > 0;
  }

  submitNew(): void {
    this.newSubmitted = true;
    if (!this.canSubmitNew || this.newSaving) return;

    const { modelId, date, userName, department, purpose } = this.newForm.value as {
      modelId: string; date: string; userName: string; department: string; purpose: string;
    };

    let requests: Observable<Reservation>[];

    if (this.newMode === 'full-day') {
      requests = [this.reservationService.addReservation({
        modelId, date, userName, department, purpose, isFullDay: true
      })];
    } else {
      requests = this.newSelectedSlots.map(time => {
        const [h, m] = time.split(':').map(Number);
        const endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return this.reservationService.addReservation({
          modelId, date, userName, department, purpose,
          isFullDay: false, startTime: time, endTime
        });
      });
    }

    this.newSaving = true;
    forkJoin(requests).subscribe({
      next: () => {
        this.newSaving  = false;
        this.newSuccess = true;
        setTimeout(() => { this.resetNewForm(); this.showNewForm = false; this.refresh(); }, 1600);
      },
      error: () => { this.newSaving = false; }
    });
  }

  syncModels(): void {
    this.syncing = true;
    this.syncResult = null;
    this.http.post<{ synced: number }>('/rezerwacje/api/admin/sync-models', {}).subscribe({
      next: (r: { synced: number }) => {
        this.syncing    = false;
        this.syncResult = r.synced;
        this.refresh();
      },
      error: () => { this.syncing = false; }
    });
  }

  topModels(): Array<{ model: AIModel; count: number }> {
    return this.models
      .map(m => ({ model: m, count: this.stats.byModel[m.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  newFormFieldError(field: string): boolean {
    const ctrl = this.newForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || this.newSubmitted));
  }
}
