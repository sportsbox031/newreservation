import bcrypt from 'bcryptjs'

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

export const isBcryptHash = (value: string): boolean => {
  return BCRYPT_HASH_PATTERN.test(value)
}

export const legacyHashPassword = (password: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(password + 'sportsbox_salt')))
  } catch (error) {
    console.error('Password encoding error:', error)
    const safePassword = (password + 'sportsbox_salt').replace(/[^\x00-\x7F]/g, '_')
    return btoa(safePassword)
  }
}
