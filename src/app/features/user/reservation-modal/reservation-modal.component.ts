import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AIModel } from '../../../core/models/ai-model.model';
import { CalendarDay, Reservation, TimeSlot } from '../../../core/models/reservation.model';
import { ReservationService } from '../../../core/services/reservation.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reservation-modal',
  templateUrl: './reservation-modal.component.html',
  styleUrls: ['./reservation-modal.component.scss']
})
export class ReservationModalComponent implements OnInit {
  @Input() model!: AIModel;
  @Input() day!: CalendarDay;
  @Output() closed = new EventEmitter<void>();

  mode: 'full-day' | 'hourly' = 'full-day';
  timeSlots: TimeSlot[] = [];
  existingReservations: Reservation[] = [];
  form: FormGroup;
  submitted = false;
  success = false;
  saving = false;

  readonly hours = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00','19:00'
  ];

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    public auth: AuthService
  ) {
    this.form = this.fb.group({
      userName:   ['', [Validators.required, Validators.minLength(3)]],
      department: ['', Validators.required],
      purpose:    ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.form.patchValue({ userName: user.displayName });
      if (!this.auth.isAdmin) {
        this.form.get('userName')!.disable();
      }
    }
    this.loadData();
  }

  loadData(): void {
    this.existingReservations = this.reservationService.getReservationsForDay(
      this.model.id, this.day.dateStr
    );
    const fullDayRes = this.existingReservations.find(r => r.isFullDay);

    this.timeSlots = this.hours.map(time => {
      const taken = this.existingReservations.find(r => !r.isFullDay && r.startTime === time);
      return {
        time,
        isAvailable: !taken && !fullDayRes,
        isSelected:  false,
        userName:    taken?.userName   ?? fullDayRes?.userName,
        department:  taken?.department ?? fullDayRes?.department
      };
    });

    if (fullDayRes) this.mode = 'hourly';
  }

  get isFullDayTaken(): boolean {
    return this.existingReservations.some(r => r.isFullDay);
  }

  get selectedSlots(): TimeSlot[] {
    return this.timeSlots.filter(s => s.isSelected);
  }

  get dateLabel(): string {
    return new Date(this.day.dateStr + 'T00:00:00').toLocaleDateString('pl-PL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get canSubmit(): boolean {
    if (!this.form.valid) return false;
    if (this.mode === 'full-day') return !this.isFullDayTaken;
    return this.selectedSlots.length > 0;
  }

  cancelExisting(r: Reservation): void {
    this.reservationService.cancelReservation(r.id).subscribe({
      next: () => this.loadData(),
      error: () => this.loadData()
    });
  }

  toggleSlot(slot: TimeSlot): void {
    if (!slot.isAvailable) return;
    slot.isSelected = !slot.isSelected;
  }

  setMode(mode: 'full-day' | 'hourly'): void {
    if (mode === 'full-day' && this.isFullDayTaken) return;
    this.mode = mode;
    this.timeSlots.forEach(s => s.isSelected = false);
  }

  selectAllAvailable(): void {
    this.timeSlots.filter(s => s.isAvailable).forEach(s => s.isSelected = true);
  }

  clearSelection(): void {
    this.timeSlots.forEach(s => s.isSelected = false);
  }

  submit(): void {
    this.submitted = true;
    if (!this.canSubmit || this.saving) return;

    const userName   = this.form.get('userName')!.value   as string;
    const department = this.form.get('department')!.value as string;
    const purpose    = this.form.get('purpose')!.value    as string;

    let requests: Observable<Reservation>[];

    if (this.mode === 'full-day') {
      requests = [this.reservationService.addReservation({
        modelId: this.model.id,
        userName, department, purpose,
        date: this.day.dateStr,
        isFullDay: true
      })];
    } else {
      requests = this.selectedSlots.map(slot =>
        this.reservationService.addReservation({
          modelId: this.model.id,
          userName, department, purpose,
          date: this.day.dateStr,
          isFullDay: false,
          startTime: slot.time,
          endTime:   this.nextHour(slot.time)
        })
      );
    }

    this.saving = true;
    forkJoin(requests).subscribe({
      next: () => {
        this.saving  = false;
        this.success = true;
        setTimeout(() => this.closed.emit(), 1800);
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

  fieldError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || this.submitted));
  }
}
