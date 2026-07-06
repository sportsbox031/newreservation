import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

// 승인 상태(pending/approved/rejected) 공통 표시 유틸 — 관리자 대시보드용

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-500" />
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '대기중'
    case 'approved': return '승인됨'
    case 'rejected': return '거절됨'
    default: return '알 수 없음'
  }
}

export const getStatusBadgeClass = (status: string) => {
  return status === 'pending'
    ? 'bg-yellow-100 text-yellow-800'
    : status === 'approved'
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800'
}
