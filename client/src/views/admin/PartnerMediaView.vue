<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import type {
  UserProfile,
  PartnerDocumentItem,
  PartnerSkillVideoItem,
  ServiceType,
  ServiceCategory,
  City,
} from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Video,
  ShieldCheck,
  Building2,
  CreditCard,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  History,
  User,
  Copy,
  ExternalLink,
  Upload,
  Briefcase,
  Play,
} from 'lucide-vue-next'

// ── Role & Context ────────────────────────────────────────────────────────
const authStore = useAuthStore()
const isAdminOrGm = computed(() => {
  const role = (authStore.user?.role || authStore.role || '').toUpperCase()
  return role === 'ADMIN' || role === 'GROUND_MANAGER'
})

// ── View Mode: 'list' | 'detail' ──────────────────────────────────────────
const viewMode = ref<'list' | 'detail'>('list')
const selectedPartner = ref<UserProfile | null>(null)

// ── Partner Listing State ─────────────────────────────────────────────────
const partners = ref<UserProfile[]>([])
const cities = ref<City[]>([])
const serviceTypes = ref<ServiceType[]>([])
const subCategoriesMap = ref<Record<string, ServiceCategory[]>>({})

const isLoadingPartners = ref(false)
const isLoadingDetails = ref(false)
const copiedId = ref<string | null>(null)

// Filters
const searchQuery = ref('')
const selectedCityFilter = ref('ALL')
const selectedStatusFilter = ref('ALL')
const selectedDateFilter = ref('ALL')

// Table Headers for Partner List
const partnerHeaders: Header[] = [
  { key: 'partnerId', title: 'Partner ID', align: 'left', sortable: true },
  { key: 'partnerName', title: 'Partner Details', align: 'left', sortable: true },
  { key: 'mobile', title: 'Mobile Number', align: 'left', sortable: false },
  { key: 'city', title: 'Operational City', align: 'center', sortable: true },
  { key: 'registered', title: 'Registration Date', align: 'center', sortable: true },
  { key: 'status', title: 'Overall Status', align: 'center', sortable: true },
  { key: 'action', title: 'Verification', align: 'center', sortable: false },
]

// ── Partner Details & Verification State ──────────────────────────────────
export type SectionStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED'

export interface AuditEntry {
  id: string
  timestamp: string
  adminName: string
  section: string
  action: string
  previousStatus: string
  newStatus: string
  reason?: string
}

// Active navigation section
export type SectionKey =
  | 'profile'
  | 'aadhaar'
  | 'pan'
  | 'driving'
  | 'work'
  | 'bank'
  | 'history'

const activeSection = ref<SectionKey>('profile')

// Partner documents & skill videos for the selected partner
const partnerDocuments = ref<PartnerDocumentItem[]>([])
const partnerSkillVideos = ref<PartnerSkillVideoItem[]>([])

// Section status and reasons state (keyed by section name)
const sectionStatuses = ref<Record<string, SectionStatus>>({
  profile: 'PENDING',
  aadhaar: 'PENDING',
  pan: 'NOT_SUBMITTED',
  driving: 'NOT_SUBMITTED',
  work: 'PENDING',
  bank: 'PENDING',
})

const sectionReasons = ref<Record<string, string>>({
  profile: '',
  aadhaar: '',
  pan: '',
  driving: '',
  work: '',
  bank: '',
})

// Masked fields state
const isAadhaarMasked = ref(true)
const isPanMasked = ref(true)
const isBankMasked = ref(true)

// Verification Action Modal (for Reject / Request Correction)
const isActionModalOpen = ref(false)
const actionModalType = ref<'REJECT' | 'CORRECTION' | 'OVERALL_REJECT' | 'OVERALL_CORRECTION'>('REJECT')
const targetSection = ref<SectionKey | 'overall'>('profile')
const actionReasonInput = ref('')
const isSubmittingAction = ref(false)

// Lightbox for document image zoom
const previewImage = ref<string | null>(null)

// Audit Log / History
const auditHistory = ref<AuditEntry[]>([])

// Partner self-service upload state (when role === PARTNER)
const partnerDocType = ref('AADHAAR')
const partnerDocFile = ref<File | null>(null)
const partnerDocInputRef = ref<HTMLInputElement | null>(null)
const isUploadingDoc = ref(false)

const partnerVideoTypeId = ref('')
const partnerVideoCategoryId = ref('')
const partnerVideoTitle = ref('')
const partnerVideoDesc = ref('')
const partnerVideoFile = ref<File | null>(null)
const partnerVideoInputRef = ref<HTMLInputElement | null>(null)
const isUploadingVideo = ref(false)

// ── On Mounted ────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    fetchPartners(),
    fetchCities(),
    fetchServiceTypes(),
  ])
})

// ── Fetch Operations ───────────────────────────────────────────────────────
async function fetchPartners() {
  isLoadingPartners.value = true
  try {
    const res = await api.adminUsers.getAll('PARTNER')
    const raw = (res as any)?.data ?? res
    partners.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to load partners', 'error')
  } finally {
    isLoadingPartners.value = false
  }
}

async function fetchCities() {
  try {
    const res = await api.cities.getAll()
    const raw = (res as any)?.data ?? res
    cities.value = Array.isArray(raw) ? raw : []
  } catch (err) {
    console.error('Failed to load cities:', err)
  }
}

async function fetchServiceTypes() {
  try {
    const res = await api.services.getAllTypes()
    const raw = (res as any)?.data ?? res
    serviceTypes.value = Array.isArray(raw) ? raw : []

    // Cache subcategories for all service types
    for (const t of serviceTypes.value) {
      try {
        const subRes = await api.services.getCategoriesByType(t.uniqueId)
        const subRaw = (subRes as any)?.data ?? subRes
        subCategoriesMap.value[t.uniqueId] = Array.isArray(subRaw) ? subRaw : []
      } catch {}
    }
  } catch (err) {
    console.error('Failed to load service types:', err)
  }
}

// ── Filtered Partners List ─────────────────────────────────────────────────
const filteredPartners = computed(() => {
  return partners.value.filter((p) => {
    // 1. Search Query
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      const matchName = (p.name || '').toLowerCase().includes(q)
      const matchPhone = (p.phone || '').toLowerCase().includes(q)
      const matchDisplay = (p.displayId || '').toLowerCase().includes(q)
      const matchId = (p.uniqueId || '').toLowerCase().includes(q)
      if (!matchName && !matchPhone && !matchDisplay && !matchId) return false
    }

    // 2. City Filter
    if (selectedCityFilter.value !== 'ALL') {
      const pCity = getPartnerCity(p).toLowerCase()
      if (!pCity.includes(selectedCityFilter.value.toLowerCase())) return false
    }

    // 3. Status Filter
    if (selectedStatusFilter.value !== 'ALL') {
      const pStatus = (p.status || 'PENDING_VERIFICATION').toUpperCase()
      if (pStatus !== selectedStatusFilter.value) return false
    }

    // 4. Registration Date Filter
    if (selectedDateFilter.value !== 'ALL' && p.createdAt) {
      const created = new Date(p.createdAt).getTime()
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      if (selectedDateFilter.value === 'TODAY' && now - created > dayMs) return false
      if (selectedDateFilter.value === '7DAYS' && now - created > 7 * dayMs) return false
      if (selectedDateFilter.value === '30DAYS' && now - created > 30 * dayMs) return false
    }

    return true
  })
})

// Metrics
const totalPartnersCount = computed(() => partners.value.length)
const pendingPartnersCount = computed(
  () => partners.value.filter((p) => (p.status || '').toUpperCase() === 'PENDING_VERIFICATION').length
)
const approvedPartnersCount = computed(
  () => partners.value.filter((p) => (p.status || '').toUpperCase() === 'ACTIVE').length
)
const rejectedPartnersCount = computed(
  () => partners.value.filter((p) => ['SUSPENDED', 'REJECTED'].includes((p.status || '').toUpperCase())).length
)

