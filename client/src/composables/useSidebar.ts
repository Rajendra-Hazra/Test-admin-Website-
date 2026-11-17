import { ref } from 'vue'

const isCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')
const isMobileOpen = ref(false)

export function useSidebar() {
  function toggle() {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
  }

  function setCollapsed(value: boolean) {
    isCollapsed.value = value
    localStorage.setItem('sidebar_collapsed', String(value))
  }

  function toggleMobile() {
    isMobileOpen.value = !isMobileOpen.value
  }

  function closeMobile() {
    isMobileOpen.value = false
  }

  return {
    isCollapsed,
    toggle,
    setCollapsed,
    isMobileOpen,
    toggleMobile,
    closeMobile,
  }
}

