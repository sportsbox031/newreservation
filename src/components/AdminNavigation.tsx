'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Bell, 
  Settings, 
  BarChart3, 
  LogOut,
  Home,
  Monitor,
  UserCog
} from 'lucide-react'
import AccountManagementModal from './AccountManagementModal'

interface AdminNavigationProps {
  adminRole?: string
}

export default function AdminNavigation({ adminRole = 'super' }: AdminNavigationProps) {
  const pathname = usePathname()
  const [showAccountModal, setShowAccountModal] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('adminInfo')
    window.location.href = '/auth/login'
  }

  const handleAccountManagement = () => {
    setShowAccountModal(true)
  }

  const navItems = [
    {
      href: '/admin',
      label: '대시보드',
      icon: Home,
      roles: ['super', 'south', 'north']
    },
    {
      href: '/admin/announcements',
      label: '공지사항 관리',
      icon: Bell,
      roles: ['super', 'south', 'north']
    },
    {
      href: '/admin/popups',
      label: '팝업 관리',
      icon: Monitor,
      roles: ['super', 'south', 'north']
    },
    {
      href: '/admin/members',
      label: '회원 관리',
      icon: Users,
      roles: ['super', 'south', 'north']
    },
    {
      href: '/admin/reservations',
      label: '예약 관리', 
      icon: Calendar,
      roles: ['super', 'south', 'north']
    },
    {
      href: '/admin/settings',
      label: '설정',
      icon: Settings,
      roles: ['super']
    },
    {
      href: '/admin/reports',
      label: '통계',
      icon: BarChart3,
      roles: ['super']
    }
  ]

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(adminRole)
  )

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">관리자</span>
            </Link>

            <div className="flex space-x-4">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center space-x-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 hidden md:inline">
              {adminRole === 'super' && '전체'}
              {adminRole === 'south' && '남부'}
              {adminRole === 'north' && '북부'}
            </span>
            <button
              onClick={handleAccountManagement}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <UserCog className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">계정</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
      
      <AccountManagementModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        userType="admin"
      />
    </nav>
  )
}