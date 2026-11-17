<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { Coupon, ScratchCouponPrize, City, ServiceType } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Toggle from '@/components/common/Toggle.vue'
import {
  Pen,
  Users,
  Plus,
  Ticket,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  Search,
  MapPin,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-vue-next'

// --- State ---
type MainTab = 'promos' | 'scratch'
const activeMainTab = ref<MainTab>('promos')

const coupons = ref<Coupon[]>([])
const scratchPrizes = ref<ScratchCouponPrize[]>([])
const cities = ref<City[]>([])
const serviceTypes = ref<ServiceType[]>([])
const isLoading = ref(false)
const search = ref('')
const selectedTypeFilter = ref<string>('ALL')

const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  notification.value = { type, message }
  setTimeout(() => {
    if (notification.value?.message === message) {
      notification.value = null
    }
  }, 4000)
}

// Table Headers for Promo Coupons
const promoHeaders: Header[] = [
  { key: 'code', title: 'Coupon Code & Title', align: 'left', sortable: true },
  { key: 'discount', title: 'Discount', align: 'center', sortable: true },
  { key: 'scope', title: 'Eligibility & Scope', align: 'left', sortable: false },
  { key: 'validity', title: 'Validity & Limits', align: 'left', sortable: false },
  { key: 'audience', title: 'Targeting', align: 'center', sortable: false },
  { key: 'status', title: 'Active', align: 'center', sortable: false },
  { key: 'action', title: 'Actions', align: 'center', sortable: false },
]

// Table Headers for Scratch Card Coupons
const scratchHeaders: Header[] = [
  { key: 'title', title: 'Prize Title', align: 'left', sortable: true },
  { key: 'reward', title: 'Discount Reward', align: 'center', sortable: true },
  { key: 'validity', title: 'Validity Window', align: 'center', sortable: true },
  { key: 'scope', title: 'Scope & Restrictions', align: 'left', sortable: false },
  { key: 'status', title: 'Status', align: 'center', sortable: false },
  { key: 'action', title: 'Actions', align: 'center', sortable: false },
]

// Modal visibility flags
const isCityModalOpen = ref(false)
const isCategoryModalOpen = ref(false)
const isScratchModalOpen = ref(false)
const isGeneralModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isEditScratchModalOpen = ref(false)
const isUsersModalOpen = ref(false)
const isSubmitting = ref(false)
const isCreateMenuOpen = ref(false)

// Discount kinds
type DiscountKind = 'PERCENTAGE' | 'FLAT' | 'WELCOME'

// --- 1. City Specific Form ---
const cityForm = ref({
  cityId: '',
  code: '',
  title: '',
  description: '',
  color: '#0284c7', // Sky-600
  discountKind: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  percentage: 15,
  uptoAmount: null as number | null,
  fixAmount: null as number | null,
  minOrderAmount: null as number | null,
  serviceTypeId: '',
  validFrom: '',
  validTill: '',
  maxUsagePerCustomer: null as number | null,
  totalUsageLimit: null as number | null,
  isPrivate: false,
  isActive: true,
})

// --- 2. Category Specific Form ---
const categoryForm = ref({
  serviceTypeId: '',
  code: '',
  title: '',
  description: '',
  color: '#7c3aed', // Violet-600
  discountKind: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  percentage: 20,
  uptoAmount: null as number | null,
  fixAmount: null as number | null,
  minOrderAmount: null as number | null,
  cityId: '',
  validFrom: '',
  validTill: '',
  maxUsagePerCustomer: null as number | null,
  totalUsageLimit: null as number | null,
  isPrivate: false,
  isActive: true,
})

// --- 3. Scratch Card Coupon Form ---
const scratchForm = ref({
  id: '',
  title: '',
  description: '',
  color: '#f59e0b', // Amber-500
  discountKind: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  percentage: 10,
  uptoAmount: null as number | null,
  fixAmount: null as number | null,
  validityDays: 7,
  cityId: '',
  serviceTypeId: '',
  minOrderAmount: null as number | null,
  applyOnSingleOrder: false,
  isActive: true,
})

// --- 4. General Promo Form ---
const generalForm = ref({
  code: '',
  title: '',
  description: '',
  color: '#4f46e5', // Indigo-600
  discountKind: 'PERCENTAGE' as DiscountKind,
  percentage: 10,
  uptoAmount: null as number | null,
  fixAmount: null as number | null,
  minOrderAmount: null as number | null,
  validFrom: '',
  validTill: '',
  maxUsagePerCustomer: null as number | null,
  totalUsageLimit: null as number | null,
  isPrivate: false,
  isActive: true,
})

// --- 5. Edit Standard Coupon Form ---
const editForm = ref({
  id: '',
  code: '',
  title: '',
  description: '',
  color: '#4f46e5',
  discountKind: 'PERCENTAGE' as DiscountKind,
  percentage: null as number | null,
  uptoAmount: null as number | null,
  fixAmount: null as number | null,
  minOrderAmount: null as number | null,
  cityId: '',
  serviceTypeId: '',
  applyOnSingleOrder: false,
  validFrom: '',
  validTill: '',
  maxUsagePerCustomer: null as number | null,
  totalUsageLimit: null as number | null,
  isPrivate: false,
  isActive: true,
})

// Assigned Users Modal State
const activeCoupon = ref<Coupon | null>(null)
const assignedUsersList = ref<string[]>([])
const newUserIdInput = ref('')
const isFetchingUsers = ref(false)
const isAssigningUser = ref(false)

// --- Initial Data Load ---
async function fetchData() {
  isLoading.value = true
  try {
    const [couponRes, prizeRes, cityRes, typeRes] = await Promise.allSettled([
      api.coupons.adminGetAll(),
      api.adminScratchCoupons.getAllPrizes(),
      api.cities.getAll(),
      api.services.getAllTypes(),
    ])

    if (couponRes.status === 'fulfilled') {
      const raw = (couponRes.value as any)?.data ?? couponRes.value
      coupons.value = Array.isArray(raw) ? raw : []
    }
    if (prizeRes.status === 'fulfilled') {
      const raw = (prizeRes.value as any)?.data ?? prizeRes.value
      scratchPrizes.value = Array.isArray(raw) ? raw : []
    }
    if (cityRes.status === 'fulfilled') {
      const raw = (cityRes.value as any)?.data ?? cityRes.value
      cities.value = Array.isArray(raw) ? raw : []
    }
    if (typeRes.status === 'fulfilled') {
      const raw = (typeRes.value as any)?.data ?? typeRes.value
      serviceTypes.value = Array.isArray(raw) ? raw : []
    }
  } catch (err: any) {
    showNotification(err?.message || 'Failed to fetch coupon data', 'error')
  } finally {
    isLoading.value = false
  }
}

// Helpers
function getCityName(cityId?: string): string {
  if (!cityId) return 'All Cities'
  const found = cities.value.find((c) => c.uniqueId === cityId || (c as any).id === cityId)
  return found ? found.name : cityId
}

function getServiceTypeName(typeId?: string): string {
  if (!typeId) return 'All Categories'
  const found = serviceTypes.value.find((t) => t.uniqueId === typeId)
  return found ? found.name : typeId
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function toLocalDatetimeInput(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const min = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  } catch {
    return ''
  }
}