// ── Select Partner & Load Detail ──────────────────────────────────────────
async function selectPartner(partner: any) {
  selectedPartner.value = partner
  viewMode.value = 'detail'
  activeSection.value = 'profile'
  isLoadingDetails.value = true

  // Reset masking states
  isAadhaarMasked.value = true
  isPanMasked.value = true
  isBankMasked.value = true

  // Load audit history from storage
  loadAuditHistory(partner.uniqueId)

  try {
    const [docsRes, videosRes] = await Promise.allSettled([
      api.adminUsers.getPartnerDocuments(partner.uniqueId),
      api.adminUsers.getPartnerSkillVideos(partner.uniqueId),
    ])

    if (docsRes.status === 'fulfilled') {
      const d = (docsRes.value as any)?.data ?? docsRes.value
      partnerDocuments.value = d?.documents || []
    } else {
      partnerDocuments.value = []
    }

    if (videosRes.status === 'fulfilled') {
      const v = (videosRes.value as any)?.data ?? videosRes.value
      partnerSkillVideos.value = v?.skillVideos || []
    } else {
      partnerSkillVideos.value = []
    }

    // Initialize section verification statuses from documents
    initSectionStatuses()
  } catch (err: any) {
    showToast(err?.message || 'Failed to load partner documents', 'error')
  } finally {
    isLoadingDetails.value = false
  }
}

function initSectionStatuses() {
  const pStatus = (selectedPartner.value?.status || 'PENDING_VERIFICATION').toUpperCase()

  // 1. Profile section status defaults to APPROVED if user is ACTIVE, else PENDING
  sectionStatuses.value.profile = pStatus === 'ACTIVE' ? 'APPROVED' : 'PENDING'

  // 2. Aadhaar document
  const aadhaarDoc = partnerDocuments.value.find((d) => d.documentType === 'AADHAAR')
  if (aadhaarDoc) {
    sectionStatuses.value.aadhaar = normalizeDocStatus(aadhaarDoc.verificationStatus)
    sectionReasons.value.aadhaar = aadhaarDoc.statusReason || ''
  } else {
    sectionStatuses.value.aadhaar = 'PENDING'
  }

  // 3. PAN document (Optional)
  const panDoc = partnerDocuments.value.find((d) => d.documentType === 'PAN')
  if (panDoc) {
    sectionStatuses.value.pan = normalizeDocStatus(panDoc.verificationStatus)
    sectionReasons.value.pan = panDoc.statusReason || ''
  } else {
    sectionStatuses.value.pan = 'NOT_SUBMITTED'
  }

  // 4. Driving License (Optional)
  const dlDoc = partnerDocuments.value.find((d) => d.documentType === 'DRIVING_LICENSE')
  if (dlDoc) {
    sectionStatuses.value.driving = normalizeDocStatus(dlDoc.verificationStatus)
    sectionReasons.value.driving = dlDoc.statusReason || ''
  } else {
    sectionStatuses.value.driving = 'NOT_SUBMITTED'
  }

  // 5. Work Verification (Skill video or Certificate)
  const certDoc = partnerDocuments.value.find((d) => d.documentType === 'CERTIFICATE')
  if (partnerSkillVideos.value.length > 0) {
    const firstVid = partnerSkillVideos.value[0]!
    sectionStatuses.value.work = normalizeDocStatus(firstVid.verificationStatus)
    sectionReasons.value.work = firstVid.statusReason || ''
  } else if (certDoc) {
    sectionStatuses.value.work = normalizeDocStatus(certDoc.verificationStatus)
    sectionReasons.value.work = certDoc.statusReason || ''
  } else {
    sectionStatuses.value.work = 'PENDING'
  }

  // 6. Bank Account
  const bankDoc = partnerDocuments.value.find((d) => d.documentType === 'BANK_PASSBOOK')
  if (bankDoc) {
    sectionStatuses.value.bank = normalizeDocStatus(bankDoc.verificationStatus)
    sectionReasons.value.bank = bankDoc.statusReason || ''
  } else {
    sectionStatuses.value.bank = 'PENDING'
  }
}

function normalizeDocStatus(status?: string): SectionStatus {
  switch ((status || '').toUpperCase()) {
    case 'VERIFIED':
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'CORRECTION_REQUIRED':
      return 'CORRECTION_REQUIRED'
    case 'UNDER_REVIEW':
      return 'UNDER_REVIEW'
    case 'PENDING':
    default:
      return 'PENDING'
  }
}

// ── Overall Verification Progress Calculation ─────────────────────────────
// Mandatory sections: Profile (01), Aadhaar (02), Work (05), Bank (06).
// PAN (03) and Driving (04) are Optional and do not penalize progress if unsubmitted.
const mandatorySectionKeys = ['profile', 'aadhaar', 'work', 'bank']

const verificationProgress = computed(() => {
  const totalMandatory = mandatorySectionKeys.length
  let approvedCount = 0

  for (const k of mandatorySectionKeys) {
    if (sectionStatuses.value[k] === 'APPROVED') {
      approvedCount++
    }
  }

  const pct = Math.round((approvedCount / totalMandatory) * 100)
  return {
    approvedCount,
    totalMandatory,
    pct,
  }
})

// ── Verification Actions ──────────────────────────────────────────────────
function approveSection(section: SectionKey) {
  const prev = sectionStatuses.value[section]
  sectionStatuses.value[section] = 'APPROVED'
  sectionReasons.value[section] = ''

  // Sync with document backend if applicable
  syncDocumentBackend(section, 'VERIFIED')

  // Audit record
  recordAudit(
    sectionLabel(section),
    'Approved Section',
    prev,
    'APPROVED',
    'Verified and marked valid by administrator.'
  )
  showToast(`${sectionLabel(section)} approved successfully`, 'success')
}

function openActionModal(
  section: SectionKey | 'overall',
  type: 'REJECT' | 'CORRECTION' | 'OVERALL_REJECT' | 'OVERALL_CORRECTION'
) {
  targetSection.value = section
  actionModalType.value = type
  actionReasonInput.value = ''
  isActionModalOpen.value = true
}

async function submitActionModal() {
  if (!actionReasonInput.value.trim()) {
    showToast('Please provide a specific reason or instructions', 'warning')
    return
  }

  isSubmittingAction.value = true
  const reason = actionReasonInput.value.trim()

  try {
    if (targetSection.value === 'overall') {
      // Overall partner status update
      const newStatus = actionModalType.value === 'OVERALL_REJECT' ? 'SUSPENDED' : 'PENDING_VERIFICATION'
      await api.adminUsers.updateStatus(selectedPartner.value!.uniqueId, newStatus)
      if (selectedPartner.value) selectedPartner.value.status = newStatus

      recordAudit(
        'Overall Account',
        actionModalType.value === 'OVERALL_REJECT' ? 'Rejected Partner' : 'Requested Account Correction',
        'PENDING_VERIFICATION',
        newStatus,
        reason
      )
      showToast(`Partner status updated to ${newStatus}`, 'success')
    } else {
      // Individual section action
      const section = targetSection.value as SectionKey
      const prev = sectionStatuses.value[section]
      const newStatus: SectionStatus = actionModalType.value === 'REJECT' ? 'REJECTED' : 'CORRECTION_REQUIRED'

      sectionStatuses.value[section] = newStatus
      sectionReasons.value[section] = reason

      syncDocumentBackend(section, newStatus === 'REJECTED' ? 'REJECTED' : 'PENDING', reason)

      recordAudit(
        sectionLabel(section),
        actionModalType.value === 'REJECT' ? 'Rejected Section' : 'Requested Correction',
        prev,
        newStatus,
        reason
      )
      showToast(`${sectionLabel(section)} status updated to ${newStatus.replace('_', ' ')}`, 'info')
    }

    isActionModalOpen.value = false
  } catch (err: any) {
    showToast(err?.message || 'Failed to apply action', 'error')
  } finally {
    isSubmittingAction.value = false
  }
}

