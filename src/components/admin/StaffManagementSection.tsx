'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  Pencil,
  Check,
  Palmtree,
  UserRound
} from 'lucide-react'
import { staffAPI } from '@/lib/supabase'

interface StaffMemberItem {
  id: number
  region_code: string
  name: string
  team_no: number | null
  is_active: boolean
  sort_order: number
}

interface StaffVacationItem {
  id: number
  staff_id: number
  date: string
  staff_members: {
    id: number
    name: string
    region_code: string
    team_no: number | null
  }
}

interface StaffManagementSectionProps {
  regionCode: 'south' | 'north'
  year: number
  month: number
}

const TEAM_OPTIONS = [1, 2, 3] // 필요 시 3팀까지 확장 가능

export default function StaffManagementSection({ regionCode, year, month }: StaffManagementSectionProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMemberItem[]>([])
  const [vacations, setVacations] = useState<StaffVacationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 담당자 추가 폼
  const [newStaff, setNewStaff] = useState<{ name: string; teamNo: string }>({ name: '', teamNo: '1' })

  // 이름 수정 상태
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  // 휴가 등록 폼
  const [newVacation, setNewVacation] = useState<{ staffId: string; date: string }>({ staffId: '', date: '' })

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const loadStaff = useCallback(async () => {
    const { data, error } = await staffAPI.getStaffMembers(regionCode)
    if (!error && data) {
      setStaffMembers(data)
    }
  }, [regionCode])

  const loadVacations = useCallback(async () => {
    const { data, error } = await staffAPI.getVacations(regionCode, yearMonth)
    if (!error && data) {
      setVacations(data)
    }
  }, [regionCode, yearMonth])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([loadStaff(), loadVacations()]).finally(() => {
      if (!cancelled) {
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [loadStaff, loadVacations])

  // ===== 담당자 CRUD =====

  const addStaff = async () => {
    if (!newStaff.name.trim()) {
      showMessage('error', '담당자 이름을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const teamNo = newStaff.teamNo === '' ? null : Number(newStaff.teamNo)
      const { error } = await staffAPI.createStaffMember(regionCode, newStaff.name.trim(), teamNo)

      if (error) {
        showMessage('error', (error as any).message || '담당자 등록에 실패했습니다.')
        return
      }

      showMessage('success', `${newStaff.name.trim()} 담당자가 등록되었습니다.`)
      setNewStaff({ name: '', teamNo: '1' })
      loadStaff()
    } finally {
      setSaving(false)
    }
  }

  const saveStaffName = async (staffId: number) => {
    if (!editingName.trim()) {
      showMessage('error', '담당자 이름을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const { error } = await staffAPI.updateStaffMember(regionCode, staffId, { name: editingName.trim() })

      if (error) {
        showMessage('error', (error as any).message || '담당자 수정에 실패했습니다.')
        return
      }

      showMessage('success', '담당자 이름이 수정되었습니다.')
      setEditingStaffId(null)
      setEditingName('')
      loadStaff()
    } finally {
      setSaving(false)
    }
  }

  const changeStaffTeam = async (staffId: number, teamNoValue: string) => {
    setSaving(true)
    try {
      const teamNo = teamNoValue === '' ? null : Number(teamNoValue)
      const { error } = await staffAPI.updateStaffMember(regionCode, staffId, { teamNo })

      if (error) {
        showMessage('error', (error as any).message || '팀 변경에 실패했습니다.')
        return
      }

      showMessage('success', '팀 구성이 변경되었습니다.')
      loadStaff()
    } finally {
      setSaving(false)
    }
  }

  const removeStaff = async (staff: StaffMemberItem) => {
    if (!confirm(`${staff.name} 담당자를 삭제하시겠습니까?\n해당 담당자의 휴가 기록과 예약 배정도 함께 삭제됩니다.`)) {
      return
    }

    setSaving(true)
    try {
      const { error } = await staffAPI.deleteStaffMember(regionCode, staff.id)

      if (error) {
        showMessage('error', (error as any).message || '담당자 삭제에 실패했습니다.')
        return
      }

      showMessage('success', `${staff.name} 담당자가 삭제되었습니다.`)
      loadStaff()
      loadVacations()
    } finally {
      setSaving(false)
    }
  }

  // ===== 휴가 관리 =====

  const addVacation = async () => {
    if (!newVacation.staffId) {
      showMessage('error', '담당자를 선택해주세요.')
      return
    }

    if (!newVacation.date) {
      showMessage('error', '휴가 날짜를 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const { error } = await staffAPI.addVacation(regionCode, Number(newVacation.staffId), newVacation.date)

      if (error) {
        showMessage('error', (error as any).message || '휴가 등록에 실패했습니다.')
        return
      }

      const staffName = staffMembers.find(s => s.id === Number(newVacation.staffId))?.name || '담당자'
      showMessage('success', `${staffName}의 휴가(${newVacation.date})가 등록되었습니다.`)
      setNewVacation(prev => ({ ...prev, date: '' }))
      loadVacations()
    } finally {
      setSaving(false)
    }
  }

  const removeVacation = async (vacation: StaffVacationItem) => {
    if (!confirm(`${vacation.staff_members?.name}의 ${vacation.date} 휴가를 삭제하시겠습니까?`)) {
      return
    }

    setSaving(true)
    try {
      const { error } = await staffAPI.removeVacation(regionCode, vacation.id)

      if (error) {
        showMessage('error', (error as any).message || '휴가 삭제에 실패했습니다.')
        return
      }

      showMessage('success', '휴가가 삭제되었습니다.')
      loadVacations()
    } finally {
      setSaving(false)
    }
  }

  // 팀별 그룹핑
  const teamGroups = new Map<number, StaffMemberItem[]>()
  const unassignedStaff: StaffMemberItem[] = []
  for (const staff of staffMembers) {
    if (staff.team_no === null) {
      unassignedStaff.push(staff)
    } else {
      const members = teamGroups.get(staff.team_no) ?? []
      members.push(staff)
      teamGroups.set(staff.team_no, members)
    }
  }
  const sortedTeams = [...teamGroups.entries()].sort((a, b) => a[0] - b[0])

  // 이번 달 휴가를 담당자별로 그룹핑
  const vacationsByStaff = new Map<number, StaffVacationItem[]>()
  for (const vacation of vacations) {
    const items = vacationsByStaff.get(vacation.staff_id) ?? []
    items.push(vacation)
    vacationsByStaff.set(vacation.staff_id, items)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* 담당자 목록 및 팀 구성 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            담당자 및 팀 구성
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            담당자를 추가/수정/삭제하고 팀을 구성합니다. 팀 구성은 언제든 변경할 수 있으며, 예약관리의 팀배정에 사용됩니다.
          </p>
        </div>

        {/* 담당자 추가 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                placeholder="담당자 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
              <select
                value={newStaff.teamNo}
                onChange={(e) => setNewStaff(prev => ({ ...prev, teamNo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TEAM_OPTIONS.map(no => (
                  <option key={no} value={String(no)}>{no}팀</option>
                ))}
                <option value="">팀 미지정</option>
              </select>
            </div>
            <button
              onClick={addStaff}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" />
              담당자 추가
            </button>
          </div>
        </div>

        {/* 팀별 담당자 목록 */}
        <div className="p-6">
          {staffMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>등록된 담당자가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTeams.map(([teamNo, members]) => (
                <div key={teamNo} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mr-2">
                      {teamNo}
                    </span>
                    {teamNo}팀 <span className="text-sm text-gray-500 ml-2">({members.length}명)</span>
                  </h3>
                  <div className="space-y-2">
                    {members.map(staff => (
                      <StaffRow
                        key={staff.id}
                        staff={staff}
                        saving={saving}
                        editingStaffId={editingStaffId}
                        editingName={editingName}
                        setEditingStaffId={setEditingStaffId}
                        setEditingName={setEditingName}
                        saveStaffName={saveStaffName}
                        changeStaffTeam={changeStaffTeam}
                        removeStaff={removeStaff}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {unassignedStaff.length > 0 && (
                <div className="border border-dashed border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-500 mb-3">팀 미지정 <span className="text-sm ml-1">({unassignedStaff.length}명)</span></h3>
                  <div className="space-y-2">
                    {unassignedStaff.map(staff => (
                      <StaffRow
                        key={staff.id}
                        staff={staff}
                        saving={saving}
                        editingStaffId={editingStaffId}
                        editingName={editingName}
                        setEditingStaffId={setEditingStaffId}
                        setEditingName={setEditingName}
                        saveStaffName={saveStaffName}
                        changeStaffTeam={changeStaffTeam}
                        removeStaff={removeStaff}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">
            팀 선택을 바꾸면 즉시 반영됩니다. 팀 미지정 담당자는 팀배정에서 제외되고 개인배정에는 포함됩니다.
          </p>
        </div>
      </div>

      {/* 월별 휴가 관리 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Palmtree className="w-5 h-5 mr-2" />
            휴가 관리 <span className="text-sm font-normal text-gray-500 ml-2">({year}년 {month}월)</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            휴가로 등록된 날짜에는 해당 담당자가 예약 배정에서 제외됩니다. 월은 상단에서 변경할 수 있습니다.
          </p>
        </div>

        {/* 휴가 등록 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자 *</label>
              <select
                value={newVacation.staffId}
                onChange={(e) => setNewVacation(prev => ({ ...prev, staffId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={String(staff.id)}>
                    {staff.name}{staff.team_no ? ` (${staff.team_no}팀)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">휴가 날짜 *</label>
              <input
                type="date"
                value={newVacation.date}
                onChange={(e) => setNewVacation(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={addVacation}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" />
              휴가 등록
            </button>
          </div>
        </div>

        {/* 이번 달 휴가 목록 */}
        <div className="p-6">
          {vacations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Palmtree className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>{year}년 {month}월에 등록된 휴가가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffMembers.filter(staff => vacationsByStaff.has(staff.id)).map(staff => (
                <div key={staff.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center min-w-[120px]">
                    <UserRound className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium text-gray-900">{staff.name}</span>
                    {staff.team_no && (
                      <span className="ml-1 text-xs text-gray-500">({staff.team_no}팀)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(vacationsByStaff.get(staff.id) ?? []).map(vacation => (
                      <span
                        key={vacation.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {vacation.date}
                        <button
                          onClick={() => removeVacation(vacation)}
                          disabled={saving}
                          className="ml-1.5 text-amber-600 hover:text-amber-900 disabled:opacity-50"
                          title="휴가 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 담당자 한 줄 (이름 수정 / 팀 변경 / 삭제)
function StaffRow({
  staff,
  saving,
  editingStaffId,
  editingName,
  setEditingStaffId,
  setEditingName,
  saveStaffName,
  changeStaffTeam,
  removeStaff,
}: {
  staff: StaffMemberItem
  saving: boolean
  editingStaffId: number | null
  editingName: string
  setEditingStaffId: (id: number | null) => void
  setEditingName: (name: string) => void
  saveStaffName: (id: number) => void
  changeStaffTeam: (id: number, teamNoValue: string) => void
  removeStaff: (staff: StaffMemberItem) => void
}) {
  const isEditing = editingStaffId === staff.id

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveStaffName(staff.id)
                if (e.key === 'Escape') setEditingStaffId(null)
              }}
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={() => saveStaffName(staff.id)}
              disabled={saving}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
              title="저장"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingStaffId(null)}
              className="text-gray-400 hover:text-gray-600"
              title="취소"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className="font-medium text-gray-900 truncate">{staff.name}</span>
            <button
              onClick={() => {
                setEditingStaffId(staff.id)
                setEditingName(staff.name)
              }}
              className="text-gray-400 hover:text-blue-600"
              title="이름 수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={staff.team_no === null ? '' : String(staff.team_no)}
          onChange={(e) => changeStaffTeam(staff.id, e.target.value)}
          disabled={saving}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          {TEAM_OPTIONS.map(no => (
            <option key={no} value={String(no)}>{no}팀</option>
          ))}
          <option value="">미지정</option>
        </select>
        <button
          onClick={() => removeStaff(staff)}
          disabled={saving}
          className="text-red-500 hover:text-red-700 disabled:opacity-50"
          title="담당자 삭제"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