// Filtered Lists
const filteredCoupons = computed(() => {
  return coupons.value.filter((c) => {
    const matchesSearch =
      (c.code || '').toLowerCase().includes(search.value.toLowerCase()) ||
      (c.title || '').toLowerCase().includes(search.value.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.value.toLowerCase())

    if (!matchesSearch) return false

    if (selectedTypeFilter.value === 'ALL') return true
    if (selectedTypeFilter.value === 'CITY') return Boolean(c.cityId)
    if (selectedTypeFilter.value === 'CATEGORY') return Boolean(c.serviceTypeId)
    if (selectedTypeFilter.value === 'PERCENTAGE') return c.type === 'PERCENTAGE'
    if (selectedTypeFilter.value === 'FLAT') return c.type === 'FLAT'
    if (selectedTypeFilter.value === 'WELCOME') return c.type === 'WELCOME' || c.isWelcomeCoupon
    if (selectedTypeFilter.value === 'ACTIVE') return c.isActive
    if (selectedTypeFilter.value === 'INACTIVE') return !c.isActive

    return true
  })
})

const filteredScratchPrizes = computed(() => {
  return scratchPrizes.value.filter((p) => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(search.value.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.value.toLowerCase())
    return matchesSearch
  })
})

// --- Toggle Handlers ---
async function toggleCouponActive(coupon: any) {
  const couponId = coupon.id || coupon.couponId
  if (!couponId) return
  const newStatus = coupon.isActive
  try {
    await api.coupons.adminSetActive(couponId, newStatus)
    showNotification(`Coupon ${coupon.code} ${newStatus ? 'activated' : 'deactivated'}`)
  } catch (err: any) {
    coupon.isActive = !newStatus
    showNotification(err?.message || 'Failed to update coupon status', 'error')
  }
}

async function toggleScratchActive(prize: any) {
  const prizeId = prize.id || prize.prizeId
  if (!prizeId) return
  const newStatus = prize.isActive
  try {
    await api.adminScratchCoupons.setActive(prizeId, newStatus)
    showNotification(`Scratch prize ${prize.title} ${newStatus ? 'activated' : 'deactivated'}`)
  } catch (err: any) {
    prize.isActive = !newStatus
    showNotification(err?.message || 'Failed to update scratch prize status', 'error')
  }
}

// --- Popup Openers ---
function openCityPopup() {
  cityForm.value = {
    cityId: cities.value.length ? (cities.value[0]?.uniqueId || (cities.value[0] as any)?.id || '') : '',
    code: '',
    title: '',
    description: '',
    color: '#0284c7',
    discountKind: 'PERCENTAGE',
    percentage: 15,
    uptoAmount: null,
    fixAmount: null,
    minOrderAmount: null,
    serviceTypeId: '',
    validFrom: '',
    validTill: '',
    maxUsagePerCustomer: null,
    totalUsageLimit: null,
    isPrivate: false,
    isActive: true,
  }
  isCreateMenuOpen.value = false
  isCityModalOpen.value = true
}

function openCategoryPopup() {
  categoryForm.value = {
    serviceTypeId: serviceTypes.value.length ? (serviceTypes.value[0]?.uniqueId || '') : '',
    code: '',
    title: '',
    description: '',
    color: '#7c3aed',
    discountKind: 'PERCENTAGE',
    percentage: 20,
    uptoAmount: null,
    fixAmount: null,
    minOrderAmount: null,
    cityId: '',
    validFrom: '',
    validTill: '',
    maxUsagePerCustomer: null,
    totalUsageLimit: null,
    isPrivate: false,
    isActive: true,
  }
  isCreateMenuOpen.value = false
  isCategoryModalOpen.value = true
}

function openScratchPopup() {
  scratchForm.value = {
    id: '',
    title: '',
    description: '',
    color: '#f59e0b',
    discountKind: 'PERCENTAGE',
    percentage: 10,
    uptoAmount: null,
    fixAmount: null,
    validityDays: 7,
    cityId: '',
    serviceTypeId: '',
    minOrderAmount: null,
    applyOnSingleOrder: false,
    isActive: true,
  }
  isCreateMenuOpen.value = false
  isScratchModalOpen.value = true
}

function openGeneralPopup() {
  generalForm.value = {
    code: '',
    title: '',
    description: '',
    color: '#4f46e5',
    discountKind: 'PERCENTAGE',
    percentage: 10,
    uptoAmount: null,
    fixAmount: null,
    minOrderAmount: null,
    validFrom: '',
    validTill: '',
    maxUsagePerCustomer: null,
    totalUsageLimit: null,
    isPrivate: false,
    isActive: true,
  }
  isCreateMenuOpen.value = false
  isGeneralModalOpen.value = true
}

function openEditCouponModal(c: any) {
  const kind: DiscountKind =
    c.type === 'WELCOME' || c.isWelcomeCoupon
      ? 'WELCOME'
      : c.type === 'FLAT' || (c.fixAmount && c.fixAmount > 0)
      ? 'FLAT'
      : 'PERCENTAGE'

  editForm.value = {
    id: c.id || c.couponId,
    code: c.code || '',
    title: c.title || '',
    description: c.description || '',
    color: c.color || '#4f46e5',
    discountKind: kind,
    percentage: c.percentage ?? null,
    uptoAmount: c.uptoAmount ?? null,
    fixAmount: c.fixAmount ?? null,
    minOrderAmount: c.minOrderAmount ?? null,
    cityId: c.cityId || '',
    serviceTypeId: c.serviceTypeId || '',
    applyOnSingleOrder: Boolean(c.applyOnSingleOrder),
    validFrom: toLocalDatetimeInput(c.validFrom),
    validTill: toLocalDatetimeInput(c.validTill),
    maxUsagePerCustomer: c.maxUsagePerCustomer ?? null,
    totalUsageLimit: c.totalUsageLimit ?? null,
    isPrivate: Boolean(c.isPrivate),
    isActive: Boolean(c.isActive),
  }
  isEditModalOpen.value = true
}

function openEditScratchModal(p: any) {
  scratchForm.value = {
    id: p.id || p.prizeId,
    title: p.title || '',
    description: p.description || '',
    color: p.color || '#f59e0b',
    discountKind: p.type === 'FLAT' || (p.fixAmount && p.fixAmount > 0) ? 'FLAT' : 'PERCENTAGE',
    percentage: p.percentage ?? 10,
    uptoAmount: p.uptoAmount ?? null,
    fixAmount: p.fixAmount ?? null,
    validityDays: p.validityDays ?? 7,
    cityId: p.cityId || '',
    serviceTypeId: p.serviceTypeId || '',
    minOrderAmount: p.minOrderAmount ?? null,
    applyOnSingleOrder: Boolean(p.applyOnSingleOrder),
    isActive: Boolean(p.isActive),
  }
  isEditScratchModalOpen.value = true
}

