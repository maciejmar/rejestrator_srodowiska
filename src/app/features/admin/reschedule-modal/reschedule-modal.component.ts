import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Reservation } from '../../../core/models/reservation.model';
import { ReservationService } from '../../../core/services/reservation.service';
import { ModelService } from '../../../core/services/model.service';

@Component({
  selector: 'app-reschedule-modal',
  templateUrl: './reschedule-modal.component.html',
  styleUrls: ['./reschedule-modal.component.scss']
})
export class RescheduleModalComponent implements OnInit {
  @Input() reservation!: Reservation;
  @Output() closed  = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  form: FormGroup;
  mode: 'full-day' | 'hourly' = 'full-day';
  takenSlots: Set<string> = new Set();
  selectedSlots: string[] = [];
  submitted = false;
  success = false;
  saving = false;
  conflict = false;

  readonly hours = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00','19:00'
  ];

  readonly minDate: string;

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private modelService: ModelService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.form = this.fb.group({
      date: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.mode = this.reservation.isFullDay ? 'full-day' : 'hourly';
    this.form.patchValue({ date: this.reservation.date });
    if (!this.reservation.isFullDay && this.reservation.startTime) {
      this.selectedSlots = [this.reservation.startTime];
    }
    this.refreshTaken();
  }

  get modelName(): string {
    return this.modelService.getModelById(this.reservation.modelId)?.name ?? this.reservation.modelId;
  }

  get currentDate(): string {
    return this.form.get('date')?.value ?? '';
  }

  refreshTaken(): void {
    const date = this.currentDate;
    if (!date) return;
    const others = this.reservationService
      .getReservationsForDay(this.reservation.modelId, date)
      .filter(r => r.id !== this.reservation.id);

    this.takenSlots = new Set<string>();
    for (const r of others) {
      if (r.isFullDay) {
        this.hours.forEach(h => this.takenSlots.add(h));
      } else if (r.startTime) {
        this.takenSlots.add(r.startTime);
      }
    }
    this.conflict = false;
  }

  onDateChange(): void {
    this.selectedSlots = [];
    this.refreshTaken();
  }

  isSlotTaken(h: string): boolean { return this.takenSlots.has(h); }
  isSlotSelected(h: string): boolean { return this.selectedSlots.includes(h); }

  toggleSlot(h: string): void {
    if (this.isSlotTaken(h)) return;
    const idx = this.selectedSlots.indexOf(h);
    idx === -1 ? this.selectedSlots.push(h) : this.selectedSlots.splice(idx, 1);
  }

  setMode(m: 'full-day' | 'hourly'): void {
    this.mode = m;
    this.selectedSlots = [];
    this.conflict = false;
  }

  get isFullDayConflict(): boolean {
    return this.mode === 'full-day' && this.takenSlots.size > 0;
  }

  get canSave(): boolean {
    if (!this.form.valid) return false;
    if (this.mode === 'full-day') return !this.isFullDayConflict;
    return this.selectedSlots.length > 0;
  }

  save(): void {
    this.submitted = true;
    if (!this.canSave || this.saving) { this.conflict = true; return; }

    const date = this.currentDate;
    const changes = this.mode === 'full-day'
      ? { date, isFullDay: true, startTime: undefined, endTime: undefined }
      : (() => {
          const start = this.selectedSlots.slice().sort()[0];
          const end   = this.nextHour(this.selectedSlots.slice().sort().reverse()[0]);
          return { date, isFullDay: false, startTime: start, endTime: end };
        })();

    this.saving = true;
    this.reservationService.updateReservation(this.reservation.id, changes).subscribe({
      next: () => {
        this.saving  = false;
        this.success = true;
        setTimeout(() => this.updated.emit(), 1500);
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  private nextHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  close(): void { this.closed.emit(); }
}
