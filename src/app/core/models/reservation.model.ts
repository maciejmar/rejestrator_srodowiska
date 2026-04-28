export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Reservation {
  id: string;
  modelId: string;
  userEmail: string;
  userName: string;
  department: string;
  date: string;         // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string;   // HH:MM  (only when !isFullDay)
  endTime?: string;     // HH:MM
  purpose: string;
  status: ReservationStatus;
  createdAt: string;    // ISO
}

export interface TimeSlot {
  time: string;         // HH:MM
  isAvailable: boolean;
  isSelected: boolean;
  userName?: string;
  department?: string;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;      // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  reservations: Reservation[];
  occupancy: 'none' | 'low' | 'partial' | 'full';
}