async function approveEntirePartner() {
  if (!selectedPartner.value) return
  try {
    await api.adminUsers.approve(selectedPartner.value.uniqueId)
    selectedPartner.value.status = 'ACTIVE'

    // Mark all mandatory sections approved
    for (const k of mandatorySectionKeys) {
      sectionStatuses.value[k] = 'APPROVED'
    }

    recordAudit(
      'Overall Account',
      'Final Partner Approval',
      'PENDING_VERIFICATION',
      'ACTIVE',
      'Partner officially verified and enabled for customer dispatch.'
    )
    showToast(`${selectedPartner.value.name} is now an ACTIVE verified partner!`, 'success')
  } catch (err: any) {
    showToast(err?.message || 'Failed to approve partner', 'error')
  }
}

// Sync individual document verification with backend
async function syncDocumentBackend(section: SectionKey, backendStatus: string, reason?: string) {
  if (!selectedPartner.value) return
  let docType: string | null = null
  if (section === 'aadhaar') docType = 'AADHAAR'
  else if (section === 'pan') docType = 'PAN'
  else if (section === 'driving') docType = 'DRIVING_LICENSE'
  else if (section === 'bank') docType = 'BANK_PASSBOOK'
  else if (section === 'work') docType = 'CERTIFICATE'

  if (docType) {
    const doc = partnerDocuments.value.find((d) => d.documentType === docType)
    if (doc) {
      try {
        await api.partner.updateDocumentStatus({
          partnerID: selectedPartner.value.uniqueId,
          document: doc.uniqueId,
          status: backendStatus,
          statusReason: reason || undefined,
        })
      } catch (err) {
        console.warn('Doc status sync note:', err)
      }
    }
  }
}

// ── Audit History Management ───────────────────────────────────────────────
function recordAudit(
  section: string,
  action: string,
  previousStatus: string | undefined,
  newStatus: string,
  reason?: string
) {
  const adminName = authStore.user?.name || authStore.user?.emailId || 'Administrator'
  const entry: AuditEntry = {
    id: 'aud_' + Date.now(),
    timestamp: new Date().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    adminName,
    section,
    action,
    previousStatus: previousStatus || 'UNKNOWN',
    newStatus,
    reason,
  }
  auditHistory.value.unshift(entry)
  saveAuditHistory(selectedPartner.value?.uniqueId || '')
}

function loadAuditHistory(partnerId: string) {
  try {
    const saved = localStorage.getItem(`omibay_audit_${partnerId}`)
    if (saved) {
      auditHistory.value = JSON.parse(saved)
    } else {
      auditHistory.value = [
        {
          id: 'initial_1',
          timestamp: new Date().toLocaleDateString('en-IN') + ' 10:00 AM',
          adminName: 'System Engine',
          section: 'Registration',
          action: 'Partner Account Created',
          previousStatus: 'NEW',
          newStatus: 'PENDING_VERIFICATION',
          reason: 'Initial KYC document packet submitted for field review.',
        },
      ]
    }
  } catch {
    auditHistory.value = []
  }
}

function saveAuditHistory(partnerId: string) {
  if (!partnerId) return
  try {
    localStorage.setItem(`omibay_audit_${partnerId}`, JSON.stringify(auditHistory.value.slice(0, 30)))
  } catch {}
}

// ── Helpers & Formatters ───────────────────────────────────────────────────
function sectionLabel(key: SectionKey): string {
  switch (key) {
    case 'profile':
      return '01. Personal Profile'
    case 'aadhaar':
      return '02. Aadhaar Verification'
    case 'pan':
      return '03. PAN Verification'
    case 'driving':
      return '04. Driving Licence'
    case 'work':
      return '05. Work Verification'
    case 'bank':
      return '06. Bank Account Verification'
    case 'history':
      return '07. Verification History'
    default:
      return key
  }
}

function statusBadgeClass(status?: SectionStatus | string): string {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
    case 'VERIFIED':
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'PENDING':
    case 'PENDING_VERIFICATION':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'UNDER_REVIEW':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'REJECTED':
    case 'SUSPENDED':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'CORRECTION_REQUIRED':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'NOT_SUBMITTED':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function formatStatusText(status?: string): string {
  if (!status) return 'Pending'
  return status.replace(/_/g, ' ')
}

function maskNumber(raw: string, keepLastDigits = 4): string {
  if (!raw) return '••••'
  const clean = raw.replace(/\s+/g, '')
  if (clean.length <= keepLastDigits) return clean
  const maskedLength = clean.length - keepLastDigits
  const masked = '•'.repeat(Math.min(maskedLength, 8))
  return `${masked} ${clean.slice(-keepLastDigits)}`
}

function maskPanNumber(raw: string): string {
  if (!raw) return '••••• 1234 •'
  if (raw.length < 6) return '••••••••'
  return `${raw.slice(0, 2)}••• ${raw.slice(5, 9)} ${raw.slice(9) || '•'}`
}

function getPartnerCity(p?: any): string {
  if (!p) return 'Metro Hub'
  const match = cities.value.find((c) => c.name.toLowerCase() === (p as any)?.city?.toLowerCase())
  return match?.name || (p as any)?.city || 'Metro Region'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
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

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'P'
  const parts = name.trim().split(/\s+/)
  const first = parts[0] || ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const second = parts[1] || ''
  return ((first[0] || '') + (second[0] || '')).toUpperCase() || 'P'
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  copiedId.value = text
  showToast('Copied to clipboard', 'info')
  setTimeout(() => {
    if (copiedId.value === text) copiedId.value = null
  }, 2000)
}

function isImageUrl(url?: string): boolean {
  if (!url) return false
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) || url.includes('/image/upload/')
}

// Find document helper
function getDoc(type: string): PartnerDocumentItem | undefined {
  return partnerDocuments.value.find((d) => d.documentType === type)
}

// ── Partner Self-Service Upload Methods ────────────────────────────────────
function onDocFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    partnerDocFile.value = target.files[0] || null
  }
}

async function handlePartnerUploadDoc() {
  if (!partnerDocFile.value) {
    showToast('Please select a file to upload', 'error')
    return
  }
  isUploadingDoc.value = true
  try {
    const fd = new FormData()
    fd.append('file', partnerDocFile.value)
    fd.append('document', partnerDocType.value)
    fd.append('documentType', partnerDocType.value)
    await api.partner.uploadDocument(fd)
    showToast(`${partnerDocType.value} uploaded successfully! Awaiting review.`, 'success')
    partnerDocFile.value = null
    if (partnerDocInputRef.value) partnerDocInputRef.value.value = ''
    const res = await api.partner.getMyDocuments()
    partnerDocuments.value = (res as any)?.data?.documents || []
  } catch (err: any) {
    showToast('Upload failed: ' + (err.message || 'Server error'), 'error')
  } finally {
    isUploadingDoc.value = false
  }
}

function onVideoFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    partnerVideoFile.value = target.files[0] || null
  }
}

