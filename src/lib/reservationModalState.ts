export type ReservationSlotFormState = {
  startTime: string
  endTime: string
  grade: string
  participantCount: string
  location: string
}

export const EMPTY_RESERVATION_SLOT_FORM: ReservationSlotFormState = {
  startTime: '',
  endTime: '',
  grade: '',
  participantCount: '',
  location: '',
}

export function getClosedReservationModalState() {
  return {
    activeModal: null,
    selectedDate: null,
    reservationSlots: [{ ...EMPTY_RESERVATION_SLOT_FORM }, { ...EMPTY_RESERVATION_SLOT_FORM }],
  }
}
