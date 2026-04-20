import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AIModel } from '../../../core/models/ai-model.model';
import { CalendarDay, Reservation } from '../../../core/models/reservation.model';
import { ReservationService } from '../../../core/services/reservation.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnChanges {
  @Input() model!: AIModel;

  displayedDate = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;
  showModal = false;
  loading = false;

  readonly weekDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  constructor(private reservationService: ReservationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model'] && this.model) {
      this.reloadAndRender();
    }
  }

  private reloadAndRender(): void {
    this.loading = true;
    this.reservationService.loadForModel(this.model.id)
      .then(() => { this.loading = false; this.generateCalendar(); })
      .catch(() => { this.loading = false; this.generateCalendar(); });
  }

  generateCalendar(): void {
    const year  = this.displayedDate.getFullYear();
    const month = this.displayedDate.getMonth();
    const today = this.todayMidnight();

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    // ISO week starts Monday (0=Mon…6=Sun)
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const days: CalendarDay[] = [];

    // Trailing days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(this.makeDay(date, false, today));
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(this.makeDay(date, true, today));
    }

    // Pad to 42 cells (6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push(this.makeDay(date, false, today));
    }

    this.calendarDays = days;
  }

  private makeDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const dateStr      = this.formatDate(date);
    const dow          = date.getDay();
    const isWeekend    = dow === 0 || dow === 6;
    const reservations = this.model
      ? this.reservationService.getReservationsForDay(this.model.id, dateStr)
      : [];

    return {
      date,
      dateStr,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday:   date.getTime() === today.getTime(),
      isPast:    date < today,
      isWeekend,
      reservations,
      occupancy: this.calcOccupancy(reservations)
    };
  }

  private calcOccupancy(res: Reservation[]): CalendarDay['occupancy'] {
    if (res.length === 0)           return 'none';
    if (res.some(r => r.isFullDay)) return 'full';
    if (res.length >= 6)            return 'full';
    if (res.length >= 3)            return 'partial';
    return 'low';
  }

  private todayMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get monthTitle(): string {
    return this.displayedDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }

  get canGoPrev(): boolean {
    const now = new Date();
    return !(
      this.displayedDate.getFullYear() === now.getFullYear() &&
      this.displayedDate.getMonth()    === now.getMonth()
    );
  }

  prevMonth(): void {
    if (!this.canGoPrev) return;
    this.displayedDate = new Date(
      this.displayedDate.getFullYear(),
      this.displayedDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  nextMonth(): void {
    this.displayedDate = new Date(
      this.displayedDate.getFullYear(),
      this.displayedDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }

  openDay(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isPast || this.model.status === 'maintenance') return;
    this.selectedDay = day;
    this.showModal   = true;
  }

  onModalClose(): void {
    this.showModal   = false;
    this.selectedDay = null;
    this.reloadAndRender();
  }

  occupancyLabel(occ: CalendarDay['occupancy']): string {
    const map: Record<string, string> = {
      none:    'Wolny',
      low:     'Mało zajęty',
      partial: 'Częściowo zajęty',
      full:    'Zajęty'
    };
    return map[occ];
  }

  reservationCountLabel(day: CalendarDay): string {
    const n = day.reservations.length;
    if (n === 0) return '';
    if (day.reservations.some(r => r.isFullDay)) return 'Cały dzień';
    return `${n} rez.`;
  }
}
