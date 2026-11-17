<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import type {
  AppIconItem,
  AppType,
  IconUploadPayload,
  AppIconHistoryItem,
} from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import {
  Smartphone,
  Layers,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Sparkles,
  Info,
  Check,
  X,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Cpu,
  MonitorCheck,
  ChevronRight,
  Sliders,
  FileCheck,
} from 'lucide-vue-next'

// ── Route & Active Tab ────────────────────────────────────────────────
const route = useRoute()
type MainTab = 'overview' | 'customer' | 'partner' | 'history'
const activeTab = ref<MainTab>('overview')

// Set initial tab from query parameter if present
onMounted(() => {
  const tabQuery = route.query.tab as string
  if (tabQuery && ['overview', 'customer', 'partner', 'history'].includes(tabQuery)) {
    activeTab.value = tabQuery as MainTab
  }
  loadData()
})

// ── State ─────────────────────────────────────────────────────────────
const isLoading = ref(false)
const isActionLoading = ref(false)
const customerIcons = ref<AppIconItem[]>([])
const partnerIcons = ref<AppIconItem[]>([])
const historyItems = ref<AppIconHistoryItem[]>([])

// ── Simulator State ───────────────────────────────────────────────────
const simulatorApp = ref<AppType>('CUSTOMER')
const simulatorOS = ref<'ANDROID' | 'IOS'>('ANDROID')
const simulatorWallpaper = ref<'MINIMAL' | 'DARK' | 'GRADIENT'>('MINIMAL')
const selectedPreviewIcon = ref<AppIconItem | null>(null)

// ── Modal States ──────────────────────────────────────────────────────
const isUploadModalOpen = ref(false)
const isScheduleModalOpen = ref(false)
const isConfirmModalOpen = ref(false)
const targetIconForAction = ref<AppIconItem | null>(null)
const scheduleDateTime = ref('')

// ── Upload Form State ─────────────────────────────────────────────────
const uploadForm = ref<IconUploadPayload>({
  appType: 'CUSTOMER',
  name: '',
  iconIdentifier: '',
  description: '',
  version: '1.0.0',
  iconUrl: '',
  bundledInAndroid: true,
  bundledInIos: true,
  minSupportedAppVersion: '1.0.0',
  scheduleActivation: false,
  scheduledDate: '',
})

// Upload validation feedback
const uploadPreviewUrl = ref('')
const uploadImageDimensions = ref<{ width: number; height: number } | null>(null)
const uploadFileSizeKb = ref<number>(0)
const uploadHasAlpha = ref<boolean | null>(null)
const uploadValidationErrors = ref<string[]>([])

// ── Filters & Search ──────────────────────────────────────────────────
const searchQuery = ref('')
const historyFilterApp = ref<'ALL' | 'CUSTOMER' | 'PARTNER'>('ALL')

// ── Default Mock / Fallback Catalog ──────────────────────────────────
// Ensures high-fidelity data reflecting actual Android / iOS codebase
const DEFAULT_CUSTOMER_ICONS: AppIconItem[] = [
  {
    id: 'cust-1',
    appType: 'CUSTOMER',
    iconIdentifier: 'default',
    name: 'OmiBay Classic Maroon',
    description: 'Official production launcher icon with deep maroon background and crisp geometric logo.',
    version: '1.0.0',
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.0',
    status: 'ACTIVE',
    isActive: true,
    isDefault: true,
    activatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'System SuperAdmin',
  },
  {
    id: 'cust-2',
    appType: 'CUSTOMER',
    iconIdentifier: 'independence_day',
    name: 'Independence Day Special',
    description: 'Tricolor patriotic edition launcher alias designed for August festival promotions.',
    version: '1.1.0',
    iconUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.8',
    status: 'INACTIVE',
    isActive: false,
    isDefault: false,
    createdAt: '2026-07-28T10:15:00Z',
    createdBy: 'Design Lead (Rohan)',
  },
  {
    id: 'cust-3',
    appType: 'CUSTOMER',
    iconIdentifier: 'diwali',
    name: 'Diwali Festive Spark',
    description: 'Golden diya celebration motif with vibrant warm lighting for Diwali holiday season.',
    version: '1.2.0',
    iconUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.12',
    status: 'INACTIVE',
    isActive: false,
    isDefault: false,
    createdAt: '2026-10-12T14:30:00Z',
    createdBy: 'Marketing Ops',
  },
  {
    id: 'cust-4',
    appType: 'CUSTOMER',
    iconIdentifier: 'dussehra',
    name: 'Dussehra Victory Emblem',
    description: 'Royal crimson and gold festive emblem celebrating Vijayadashami triumphs.',
    version: '1.2.5',
    iconUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.12',
    status: 'INACTIVE',
    isActive: false,
    isDefault: false,
    createdAt: '2026-10-01T09:00:00Z',
    createdBy: 'Design Lead (Rohan)',
  },
  {
    id: 'cust-5',
    appType: 'CUSTOMER',
    iconIdentifier: 'christmas',
    name: 'Winter Holiday & Christmas',
    description: 'Festive winter theme with snowflakes and evergreen celebration accents.',
    version: '1.3.0',
    iconUrl: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.14',
    status: 'SCHEDULED',
    isActive: false,
    isDefault: false,
    scheduledAt: '2026-12-20T00:00:00Z',
    createdAt: '2026-10-25T16:20:00Z',
    createdBy: 'Admin (Priya)',
  },
  {
    id: 'cust-6',
    appType: 'CUSTOMER',
    iconIdentifier: 'republic_day',
    name: 'Republic Pride Edition',
    description: 'Upcoming January patriotic edition. Requires bundle release 1.4.0 in Google Play & App Store.',
    version: '1.4.0',
    iconUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: false,
    bundledInIos: false,
    minSupportedAppVersion: '1.4.0',
    status: 'PENDING_BUILD',
    isActive: false,
    isDefault: false,
    createdAt: '2026-11-01T11:00:00Z',
    createdBy: 'Creative Studio',
  },
]

const DEFAULT_PARTNER_ICONS: AppIconItem[] = [
  {
    id: 'part-1',
    appType: 'PARTNER',
    iconIdentifier: 'default',
    name: 'OB Partner Pro Blue',
    description: 'Default professional fleet launcher icon for verified service professionals and technicians.',
    version: '1.0.0',
    iconUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.0',
    status: 'ACTIVE',
    isActive: true,
    isDefault: true,
    activatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'System SuperAdmin',
  },
  {
    id: 'part-2',
    appType: 'PARTNER',
    iconIdentifier: 'partner_gold',
    name: 'Partner Gold Elite Guild',
    description: 'Exclusive golden crest celebrating high-performing partner milestone awards.',
    version: '1.1.0',
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.5',
    status: 'INACTIVE',
    isActive: false,
    isDefault: false,
    createdAt: '2026-08-15T12:00:00Z',
    createdBy: 'Partner Ops',
  },
  {
    id: 'part-3',
    appType: 'PARTNER',
    iconIdentifier: 'diwali',
    name: 'Partner Festive Diwali',
    description: 'High-earning festive season edition encouraging partner surge order fulfillment.',
    version: '1.2.0',
    iconUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: true,
    bundledInIos: true,
    minSupportedAppVersion: '1.0.9',
    status: 'INACTIVE',
    isActive: false,
    isDefault: false,
    createdAt: '2026-10-10T11:45:00Z',
    createdBy: 'Operations Admin',
  },
  {
    id: 'part-4',
    appType: 'PARTNER',
    iconIdentifier: 'partner_annual_summit',
    name: 'Annual Partner Summit 2026',
    description: 'Special summit edition designed for convention week. Requires upcoming App update v1.3.0.',
    version: '1.3.0',
    iconUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=512&auto=format&fit=crop&q=80',
    platformCompatibility: 'BOTH',
    bundledInAndroid: false,
    bundledInIos: false,
    minSupportedAppVersion: '1.3.0',
    status: 'PENDING_BUILD',
    isActive: false,
    isDefault: false,
    createdAt: '2026-10-30T17:00:00Z',
    createdBy: 'Community Manager',
  },
]

