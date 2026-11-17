import { toast } from 'vue-sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export function showToast(text: string, type: ToastType = 'success') {
  if (type === 'error') {
    toast.error(text)
  } else if (type === 'warning') {
    toast.warning(text)
  } else if (type === 'info') {
    toast.info(text)
  } else {
    toast.success(text)
  }
}

export { toast }

