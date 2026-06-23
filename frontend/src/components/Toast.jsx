import { toast as sonnerToast } from 'sonner'

export function useToast() {
  return function addToast(message, type = 'info', duration = 4000) {
    const map = { info: 'default', success: 'success', error: 'error' }
    sonnerToast[map[type] || 'default'](message, { duration })
  }
}