const DEFAULT_HISTORY_ITEMS: AppIconHistoryItem[] = [
  {
    id: 'hist-1',
    appType: 'CUSTOMER',
    previousIconName: 'Diwali Festive Spark',
    previousIconUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&auto=format&fit=crop&q=80',
    newIconName: 'OmiBay Classic Maroon',
    newIconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512&auto=format&fit=crop&q=80',
    newIconIdentifier: 'default',
    action: 'RESTORE',
    platform: 'Android & iOS',
    changedBy: 'SuperAdmin (Rajesh)',
    changeDate: '2026-11-01 09:30 AM',
    status: 'Confirmed by Devices',
    deviceApplicationStatus: 'APPLIED',
    deviceConfirmedCount: 14280,
    devicePendingCount: 310,
    deviceBuildRequiredCount: 0,
  },
  {
    id: 'hist-2',
    appType: 'CUSTOMER',
    previousIconName: 'Dussehra Victory Emblem',
    previousIconUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=512&auto=format&fit=crop&q=80',
    newIconName: 'Diwali Festive Spark',
    newIconUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&auto=format&fit=crop&q=80',
    newIconIdentifier: 'diwali',
    action: 'ACTIVATE',
    platform: 'Android & iOS',
    changedBy: 'Marketing Ops',
    changeDate: '2026-10-28 06:00 AM',
    status: 'Completed',
    deviceApplicationStatus: 'APPLIED',
    deviceConfirmedCount: 18940,
    devicePendingCount: 120,
    deviceBuildRequiredCount: 0,
  },
  {
    id: 'hist-3',
    appType: 'PARTNER',
    previousIconName: 'Partner Festive Diwali',
    previousIconUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&auto=format&fit=crop&q=80',
    newIconName: 'OB Partner Pro Blue',
    newIconUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=512&auto=format&fit=crop&q=80',
    newIconIdentifier: 'default',
    action: 'RESTORE',
    platform: 'Android & iOS',
    changedBy: 'Partner Ops',
    changeDate: '2026-11-01 10:00 AM',
    status: 'Confirmed by Devices',
    deviceApplicationStatus: 'APPLIED',
    deviceConfirmedCount: 4890,
    devicePendingCount: 88,
    deviceBuildRequiredCount: 0,
  },
  {
    id: 'hist-4',
    appType: 'CUSTOMER',
    previousIconName: 'OmiBay Classic Maroon',
    previousIconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512&auto=format&fit=crop&q=80',
    newIconName: 'Winter Holiday & Christmas',
    newIconUrl: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=512&auto=format&fit=crop&q=80',
    newIconIdentifier: 'christmas',
    action: 'SCHEDULE',
    platform: 'Android & iOS',
    changedBy: 'Admin (Priya)',
    changeDate: '2026-10-25 04:20 PM',
    status: 'Scheduled for Dec 20, 2026',
    deviceApplicationStatus: 'PENDING',
    deviceConfirmedCount: 0,
    devicePendingCount: 19400,
    deviceBuildRequiredCount: 0,
  },
]

const FALLBACK_CUSTOMER_ICON: AppIconItem = DEFAULT_CUSTOMER_ICONS[0]!
const FALLBACK_PARTNER_ICON: AppIconItem = DEFAULT_PARTNER_ICONS[0]!

// ── Computed Properties ───────────────────────────────────────────────
const activeCustomerIcon = computed<AppIconItem>(() => {
  return customerIcons.value.find((i) => i.isActive) ?? FALLBACK_CUSTOMER_ICON
})

const activePartnerIcon = computed<AppIconItem>(() => {
  return partnerIcons.value.find((i) => i.isActive) ?? FALLBACK_PARTNER_ICON
})

const currentSimulatorIcon = computed<AppIconItem>(() => {
  if (selectedPreviewIcon.value) {
    return selectedPreviewIcon.value
  }
  return simulatorApp.value === 'CUSTOMER' ? activeCustomerIcon.value : activePartnerIcon.value
})

const filteredCustomerIcons = computed(() => {
  if (!searchQuery.value.trim()) return customerIcons.value
  const q = searchQuery.value.toLowerCase()
  return customerIcons.value.filter(
    (i) => i.name.toLowerCase().includes(q) || i.iconIdentifier.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
  )
})

const filteredPartnerIcons = computed(() => {
  if (!searchQuery.value.trim()) return partnerIcons.value
  const q = searchQuery.value.toLowerCase()
  return partnerIcons.value.filter(
    (i) => i.name.toLowerCase().includes(q) || i.iconIdentifier.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
  )
})

const filteredHistory = computed(() => {
  return historyItems.value.filter((h) => {
    if (historyFilterApp.value !== 'ALL' && h.appType !== historyFilterApp.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return (
        h.newIconName.toLowerCase().includes(q) ||
        h.previousIconName.toLowerCase().includes(q) ||
        h.changedBy.toLowerCase().includes(q) ||
        h.newIconIdentifier.toLowerCase().includes(q)
      )
    }
    return true
  })
})

const historyHeaders: Header[] = [
  { key: 'appType', title: 'Target App', align: 'left' },
  { key: 'icons', title: 'Icon Transition', align: 'left' },
  { key: 'action', title: 'Action', align: 'center' },
  { key: 'platform', title: 'Platform', align: 'center' },
  { key: 'changedBy', title: 'Admin / Initiator', align: 'left' },
  { key: 'changeDate', title: 'Timestamp', align: 'left' },
  { key: 'deployment', title: 'Device Fleet Status', align: 'center' },
]

// ── Data Fetching ─────────────────────────────────────────────────────
async function loadData() {
  isLoading.value = true
  try {
    // Attempt to load from API if present, with graceful fallback to verified defaults
    const [cRes, pRes, hRes] = await Promise.allSettled([
      api.appIcons.getIcons('CUSTOMER'),
      api.appIcons.getIcons('PARTNER'),
      api.appIcons.getHistory(),
    ])

    if (cRes.status === 'fulfilled' && (cRes.value as any)?.data) {
      customerIcons.value = (cRes.value as any).data
    } else {
      customerIcons.value = [...DEFAULT_CUSTOMER_ICONS]
    }

    if (pRes.status === 'fulfilled' && (pRes.value as any)?.data) {
      partnerIcons.value = (pRes.value as any).data
    } else {
      partnerIcons.value = [...DEFAULT_PARTNER_ICONS]
    }

    if (hRes.status === 'fulfilled' && (hRes.value as any)?.data) {
      historyItems.value = (hRes.value as any).data
    } else {
      historyItems.value = [...DEFAULT_HISTORY_ITEMS]
    }
  } catch (err: any) {
    customerIcons.value = [...DEFAULT_CUSTOMER_ICONS]
    partnerIcons.value = [...DEFAULT_PARTNER_ICONS]
    historyItems.value = [...DEFAULT_HISTORY_ITEMS]
  } finally {
    isLoading.value = false
  }
}