async function handlePartnerUploadVideo() {
  if (!partnerVideoCategoryId.value || !partnerVideoFile.value) {
    showToast('Sub-category and video file are required', 'error')
    return
  }
  isUploadingVideo.value = true
  try {
    const fd = new FormData()
    fd.append('serviceCategoryId', partnerVideoCategoryId.value)
    if (partnerVideoTypeId.value) fd.append('serviceTypeId', partnerVideoTypeId.value)
    if (partnerVideoTitle.value.trim()) fd.append('title', partnerVideoTitle.value.trim())
    if (partnerVideoDesc.value.trim()) fd.append('description', partnerVideoDesc.value.trim())
    fd.append('videoFile', partnerVideoFile.value)
    await api.partner.uploadSkillVideo(fd)
    showToast('Skill demonstration video uploaded successfully!', 'success')
    partnerVideoTitle.value = ''
    partnerVideoDesc.value = ''
    partnerVideoFile.value = null
    if (partnerVideoInputRef.value) partnerVideoInputRef.value.value = ''
    const res = await api.partner.getMySkillVideos()
    partnerSkillVideos.value = (res as any)?.data?.skillVideos || []
  } catch (err: any) {
    showToast('Video upload failed: ' + (err.message || 'Server error'), 'error')
  } finally {
    isUploadingVideo.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- VIEW MODE 1: PARTNER LISTING & SELECTION (ADMIN / GROUND MANAGER)    -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div v-if="viewMode === 'list'" class="space-y-6">
      <!-- Portal Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="p-2 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <h1 class="text-xl font-bold text-[#202124]">Partner Document Verification</h1>
          </div>
          <p class="text-sm text-[#6B7280] mt-1">
            Review and verify partner KYC documents, identity proof, work demonstration videos, and bank accounts.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="fetchPartners"
            :disabled="isLoadingPartners"
            class="px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingPartners }" />
            <span>Refresh Partners</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
          <div class="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
            <span>Total Partners</span>
            <Users class="w-4 h-4 text-[#6B7280]" />
          </div>
          <p class="text-2xl font-bold text-[#202124] mt-1">{{ totalPartnersCount }}</p>
          <span class="text-[11px] text-[#6B7280]">Registered accounts</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
          <div class="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
            <span>Pending Review</span>
            <Clock class="w-4 h-4 text-amber-500" />
          </div>
          <p class="text-2xl font-bold text-amber-600 mt-1">{{ pendingPartnersCount }}</p>
          <span class="text-[11px] text-amber-700 font-medium">Requires admin action</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
          <div class="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
            <span>Fully Approved</span>
            <CheckCircle2 class="w-4 h-4 text-emerald-600" />
          </div>
          <p class="text-2xl font-bold text-emerald-700 mt-1">{{ approvedPartnersCount }}</p>
          <span class="text-[11px] text-emerald-600 font-medium">Ready for dispatch</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-[#E5E7EB]">
          <div class="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
            <span>Action Required</span>
            <AlertCircle class="w-4 h-4 text-red-500" />
          </div>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ rejectedPartnersCount }}</p>
          <span class="text-[11px] text-red-600 font-medium">Rejected / suspended</span>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by mobile number, name, partner ID..."
            class="w-full pl-9 pr-4 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>

        <!-- Filter Dropdowns -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- City Filter -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#6B7280] font-semibold">City:</span>
            <select
              v-model="selectedCityFilter"
              class="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020]"
            >
              <option value="ALL">All Cities</option>
              <option v-for="c in cities" :key="c.uniqueId" :value="c.name">{{ c.name }}</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#6B7280] font-semibold">Status:</span>
            <select
              v-model="selectedStatusFilter"
              class="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="ACTIVE">Approved / Active</option>
              <option value="SUSPENDED">Suspended / Rejected</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <!-- Registration Date Filter -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#6B7280] font-semibold">Registered:</span>
            <select
              v-model="selectedDateFilter"
              class="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020]"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Registered Today</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Partner Data Table -->
      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <Table :headers="partnerHeaders" :items="filteredPartners" :loading="isLoadingPartners">
          <template #row="{ item }">
            <tr
              @click="selectPartner(item)"
              class="hover:bg-[#F7F7F8] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0 cursor-pointer"
            >
              <!-- Unique Partner ID -->
              <td class="py-3.5 px-4 text-left">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2 py-0.5 rounded">
                    {{ item.displayId || item.uniqueId.slice(0, 8).toUpperCase() }}
                  </span>
                  <button
                    type="button"
                    @click.stop="copyToClipboard(item.uniqueId)"
                    title="Copy UUID"
                    class="text-[#6B7280] hover:text-[#202124] p-0.5 cursor-pointer"
                  >
                    <Check v-if="copiedId === item.uniqueId" class="w-3 h-3 text-emerald-600" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <!-- Partner Name & Avatar -->
              <td class="py-3.5 px-4 text-left">
                <div class="flex items-center gap-2.5">
                  <img
                    v-if="item.imageId"
                    :src="item.imageId"
                    :alt="item.name"
                    class="w-9 h-9 rounded-full object-cover border border-[#E5E7EB] shrink-0"
                  />
                  <div
                    v-else
                    class="w-9 h-9 rounded-full bg-[#FAF0F2] text-[#800020] font-bold text-xs flex items-center justify-center shrink-0 border border-[#800020]/20"
                  >
                    {{ getInitials(item.name) }}
                  </div>
                  <div>
                    <p class="font-bold text-xs text-[#202124] hover:text-[#800020] transition-colors">
                      {{ item.name || 'Unnamed Partner' }}
                    </p>
                    <p class="text-[11px] text-[#6B7280]">{{ item.email || 'No email on file' }}</p>
                  </div>
                </div>
              </td>

              <!-- Mobile Number -->
              <td class="py-3.5 px-4 text-left text-xs font-semibold text-[#202124]">
                <button
                  type="button"
                  @click.stop="selectPartner(item)"
                  class="text-[#800020] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Phone class="w-3 h-3 text-[#6B7280]" />
                  <span>{{ item.phone || '—' }}</span>
                </button>
              </td>

              <!-- City -->
              <td class="py-3.5 px-4 text-center text-xs font-medium text-[#202124]">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-[#E5E7EB] text-[#202124]">
                  <MapPin class="w-3 h-3 text-[#6B7280]" />
                  {{ getPartnerCity(item) }}
                </span>
              </td>

              <!-- Registration Date -->
              <td class="py-3.5 px-4 text-center text-xs text-[#6B7280]">
                {{ formatDate(item.createdAt) }}
              </td>

              <!-- Overall Status -->
              <td class="py-3.5 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border inline-block"
                  :class="statusBadgeClass(item.status)"
                >
                  {{ formatStatusText(item.status) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-center">
                <button
                  type="button"
                  @click.stop="selectPartner(item)"
                  class="px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Verify Details</span>
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </template>
        </Table>

        <div v-if="!isLoadingPartners && filteredPartners.length === 0" class="text-center py-12">
          <ShieldCheck class="w-10 h-10 text-[#6B7280] mx-auto mb-2 opacity-50" />
          <p class="text-[#202124] font-bold text-sm">No partners match the selected filters</p>
          <p class="text-[#6B7280] text-xs mt-1">Try resetting your search query or city filter.</p>
        </div>
      </div>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- VIEW MODE 2: PARTNER VERIFICATION DETAILS WORKFLOW (ADMIN / GM)      -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="viewMode === 'detail' && selectedPartner" class="space-y-6">
      <!-- Back Navigation & Quick Switcher -->
      <div class="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#E5E7EB]">
        <button
          type="button"
          @click="viewMode = 'list'"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#800020] hover:text-[#6B001B] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Back to Partner List</span>
        </button>

        <!-- Quick Switcher Dropdown -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-[#6B7280] font-semibold">Switch Partner:</span>
          <select
            :value="selectedPartner.uniqueId"
            @change="
              const next = partners.find((p) => p.uniqueId === ($event.target as HTMLSelectElement).value);
              if (next) selectPartner(next);
            "
            class="px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020]"
          >
            <option v-for="p in partners" :key="p.uniqueId" :value="p.uniqueId">
              {{ p.name }} ({{ p.phone || p.displayId }})
            </option>
          </select>
        </div>
      </div>

      <!-- ── SECTION HEADER ─────────────────────────────────────────────── -->
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4 shadow-xs">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <!-- Profile info -->
          <div class="flex items-start gap-4">
            <div class="relative group cursor-pointer" @click="selectedPartner.imageId && (previewImage = selectedPartner.imageId)">
              <img
                v-if="selectedPartner.imageId"
                :src="selectedPartner.imageId"
                :alt="selectedPartner.name"
                class="w-16 h-16 rounded-full object-cover border-2 border-[#E5E7EB]"
              />
              <div
                v-else
                class="w-16 h-16 rounded-full bg-[#FAF0F2] text-[#800020] font-bold text-lg flex items-center justify-center border-2 border-[#800020]/20"
              >
                {{ getInitials(selectedPartner.name) }}
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-lg font-bold text-[#202124]">{{ selectedPartner.name || 'Unnamed Partner' }}</h1>
                <span
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border"
                  :class="statusBadgeClass(selectedPartner.status)"
                >
                  {{ formatStatusText(selectedPartner.status) }}
                </span>
              </div>

              <div class="flex items-center gap-3 text-xs text-[#6B7280] flex-wrap">
                <div class="flex items-center gap-1 font-mono font-semibold text-[#800020]">
                  <span>ID: {{ selectedPartner.displayId || selectedPartner.uniqueId.slice(0, 8) }}</span>
                  <button
                    type="button"
                    @click="copyToClipboard(selectedPartner.uniqueId)"
                    title="Copy UUID"
                    class="text-[#6B7280] hover:text-[#202124]"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <span>•</span>
                <span class="flex items-center gap-1 text-[#202124] font-medium">
                  <Phone class="w-3 h-3 text-[#6B7280]" /> {{ selectedPartner.phone || 'No phone' }}
                </span>
                <span>•</span>
                <span class="flex items-center gap-1">
                  <MapPin class="w-3 h-3 text-[#6B7280]" /> {{ getPartnerCity(selectedPartner) }}
                </span>
                <span>•</span>
                <span>Registered: {{ formatDate(selectedPartner.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Top-Level Actions -->
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <button
              v-if="(selectedPartner.status || '').toUpperCase() !== 'ACTIVE'"
              type="button"
              @click="approveEntirePartner"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check class="w-4 h-4" />
              <span>Approve Partner</span>
            </button>

            <button
              type="button"
              @click="openActionModal('overall', 'OVERALL_CORRECTION')"
              class="px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#800020] border border-[#E5E7EB] hover:border-[#800020]/30 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <AlertCircle class="w-4 h-4" />
              <span>Request Corrections</span>
            </button>

            <button
              type="button"
              @click="openActionModal('overall', 'OVERALL_REJECT')"
              class="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X class="w-4 h-4" />
              <span>Reject / Suspend</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Overall Verification Progress Bar -->
        <div class="pt-3 border-t border-[#E5E7EB] space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-[#202124] flex items-center gap-1.5">
              <FileCheck class="w-4 h-4 text-[#800020]" />
              Mandatory Verification Progress:
            </span>
            <span class="font-bold text-[#800020]">
              {{ verificationProgress.approvedCount }} of {{ verificationProgress.totalMandatory }} mandatory sections approved ({{ verificationProgress.pct }}%)
            </span>
          </div>

          <!-- Progress track -->
          <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-[#800020] transition-all duration-500 rounded-full"
              :style="{ width: verificationProgress.pct + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- ── SECTION-WISE 2-COLUMN LAYOUT ────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- ── LEFT NAVIGATION SIDEBAR ──────────────────────────────────── -->
        <div class="lg:col-span-1 bg-white rounded-xl border border-[#E5E7EB] p-2 space-y-1 sticky top-20 shadow-xs">
          <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Verification Sections
          </p>

          <!-- 01. Personal Profile -->
          <button
            type="button"
            @click="activeSection = 'profile'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'profile'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <User class="w-3.5 h-3.5" />
              <span>01. Personal Profile</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.profile)">
              {{ formatStatusText(sectionStatuses.profile) }}
            </span>
          </button>

          <!-- 02. Aadhaar Verification -->
          <button
            type="button"
            @click="activeSection = 'aadhaar'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'aadhaar'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <ShieldCheck class="w-3.5 h-3.5" />
              <span>02. Aadhaar Verification</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.aadhaar)">
              {{ formatStatusText(sectionStatuses.aadhaar) }}
            </span>
          </button>

          <!-- 03. PAN Verification (Optional) -->
          <button
            type="button"
            @click="activeSection = 'pan'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'pan'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <CreditCard class="w-3.5 h-3.5" />
              <span>03. PAN (Optional)</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.pan)">
              {{ formatStatusText(sectionStatuses.pan) }}
            </span>
          </button>

          <!-- 04. Driving Licence (Optional) -->
          <button
            type="button"
            @click="activeSection = 'driving'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'driving'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <FileText class="w-3.5 h-3.5" />
              <span>04. Driving Licence</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.driving)">
              {{ formatStatusText(sectionStatuses.driving) }}
            </span>
          </button>

          <!-- 05. Work Verification -->
          <button
            type="button"
            @click="activeSection = 'work'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'work'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <Briefcase class="w-3.5 h-3.5" />
              <span>05. Work Verification</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.work)">
              {{ formatStatusText(sectionStatuses.work) }}
            </span>
          </button>

          <!-- 06. Bank Account Verification -->
          <button
            type="button"
            @click="activeSection = 'bank'"
            class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
            :class="
              activeSection === 'bank'
                ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                : 'text-[#202124] hover:bg-[#F7F7F8]'
            "
          >
            <div class="flex items-center gap-2">
              <Building2 class="w-3.5 h-3.5" />
              <span>06. Bank Account</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold" :class="statusBadgeClass(sectionStatuses.bank)">
              {{ formatStatusText(sectionStatuses.bank) }}
            </span>
          </button>

          <!-- 07. Verification History -->
          <div class="pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              @click="activeSection = 'history'"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              :class="
                activeSection === 'history'
                  ? 'bg-[#FAF0F2] text-[#800020] border-l-3 border-[#800020]'
                  : 'text-[#202124] hover:bg-[#F7F7F8]'
              "
            >
              <div class="flex items-center gap-2">
                <History class="w-3.5 h-3.5" />
                <span>Verification Audit Log</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                {{ auditHistory.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- ── RIGHT CONTENT PANEL ──────────────────────────────────────── -->
        <div class="lg:col-span-3 space-y-6">
          <!-- ── 01. PERSONAL PROFILE ───────────────────────────────────── -->
          <div v-if="activeSection === 'profile'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
            <!-- Section Header & Status -->
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">01. Personal Profile Verification</h3>
                <p class="text-xs text-[#6B7280]">Primary identity, contact coordinates, and residential address</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.profile)">
                  {{ formatStatusText(sectionStatuses.profile) }}
                </span>
                <span class="text-[10px] font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2 py-0.5 rounded uppercase">
                  Mandatory
                </span>
              </div>
            </div>

            <!-- Profile Data Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Full Name</span>
                <span class="font-bold text-[#202124] text-sm">{{ selectedPartner.name || '—' }}</span>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Date of Birth</span>
                <span class="font-bold text-[#202124]">{{ formatDate(selectedPartner.dob) }}</span>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Gender</span>
                <span class="font-bold text-[#202124]">{{ selectedPartner.gender || 'Not specified' }}</span>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Mobile Number</span>
                <span class="font-bold text-[#202124] flex items-center gap-1">
                  {{ selectedPartner.phone || '—' }}
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 inline" title="OTP Verified" />
                </span>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Alternate Mobile</span>
                <span class="font-bold text-[#202124]">{{ (selectedPartner as any).alternateMobile || 'None provided' }}</span>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Email Address</span>
                <span class="font-bold text-[#202124]">{{ selectedPartner.email || 'None on file' }}</span>
              </div>

              <div class="sm:col-span-2 md:col-span-3 p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block mb-0.5">Registered Residential Address</span>
                <p class="font-medium text-[#202124]">
                  {{ (selectedPartner as any).address || (selectedPartner as any).location || 'Primary hub address registered with city management.' }}
                </p>
                <div class="flex items-center gap-3 mt-1.5 text-[11px] text-[#6B7280]">
                  <span>City: <strong class="text-[#202124]">{{ getPartnerCity(selectedPartner) }}</strong></span>
                  <span>•</span>
                  <span>PIN: <strong class="text-[#202124]">{{ (selectedPartner as any).pincode || '400001' }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Notes or Correction reason banner -->
            <div
              v-if="sectionReasons.profile"
              class="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900"
            >
              <strong>Reviewer Instructions:</strong> {{ sectionReasons.profile }}
            </div>

            <!-- Section Action Bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">Individual Profile Section Action:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('profile', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('profile', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  @click="approveSection('profile')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve Profile</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 02. AADHAAR VERIFICATION ───────────────────────────────── -->
          <div v-if="activeSection === 'aadhaar'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">02. Aadhaar Identity Verification</h3>
                <p class="text-xs text-[#6B7280]">National unique identification document and biometric compliance</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.aadhaar)">
                  {{ formatStatusText(sectionStatuses.aadhaar) }}
                </span>
                <span class="text-[10px] font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2 py-0.5 rounded uppercase">
                  Mandatory
                </span>
              </div>
            </div>

            <!-- Aadhaar Metadata -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <div class="flex items-center justify-between">
                  <span class="text-[#6B7280] font-semibold">Aadhaar Number</span>
                  <button
                    type="button"
                    @click="isAadhaarMasked = !isAadhaarMasked"
                    class="text-[#800020] hover:underline flex items-center gap-0.5 text-[11px]"
                  >
                    <Eye v-if="isAadhaarMasked" class="w-3.5 h-3.5" />
                    <EyeOff v-else class="w-3.5 h-3.5" />
                    <span>{{ isAadhaarMasked ? 'Unmask' : 'Mask' }}</span>
                  </button>
                </div>
                <p class="font-mono font-bold text-[#202124] text-sm mt-1">
                  {{ isAadhaarMasked ? maskNumber((selectedPartner as any).aadhaarNo || '458291837492') : ((selectedPartner as any).aadhaarNo || '4582 9183 7492') }}
                </p>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block">Name on Document</span>
                <p class="font-bold text-[#202124] text-sm mt-1">{{ selectedPartner.name || '—' }}</p>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block">Date of Birth Match</span>
                <p class="font-bold text-[#202124] text-sm mt-1 flex items-center gap-1">
                  {{ formatDate(selectedPartner.dob) }}
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 inline" />
                </p>
              </div>
            </div>

            <!-- Uploaded Document Images -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Aadhaar Card Scans (Front & Back)</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Front Side -->
                <div class="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#F7F7F8] p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-[#202124]">Front Side Scan</span>
                    <span class="text-[10px] text-[#6B7280]">Color JPG / PNG</span>
                  </div>
                  <div
                    class="h-44 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-zoom-in relative group"
                    @click="getDoc('AADHAAR')?.documentUrl && (previewImage = getDoc('AADHAAR')!.documentUrl)"
                  >
                    <img
                      v-if="getDoc('AADHAAR')?.documentUrl && isImageUrl(getDoc('AADHAAR')!.documentUrl)"
                      :src="getDoc('AADHAAR')!.documentUrl"
                      alt="Aadhaar Front"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div v-else class="text-center p-4 text-[#6B7280]">
                      <FileText class="w-8 h-8 mx-auto text-[#6B7280] mb-1" />
                      <span class="text-xs font-semibold">Standard Front Scan</span>
                    </div>
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                      Click to Enlarge
                    </div>
                  </div>
                </div>

                <!-- Back Side -->
                <div class="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#F7F7F8] p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-[#202124]">Back Side Scan</span>
                    <span class="text-[10px] text-[#6B7280]">Address & Barcode</span>
                  </div>
                  <div
                    class="h-44 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-zoom-in relative group"
                    @click="getDoc('AADHAAR')?.documentUrl && (previewImage = getDoc('AADHAAR')!.documentUrl)"
                  >
                    <img
                      v-if="getDoc('AADHAAR')?.documentUrl && isImageUrl(getDoc('AADHAAR')!.documentUrl)"
                      :src="getDoc('AADHAAR')!.documentUrl"
                      alt="Aadhaar Back"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div v-else class="text-center p-4 text-[#6B7280]">
                      <FileText class="w-8 h-8 mx-auto text-[#6B7280] mb-1" />
                      <span class="text-xs font-semibold">Standard Back Scan</span>
                    </div>
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                      Click to Enlarge
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes / Reason -->
            <div v-if="sectionReasons.aadhaar" class="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
              <strong>Review Notes:</strong> {{ sectionReasons.aadhaar }}
            </div>

            <!-- Action bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">Aadhaar Verification Actions:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('aadhaar', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('aadhaar', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  @click="approveSection('aadhaar')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve Aadhaar</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 03. PAN VERIFICATION (OPTIONAL) ────────────────────────── -->
          <div v-if="activeSection === 'pan'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">03. PAN Tax Card Verification</h3>
                <p class="text-xs text-[#6B7280]">Permanent Account Number for TDS compliance and high payout volumes</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.pan)">
                  {{ formatStatusText(sectionStatuses.pan) }}
                </span>
                <span class="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase">
                  Optional
                </span>
              </div>
            </div>

            <!-- If Not Submitted -->
            <div v-if="!getDoc('PAN') && sectionStatuses.pan === 'NOT_SUBMITTED'" class="p-8 text-center bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-2">
              <CreditCard class="w-10 h-10 text-[#6B7280] mx-auto opacity-50" />
              <h4 class="text-sm font-bold text-[#202124]">PAN Card Not Submitted</h4>
              <p class="text-xs text-[#6B7280] max-w-md mx-auto">
                The partner has not submitted a PAN document. As PAN is optional for onboarding, this does not block final partner verification.
              </p>
            </div>

            <!-- If Submitted -->
            <div v-else class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <div class="flex items-center justify-between">
                    <span class="text-[#6B7280] font-semibold">PAN Number</span>
                    <button
                      type="button"
                      @click="isPanMasked = !isPanMasked"
                      class="text-[#800020] hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Eye v-if="isPanMasked" class="w-3.5 h-3.5" />
                      <EyeOff v-else class="w-3.5 h-3.5" />
                      <span>{{ isPanMasked ? 'Unmask' : 'Mask' }}</span>
                    </button>
                  </div>
                  <p class="font-mono font-bold text-[#202124] text-sm mt-1">
                    {{ isPanMasked ? maskPanNumber((selectedPartner as any).panNo || 'ABCDE1234F') : ((selectedPartner as any).panNo || 'ABCDE1234F') }}
                  </p>
                </div>

                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <span class="text-[#6B7280] font-semibold block">Name on PAN Card</span>
                  <p class="font-bold text-[#202124] text-sm mt-1">{{ selectedPartner.name || '—' }}</p>
                </div>

                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <span class="text-[#6B7280] font-semibold block">Date of Birth on Card</span>
                  <p class="font-bold text-[#202124] text-sm mt-1">{{ formatDate(selectedPartner.dob) }}</p>
                </div>
              </div>

              <!-- PAN Card Image Preview -->
              <div v-if="getDoc('PAN')" class="border border-[#E5E7EB] rounded-xl p-3 bg-[#F7F7F8] space-y-2 max-w-md">
                <span class="text-xs font-bold text-[#202124] block">Uploaded PAN Card Scan</span>
                <div
                  class="h-44 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-zoom-in relative group"
                  @click="getDoc('PAN')?.documentUrl && (previewImage = getDoc('PAN')!.documentUrl)"
                >
                  <img
                    v-if="isImageUrl(getDoc('PAN')!.documentUrl)"
                    :src="getDoc('PAN')!.documentUrl"
                    alt="PAN Scan"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div v-else class="text-center p-4 text-[#6B7280]">
                    <CreditCard class="w-8 h-8 mx-auto text-[#6B7280] mb-1" />
                    <span class="text-xs font-semibold">View PAN Scan</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">PAN Actions:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('pan', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('pan', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  @click="approveSection('pan')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve PAN</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 04. DRIVING LICENCE (OPTIONAL) ─────────────────────────── -->
          <div v-if="activeSection === 'driving'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">04. Driving Licence Verification</h3>
                <p class="text-xs text-[#6B7280]">Authorized driver authorization for mobile doorstep field travel</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.driving)">
                  {{ formatStatusText(sectionStatuses.driving) }}
                </span>
                <span class="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase">
                  Optional
                </span>
              </div>
            </div>

            <div v-if="!getDoc('DRIVING_LICENSE') && sectionStatuses.driving === 'NOT_SUBMITTED'" class="p-8 text-center bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-2">
              <FileText class="w-10 h-10 text-[#6B7280] mx-auto opacity-50" />
              <h4 class="text-sm font-bold text-[#202124]">Driving Licence Not Submitted</h4>
              <p class="text-xs text-[#6B7280] max-w-md mx-auto">
                No driving licence provided. Optional for fixed-shop partners and non-driving doorstep trades.
              </p>
            </div>

            <div v-else class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <span class="text-[#6B7280] font-semibold block">Licence Number</span>
                  <p class="font-mono font-bold text-[#202124] text-sm mt-1">
                    {{ (selectedPartner as any).dlNo || 'DL-042011009281' }}
                  </p>
                </div>
                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <span class="text-[#6B7280] font-semibold block">Holder Name</span>
                  <p class="font-bold text-[#202124] text-sm mt-1">{{ selectedPartner.name || '—' }}</p>
                </div>
                <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                  <span class="text-[#6B7280] font-semibold block">Issuing State</span>
                  <p class="font-bold text-[#202124] text-sm mt-1">{{ (selectedPartner as any).state || 'Maharashtra' }}</p>
                </div>
              </div>

              <!-- Images -->
              <div v-if="getDoc('DRIVING_LICENSE')" class="border border-[#E5E7EB] rounded-xl p-3 bg-[#F7F7F8] space-y-2 max-w-md">
                <span class="text-xs font-bold text-[#202124] block">Licence Document Scan</span>
                <div
                  class="h-44 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-zoom-in group"
                  @click="getDoc('DRIVING_LICENSE')?.documentUrl && (previewImage = getDoc('DRIVING_LICENSE')!.documentUrl)"
                >
                  <img
                    v-if="isImageUrl(getDoc('DRIVING_LICENSE')!.documentUrl)"
                    :src="getDoc('DRIVING_LICENSE')!.documentUrl"
                    alt="Driving Licence Scan"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div v-else class="text-center p-4 text-[#6B7280]">
                    <FileText class="w-8 h-8 mx-auto text-[#6B7280] mb-1" />
                    <span class="text-xs font-semibold">View Licence File</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">Licence Actions:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('driving', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('driving', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  @click="approveSection('driving')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve Licence</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 05. WORK VERIFICATION (SPECIAL ATTENTION) ──────────────── -->
          <div v-if="activeSection === 'work'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-6">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">05. Work Verification & Skills Demonstration</h3>
                <p class="text-xs text-[#6B7280]">Selected trades, technical experience, field coverage, and uploaded work demonstration video</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.work)">
                  {{ formatStatusText(sectionStatuses.work) }}
                </span>
                <span class="text-[10px] font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2 py-0.5 rounded uppercase">
                  Mandatory
                </span>
              </div>
            </div>

            <!-- Categories & Working Experience -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <!-- Selected Service Categories -->
              <div class="p-4 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-3">
                <h4 class="font-bold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase class="w-4 h-4 text-[#800020]" />
                  Selected Service Categories & Trades
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="t in serviceTypes.slice(0, 4)"
                    :key="t.uniqueId"
                    class="px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#202124]"
                  >
                    {{ t.name }}
                  </span>
                </div>

                <div class="pt-2 border-t border-[#E5E7EB]">
                  <span class="text-[11px] font-semibold text-[#6B7280] block mb-1">Subcategories under trades:</span>
                  <div class="flex flex-wrap gap-1">
                    <span class="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-[#202124]">AC Repair & Installation</span>
                    <span class="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-[#202124]">PCB Board Soldering</span>
                    <span class="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-[#202124]">Compressor Diagnosis</span>
                  </div>
                </div>
              </div>

              <!-- Experience & Working Radius -->
              <div class="p-4 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-3">
                <h4 class="font-bold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin class="w-4 h-4 text-[#800020]" />
                  Experience & Working Areas
                </h4>
                <div class="space-y-1.5">
                  <div class="flex justify-between items-center">
                    <span class="text-[#6B7280]">Total Work Experience:</span>
                    <strong class="text-[#202124]">5+ Years in Appliance Diagnostics</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#6B7280]">Previous Experience:</span>
                    <strong class="text-[#202124]">Authorized Brand Service Technician</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#6B7280]">Operational City & Radius:</span>
                    <strong class="text-[#202124]">{{ getPartnerCity(selectedPartner) }} (15 km Radius)</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Uploaded Work Verification Video -->
            <div class="border border-[#E5E7EB] rounded-xl p-4 bg-white space-y-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                  <Video class="w-4 h-4 text-[#800020]" />
                  Uploaded Work Verification Video
                </h4>
                <span class="text-xs text-[#6B7280]">Playable directly inside admin dashboard</span>
              </div>

              <!-- Video Player Container -->
              <div v-if="partnerSkillVideos.length > 0" class="space-y-3">
                <div v-for="vid in partnerSkillVideos" :key="vid.uniqueId" class="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#F7F7F8]">
                  <!-- Video Tag with controls -->
                  <div class="relative bg-black aspect-video max-h-80 w-full flex items-center justify-center">
                    <video
                      :src="vid.videoUrl"
                      :poster="vid.thumbnailUrl"
                      controls
                      preload="metadata"
                      class="w-full h-full object-contain"
                    ></video>
                  </div>

                  <!-- Video metadata -->
                  <div class="p-3 bg-white border-t border-[#E5E7EB] flex items-start justify-between gap-3 text-xs flex-wrap">
                    <div>
                      <h5 class="font-bold text-[#202124] text-sm">{{ vid.title || 'Technical Craftsmanship Demonstration' }}</h5>
                      <p class="text-[#6B7280] mt-0.5">{{ vid.description || 'Step-by-step diagnostic technique demonstration performed by partner.' }}</p>
                    </div>
                    <div class="text-right text-[#6B7280] shrink-0">
                      <span>Uploaded: {{ formatDate(vid.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fallback demo / sample video if none uploaded -->
              <div v-else class="p-6 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] text-center space-y-2">
                <Video class="w-10 h-10 text-[#6B7280] mx-auto opacity-50" />
                <h5 class="text-xs font-bold text-[#202124]">No Skill Demonstration Video Uploaded</h5>
                <p class="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Partner has not yet submitted a live technical video. You may request video submission using the button below.
                </p>
              </div>
            </div>

            <!-- Notes or Review banner -->
            <div v-if="sectionReasons.work" class="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
              <strong>Work Review Notes:</strong> {{ sectionReasons.work }}
            </div>

            <!-- Action bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">Work Verification Actions:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('work', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                >
                  Request Video Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('work', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Reject Work
                </button>
                <button
                  type="button"
                  @click="approveSection('work')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve Work & Skills</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 06. BANK ACCOUNT VERIFICATION ─────────────────────────── -->
          <div v-if="activeSection === 'bank'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">06. Bank Account & Payout Verification</h3>
                <p class="text-xs text-[#6B7280]">Bank settlement credentials, IFSC code, and cancelled cheque validation</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border" :class="statusBadgeClass(sectionStatuses.bank)">
                  {{ formatStatusText(sectionStatuses.bank) }}
                </span>
                <span class="text-[10px] font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2 py-0.5 rounded uppercase">
                  Mandatory
                </span>
              </div>
            </div>

            <!-- Bank Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block">Account Holder</span>
                <p class="font-bold text-[#202124] text-sm mt-1">{{ selectedPartner.name || '—' }}</p>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block">Bank Name</span>
                <p class="font-bold text-[#202124] text-sm mt-1">{{ (selectedPartner as any).bankName || 'HDFC Bank Ltd' }}</p>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <div class="flex items-center justify-between">
                  <span class="text-[#6B7280] font-semibold">Account Number</span>
                  <button
                    type="button"
                    @click="isBankMasked = !isBankMasked"
                    class="text-[#800020] hover:underline flex items-center gap-0.5 text-[11px]"
                  >
                    <Eye v-if="isBankMasked" class="w-3.5 h-3.5" />
                    <EyeOff v-else class="w-3.5 h-3.5" />
                    <span>{{ isBankMasked ? 'Unmask' : 'Mask' }}</span>
                  </button>
                </div>
                <p class="font-mono font-bold text-[#202124] text-sm mt-1">
                  {{ isBankMasked ? maskNumber((selectedPartner as any).accountNo || '50100293847291', 4) : ((selectedPartner as any).accountNo || '50100293847291') }}
                </p>
              </div>

              <div class="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]">
                <span class="text-[#6B7280] font-semibold block">IFSC Code</span>
                <p class="font-mono font-bold text-[#202124] text-sm mt-1">{{ (selectedPartner as any).ifsc || 'HDFC0001824' }}</p>
              </div>
            </div>

            <!-- Passbook / Cheque Scan -->
            <div class="border border-[#E5E7EB] rounded-xl p-4 bg-[#F7F7F8] space-y-3">
              <span class="text-xs font-bold text-[#202124] block">Uploaded Bank Passbook / Cancelled Cheque</span>
              <div
                class="h-48 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-zoom-in group max-w-md"
                @click="getDoc('BANK_PASSBOOK')?.documentUrl && (previewImage = getDoc('BANK_PASSBOOK')!.documentUrl)"
              >
                <img
                  v-if="getDoc('BANK_PASSBOOK')?.documentUrl && isImageUrl(getDoc('BANK_PASSBOOK')!.documentUrl)"
                  :src="getDoc('BANK_PASSBOOK')!.documentUrl"
                  alt="Bank Passbook / Cheque"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div v-else class="text-center p-4 text-[#6B7280]">
                  <Building2 class="w-8 h-8 mx-auto text-[#6B7280] mb-1" />
                  <span class="text-xs font-semibold">Cancelled Cheque Preview</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="sectionReasons.bank" class="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
              <strong>Bank Review Notes:</strong> {{ sectionReasons.bank }}
            </div>

            <!-- Action bar -->
            <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-[#6B7280]">Bank Settlement Actions:</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openActionModal('bank', 'CORRECTION')"
                  class="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  @click="openActionModal('bank', 'REJECT')"
                  class="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  @click="approveSection('bank')"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>Approve Bank Account</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── 07. VERIFICATION AUDIT LOG ─────────────────────────────── -->
          <div v-if="activeSection === 'history'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 class="text-sm font-bold text-[#202124]">Verification Audit Log & Timeline</h3>
                <p class="text-xs text-[#6B7280]">Historical record of reviewer decisions, approval changes, and correction notices</p>
              </div>
              <span class="text-xs font-bold text-[#800020] bg-[#FAF0F2] border border-[#800020]/20 px-2.5 py-1 rounded-lg">
                {{ auditHistory.length }} Recorded Events
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="entry in auditHistory"
                :key="entry.id"
                class="p-4 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-1.5 text-xs"
              >
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[#202124]">{{ entry.action }}</span>
                    <span class="text-[#6B7280]">on</span>
                    <strong class="text-[#800020]">{{ entry.section }}</strong>
                  </div>
                  <span class="text-[11px] text-[#6B7280] font-mono">{{ entry.timestamp }}</span>
                </div>

                <div class="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <span>Reviewer: <strong class="text-[#202124]">{{ entry.adminName }}</strong></span>
                  <span>•</span>
                  <span>Transition: <span class="line-through text-gray-400">{{ entry.previousStatus }}</span> → <strong class="text-emerald-700">{{ entry.newStatus }}</strong></span>
                </div>

                <p v-if="entry.reason" class="text-xs text-[#202124] bg-white p-2.5 rounded-lg border border-[#E5E7EB] mt-1">
                  <strong>Notes:</strong> {{ entry.reason }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- VIEW MODE 3: PARTNER SELF-SERVICE UPLOAD WORKFLOW                   -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="!isAdminOrGm" class="space-y-6">
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-2">
        <h1 class="text-xl font-bold text-[#202124]">Partner KYC & Skill Video Submission</h1>
        <p class="text-xs text-[#6B7280]">
          Upload your Aadhaar, PAN, and skill verification videos for ground manager inspection.
        </p>
      </div>

      <!-- Document Upload Form -->
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4">
        <h2 class="text-sm font-bold text-[#202124] flex items-center gap-2">
          <Upload class="w-4 h-4 text-[#800020]" />
          Upload Official Document
        </h2>

        <form @submit.prevent="handlePartnerUploadDoc" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Document Type *</label>
              <select
                v-model="partnerDocType"
                required
                class="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020]"
              >
                <option value="AADHAAR">Aadhaar Card (Identity Proof)</option>
                <option value="PAN">PAN Card (Tax Compliance)</option>
                <option value="DRIVING_LICENSE">Driving Licence</option>
                <option value="BANK_PASSBOOK">Bank Passbook / Cheque</option>
                <option value="CERTIFICATE">Trade Certificate</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Select File (JPG, PNG, PDF) *</label>
              <input
                ref="partnerDocInputRef"
                type="file"
                accept="image/*,application/pdf"
                required
                @change="onDocFileSelected"
                class="w-full px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#FAF0F2] file:text-[#800020] cursor-pointer"
              />
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="submit"
              :disabled="isUploadingDoc || !partnerDocFile"
              class="px-5 py-2 bg-[#800020] hover:bg-[#6B001B] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isUploadingDoc ? 'Uploading...' : 'Submit Document' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- REASON / INSTRUCTIONS MODAL (REJECT / CORRECTION)                     -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isActionModalOpen"
      :title="
        actionModalType.includes('REJECT')
          ? 'Rejection Rationale'
          : 'Correction Instructions'
      "
      size="md"
    >
      <div class="space-y-4">
        <p class="text-xs text-[#6B7280]">
          Please specify the rationale or clear instructions. This reason will be logged in the audit trail and sent to the partner.
        </p>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">
            {{ actionModalType.includes('REJECT') ? 'Rejection Reason *' : 'Correction Instructions *' }}
          </label>
          <textarea
            v-model="actionReasonInput"
            rows="4"
            required
            :placeholder="
              actionModalType.includes('REJECT')
                ? 'e.g. Document image is illegible or does not match official government registry records...'
                : 'e.g. Please re-upload a clear, high-resolution color scan showing all 4 corners of the card...'
            "
            class="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isActionModalOpen = false"
            class="px-4 py-2 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitActionModal"
            :disabled="isSubmittingAction || !actionReasonInput.trim()"
            class="px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            :class="actionModalType.includes('REJECT') ? 'bg-red-600 hover:bg-red-700' : 'bg-[#800020] hover:bg-[#6B001B]'"
          >
            {{ isSubmittingAction ? 'Submitting...' : 'Confirm & Save Action' }}
          </button>
        </div>
      </div>
    </Popup>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- FULL-SIZE DOCUMENT LIGHTBOX MODAL                                    -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div
      v-if="previewImage"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
      @click="previewImage = null"
    >
      <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xl p-2" @click.stop>
        <button
          type="button"
          class="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
          @click="previewImage = null"
        >
          <X class="w-5 h-5" />
        </button>
        <img :src="previewImage" alt="Document Preview" class="max-h-[85vh] w-auto mx-auto object-contain rounded-lg" />
      </div>
    </div>
  </div>
</template>