// --- Submit 1: City Specific Coupon ---
async function handleCreateCityCoupon() {
  const f = cityForm.value
  if (!f.cityId) {
    showNotification('Please select an operational city', 'error')
    return
  }
  if (!f.code || !f.title) {
    showNotification('Coupon code and title are required', 'error')
    return
  }
  if (f.discountKind === 'PERCENTAGE' && (!f.percentage || f.percentage <= 0)) {
    showNotification('Percentage must be greater than 0', 'error')
    return
  }
  if (f.discountKind === 'FLAT' && (!f.fixAmount || f.fixAmount <= 0)) {
    showNotification('Flat discount amount must be greater than 0', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: any = {
      code: f.code.trim().toUpperCase(),
      title: f.title.trim(),
      description: f.description.trim() || null,
      color: f.color,
      cityId: f.cityId,
      serviceTypeId: f.serviceTypeId || null,
      applyOnSingleOrder: Boolean(f.serviceTypeId),
      minOrderAmount: f.minOrderAmount && f.minOrderAmount > 0 ? f.minOrderAmount : null,
      isWelcomeCoupon: false,
      percentage: f.discountKind === 'PERCENTAGE' ? f.percentage : null,
      uptoAmount: f.discountKind === 'PERCENTAGE' && f.uptoAmount && f.uptoAmount > 0 ? f.uptoAmount : null,
      fixAmount: f.discountKind === 'FLAT' ? f.fixAmount : null,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : null,
      validTill: f.validTill ? new Date(f.validTill).toISOString() : null,
      maxUsagePerCustomer: f.maxUsagePerCustomer && f.maxUsagePerCustomer > 0 ? f.maxUsagePerCustomer : null,
      totalUsageLimit: f.totalUsageLimit && f.totalUsageLimit > 0 ? f.totalUsageLimit : null,
      isPrivate: Boolean(f.isPrivate),
      isActive: Boolean(f.isActive),
    }

    await api.coupons.adminCreate(payload)
    showNotification(`City coupon ${payload.code} for ${getCityName(f.cityId)} created!`)
    isCityModalOpen.value = false
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to create city coupon', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Submit 2: Category Specific Coupon ---
async function handleCreateCategoryCoupon() {
  const f = categoryForm.value
  if (!f.serviceTypeId) {
    showNotification('Please select a service category', 'error')
    return
  }
  if (!f.code || !f.title) {
    showNotification('Coupon code and title are required', 'error')
    return
  }
  if (f.discountKind === 'PERCENTAGE' && (!f.percentage || f.percentage <= 0)) {
    showNotification('Percentage must be greater than 0', 'error')
    return
  }
  if (f.discountKind === 'FLAT' && (!f.fixAmount || f.fixAmount <= 0)) {
    showNotification('Flat discount amount must be greater than 0', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: any = {
      code: f.code.trim().toUpperCase(),
      title: f.title.trim(),
      description: f.description.trim() || null,
      color: f.color,
      serviceTypeId: f.serviceTypeId,
      cityId: f.cityId || null,
      applyOnSingleOrder: true, // Backend enforces category coupon lands on that category's order
      minOrderAmount: f.minOrderAmount && f.minOrderAmount > 0 ? f.minOrderAmount : null,
      isWelcomeCoupon: false,
      percentage: f.discountKind === 'PERCENTAGE' ? f.percentage : null,
      uptoAmount: f.discountKind === 'PERCENTAGE' && f.uptoAmount && f.uptoAmount > 0 ? f.uptoAmount : null,
      fixAmount: f.discountKind === 'FLAT' ? f.fixAmount : null,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : null,
      validTill: f.validTill ? new Date(f.validTill).toISOString() : null,
      maxUsagePerCustomer: f.maxUsagePerCustomer && f.maxUsagePerCustomer > 0 ? f.maxUsagePerCustomer : null,
      totalUsageLimit: f.totalUsageLimit && f.totalUsageLimit > 0 ? f.totalUsageLimit : null,
      isPrivate: Boolean(f.isPrivate),
      isActive: Boolean(f.isActive),
    }

    await api.coupons.adminCreate(payload)
    showNotification(`Category coupon ${payload.code} for ${getServiceTypeName(f.serviceTypeId)} created!`)
    isCategoryModalOpen.value = false
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to create category coupon', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Submit 3: Scratch Card Coupon ---
async function handleCreateOrUpdateScratchCoupon(isUpdate = false) {
  const f = scratchForm.value
  if (!f.title) {
    showNotification('Prize title is required', 'error')
    return
  }
  if (f.discountKind === 'PERCENTAGE' && (!f.percentage || f.percentage <= 0)) {
    showNotification('Percentage must be greater than 0', 'error')
    return
  }
  if (f.discountKind === 'FLAT' && (!f.fixAmount || f.fixAmount <= 0)) {
    showNotification('Flat reward amount must be greater than 0', 'error')
    return
  }
  if (!f.validityDays || f.validityDays <= 0) {
    showNotification('Validity days must be at least 1 day', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: any = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      color: f.color,
      cityId: f.cityId || null,
      serviceTypeId: f.serviceTypeId || null,
      applyOnSingleOrder: Boolean(f.serviceTypeId) || Boolean(f.applyOnSingleOrder),
      minOrderAmount: f.minOrderAmount && f.minOrderAmount > 0 ? f.minOrderAmount : null,
      validityDays: f.validityDays,
      percentage: f.discountKind === 'PERCENTAGE' ? f.percentage : null,
      uptoAmount: f.discountKind === 'PERCENTAGE' && f.uptoAmount && f.uptoAmount > 0 ? f.uptoAmount : null,
      fixAmount: f.discountKind === 'FLAT' ? f.fixAmount : null,
      isActive: Boolean(f.isActive),
    }

    if (isUpdate && f.id) {
      await api.adminScratchCoupons.updatePrize(f.id, payload)
      showNotification(`Scratch card prize "${f.title}" updated!`)
      isEditScratchModalOpen.value = false
    } else {
      await api.adminScratchCoupons.createPrize(payload)
      showNotification(`Scratch card prize "${f.title}" created!`)
      isScratchModalOpen.value = false
      activeMainTab.value = 'scratch'
    }
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to save scratch card coupon', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Submit 4: General Promo Coupon ---
async function handleCreateGeneralCoupon() {
  const f = generalForm.value
  if (!f.code || !f.title) {
    showNotification('Coupon code and title are required', 'error')
    return
  }
  if (f.discountKind === 'PERCENTAGE' && (!f.percentage || f.percentage <= 0)) {
    showNotification('Percentage must be greater than 0', 'error')
    return
  }
  if (f.discountKind === 'FLAT' && (!f.fixAmount || f.fixAmount <= 0)) {
    showNotification('Flat discount amount must be greater than 0', 'error')
    return
  }
  if (f.discountKind === 'WELCOME' && (!f.uptoAmount || f.uptoAmount <= 0)) {
    showNotification('Welcome wallet credit amount must be greater than 0', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: any = {
      code: f.code.trim().toUpperCase(),
      title: f.title.trim(),
      description: f.description.trim() || null,
      color: f.color,
      cityId: null,
      serviceTypeId: null,
      applyOnSingleOrder: false,
      minOrderAmount: f.discountKind !== 'WELCOME' && f.minOrderAmount && f.minOrderAmount > 0 ? f.minOrderAmount : null,
      isWelcomeCoupon: f.discountKind === 'WELCOME',
      percentage: f.discountKind === 'PERCENTAGE' ? f.percentage : null,
      uptoAmount: f.discountKind === 'PERCENTAGE' || f.discountKind === 'WELCOME' ? (f.uptoAmount && f.uptoAmount > 0 ? f.uptoAmount : null) : null,
      fixAmount: f.discountKind === 'FLAT' ? f.fixAmount : null,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : null,
      validTill: f.validTill ? new Date(f.validTill).toISOString() : null,
      maxUsagePerCustomer: f.maxUsagePerCustomer && f.maxUsagePerCustomer > 0 ? f.maxUsagePerCustomer : null,
      totalUsageLimit: f.totalUsageLimit && f.totalUsageLimit > 0 ? f.totalUsageLimit : null,
      isPrivate: Boolean(f.isPrivate),
      isActive: Boolean(f.isActive),
    }

    await api.coupons.adminCreate(payload)
    showNotification(`General coupon ${payload.code} created!`)
    isGeneralModalOpen.value = false
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to create coupon', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Submit 5: Update Standard Coupon ---
async function handleUpdateStandardCoupon() {
  const f = editForm.value
  if (!f.id || !f.code || !f.title) {
    showNotification('Coupon code and title are required', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: any = {
      code: f.code.trim().toUpperCase(),
      title: f.title.trim(),
      description: f.description.trim() || null,
      color: f.color,
      cityId: f.cityId ? f.cityId : null,
      serviceTypeId: f.serviceTypeId ? f.serviceTypeId : null,
      applyOnSingleOrder: f.serviceTypeId ? true : Boolean(f.applyOnSingleOrder),
      minOrderAmount: f.minOrderAmount && f.minOrderAmount > 0 ? f.minOrderAmount : null,
      isWelcomeCoupon: f.discountKind === 'WELCOME',
      percentage: f.discountKind === 'PERCENTAGE' ? f.percentage : null,
      uptoAmount: f.uptoAmount && f.uptoAmount > 0 ? f.uptoAmount : null,
      fixAmount: f.discountKind === 'FLAT' ? f.fixAmount : null,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : null,
      validTill: f.validTill ? new Date(f.validTill).toISOString() : null,
      maxUsagePerCustomer: f.maxUsagePerCustomer && f.maxUsagePerCustomer > 0 ? f.maxUsagePerCustomer : null,
      totalUsageLimit: f.totalUsageLimit && f.totalUsageLimit > 0 ? f.totalUsageLimit : null,
      isPrivate: Boolean(f.isPrivate),
      isActive: Boolean(f.isActive),
    }

    await api.coupons.adminUpdate(f.id, payload)
    showNotification(`Coupon ${payload.code} updated!`)
    isEditModalOpen.value = false
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to update coupon', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Assigned Users Management ---
async function openUsersModal(coupon: any) {
  activeCoupon.value = coupon
  assignedUsersList.value = []
  newUserIdInput.value = ''
  isUsersModalOpen.value = true
  await fetchAssignedUsers()
}

async function fetchAssignedUsers() {
  const couponId = activeCoupon.value?.id || activeCoupon.value?.couponId
  if (!couponId) return
  isFetchingUsers.value = true
  try {
    const res = await api.coupons.adminGetAssignedUsers(couponId)
    const raw = (res as any)?.data ?? res
    assignedUsersList.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    showNotification(err?.message || 'Failed to load assigned users', 'error')
  } finally {
    isFetchingUsers.value = false
  }
}

async function handleAssignUser() {
  const couponId = activeCoupon.value?.id || activeCoupon.value?.couponId
  const userId = newUserIdInput.value.trim()
  if (!couponId || !userId) return

  isAssigningUser.value = true
  try {
    await api.coupons.adminAssignUsers(couponId, [userId])
    showNotification(`Assigned user ${userId} to coupon ${activeCoupon.value?.code}`)
    newUserIdInput.value = ''
    await fetchAssignedUsers()
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to assign user', 'error')
  } finally {
    isAssigningUser.value = false
  }
}

async function handleUnassignUser(userId: string) {
  const couponId = activeCoupon.value?.id || activeCoupon.value?.couponId
  if (!couponId || !userId) return

  try {
    await api.coupons.adminUnassignUser(couponId, userId)
    showNotification(`Removed user ${userId}`)
    await fetchAssignedUsers()
    await fetchData()
  } catch (err: any) {
    showNotification(err?.message || 'Failed to remove user', 'error')
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
            <Ticket class="w-5 h-5" />
          </div>
          <h1 class="text-xl font-bold text-[#202124]">Coupon & Reward Management</h1>
        </div>
        <p class="text-sm text-[#6B7280] mt-1">
          Create targeted city vouchers, category discount codes, and order-completion scratch card prize coupons.
        </p>
      </div>

      <!-- Action Buttons with Dedicated Popups -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- 1. City Specific Coupon Button -->
        <button
          @click="openCityPopup"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800020] hover:bg-[#6B001B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <MapPin class="w-3.5 h-3.5" />
          + City Coupon
        </button>

        <!-- 2. Category Specific Coupon Button -->
        <button
          @click="openCategoryPopup"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB] hover:border-[#800020]/30 hover:text-[#800020] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Layers class="w-3.5 h-3.5" />
          + Category Coupon
        </button>

        <!-- 3. Scratch Card Coupon Button -->
        <button
          @click="openScratchPopup"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB] hover:border-[#800020]/30 hover:text-[#800020] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Gift class="w-3.5 h-3.5" />
          + Scratch Card Prize
        </button>

        <!-- 4. General / Cart Promo Button -->
        <button
          @click="openGeneralPopup"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB] hover:border-[#800020]/30 hover:text-[#800020] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Ticket class="w-3.5 h-3.5" />
          + General Promo
        </button>
      </div>
    </div>

    <!-- Notifications -->
    <div
      v-if="notification"
      class="px-4 py-3 rounded-xl border flex items-center gap-3 transition-all text-sm font-medium"
      :class="
        notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      "
    >
      <CheckCircle2 v-if="notification.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
      <AlertCircle v-else class="w-5 h-5 text-red-600 shrink-0" />
      <span>{{ notification.message }}</span>
    </div>

    <!-- Navigation Tabs: Promotional Coupons vs Scratch Card Prizes -->
    <div class="flex items-center gap-2 border-b border-[#E5E7EB] pb-1">
      <button
        @click="activeMainTab = 'promos'"
        class="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
        :class="
          activeMainTab === 'promos'
            ? 'bg-[#FAF0F2] text-[#800020] border-b-2 border-[#800020]'
            : 'text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'
        "
      >
        <Ticket class="w-4 h-4" />
        Promotional Coupons ({{ coupons.length }})
      </button>

      <button
        @click="activeMainTab = 'scratch'"
        class="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
        :class="
          activeMainTab === 'scratch'
            ? 'bg-[#FAF0F2] text-[#800020] border-b-2 border-[#800020]'
            : 'text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'
        "
      >
        <Sparkles class="w-4 h-4" />
        Scratch Card Coupons & Rewards ({{ scratchPrizes.length }})
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input
          v-model="search"
          type="text"
          :placeholder="
            activeMainTab === 'promos'
              ? 'Search by coupon code, title, or description...'
              : 'Search scratch card reward title or description...'
          "
          class="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
        />
      </div>

      <!-- Type Filter (for Promotional Coupons) -->
      <div v-if="activeMainTab === 'promos'" class="flex items-center gap-2">
        <label class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Scope / Type:</label>
        <select
          v-model="selectedTypeFilter"
          class="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
        >
          <option value="ALL">All Coupons</option>
          <option value="CITY">City Specific Only</option>
          <option value="CATEGORY">Category Specific Only</option>
          <option value="PERCENTAGE">Percentage (%)</option>
          <option value="FLAT">Flat ₹ Off</option>
          <option value="WELCOME">Welcome Bonus</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>
    </div>

    <!-- ── TAB 1: PROMOTIONAL COUPONS ──────────────────────────────────────── -->
    <div v-if="activeMainTab === 'promos'" class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
      <Table :headers="promoHeaders" :items="filteredCoupons">
        <template #row="{ item }">
          <tr class="hover:bg-white/80 transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
            <!-- Code & Title -->
            <td class="py-3.5 px-4 text-left">
              <div class="flex items-start gap-2.5">
                <span
                  class="w-2.5 h-10 rounded-full shrink-0 mt-0.5"
                  :style="{ backgroundColor: item.color || '#4f46e5' }"
                ></span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-sm text-[#202124] tracking-wider bg-[#F7F7F8] px-2 py-0.5 rounded border border-[#E5E7EB]">
                      {{ item.code }}
                    </span>
                    <span
                      v-if="item.cityId"
                      class="px-2 py-0.5 bg-sky-50 text-[#6B7280] border border-sky-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-0.5"
                    >
                      <MapPin class="w-2.5 h-2.5" />
                      City
                    </span>
                    <span
                      v-if="item.serviceTypeId"
                      class="px-2 py-0.5 bg-purple-50 text-[#6B7280] border border-purple-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-0.5"
                    >
                      <Layers class="w-2.5 h-2.5" />
                      Category
                    </span>
                    <span
                      v-if="item.isWelcomeCoupon || item.type === 'WELCOME'"
                      class="px-2 py-0.5 bg-amber-100 text-[#6B7280] text-[10px] font-bold rounded-full uppercase tracking-wider"
                    >
                      Welcome
                    </span>
                  </div>
                  <p class="text-xs font-semibold text-[#202124] mt-1 line-clamp-1">{{ item.title || 'No Title' }}</p>
                  <p v-if="item.description" class="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5">{{ item.description }}</p>
                </div>
              </div>
            </td>

            <!-- Discount -->
            <td class="py-3.5 px-4 text-center">
              <div v-if="item.type === 'WELCOME' || item.isWelcomeCoupon" class="inline-flex flex-col items-center">
                <span class="text-sm font-bold text-amber-600 flex items-center gap-1">
                  <Gift class="w-3.5 h-3.5" />
                  ₹{{ item.uptoAmount ?? 0 }}
                </span>
                <span class="text-[10px] text-[#6B7280]">Wallet Bonus</span>
              </div>
              <div v-else-if="item.type === 'FLAT' || (item.fixAmount && item.fixAmount > 0)" class="inline-flex flex-col items-center">
                <span class="text-sm font-bold text-emerald-600 flex items-center gap-0.5">
                  ₹{{ item.fixAmount }}
                </span>
                <span class="text-[10px] text-[#6B7280] font-medium">Flat Off</span>
              </div>
              <div v-else class="inline-flex flex-col items-center">
                <span class="text-sm font-bold text-indigo-600 flex items-center gap-0.5">
                  {{ item.percentage }}% OFF
                </span>
                <span v-if="item.uptoAmount" class="text-[10px] text-[#6B7280] font-medium">
                  Up to ₹{{ item.uptoAmount }}
                </span>
              </div>
            </td>

            <!-- Scope & Min Order -->
            <td class="py-3.5 px-4 text-left text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">Min Order:</span>
                  <span class="font-semibold text-[#202124]">{{ item.minOrderAmount ? `₹${item.minOrderAmount}` : 'None' }}</span>
                </div>
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">City:</span>
                  <span class="font-semibold" :class="item.cityId ? 'text-[#6B7280]' : 'text-[#202124]'">
                    {{ getCityName(item.cityId) }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">Category:</span>
                  <span class="font-semibold" :class="item.serviceTypeId ? 'text-[#6B7280]' : 'text-[#202124]'">
                    {{ getServiceTypeName(item.serviceTypeId) }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Validity & Limits -->
            <td class="py-3.5 px-4 text-left text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <Calendar class="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>
                    {{ formatDateDisplay(item.validFrom) }}
                    <span class="text-[#6B7280]">→</span>
                    {{ formatDateDisplay(item.validTill) }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">Usage:</span>
                  <span class="font-semibold text-[#202124]">
                    {{ item.usedCount ?? 0 }}
                    <span v-if="item.totalUsageLimit" class="font-normal text-[#6B7280]">/ {{ item.totalUsageLimit }} max</span>
                    <span v-else class="font-normal text-[#6B7280]">(Unlimited)</span>
                  </span>
                </div>
                <div v-if="item.maxUsagePerCustomer" class="text-[11px] text-[#6B7280]">
                  {{ item.maxUsagePerCustomer }} per customer
                </div>
              </div>
            </td>

            <!-- Audience / Targeting -->
            <td class="py-3.5 px-4 text-center">
              <div v-if="item.isPrivate" class="inline-flex flex-col items-center gap-1">
                <span class="px-2 py-0.5 bg-purple-50 text-[#6B7280] text-[11px] font-semibold rounded-full border border-purple-200">
                  Private
                </span>
                <button
                  @click="openUsersModal(item)"
                  class="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Users class="w-3 h-3" />
                  Manage Users
                </button>
              </div>
              <div v-else>
                <span class="px-2 py-0.5 bg-[#F7F7F8] text-[#6B7280] text-[11px] font-medium rounded-full">
                  Public
                </span>
              </div>
            </td>

            <!-- Status Toggle -->
            <td class="py-3.5 px-4 text-center">
              <div class="flex justify-center">
                <Toggle v-model="item.isActive" @update:modelValue="toggleCouponActive(item)" />
              </div>
            </td>

            <!-- Actions -->
            <td class="py-3.5 px-4 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button
                  @click="openEditCouponModal(item)"
                  title="Edit Coupon"
                  class="p-1.5 text-[#6B7280] hover:text-[#800020] hover:bg-[#FAF0F2] rounded-lg transition-colors cursor-pointer"
                >
                  <Pen class="w-4 h-4" />
                </button>
                <button
                  @click="openUsersModal(item)"
                  title="Assign Users"
                  class="p-1.5 text-[#6B7280] hover:text-[#800020] hover:bg-[#FAF0F2] rounded-lg transition-colors cursor-pointer"
                >
                  <Users class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </template>
      </Table>

      <div v-if="!isLoading && filteredCoupons.length === 0" class="text-center py-12">
        <Ticket class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-[#6B7280] font-medium text-sm">No promotional coupons found</p>
        <p class="text-[#6B7280] text-xs mt-1">Use the buttons above to create city-specific, category, or general coupons.</p>
      </div>
    </div>

    <!-- ── TAB 2: SCRATCH CARD PRIZES ─────────────────────────────────────── -->
    <div v-if="activeMainTab === 'scratch'" class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
      <Table :headers="scratchHeaders" :items="filteredScratchPrizes">
        <template #row="{ item }">
          <tr class="hover:bg-white/80 transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
            <!-- Title -->
            <td class="py-3.5 px-4 text-left">
              <div class="flex items-start gap-2.5">
                <span
                  class="w-2.5 h-10 rounded-full shrink-0 mt-0.5"
                  :style="{ backgroundColor: item.color || '#f59e0b' }"
                ></span>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-sm text-[#202124]">{{ item.title }}</span>
                    <span class="px-2 py-0.5 bg-amber-100 text-[#6B7280] text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Post-Rating Prize
                    </span>
                  </div>
                  <p v-if="item.description" class="text-xs text-[#6B7280] mt-0.5">{{ item.description }}</p>
                </div>
              </div>
            </td>

            <!-- Reward Value -->
            <td class="py-3.5 px-4 text-center">
              <div v-if="item.type === 'FLAT' || (item.fixAmount && item.fixAmount > 0)" class="inline-flex flex-col items-center">
                <span class="text-sm font-bold text-emerald-600">₹{{ item.fixAmount }} Flat OFF</span>
                <span class="text-[10px] text-[#6B7280]">Won on Scratch</span>
              </div>
              <div v-else class="inline-flex flex-col items-center">
                <span class="text-sm font-bold text-indigo-600">{{ item.percentage }}% OFF</span>
                <span v-if="item.uptoAmount" class="text-[10px] text-[#6B7280]">Up to ₹{{ item.uptoAmount }}</span>
              </div>
            </td>

            <!-- Validity -->
            <td class="py-3.5 px-4 text-center">
              <span class="px-2.5 py-1 bg-amber-50 text-[#6B7280] border border-amber-200 rounded-lg text-xs font-semibold">
                {{ item.validityDays || 7 }} Days
              </span>
              <span class="block text-[10px] text-[#6B7280] mt-0.5">from scratch</span>
            </td>

            <!-- Scope -->
            <td class="py-3.5 px-4 text-left text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">City:</span>
                  <span class="font-medium text-[#202124]">{{ getCityName(item.cityId) }}</span>
                </div>
                <div class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">Category:</span>
                  <span class="font-medium text-[#202124]">{{ getServiceTypeName(item.serviceTypeId) }}</span>
                </div>
                <div v-if="item.minOrderAmount" class="flex items-center gap-1 text-[#6B7280]">
                  <span class="font-medium text-[#6B7280]">Min Order:</span>
                  <span class="font-semibold text-[#202124]">₹{{ item.minOrderAmount }}</span>
                </div>
              </div>
            </td>

            <!-- Status Toggle -->
            <td class="py-3.5 px-4 text-center">
              <div class="flex justify-center">
                <Toggle v-model="item.isActive" @update:modelValue="toggleScratchActive(item)" />
              </div>
            </td>

            <!-- Actions -->
            <td class="py-3.5 px-4 text-center">
              <button
                @click="openEditScratchModal(item)"
                title="Edit Scratch Prize"
                class="p-1.5 text-amber-600 hover:text-[#6B7280] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              >
                <Pen class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </template>
      </Table>

      <div v-if="!isLoading && filteredScratchPrizes.length === 0" class="text-center py-12">
        <Sparkles class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-[#6B7280] font-medium text-sm">No scratch card prizes configured</p>
        <p class="text-[#6B7280] text-xs mt-1">Click "+ Scratch Card Prize" above to configure prizes won by 4/5 star rating users.</p>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 1: CITY SPECIFIC COUPON MODAL ─────────────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isCityModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-white border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <MapPin class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">Create City-Specific Coupon</h2>
              <p class="text-xs text-[#6B7280]">Restricted exclusively to orders placed within the specified operational city.</p>
            </div>
          </div>
          <button @click="isCityModalOpen = false" class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateCityCoupon" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <!-- Target City (Required) -->
            <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                Select Operational City <span class="text-red-500">*</span>
              </label>
              <select
                v-model="cityForm.cityId"
                required
                class="w-full px-3 py-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124]"
              >
                <option value="" disabled>-- Select Target City --</option>
                <option v-for="c in cities" :key="c.uniqueId || (c as any).id" :value="c.uniqueId || (c as any).id">
                  {{ c.name }}
                </option>
              </select>
              <span class="text-[11px] text-[#6B7280] mt-1 block">
                Customers outside this city will not see or be able to apply this coupon code.
              </span>
            </div>

            <!-- Code & Title -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Coupon Code <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="cityForm.code"
                  type="text"
                  required
                  placeholder="e.g. MUMBAI20"
                  class="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Promo Title <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="cityForm.title"
                  type="text"
                  required
                  placeholder="e.g. 20% Off for Mumbai Users"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-[#202124] mb-1">Terms / Description</label>
              <textarea
                v-model="cityForm.description"
                rows="2"
                placeholder="Details visible to customer..."
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              ></textarea>
            </div>

            <!-- Discount Type -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider">Discount Structure</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="cityForm.discountKind = 'PERCENTAGE'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="cityForm.discountKind === 'PERCENTAGE' ? 'bg-sky-50 border-sky-500 text-[#6B7280] ring-2 ring-sky-200' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <Percent class="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  @click="cityForm.discountKind = 'FLAT'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="cityForm.discountKind === 'FLAT' ? 'bg-[#FAF0F2] border-[#800020] text-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <DollarSign class="w-3.5 h-3.5" /> Flat (₹ Off)
                </button>
              </div>

              <!-- Values -->
              <div v-if="cityForm.discountKind === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Percentage (%) *</label>
                  <input
                    v-model.number="cityForm.percentage"
                    type="number"
                    min="1"
                    max="100"
                    required
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Max Cap (₹)</label>
                  <input
                    v-model.number="cityForm.uptoAmount"
                    type="number"
                    min="1"
                    placeholder="e.g. 150"
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
              </div>
              <div v-else class="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <label class="block text-xs font-semibold text-[#202124] mb-1">Flat Discount Amount (₹) *</label>
                <input
                  v-model.number="cityForm.fixAmount"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 100"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                />
              </div>
            </div>

            <!-- Optional Category Restriction & Min Order -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Optional Category Restriction</label>
                <select
                  v-model="cityForm.serviceTypeId"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                >
                  <option value="">All Categories in City</option>
                  <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Min Order Amount (₹)</label>
                <input
                  v-model.number="cityForm.minOrderAmount"
                  type="number"
                  min="1"
                  placeholder="e.g. 299"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Validity & Limits -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid From</label>
                <input
                  v-model="cityForm.validFrom"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid Till</label>
                <input
                  v-model="cityForm.validTill"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Max Uses Per Customer</label>
                <input
                  v-model.number="cityForm.maxUsagePerCustomer"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Total Global Usage Limit</label>
                <input
                  v-model.number="cityForm.totalUsageLimit"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Color & Active -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <input v-model="cityForm.isActive" type="checkbox" id="cityActive" class="rounded text-sky-600 focus:ring-[#800020] focus:border-[#800020] w-4 h-4" />
                <label for="cityActive" class="text-xs font-medium text-[#202124]">Activate Immediately</label>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-[#6B7280]">Color:</label>
                <input v-model="cityForm.color" type="color" class="w-7 h-7 rounded border cursor-pointer" />
              </div>
            </div>
          </div>

          <!-- Sticky Footer -->
          <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              @click="isCityModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Saving...' : 'Create City Coupon' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 2: CATEGORY SPECIFIC COUPON MODAL ─────────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isCategoryModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-white border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">Create Category-Specific Coupon</h2>
              <p class="text-xs text-[#6B7280]">Restricted specifically to items booked under the chosen service category.</p>
            </div>
          </div>
          <button @click="isCategoryModalOpen = false" class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateCategoryCoupon" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <!-- Target Category (Required) -->
            <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                Select Service Category <span class="text-red-500">*</span>
              </label>
              <select
                v-model="categoryForm.serviceTypeId"
                required
                class="w-full px-3 py-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124]"
              >
                <option value="" disabled>-- Select Target Category --</option>
                <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">
                  {{ t.name }}
                </option>
              </select>
              <span class="text-[11px] text-[#6B7280] mt-1 block">
                The discount will apply strictly to this category's service orders during checkout.
              </span>
            </div>

            <!-- Code & Title -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Coupon Code <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="categoryForm.code"
                  type="text"
                  required
                  placeholder="e.g. CLEAN50"
                  class="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Promo Title <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="categoryForm.title"
                  type="text"
                  required
                  placeholder="e.g. Flat ₹50 Off on Cleaning Services"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-[#202124] mb-1">Terms / Description</label>
              <textarea
                v-model="categoryForm.description"
                rows="2"
                placeholder="Details visible to customer..."
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              ></textarea>
            </div>

            <!-- Discount Type -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider">Discount Structure</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="categoryForm.discountKind = 'PERCENTAGE'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="categoryForm.discountKind === 'PERCENTAGE' ? 'bg-purple-50 border-purple-500 text-[#6B7280] ring-2 ring-purple-200' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <Percent class="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  @click="categoryForm.discountKind = 'FLAT'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="categoryForm.discountKind === 'FLAT' ? 'bg-[#FAF0F2] border-[#800020] text-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <DollarSign class="w-3.5 h-3.5" /> Flat (₹ Off)
                </button>
              </div>

              <!-- Values -->
              <div v-if="categoryForm.discountKind === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Percentage (%) *</label>
                  <input
                    v-model.number="categoryForm.percentage"
                    type="number"
                    min="1"
                    max="100"
                    required
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Max Cap (₹)</label>
                  <input
                    v-model.number="categoryForm.uptoAmount"
                    type="number"
                    min="1"
                    placeholder="e.g. 200"
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
              </div>
              <div v-else class="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <label class="block text-xs font-semibold text-[#202124] mb-1">Flat Discount Amount (₹) *</label>
                <input
                  v-model.number="categoryForm.fixAmount"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 50"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                />
              </div>
            </div>

            <!-- Optional City Restriction & Min Order -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Optional City Restriction</label>
                <select
                  v-model="categoryForm.cityId"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                >
                  <option value="">All Operational Cities</option>
                  <option v-for="c in cities" :key="c.uniqueId || (c as any).id" :value="c.uniqueId || (c as any).id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Min Order Amount (₹)</label>
                <input
                  v-model.number="categoryForm.minOrderAmount"
                  type="number"
                  min="1"
                  placeholder="e.g. 399"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Validity & Limits -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid From</label>
                <input
                  v-model="categoryForm.validFrom"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid Till</label>
                <input
                  v-model="categoryForm.validTill"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Max Uses Per Customer</label>
                <input
                  v-model.number="categoryForm.maxUsagePerCustomer"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Total Global Usage Limit</label>
                <input
                  v-model.number="categoryForm.totalUsageLimit"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Color & Active -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <input v-model="categoryForm.isActive" type="checkbox" id="catActive" class="rounded text-purple-600 focus:ring-[#800020] focus:border-[#800020] w-4 h-4" />
                <label for="catActive" class="text-xs font-medium text-[#202124]">Activate Immediately</label>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-[#6B7280]">Color:</label>
                <input v-model="categoryForm.color" type="color" class="w-7 h-7 rounded border cursor-pointer" />
              </div>
            </div>
          </div>

          <!-- Sticky Footer -->
          <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              @click="isCategoryModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Saving...' : 'Create Category Coupon' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 3: SCRATCH CARD COUPON / PRIZE MODAL ───────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isScratchModalOpen || isEditScratchModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-white border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <Gift class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">
                {{ isEditScratchModalOpen ? 'Edit Scratch Card Prize' : 'Create Scratch Card Reward Coupon' }}
              </h2>
              <p class="text-xs text-[#6B7280]">
                Randomly rewarded to customers who rate completed orders 4 or 5 stars.
              </p>
            </div>
          </div>
          <button
            @click="isScratchModalOpen = false; isEditScratchModalOpen = false"
            class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateOrUpdateScratchCoupon(isEditScratchModalOpen)" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <!-- Title -->
            <div>
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                Prize Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="scratchForm.title"
                type="text"
                required
                placeholder="e.g. 15% Off Your Next Booking"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-[#202124] mb-1">Prize Description (Optional)</label>
              <textarea
                v-model="scratchForm.description"
                rows="2"
                placeholder="Congratulations on rating! Use this reward on your next order..."
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              ></textarea>
            </div>

            <!-- Discount Type -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider">Reward Structure</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="scratchForm.discountKind = 'PERCENTAGE'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="scratchForm.discountKind === 'PERCENTAGE' ? 'bg-amber-50 border-amber-500 text-[#6B7280] ring-2 ring-amber-200' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <Percent class="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  @click="scratchForm.discountKind = 'FLAT'"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="scratchForm.discountKind === 'FLAT' ? 'bg-[#FAF0F2] border-[#800020] text-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <DollarSign class="w-3.5 h-3.5" /> Flat (₹ Off)
                </button>
              </div>

              <!-- Values -->
              <div v-if="scratchForm.discountKind === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Percentage (%) *</label>
                  <input
                    v-model.number="scratchForm.percentage"
                    type="number"
                    min="1"
                    max="100"
                    required
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Max Cap (₹)</label>
                  <input
                    v-model.number="scratchForm.uptoAmount"
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                  />
                </div>
              </div>
              <div v-else class="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                <label class="block text-xs font-semibold text-[#202124] mb-1">Flat Discount Amount (₹) *</label>
                <input
                  v-model.number="scratchForm.fixAmount"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 75"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                />
              </div>
            </div>

            <!-- Validity Days (Post-Scratching) -->
            <div class="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                Validity Window (Days from Scratch) <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="scratchForm.validityDays"
                type="number"
                min="1"
                required
                placeholder="e.g. 7"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
              />
              <span class="text-[11px] text-amber-700 mt-1 block">
                After customer scratches the card, the generated coupon code expires after this number of days.
              </span>
            </div>

            <!-- Optional Targeting Scope -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">City Restriction</label>
                <select
                  v-model="scratchForm.cityId"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                >
                  <option value="">All Operational Cities</option>
                  <option v-for="c in cities" :key="c.uniqueId || (c as any).id" :value="c.uniqueId || (c as any).id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Category Restriction</label>
                <select
                  v-model="scratchForm.serviceTypeId"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                >
                  <option value="">All Service Categories</option>
                  <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Min Order Amount (₹)</label>
                <input
                  v-model.number="scratchForm.minOrderAmount"
                  type="number"
                  min="1"
                  placeholder="e.g. 299"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>

              <div class="flex items-center gap-2 pt-5">
                <input
                  v-model="scratchForm.applyOnSingleOrder"
                  type="checkbox"
                  id="scratchSingle"
                  class="rounded text-amber-600 focus:ring-[#800020] focus:border-[#800020] w-4 h-4"
                />
                <label for="scratchSingle" class="text-xs font-medium text-[#202124]">Apply on single order only</label>
              </div>
            </div>

            <!-- Color & Active -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <input v-model="scratchForm.isActive" type="checkbox" id="scratchActive" class="rounded text-amber-600 focus:ring-[#800020] focus:border-[#800020] w-4 h-4" />
                <label for="scratchActive" class="text-xs font-medium text-[#202124]">Active (Eligible for win)</label>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-[#6B7280]">Badge Color:</label>
                <input v-model="scratchForm.color" type="color" class="w-7 h-7 rounded border cursor-pointer" />
              </div>
            </div>
          </div>

          <!-- Sticky Footer -->
          <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              @click="isScratchModalOpen = false; isEditScratchModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Saving...' : isEditScratchModalOpen ? 'Save Prize Changes' : 'Create Scratch Prize' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 4: GENERAL / PROMO COUPON MODAL ───────────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isGeneralModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-white border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <Ticket class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">Create General Promo Coupon</h2>
              <p class="text-xs text-[#6B7280]">Standard cart-wide promotional discounts or signup welcome vouchers.</p>
            </div>
          </div>
          <button @click="isGeneralModalOpen = false" class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateGeneralCoupon" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <!-- Code & Title -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Coupon Code <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="generalForm.code"
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  class="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                  Promo Title <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="generalForm.title"
                  type="text"
                  required
                  placeholder="e.g. 10% Off on First Order"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-[#202124] mb-1">Description (Optional)</label>
              <textarea
                v-model="generalForm.description"
                rows="2"
                placeholder="Terms and conditions or promo details..."
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              ></textarea>
            </div>

            <!-- Discount Type -->
            <div>
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">Discount Type</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  @click="generalForm.discountKind = 'PERCENTAGE'"
                  class="py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="generalForm.discountKind === 'PERCENTAGE' ? 'bg-indigo-50 border-indigo-500 text-[#6B7280] ring-2 ring-indigo-200' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <Percent class="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  @click="generalForm.discountKind = 'FLAT'"
                  class="py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="generalForm.discountKind === 'FLAT' ? 'bg-[#FAF0F2] border-[#800020] text-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <DollarSign class="w-3.5 h-3.5" /> Flat (₹ Off)
                </button>
                <button
                  type="button"
                  @click="generalForm.discountKind = 'WELCOME'"
                  class="py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  :class="generalForm.discountKind === 'WELCOME' ? 'bg-[#FAF0F2] border-[#800020] text-[#800020] ring-1 ring-[#800020]' : 'border-[#E5E7EB] text-[#6B7280]'"
                >
                  <Gift class="w-3.5 h-3.5" /> Welcome Bonus
                </button>
              </div>
            </div>

            <!-- Values based on Discount Kind -->
            <div v-if="generalForm.discountKind === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">Percentage (%) *</label>
                <input
                  v-model.number="generalForm.percentage"
                  type="number"
                  min="1"
                  max="100"
                  required
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">Max Cap (₹)</label>
                <input
                  v-model.number="generalForm.uptoAmount"
                  type="number"
                  min="1"
                  placeholder="e.g. 150"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
                />
              </div>
            </div>

            <div v-else-if="generalForm.discountKind === 'FLAT'" class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">Flat Discount Amount (₹) *</label>
              <input
                v-model.number="generalForm.fixAmount"
                type="number"
                min="1"
                required
                placeholder="e.g. 100"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
              />
            </div>

            <div v-else-if="generalForm.discountKind === 'WELCOME'" class="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">
                Welcome Bonus to Wallet (₹) *
              </label>
              <input
                v-model.number="generalForm.uptoAmount"
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white"
              />
            </div>

            <!-- Min Order Amount (for percentage/flat) -->
            <div v-if="generalForm.discountKind !== 'WELCOME'">
              <label class="block text-xs font-medium text-[#202124] mb-1">Minimum Order Amount (₹)</label>
              <input
                v-model.number="generalForm.minOrderAmount"
                type="number"
                min="1"
                placeholder="e.g. 299 (optional)"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>

            <!-- Validity & Limits -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid From</label>
                <input
                  v-model="generalForm.validFrom"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid Till</label>
                <input
                  v-model="generalForm.validTill"
                  type="datetime-local"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Max Uses Per Customer</label>
                <input
                  v-model.number="generalForm.maxUsagePerCustomer"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Total Global Usage Limit</label>
                <input
                  v-model.number="generalForm.totalUsageLimit"
                  type="number"
                  min="1"
                  placeholder="Blank = unlimited"
                  class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Color & Active -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <input v-model="generalForm.isActive" type="checkbox" id="genActive" class="rounded text-indigo-600 focus:ring-[#800020] focus:border-[#800020] w-4 h-4" />
                <label for="genActive" class="text-xs font-medium text-[#202124]">Activate Immediately</label>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-[#6B7280]">Color:</label>
                <input v-model="generalForm.color" type="color" class="w-7 h-7 rounded border cursor-pointer" />
              </div>
            </div>
          </div>

          <!-- Sticky Footer -->
          <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              @click="isGeneralModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Saving...' : 'Create Coupon' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 5: EDIT STANDARD COUPON MODAL ─────────────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        <div class="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <Pen class="w-4 h-4" />
            </div>
            <h2 class="text-base font-bold text-[#202124]">Edit Coupon: {{ editForm.code }}</h2>
          </div>
          <button @click="isEditModalOpen = false" class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleUpdateStandardCoupon" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">Coupon Code *</label>
                <input v-model="editForm.code" type="text" required class="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]" />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1">Title *</label>
                <input v-model="editForm.title" type="text" required class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-[#202124] mb-1">Description</label>
              <textarea v-model="editForm.description" rows="2" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"></textarea>
            </div>

            <!-- Scope -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">City Restriction</label>
                <select v-model="editForm.cityId" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white">
                  <option value="">All Operational Cities</option>
                  <option v-for="c in cities" :key="c.uniqueId || (c as any).id" :value="c.uniqueId || (c as any).id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Category Restriction</label>
                <select v-model="editForm.serviceTypeId" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white">
                  <option value="">All Service Categories</option>
                  <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
                </select>
              </div>
            </div>

            <!-- Discount Values -->
            <div v-if="editForm.discountKind === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-[#E5E7EB]">
              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Percentage (%) *</label>
                <input v-model.number="editForm.percentage" type="number" min="1" max="100" required class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Max Cap (₹)</label>
                <input v-model.number="editForm.uptoAmount" type="number" min="1" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white" />
              </div>
            </div>
            <div v-else-if="editForm.discountKind === 'FLAT'" class="bg-white p-3 rounded-xl border border-[#E5E7EB]">
              <label class="block text-xs font-semibold text-[#202124] mb-1">Flat Discount (₹) *</label>
              <input v-model.number="editForm.fixAmount" type="number" min="1" required class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white" />
            </div>
            <div v-else class="bg-white p-3 rounded-xl border border-[#E5E7EB]">
              <label class="block text-xs font-semibold text-[#202124] mb-1">Welcome Wallet Bonus (₹) *</label>
              <input v-model.number="editForm.uptoAmount" type="number" min="1" required class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Min Order Amount (₹)</label>
                <input v-model.number="editForm.minOrderAmount" type="number" min="1" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg" />
              </div>
              <div class="flex items-center gap-2 pt-5">
                <input v-model="editForm.applyOnSingleOrder" type="checkbox" id="editSingle" class="rounded text-indigo-600 w-4 h-4" />
                <label for="editSingle" class="text-xs font-medium text-[#202124]">Apply on single order only</label>
              </div>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid From</label>
                <input v-model="editForm.validFrom" type="datetime-local" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg" />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Valid Till</label>
                <input v-model="editForm.validTill" type="datetime-local" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg" />
              </div>
            </div>

            <!-- Limits -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Max Uses Per Customer</label>
                <input v-model.number="editForm.maxUsagePerCustomer" type="number" min="1" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg" />
              </div>
              <div>
                <label class="block text-xs font-medium text-[#202124] mb-1">Total Global Usage Limit</label>
                <input v-model.number="editForm.totalUsageLimit" type="number" min="1" class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg" />
              </div>
            </div>

            <!-- Status & Color -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <input v-model="editForm.isActive" type="checkbox" id="editActive" class="rounded text-indigo-600 w-4 h-4" />
                <label for="editActive" class="text-xs font-medium text-[#202124]">Active</label>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-[#6B7280]">Color:</label>
                <input v-model="editForm.color" type="color" class="w-7 h-7 rounded border cursor-pointer" />
              </div>
            </div>
          </div>

          <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end gap-3 shrink-0">
            <button type="button" @click="isEditModalOpen = false" class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" :disabled="isSubmitting" class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- ── POPUP 6: ASSIGNED USERS MODAL ───────────────────────────────────── -->
    <!-- ======================================================================= -->
    <div
      v-if="isUsersModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <Users class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">
                Assigned Users for {{ activeCoupon?.code }}
              </h2>
              <p class="text-xs text-[#6B7280]">Only assigned customers can view and redeem private coupons.</p>
            </div>
          </div>
          <button @click="isUsersModalOpen = false" class="text-[#6B7280] hover:text-[#6B7280] p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 flex-1 overflow-y-auto">
          <!-- Add User Form -->
          <div class="flex gap-2">
            <input
              v-model="newUserIdInput"
              type="text"
              placeholder="Enter User ID (UUID)..."
              class="flex-1 px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] font-mono"
            />
            <button
              @click="handleAssignUser"
              :disabled="isAssigningUser || !newUserIdInput.trim()"
              class="px-4 py-2 bg-[#800020] hover:bg-[#6B001B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              {{ isAssigningUser ? 'Assigning...' : 'Assign User' }}
            </button>
          </div>

          <!-- Users List -->
          <div>
            <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">
              Assigned Customers ({{ assignedUsersList.length }})
            </h4>

            <div v-if="isFetchingUsers" class="text-center py-6 text-xs text-[#6B7280]">
              Loading assigned users...
            </div>

            <div v-else-if="assignedUsersList.length === 0" class="text-center py-6 bg-white rounded-xl border border-dashed border-[#E5E7EB]">
              <p class="text-xs text-[#6B7280]">No users specifically assigned yet.</p>
              <p class="text-[11px] text-[#6B7280] mt-0.5">Assign customer IDs above to restrict usage.</p>
            </div>

            <div v-else class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="uid in assignedUsersList"
                :key="uid"
                class="flex items-center justify-between px-3 py-2 bg-white hover:bg-[#F7F7F8] rounded-lg border border-[#E5E7EB] transition-colors"
              >
                <span class="font-mono text-xs text-[#202124]">{{ uid }}</span>
                <button
                  @click="handleUnassignUser(uid)"
                  title="Remove user"
                  class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-end shrink-0">
          <button
            @click="isUsersModalOpen = false"
            class="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