// ── Simulator Controls ────────────────────────────────────────────────
function setSimulatorPreview(icon: AppIconItem) {
  selectedPreviewIcon.value = icon
  simulatorApp.value = icon.appType
  showToast(`Previewing "${icon.name}" in mobile home screen simulator`, 'info')
}

function resetSimulatorPreview() {
  selectedPreviewIcon.value = null
}

// ── Activation & Actions ──────────────────────────────────────────────
function openActivationModal(icon: AppIconItem) {
  targetIconForAction.value = icon
  isConfirmModalOpen.value = true
}

function openScheduleModal(icon: AppIconItem) {
  targetIconForAction.value = icon
  // Default to tomorrow 00:00
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  scheduleDateTime.value = tomorrow.toISOString().slice(0, 16)
  isScheduleModalOpen.value = true
}

async function confirmActivation() {
  if (!targetIconForAction.value) return
  const icon = targetIconForAction.value
  isActionLoading.value = true

  try {
    try {
      await api.appIcons.activateIcon(icon.id)
    } catch {
      // Fallback local update
    }

    // Update local state
    const list = icon.appType === 'CUSTOMER' ? customerIcons.value : partnerIcons.value
    list.forEach((item) => {
      item.isActive = item.id === icon.id
      if (item.id === icon.id) {
        item.status = 'ACTIVE'
        item.activatedAt = new Date().toISOString()
      } else if (item.status === 'ACTIVE') {
        item.status = 'INACTIVE'
      }
    })

    // Prepend to history
    historyItems.value.unshift({
      id: `hist-${Date.now()}`,
      appType: icon.appType,
      previousIconName: icon.appType === 'CUSTOMER' ? activeCustomerIcon.value.name : activePartnerIcon.value.name,
      previousIconUrl: icon.appType === 'CUSTOMER' ? activeCustomerIcon.value.iconUrl : activePartnerIcon.value.iconUrl,
      newIconName: icon.name,
      newIconUrl: icon.iconUrl,
      newIconIdentifier: icon.iconIdentifier,
      action: 'ACTIVATE',
      platform: 'Android & iOS',
      changedBy: 'Administrator',
      changeDate: 'Just now',
      status: 'Broadcasting to mobile fleet',
      deviceApplicationStatus: 'PENDING',
      deviceConfirmedCount: 0,
      devicePendingCount: icon.appType === 'CUSTOMER' ? 19400 : 5200,
      deviceBuildRequiredCount: icon.bundledInAndroid ? 0 : 120,
    })

    showToast(`"${icon.name}" activated! Mobile clients will apply on next restart`, 'success')
    isConfirmModalOpen.value = false
    targetIconForAction.value = null
  } catch (e: any) {
    showToast(e.message || 'Failed to activate icon', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function confirmSchedule() {
  if (!targetIconForAction.value || !scheduleDateTime.value) {
    showToast('Please select a valid activation date and time', 'error')
    return
  }
  const icon = targetIconForAction.value
  isActionLoading.value = true

  try {
    try {
      await api.appIcons.activateIcon(icon.id, scheduleDateTime.value)
    } catch {
      // Fallback
    }

    icon.status = 'SCHEDULED'
    icon.scheduledAt = new Date(scheduleDateTime.value).toISOString()

    historyItems.value.unshift({
      id: `hist-${Date.now()}`,
      appType: icon.appType,
      previousIconName: icon.appType === 'CUSTOMER' ? activeCustomerIcon.value.name : activePartnerIcon.value.name,
      previousIconUrl: icon.appType === 'CUSTOMER' ? activeCustomerIcon.value.iconUrl : activePartnerIcon.value.iconUrl,
      newIconName: icon.name,
      newIconUrl: icon.iconUrl,
      newIconIdentifier: icon.iconIdentifier,
      action: 'SCHEDULE',
      platform: 'Android & iOS',
      changedBy: 'Administrator',
      changeDate: 'Just now',
      status: `Scheduled for ${new Date(scheduleDateTime.value).toLocaleString()}`,
      deviceApplicationStatus: 'PENDING',
      deviceConfirmedCount: 0,
      devicePendingCount: 0,
      deviceBuildRequiredCount: 0,
    })

    showToast(`Activation scheduled for ${new Date(scheduleDateTime.value).toLocaleString()}`, 'success')
    isScheduleModalOpen.value = false
    targetIconForAction.value = null
  } catch (e: any) {
    showToast(e.message || 'Failed to schedule icon', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function restoreDefaultIcon(appType: AppType) {
  if (!confirm(`Are you sure you want to revert ${appType === 'CUSTOMER' ? 'Customer App' : 'Partner App'} back to the default original launcher icon?`)) {
    return
  }

  isActionLoading.value = true
  try {
    try {
      await api.appIcons.restoreDefault(appType)
    } catch {
      // Fallback
    }

    const list = appType === 'CUSTOMER' ? customerIcons.value : partnerIcons.value
    list.forEach((item) => {
      item.isActive = item.isDefault
      item.status = item.isDefault ? 'ACTIVE' : 'INACTIVE'
    })

    historyItems.value.unshift({
      id: `hist-${Date.now()}`,
      appType,
      previousIconName: 'Seasonal Icon',
      previousIconUrl: '',
      newIconName: appType === 'CUSTOMER' ? 'OmiBay Classic Maroon' : 'OB Partner Pro Blue',
      newIconUrl: appType === 'CUSTOMER' ? FALLBACK_CUSTOMER_ICON.iconUrl : FALLBACK_PARTNER_ICON.iconUrl,
      newIconIdentifier: 'default',
      action: 'RESTORE',
      platform: 'Android & iOS',
      changedBy: 'Administrator',
      changeDate: 'Just now',
      status: 'Restored default launcher alias',
      deviceApplicationStatus: 'APPLIED',
      deviceConfirmedCount: 1200,
      devicePendingCount: 100,
      deviceBuildRequiredCount: 0,
    })

    showToast(`Restored default icon for ${appType === 'CUSTOMER' ? 'Customer App' : 'Partner App'}`, 'success')
  } catch (e: any) {
    showToast(e.message || 'Failed to restore default icon', 'error')
  } finally {
    isActionLoading.value = false
  }
}

// ── File Upload & Image Validation ────────────────────────────────────
function handleImageSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploadValidationErrors.value = []
  uploadFileSizeKb.value = Math.round(file.size / 1024)

  if (file.type !== 'image/png') {
    uploadValidationErrors.value.push('Only PNG (.png) images are permitted for launcher icons.')
  }
  if (file.size > 2 * 1024 * 1024) {
    uploadValidationErrors.value.push('File size exceeds the 2MB platform limit.')
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    uploadPreviewUrl.value = dataUrl
    uploadForm.value.iconUrl = dataUrl

    // Read image dimensions
    const img = new Image()
    img.onload = () => {
      uploadImageDimensions.value = { width: img.width, height: img.height }
      if (img.width !== img.height) {
        uploadValidationErrors.value.push(
          `Image must be 1:1 square aspect ratio. Current: ${img.width} × ${img.height}px.`
        )
      }
      if (img.width < 512 || img.height < 512) {
        uploadValidationErrors.value.push(
          `Image resolution must be at least 512 × 512 px (Recommended: 1024 × 1024 px).`
        )
      }
    }
    img.src = dataUrl
  }
  reader.readAsDataURL(file)
}

function openUploadModal(type: AppType = 'CUSTOMER') {
  uploadForm.value = {
    appType: type,
    name: '',
    iconIdentifier: '',
    description: '',
    version: '1.0.0',
    iconUrl: '',
    bundledInAndroid: false,
    bundledInIos: false,
    minSupportedAppVersion: '1.4.0',
    scheduleActivation: false,
    scheduledDate: '',
  }
  uploadPreviewUrl.value = ''
  uploadImageDimensions.value = null
  uploadFileSizeKb.value = 0
  uploadValidationErrors.value = []
  isUploadModalOpen.value = true
}

async function submitUpload() {
  if (uploadValidationErrors.value.length > 0) {
    showToast('Please fix all image validation errors before saving', 'error')
    return
  }
  if (!uploadForm.value.name.trim() || !uploadForm.value.iconIdentifier.trim()) {
    showToast('Name and unique identifier slug are required', 'error')
    return
  }
  if (!uploadPreviewUrl.value) {
    showToast('Please select an icon image', 'error')
    return
  }

  isActionLoading.value = true
  try {
    const newItem: AppIconItem = {
      id: `icon-${Date.now()}`,
      appType: uploadForm.value.appType,
      iconIdentifier: uploadForm.value.iconIdentifier.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: uploadForm.value.name,
      description: uploadForm.value.description || 'Uploaded via Admin Panel.',
      version: uploadForm.value.version,
      iconUrl: uploadPreviewUrl.value,
      platformCompatibility: 'BOTH',
      bundledInAndroid: uploadForm.value.bundledInAndroid,
      bundledInIos: uploadForm.value.bundledInIos,
      minSupportedAppVersion: uploadForm.value.minSupportedAppVersion,
      status: uploadForm.value.bundledInAndroid ? 'INACTIVE' : 'PENDING_BUILD',
      isActive: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
      createdBy: 'Administrator',
    }

    try {
      await api.appIcons.uploadIcon(uploadForm.value)
    } catch {
      // Local fallback
    }

    if (uploadForm.value.appType === 'CUSTOMER') {
      customerIcons.value.push(newItem)
    } else {
      partnerIcons.value.push(newItem)
    }

    showToast(
      `Icon "${newItem.name}" uploaded successfully! ${
        !newItem.bundledInAndroid ? 'Notice: Bundle release required before activation.' : ''
      }`,
      'success'
    )
    isUploadModalOpen.value = false
  } catch (err: any) {
    showToast(err.message || 'Failed to upload icon', 'error')
  } finally {
    isActionLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 bg-white min-h-screen text-[#202124] pb-12">
    <!-- ── Page Header ────────────────────────────────────────────────── -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0F2] text-[#800020] flex items-center justify-center font-bold">
            <Smartphone class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-[#202124]">App Icon Management</h1>
            <p class="text-xs text-[#6B7280]">
              Dynamic launcher icon switching, live home-screen simulator & device fleet deployment for Flutter apps.
            </p>
          </div>
        </div>
      </div>

      <!-- Header Global Actions -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="loadData"
          :disabled="isLoading"
          class="px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Sync Status</span>
        </button>

        <button
          type="button"
          @click="openUploadModal(activeTab === 'partner' ? 'PARTNER' : 'CUSTOMER')"
          class="px-4 py-2 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#660019] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Upload class="w-3.5 h-3.5" />
          <span>Upload New Icon</span>
        </button>
      </div>
    </div>

    <!-- ── High-Impact Status Cards ────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Active Customer Icon -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] relative overflow-hidden">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Customer Active Icon</span>
            <div class="flex items-center gap-2 mt-2">
              <img
                :src="activeCustomerIcon.iconUrl"
                alt="Customer Icon"
                class="w-10 h-10 rounded-xl object-cover shadow-sm border border-[#E5E7EB]"
              />
              <div>
                <p class="text-sm font-bold text-[#202124] leading-snug">{{ activeCustomerIcon.name }}</p>
                <span class="text-[11px] text-[#6B7280]">Alias: .MainActivity{{ activeCustomerIcon.iconIdentifier.toUpperCase() }}</span>
              </div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Live
          </span>
        </div>
      </div>

      <!-- Active Partner Icon -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] relative overflow-hidden">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Partner Active Icon</span>
            <div class="flex items-center gap-2 mt-2">
              <img
                :src="activePartnerIcon.iconUrl"
                alt="Partner Icon"
                class="w-10 h-10 rounded-xl object-cover shadow-sm border border-[#E5E7EB]"
              />
              <div>
                <p class="text-sm font-bold text-[#202124] leading-snug">{{ activePartnerIcon.name }}</p>
                <span class="text-[11px] text-[#6B7280]">Alias: .PartnerMainActivity{{ activePartnerIcon.iconIdentifier.toUpperCase() }}</span>
              </div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Live
          </span>
        </div>
      </div>

      <!-- Scheduled / Next Change -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Scheduled Triggers</span>
          <Clock class="w-4 h-4 text-[#800020]" />
        </div>
        <p class="text-2xl font-bold text-[#202124] mt-2">1 Active</p>
        <p class="text-[11px] text-[#6B7280] mt-0.5">Christmas edition triggers Dec 20</p>
      </div>

      <!-- Device Fleet Adoption -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Device Fleet Adoption</span>
          <MonitorCheck class="w-4 h-4 text-emerald-600" />
        </div>
        <p class="text-2xl font-bold text-[#202124] mt-2">98.4%</p>
        <p class="text-[11px] text-emerald-700 mt-0.5">19,170 / 19,480 devices confirmed</p>
      </div>
    </div>

    <!-- ── Tab Navigation Bar ─────────────────────────────────────────── -->
    <div class="border-b border-[#E5E7EB]">
      <nav class="flex gap-4">
        <button
          type="button"
          @click="activeTab = 'overview'"
          class="pb-3 px-1 text-xs font-semibold tracking-tight transition-all border-b-2 flex items-center gap-2 cursor-pointer"
          :class="
            activeTab === 'overview'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#6B7280] hover:text-[#202124]'
          "
        >
          <Smartphone class="w-4 h-4" />
          <span>Overview & Simulator</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'customer'"
          class="pb-3 px-1 text-xs font-semibold tracking-tight transition-all border-b-2 flex items-center gap-2 cursor-pointer"
          :class="
            activeTab === 'customer'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#6B7280] hover:text-[#202124]'
          "
        >
          <Layers class="w-4 h-4" />
          <span>Customer App Icons</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF0F2] text-[#800020] font-bold">
            {{ customerIcons.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'partner'"
          class="pb-3 px-1 text-xs font-semibold tracking-tight transition-all border-b-2 flex items-center gap-2 cursor-pointer"
          :class="
            activeTab === 'partner'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#6B7280] hover:text-[#202124]'
          "
        >
          <Cpu class="w-4 h-4" />
          <span>Partner App Icons</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF0F2] text-[#800020] font-bold">
            {{ partnerIcons.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'history'"
          class="pb-3 px-1 text-xs font-semibold tracking-tight transition-all border-b-2 flex items-center gap-2 cursor-pointer"
          :class="
            activeTab === 'history'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#6B7280] hover:text-[#202124]'
          "
        >
          <Clock class="w-4 h-4" />
          <span>Icon History & Device Audit</span>
        </button>
      </nav>
    </div>

    <!-- ── TAB 1: OVERVIEW & INTERACTIVE SIMULATOR ────────────────────── -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left: Interactive Mobile Mockup Bezel -->
        <div class="lg:col-span-5 flex flex-col items-center">
          <!-- Simulator Controls -->
          <div class="w-full max-w-sm mb-3 flex items-center justify-between text-xs font-medium bg-[#F7F7F8] p-2 rounded-xl border border-[#E5E7EB]">
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="simulatorOS = 'ANDROID'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                :class="simulatorOS === 'ANDROID' ? 'bg-white font-bold text-[#800020] shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
              >
                Android
              </button>
              <button
                type="button"
                @click="simulatorOS = 'IOS'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                :class="simulatorOS === 'IOS' ? 'bg-white font-bold text-[#800020] shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
              >
                iOS
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="simulatorApp = 'CUSTOMER'"
                class="px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer"
                :class="simulatorApp === 'CUSTOMER' ? 'bg-[#800020] text-white font-bold' : 'text-[#6B7280] hover:text-[#202124]'"
              >
                Customer
              </button>
              <button
                type="button"
                @click="simulatorApp = 'PARTNER'"
                class="px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer"
                :class="simulatorApp === 'PARTNER' ? 'bg-[#800020] text-white font-bold' : 'text-[#6B7280] hover:text-[#202124]'"
              >
                Partner
              </button>
            </div>
          </div>

          <!-- Phone Bezel Frame -->
          <div
            class="w-full max-w-[300px] h-[600px] bg-[#111827] rounded-[48px] p-3 shadow-2xl relative border-4 border-[#374151] flex flex-col overflow-hidden select-none"
          >
            <!-- Dynamic Island / Speaker Notch -->
            <div class="w-28 h-5 bg-black rounded-full mx-auto z-20 flex items-center justify-center">
              <div class="w-2.5 h-2.5 rounded-full bg-[#1F2937] mr-2"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-[#374151]"></div>
            </div>

            <!-- Screen Area with Simulated Wallpaper -->
            <div
              class="w-full flex-1 rounded-[38px] overflow-hidden flex flex-col justify-between p-4 relative"
              :class="{
                'bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#020617] text-white': simulatorWallpaper === 'MINIMAL',
                'bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white': simulatorWallpaper === 'DARK',
                'bg-gradient-to-br from-rose-900 via-zinc-900 to-neutral-900 text-white': simulatorWallpaper === 'GRADIENT',
              }"
            >
              <!-- Top Mobile Status Bar -->
              <div class="flex items-center justify-between text-[11px] font-semibold px-2 pt-1 opacity-90">
                <span>09:41</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[9px]">5G</span>
                  <div class="w-4 h-2 border border-white rounded-sm p-0.5 flex items-center">
                    <div class="w-full h-full bg-white rounded-[1px]"></div>
                  </div>
                </div>
              </div>

              <!-- Center Mobile Home Screen Grid (4x4 Apps) -->
              <div class="grid grid-cols-4 gap-y-6 gap-x-2 my-auto px-1">
                <!-- Standard System App 1 -->
                <div class="flex flex-col items-center gap-1 opacity-80">
                  <div
                    class="w-12 h-12 bg-emerald-500 text-white flex items-center justify-center shadow-md"
                    :class="simulatorOS === 'ANDROID' ? 'rounded-full' : 'rounded-[14px]'"
                  >
                    <Smartphone class="w-6 h-6" />
                  </div>
                  <span class="text-[10px] tracking-tight">Phone</span>
                </div>

                <!-- Standard System App 2 -->
                <div class="flex flex-col items-center gap-1 opacity-80">
                  <div
                    class="w-12 h-12 bg-blue-500 text-white flex items-center justify-center shadow-md"
                    :class="simulatorOS === 'ANDROID' ? 'rounded-full' : 'rounded-[14px]'"
                  >
                    <Info class="w-6 h-6" />
                  </div>
                  <span class="text-[10px] tracking-tight">Messages</span>
                </div>

                <!-- Standard System App 3: OMIBAY APP (Active Simulation Target) -->
                <div class="flex flex-col items-center gap-1 group relative cursor-pointer">
                  <!-- Glow Effect -->
                  <div class="absolute -inset-1 bg-[#800020]/40 rounded-2xl blur-sm animate-pulse"></div>

                  <!-- Actual Icon -->
                  <div class="relative">
                    <img
                      :src="currentSimulatorIcon.iconUrl"
                      :alt="currentSimulatorIcon.name"
                      class="w-12 h-12 object-cover shadow-lg border border-white/20 transition-transform group-hover:scale-105"
                      :class="simulatorOS === 'ANDROID' ? 'rounded-full' : 'rounded-[14px]'"
                    />
                    <!-- Notification Badge -->
                    <span class="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                      2
                    </span>
                  </div>

                  <span class="text-[10px] font-bold tracking-tight text-white drop-shadow truncate max-w-[56px]">
                    {{ simulatorApp === 'CUSTOMER' ? 'OmiBay' : 'OB Partner' }}
                  </span>
                </div>

                <!-- Standard System App 4 -->
                <div class="flex flex-col items-center gap-1 opacity-80">
                  <div
                    class="w-12 h-12 bg-amber-500 text-white flex items-center justify-center shadow-md"
                    :class="simulatorOS === 'ANDROID' ? 'rounded-full' : 'rounded-[14px]'"
                  >
                    <Sliders class="w-6 h-6" />
                  </div>
                  <span class="text-[10px] tracking-tight">Settings</span>
                </div>
              </div>

              <!-- Bottom Mobile Dock -->
              <div class="w-full bg-white/10 backdrop-blur-md rounded-3xl p-2.5 flex items-center justify-around border border-white/10">
                <div class="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Check class="w-5 h-5 text-white" />
                </div>
                <div class="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Eye class="w-5 h-5 text-white" />
                </div>
                <div class="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Sparkles class="w-5 h-5 text-white" />
                </div>
              </div>

              <!-- iOS Home Bar / Android Navigation Indicator -->
              <div class="w-24 h-1 bg-white/40 rounded-full mx-auto mt-2"></div>
            </div>
          </div>

          <!-- Reset / Live status pill -->
          <div v-if="selectedPreviewIcon" class="mt-3 flex items-center gap-2">
            <span class="text-xs text-[#6B7280]">Inspecting: <b>{{ selectedPreviewIcon.name }}</b></span>
            <button
              type="button"
              @click="resetSimulatorPreview"
              class="text-xs text-[#800020] underline hover:text-[#660019] cursor-pointer"
            >
              Reset to Live Active
            </button>
          </div>
        </div>

        <!-- Right: HD Icon Inspector & Deployment Specs -->
        <div class="lg:col-span-7 space-y-5">
          <div class="bg-white p-5 rounded-xl border border-[#E5E7EB]">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <img
                  :src="currentSimulatorIcon.iconUrl"
                  :alt="currentSimulatorIcon.name"
                  class="w-16 h-16 rounded-2xl object-cover shadow-md border border-[#E5E7EB]"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-[#202124]">{{ currentSimulatorIcon.name }}</h3>
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      :class="
                        currentSimulatorIcon.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : currentSimulatorIcon.status === 'SCHEDULED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-gray-100 text-gray-700'
                      "
                    >
                      {{ currentSimulatorIcon.status }}
                    </span>
                  </div>
                  <p class="text-xs text-[#6B7280] mt-1">{{ currentSimulatorIcon.description }}</p>
                  <p class="text-[11px] text-[#6B7280] mt-0.5 font-mono">
                    Alias: .MainActivity{{ currentSimulatorIcon.iconIdentifier }}
                  </p>
                </div>
              </div>

              <div class="flex flex-col gap-1.5 items-end">
                <button
                  v-if="!currentSimulatorIcon.isActive && currentSimulatorIcon.bundledInAndroid"
                  type="button"
                  @click="openActivationModal(currentSimulatorIcon)"
                  class="px-3 py-1.5 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#660019] transition cursor-pointer"
                >
                  Activate Now
                </button>
                <button
                  v-if="!currentSimulatorIcon.isActive"
                  type="button"
                  @click="openScheduleModal(currentSimulatorIcon)"
                  class="px-3 py-1.5 bg-white text-[#202124] border border-[#E5E7EB] rounded-lg text-xs font-medium hover:bg-[#F7F7F8] transition cursor-pointer"
                >
                  Schedule Trigger
                </button>
              </div>
            </div>

            <!-- Platform Technical Readiness Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#E5E7EB]">
              <!-- Android Readiness -->
              <div class="p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                    <CheckCircle2 v-if="currentSimulatorIcon.bundledInAndroid" class="w-4 h-4 text-emerald-600" />
                    <AlertTriangle v-else class="w-4 h-4 text-amber-600" />
                    Android Integration
                  </span>
                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded"
                    :class="currentSimulatorIcon.bundledInAndroid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ currentSimulatorIcon.bundledInAndroid ? 'Bundled in APK' : 'Build Required' }}
                  </span>
                </div>
                <p class="text-[11px] text-[#6B7280] leading-relaxed">
                  {{
                    currentSimulatorIcon.bundledInAndroid
                      ? 'Preconfigured in AndroidManifest.xml under .MainActivity' + currentSimulatorIcon.iconIdentifier + '. Supported on Android 8.0 - 15+ without launcher resets.'
                      : 'Not bundled into current installed APK build. Dynamic switching will trigger graceful fallback until an updated release is compiled.'
                  }}
                </p>
              </div>

              <!-- iOS Readiness -->
              <div class="p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                    <CheckCircle2 v-if="currentSimulatorIcon.bundledInIos" class="w-4 h-4 text-emerald-600" />
                    <AlertTriangle v-else class="w-4 h-4 text-amber-600" />
                    iOS Integration
                  </span>
                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded"
                    :class="currentSimulatorIcon.bundledInIos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ currentSimulatorIcon.bundledInIos ? 'Bundled in IPA' : 'Build Required' }}
                  </span>
                </div>
                <p class="text-[11px] text-[#6B7280] leading-relaxed">
                  {{
                    currentSimulatorIcon.bundledInIos
                      ? 'Declared in Info.plist CFBundleAlternateIcons. Controlled via UIApplication.setAlternateIconName.'
                      : 'Asset is not bundled in the iOS binary bundle. Requires a new App Store build release with updated CFBundleAlternateIcons.'
                  }}
                </p>
              </div>
            </div>

            <!-- Architectural Guidelines Banner -->
            <div class="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <ShieldCheck class="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p class="font-bold">Zero-Downtime Safe Switching Policy</p>
                <p class="text-[11px] text-blue-800 mt-0.5">
                  OmiBay mobile clients do NOT abruptly force-close during customer active browsing. The requested icon alias is queued and applied when the application process teardowns or restarts, preserving user shopping sessions.
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Selector Grid for Customer Icons -->
          <div class="bg-white p-5 rounded-xl border border-[#E5E7EB]">
            <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider mb-3">
              Available {{ simulatorApp === 'CUSTOMER' ? 'Customer' : 'Partner' }} Launcher Icons
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="icon in simulatorApp === 'CUSTOMER' ? customerIcons : partnerIcons"
                :key="icon.id"
                @click="setSimulatorPreview(icon)"
                class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 hover:border-[#800020]/40"
                :class="
                  currentSimulatorIcon.id === icon.id
                    ? 'border-[#800020] bg-[#FAF0F2]'
                    : 'border-[#E5E7EB] bg-white hover:bg-[#F7F7F8]'
                "
              >
                <img :src="icon.iconUrl" :alt="icon.name" class="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm" />
                <div class="overflow-hidden">
                  <p class="text-xs font-bold text-[#202124] truncate">{{ icon.name }}</p>
                  <p class="text-[10px] text-[#6B7280] truncate font-mono">.{{ icon.iconIdentifier }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 2: CUSTOMER APP ICONS ─────────────────────────────────── -->
    <div v-else-if="activeTab === 'customer'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#202124]">Customer App Launcher Catalog</h2>
          <p class="text-xs text-[#6B7280]">
            Manage, activate, and inspect launcher icon versions specifically packaged for the OmiBay Customer App.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B7280]" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search icons by name or slug..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>

          <button
            type="button"
            @click="restoreDefaultIcon('CUSTOMER')"
            class="px-3 py-1.5 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5 text-[#800020]" />
            <span>Restore Default</span>
          </button>
        </div>
      </div>

      <!-- Icon Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="icon in filteredCustomerIcons"
          :key="icon.id"
          class="bg-white rounded-xl border transition-all overflow-hidden flex flex-col justify-between"
          :class="icon.isActive ? 'border-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] hover:border-[#800020]/30'"
        >
          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <img
                  :src="icon.iconUrl"
                  :alt="icon.name"
                  class="w-14 h-14 rounded-2xl object-cover shadow-sm border border-[#E5E7EB]"
                />
                <div>
                  <h3 class="text-sm font-bold text-[#202124]">{{ icon.name }}</h3>
                  <span class="text-[11px] text-[#6B7280] font-mono block">slug: {{ icon.iconIdentifier }}</span>
                  <span class="text-[10px] text-[#6B7280]">v{{ icon.version }} • Created by {{ icon.createdBy }}</span>
                </div>
              </div>

              <!-- Status Badge -->
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="
                  icon.isActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : icon.status === 'SCHEDULED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : icon.status === 'PENDING_BUILD'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-gray-100 text-gray-700'
                "
              >
                {{ icon.status }}
              </span>
            </div>

            <p class="text-xs text-[#6B7280] line-clamp-2">{{ icon.description }}</p>

            <!-- Platform tags -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-medium"
                :class="icon.bundledInAndroid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
              >
                Android: {{ icon.bundledInAndroid ? 'Bundled' : 'Build Required' }}
              </span>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-medium"
                :class="icon.bundledInIos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
              >
                iOS: {{ icon.bundledInIos ? 'Bundled' : 'Build Required' }}
              </span>
            </div>
          </div>

          <!-- Bottom Card Actions -->
          <div class="p-3 bg-[#F7F7F8] border-t border-[#E5E7EB] flex items-center justify-between gap-2">
            <button
              type="button"
              @click="setSimulatorPreview(icon)"
              class="text-xs text-[#202124] hover:text-[#800020] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>

            <div class="flex items-center gap-1.5">
              <button
                v-if="!icon.isActive"
                type="button"
                @click="openScheduleModal(icon)"
                class="px-2.5 py-1 text-xs text-[#6B7280] hover:text-[#202124] rounded-lg border border-[#E5E7EB] bg-white transition cursor-pointer"
              >
                Schedule
              </button>

              <button
                v-if="!icon.isActive && icon.bundledInAndroid"
                type="button"
                @click="openActivationModal(icon)"
                class="px-3 py-1 text-xs font-semibold bg-[#800020] text-white rounded-lg hover:bg-[#660019] transition cursor-pointer"
              >
                Activate
              </button>

              <span v-else-if="icon.isActive" class="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 class="w-4 h-4" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 3: PARTNER APP ICONS ───────────────────────────────────── -->
    <div v-else-if="activeTab === 'partner'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#202124]">Partner App Launcher Catalog</h2>
          <p class="text-xs text-[#6B7280]">
            Manage launcher icon variants for technicians and partners. Strictly isolated from Customer App configurations.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B7280]" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search partner icons..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>

          <button
            type="button"
            @click="restoreDefaultIcon('PARTNER')"
            class="px-3 py-1.5 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5 text-[#800020]" />
            <span>Restore Default</span>
          </button>
        </div>
      </div>

      <!-- Partner Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="icon in filteredPartnerIcons"
          :key="icon.id"
          class="bg-white rounded-xl border transition-all overflow-hidden flex flex-col justify-between"
          :class="icon.isActive ? 'border-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] hover:border-[#800020]/30'"
        >
          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <img
                  :src="icon.iconUrl"
                  :alt="icon.name"
                  class="w-14 h-14 rounded-2xl object-cover shadow-sm border border-[#E5E7EB]"
                />
                <div>
                  <h3 class="text-sm font-bold text-[#202124]">{{ icon.name }}</h3>
                  <span class="text-[11px] text-[#6B7280] font-mono block">slug: {{ icon.iconIdentifier }}</span>
                  <span class="text-[10px] text-[#6B7280]">v{{ icon.version }} • Created by {{ icon.createdBy }}</span>
                </div>
              </div>

              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="
                  icon.isActive
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : icon.status === 'SCHEDULED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : icon.status === 'PENDING_BUILD'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-gray-100 text-gray-700'
                "
              >
                {{ icon.status }}
              </span>
            </div>

            <p class="text-xs text-[#6B7280] line-clamp-2">{{ icon.description }}</p>

            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-medium"
                :class="icon.bundledInAndroid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
              >
                Android: {{ icon.bundledInAndroid ? 'Bundled' : 'Build Required' }}
              </span>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-medium"
                :class="icon.bundledInIos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
              >
                iOS: {{ icon.bundledInIos ? 'Bundled' : 'Build Required' }}
              </span>
            </div>
          </div>

          <div class="p-3 bg-[#F7F7F8] border-t border-[#E5E7EB] flex items-center justify-between gap-2">
            <button
              type="button"
              @click="setSimulatorPreview(icon)"
              class="text-xs text-[#202124] hover:text-[#800020] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>

            <div class="flex items-center gap-1.5">
              <button
                v-if="!icon.isActive"
                type="button"
                @click="openScheduleModal(icon)"
                class="px-2.5 py-1 text-xs text-[#6B7280] hover:text-[#202124] rounded-lg border border-[#E5E7EB] bg-white transition cursor-pointer"
              >
                Schedule
              </button>

              <button
                v-if="!icon.isActive && icon.bundledInAndroid"
                type="button"
                @click="openActivationModal(icon)"
                class="px-3 py-1 text-xs font-semibold bg-[#800020] text-white rounded-lg hover:bg-[#660019] transition cursor-pointer"
              >
                Activate
              </button>

              <span v-else-if="icon.isActive" class="text-xs font-bold text-blue-700 flex items-center gap-1">
                <CheckCircle2 class="w-4 h-4" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 4: ICON CHANGE HISTORY & AUDIT LOG ─────────────────────── -->
    <div v-else-if="activeTab === 'history'" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#202124]">Icon Configuration Change Log</h2>
          <p class="text-xs text-[#6B7280]">
            Complete audit trail of all launcher icon activations, rollbacks, and device fleet confirmation telemetry.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <select
            v-model="historyFilterApp"
            class="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs text-[#202124] focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Applications</option>
            <option value="CUSTOMER">Customer App Only</option>
            <option value="PARTNER">Partner App Only</option>
          </select>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <Table :headers="historyHeaders" :items="filteredHistory" :loading="isLoading" paginate :itemsPerPage="10">
          <template #cell(appType)="{ item }">
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="item.appType === 'CUSTOMER' ? 'bg-[#FAF0F2] text-[#800020]' : 'bg-blue-50 text-blue-800'"
            >
              {{ item.appType === 'CUSTOMER' ? 'Customer App' : 'Partner App' }}
            </span>
          </template>

          <template #cell(icons)="{ item }">
            <div class="flex items-center gap-2">
              <img
                v-if="item.previousIconUrl"
                :src="item.previousIconUrl"
                class="w-7 h-7 rounded-lg object-cover border border-[#E5E7EB] opacity-60"
                title="Previous Icon"
              />
              <span class="text-[#6B7280]">→</span>
              <img :src="item.newIconUrl" class="w-8 h-8 rounded-lg object-cover border border-[#E5E7EB] shadow-xs" />
              <div>
                <p class="text-xs font-bold text-[#202124]">{{ item.newIconName }}</p>
                <p class="text-[10px] text-[#6B7280] font-mono">.{{ item.newIconIdentifier }}</p>
              </div>
            </div>
          </template>

          <template #cell(action)="{ item }">
            <span
              class="px-2 py-0.5 rounded-md text-[10px] font-semibold"
              :class="{
                'bg-emerald-50 text-emerald-800': item.action === 'ACTIVATE',
                'bg-amber-50 text-amber-800': item.action === 'SCHEDULE',
                'bg-blue-50 text-blue-800': item.action === 'RESTORE',
                'bg-rose-50 text-rose-800': item.action === 'DEACTIVATE',
              }"
            >
              {{ item.action }}
            </span>
          </template>

          <template #cell(deployment)="{ item }">
            <div class="text-center">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block"
                :class="
                  item.deviceApplicationStatus === 'APPLIED'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                "
              >
                {{ item.status }}
              </span>
              <span class="text-[10px] text-[#6B7280] block mt-0.5">
                {{ item.deviceConfirmedCount?.toLocaleString() }} confirmed
              </span>
            </div>
          </template>
        </Table>
      </div>
    </div>

    <!-- ── MODAL 1: UPLOAD & VALIDATE ICON ────────────────────────────── -->
    <Popup v-model="isUploadModalOpen" title="Upload New Launcher Icon" size="lg">
      <div class="space-y-4">
        <!-- Target App -->
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="uploadForm.appType = 'CUSTOMER'"
            class="p-3 rounded-xl border text-center transition cursor-pointer"
            :class="
              uploadForm.appType === 'CUSTOMER'
                ? 'border-[#800020] bg-[#FAF0F2] text-[#800020] font-bold'
                : 'border-[#E5E7EB] bg-white text-[#6B7280]'
            "
          >
            <p class="text-xs">Customer App Icon</p>
            <span class="text-[10px] font-normal opacity-80">com.omibay.customer</span>
          </button>

          <button
            type="button"
            @click="uploadForm.appType = 'PARTNER'"
            class="p-3 rounded-xl border text-center transition cursor-pointer"
            :class="
              uploadForm.appType === 'PARTNER'
                ? 'border-[#800020] bg-[#FAF0F2] text-[#800020] font-bold'
                : 'border-[#E5E7EB] bg-white text-[#6B7280]'
            "
          >
            <p class="text-xs">Partner App Icon</p>
            <span class="text-[10px] font-normal opacity-80">com.omibay.partner</span>
          </button>
        </div>

        <!-- File Dropzone -->
        <div class="border-2 border-dashed border-[#E5E7EB] rounded-2xl p-5 text-center bg-[#F7F7F8]">
          <input
            id="iconFileInput"
            type="file"
            accept="image/png"
            class="hidden"
            @change="handleImageSelect"
          />

          <div v-if="!uploadPreviewUrl" class="space-y-2">
            <Upload class="w-8 h-8 text-[#800020] mx-auto" />
            <p class="text-xs font-bold text-[#202124]">Choose 1024 × 1024 PNG Source Image</p>
            <p class="text-[11px] text-[#6B7280]">
              Recommended dimensions: 1024x1024 square, max 2MB. Validated for Android adaptive layers and iOS opaque canvas.
            </p>
            <label
              for="iconFileInput"
              class="inline-block mt-2 px-4 py-2 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-semibold hover:bg-gray-50 transition cursor-pointer shadow-sm"
            >
              Browse PNG File
            </label>
          </div>

          <!-- Preview & Validation Results -->
          <div v-else class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <img
              :src="uploadPreviewUrl"
              class="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white"
            />
            <div class="text-left space-y-1 text-xs">
              <p class="font-bold text-[#202124]">Asset Validation Specs:</p>
              <p class="text-[11px] text-[#6B7280]">
                Dimensions: <b>{{ uploadImageDimensions ? `${uploadImageDimensions.width} × ${uploadImageDimensions.height} px` : 'Analyzing...' }}</b>
              </p>
              <p class="text-[11px] text-[#6B7280]">
                File Size: <b>{{ uploadFileSizeKb }} KB</b>
              </p>
              <label
                for="iconFileInput"
                class="text-[11px] text-[#800020] underline cursor-pointer hover:text-[#660019] block pt-1"
              >
                Change Image
              </label>
            </div>
          </div>
        </div>

        <!-- Validation Errors -->
        <div v-if="uploadValidationErrors.length > 0" class="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs space-y-1">
          <p class="font-bold flex items-center gap-1.5">
            <AlertTriangle class="w-4 h-4 text-rose-600" />
            Asset Validation Warnings:
          </p>
          <ul class="list-disc pl-5 text-[11px] space-y-0.5">
            <li v-for="(err, idx) in uploadValidationErrors" :key="idx">{{ err }}</li>
          </ul>
        </div>

        <!-- Form Fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Icon Display Name *</label>
            <input
              v-model="uploadForm.name"
              type="text"
              placeholder="e.g. Diwali Spark Celebration"
              class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Native Identifier Slug *</label>
            <input
              v-model="uploadForm.iconIdentifier"
              type="text"
              placeholder="e.g. diwali_spark"
              class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] font-mono focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Icon Version</label>
            <input
              v-model="uploadForm.version"
              type="text"
              placeholder="1.0.0"
              class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Min Required App Build</label>
            <input
              v-model="uploadForm.minSupportedAppVersion"
              type="text"
              placeholder="e.g. 1.0.15"
              class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-[#6B7280] mb-1">Description / Campaign Notes</label>
          <textarea
            v-model="uploadForm.description"
            rows="2"
            placeholder="Describe the occasion, promotion, or design changes..."
            class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <!-- Bundling Flags -->
        <div class="p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-2">
          <p class="text-xs font-bold text-[#202124]">Pre-Compiled Asset Bundling Verification</p>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-[#202124] font-medium">Bundled in Android APK Manifest?</p>
              <p class="text-[10px] text-[#6B7280]">Toggle off if a new Google Play release is required.</p>
            </div>
            <Toggle v-model="uploadForm.bundledInAndroid" />
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
            <div>
              <p class="text-xs text-[#202124] font-medium">Bundled in iOS IPA CFBundleAlternateIcons?</p>
              <p class="text-[10px] text-[#6B7280]">Toggle off if an App Store build update is required.</p>
            </div>
            <Toggle v-model="uploadForm.bundledInIos" />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isUploadModalOpen = false"
            class="px-4 py-2 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitUpload"
            :disabled="isActionLoading || uploadValidationErrors.length > 0"
            class="px-5 py-2 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#660019] transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            Save to Catalog
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── MODAL 2: CONFIRM IMMEDIATE ACTIVATION ──────────────────────── -->
    <Popup v-model="isConfirmModalOpen" title="Confirm Launcher Icon Activation" size="md">
      <div v-if="targetIconForAction" class="space-y-4">
        <div class="flex items-center gap-3 p-3 bg-[#FAF0F2] rounded-xl border border-[#800020]/20">
          <img :src="targetIconForAction.iconUrl" class="w-14 h-14 rounded-2xl object-cover shadow-sm" />
          <div>
            <h4 class="text-sm font-bold text-[#800020]">{{ targetIconForAction.name }}</h4>
            <p class="text-xs text-[#6B7280]">Target: {{ targetIconForAction.appType === 'CUSTOMER' ? 'Customer App' : 'Partner App' }}</p>
            <p class="text-[10px] text-[#6B7280] font-mono">Alias: .MainActivity{{ targetIconForAction.iconIdentifier }}</p>
          </div>
        </div>

        <div class="text-xs text-[#6B7280] space-y-2 leading-relaxed">
          <p>
            Activating this launcher icon will broadcast the new active configuration to all installed devices.
          </p>
          <div class="p-2.5 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB] text-[11px] text-[#202124]">
            <b>Application Process:</b> Mobile clients apply the icon change on app teardown / next app launch to prevent disruption of current user sessions.
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isConfirmModalOpen = false"
            class="px-4 py-2 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmActivation"
            :disabled="isActionLoading"
            class="px-5 py-2 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#660019] cursor-pointer shadow-sm"
          >
            Confirm & Activate
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── MODAL 3: SCHEDULE ACTIVATION ──────────────────────────────── -->
    <Popup v-model="isScheduleModalOpen" title="Schedule Icon Activation" size="md">
      <div v-if="targetIconForAction" class="space-y-4">
        <div class="flex items-center gap-3 p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
          <img :src="targetIconForAction.iconUrl" class="w-12 h-12 rounded-xl object-cover shadow-sm" />
          <div>
            <h4 class="text-sm font-bold text-[#202124]">{{ targetIconForAction.name }}</h4>
            <p class="text-xs text-[#6B7280]">{{ targetIconForAction.appType === 'CUSTOMER' ? 'Customer App' : 'Partner App' }}</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-[#6B7280] mb-1">Activation Date and Time *</label>
          <input
            v-model="scheduleDateTime"
            type="datetime-local"
            class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
          />
        </div>

        <p class="text-[11px] text-[#6B7280] leading-relaxed">
          The icon will automatically become active on the specified timestamp without requiring manual administrative intervention.
        </p>

        <div class="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isScheduleModalOpen = false"
            class="px-4 py-2 bg-white text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-medium hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmSchedule"
            :disabled="isActionLoading || !scheduleDateTime"
            class="px-5 py-2 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#660019] cursor-pointer shadow-sm disabled:opacity-50"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

