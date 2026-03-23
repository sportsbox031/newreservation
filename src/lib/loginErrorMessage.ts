type LoginErrorLike = {
  code?: string
  message?: string
} | null | undefined

const USER_LOGIN_MESSAGE_ALLOWLIST = new Set([
  '등록되지 않은 단체명입니다.',
  '비밀번호가 일치하지 않습니다.',
  '회원가입 승인 대기중입니다. 관리자 승인 후 로그인하실 수 있습니다.',
  '회원가입이 거부되었습니다. 관리자에게 문의하세요.',
  '계정 상태를 확인할 수 없습니다.',
])

const ADMIN_LOGIN_MESSAGE_ALLOWLIST = new Set([
  '등록되지 않은 관리자 계정입니다.',
  '비밀번호가 일치하지 않습니다.',
  '관리자 로그인에 실패했습니다.',
])

export function mapLoginErrorMessage(error: LoginErrorLike, loginType: 'user' | 'admin'): string {
  if (loginType === 'user' && error?.code === 'PGRST116') {
    return '등록되지 않은 단체명입니다.'
  }

  const message = error?.message?.trim()
  if (!message) {
    return loginType === 'admin'
      ? '관리자 로그인에 실패했습니다.'
      : '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
  }

  if (loginType === 'admin') {
    return ADMIN_LOGIN_MESSAGE_ALLOWLIST.has(message)
      ? message
      : '관리자 로그인에 실패했습니다.'
  }

  return USER_LOGIN_MESSAGE_ALLOWLIST.has(message)
    ? message
    : '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
}
