<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { load as loadCashfree } from '@cashfreepayments/cashfree-js'
import { api } from '@/api'
import type {
  PartnerProfile,
  Order,
  ReworkCase,
  Wallet,
  WalletTransactionItem,
  BankAccount,
  WithdrawalRequestItem,
  PartnerReviewStats,
  UserProfile,
} from '@/types/api'
import Select from '@/components/common/Select.vue'
const PartnerOrdersView = defineAsyncComponent(() => import('@/views/partner/PartnerOrdersView.vue'))
import {
  Wrench,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Star,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-vue-next'

type SubTab = 'jobs' | 'profile' | 'reworks' | 'wallet' | 'withdrawals' | 'bank' | 'reviews'
const activeTab = ref<SubTab>('jobs')

// The sidebar links here with ?tab=...; keep the URL and the open tab in step
const route = useRoute()
const router = useRouter()
const VALID_TABS: (SubTab | 'payouts')[] = ['jobs', 'profile', 'reworks', 'wallet', 'withdrawals', 'bank', 'reviews', 'payouts']

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab !== 'string') {
      activeTab.value = 'jobs'
      return
    }
    const t = tab as string
    if (t === 'wallet' || t === 'payouts') {
      activeTab.value = 'wallet'
      fetchPayoutData()
    } else if (t === 'withdrawals') {
      activeTab.value = 'withdrawals'
      fetchPayoutData()
    } else if (t === 'bank') {
      activeTab.value = 'bank'
      fetchPayoutData()
    } else if (t === 'jobs') {
      activeTab.value = 'jobs'
      fetchOrders()
    } else if (t === 'profile') {
      activeTab.value = 'profile'
    } else if (t === 'reworks') {
      activeTab.value = 'reworks'
      fetchReworks()
    } else if (t === 'reviews') {
      activeTab.value = 'reviews'
      fetchReviews()
    }
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  const wanted = tab === 'jobs' ? undefined : tab
  if (route.query.tab !== wanted) router.replace({ query: wanted ? { tab: wanted } : {} })
})

const isLoading = ref(false)

function notify(text: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') {
    toast.error(text)
  } else {
    toast.success(text)
  }
}

// 1. Partner Profile & Schedule
const profile = ref<PartnerProfile | null>(null)
const isOnline = ref(true)
const shiftStart = ref('09:00')
const shiftEnd = ref('19:00')
const kycDocType = ref('AADHAAR')
const kycFile = ref<File | null>(null)

// 2. Orders & Execution
const partnerOrders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)
const arrivalOtpInput = ref('')
const completionOtpInput = ref('')
const pauseReason = ref('')
const acceptToken = ref('')
const extraChargesForm = ref({ amount: 150, description: 'Replacement spare valve' })
const extraChargePreview = ref<any>(null)

// 3. Reworks
const reworks = ref<ReworkCase[]>([])
const reworkClarification = ref('')
const activeReworkId = ref('')

// 4. Wallet & Payouts
const wallet = ref<Wallet | null>(null)
const transactions = ref<WalletTransactionItem[]>([])
const isLoadingWallet = ref(false)

// Add money (online recharge): create a gateway order, pay on the gateway page, then verify
const authStore = useAuthStore()
const QUICK_AMOUNTS = [200, 500, 1000, 2000]
const rechargeForm = ref({
  amount: 500,
  email: authStore.user?.emailId || '',
  phone: (authStore.user?.mobileNo || '').replace(/\D/g, '').slice(-10),
})
const isStartingRecharge = ref(false)
const isCheckingRecharge = ref(false)
const pendingRecharge = ref<{ orderId: string; amount: number; paymentUrl: string | null } | null>(null)
const bankAccounts = ref<BankAccount[]>([])
const selectedBankId = ref<string>('')
const withdrawals = ref<WithdrawalRequestItem[]>([])
const newBank = ref({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: 'HDFC Bank' })
const withdrawAmount = ref(1000)

watch(bankAccounts, (list) => {
  if (list && list.length > 0 && !selectedBankId.value) {
    selectedBankId.value = list[0]!.bankId
  }
}, { immediate: true })

// 5. Reviews
const reviewStats = ref<PartnerReviewStats | null>(null)

onMounted(async () => {
  await Promise.all([loadPartnerData(), loadMyProfile()])
})

async function loadPartnerData() {
  isLoading.value = true
  try {
    const [pRes, oRes, wRes] = await Promise.allSettled([
      api.partner.getProfile(),
      api.orders.getPartnerOrders(),
      api.wallet.get(),
    ])
    if (pRes.status === 'fulfilled') {
      const data = (pRes.value as any)?.data ?? pRes.value
      profile.value = data
      isOnline.value = data?.isOnline ?? true
    }
    if (oRes.status === 'fulfilled') {
      const raw = (oRes.value as any)?.data ?? oRes.value
      partnerOrders.value = Array.isArray(raw) ? raw : []
    }
    if (wRes.status === 'fulfilled') {
      wallet.value = (wRes.value as any)?.data ?? wRes.value
    }
  } catch (err: any) {
    console.error('Partner init error:', err)
  } finally {
    isLoading.value = false
  }
}

// ── Profile & Availability ─────────────────────────────────────────────
// ── My profile (name, gender, date of birth, photo) ────────────────────
const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
]
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

const myProfile = ref<UserProfile | null>(null)
const profileForm = ref({ name: '', gender: '', dob: '' })
const profileImageFile = ref<File | null>(null)
const profileImagePreview = ref('')
const isSavingProfile = ref(false)

function fillProfileForm(user: UserProfile) {
  myProfile.value = user
  // dob is a LocalDate: "2000-01-31", or [2000, 1, 31] if the server writes dates as arrays
  const rawDob: any = user.dob
  const dob = Array.isArray(rawDob)
    ? rawDob.map((n: number, i: number) => String(n).padStart(i === 0 ? 4 : 2, '0')).join('-')
    : rawDob || ''
  profileForm.value = {
    name: user.name || '',
    gender: (user.gender || '').toUpperCase(),
    dob,
  }
}

async function loadMyProfile() {
  try {
    const res = await api.users.getProfile()
    const user = (res as any)?.data ?? res
    if (user) fillProfileForm(user as UserProfile)
  } catch (err: any) {
    notify('Could not load your profile: ' + (err?.message || 'unknown error'), 'error')
  }
}

function clearProfileImage() {
  if (profileImagePreview.value) URL.revokeObjectURL(profileImagePreview.value)
  profileImageFile.value = null
  profileImagePreview.value = ''
}

function handleProfileImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // lets the same file be picked again
  if (!file) return
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    return notify('Choose a JPG, PNG or WebP image', 'error')
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return notify('The photo must be 5 MB or smaller', 'error')
  }
  clearProfileImage()
  profileImageFile.value = file
  profileImagePreview.value = URL.createObjectURL(file)
}

async function saveProfile() {
  const name = profileForm.value.name.trim()
  if (!name) return notify('Name cannot be empty', 'error')

  isSavingProfile.value = true
  try {
    // Multipart form: the server changes only the fields that are sent
    const fd = new FormData()
    fd.append('name', name)
    if (profileForm.value.gender) fd.append('gender', profileForm.value.gender)
    if (profileForm.value.dob) fd.append('dob', profileForm.value.dob)
    if (profileImageFile.value) fd.append('imageFile', profileImageFile.value)

    const res = await api.users.updateProfileWithImage(fd)
    const updated = (res as any)?.data ?? res
    if (updated) fillProfileForm({ ...(myProfile.value as UserProfile), ...updated })
    clearProfileImage()
    // Keep the name shown elsewhere in the app (header, greeting) in step
    if (authStore.user) authStore.setUser({ ...authStore.user, name: updated?.name ?? name })
    notify('Profile updated successfully!')
  } catch (err: any) {
    notify('Could not update profile: ' + (err?.message || 'unknown error'), 'error')
  } finally {
    isSavingProfile.value = false
  }
}

onUnmounted(clearProfileImage)

// ── Change email (a code is sent to the NEW address; it changes only after the code is entered) ──
const emailStep = ref<'idle' | 'enter' | 'code'>('idle')
const newEmail = ref('')
const emailOtp = ref('')
const isEmailBusy = ref(false)
const resendSeconds = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

function stopResendTimer() {
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = null
}

function startResendTimer(seconds = 60) {
  stopResendTimer()
  resendSeconds.value = seconds
  resendTimer = setInterval(() => {
    resendSeconds.value -= 1
    if (resendSeconds.value <= 0) stopResendTimer()
  }, 1000)
}

onUnmounted(stopResendTimer)

function cancelEmailChange() {
  stopResendTimer()
  resendSeconds.value = 0
  emailStep.value = 'idle'
  newEmail.value = ''
  emailOtp.value = ''
}

async function sendEmailCode() {
  const email = newEmail.value.trim().toLowerCase()
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(email)) {
    return notify('Enter a valid email address', 'error')
  }
  if (email === (myProfile.value?.email || '').toLowerCase()) {
    return notify('This is already your email address', 'error')
  }
  isEmailBusy.value = true
  try {
    await api.account.requestEmailChange(email)
    newEmail.value = email
    emailOtp.value = ''
    emailStep.value = 'code'
    startResendTimer()
    notify(`We sent a 6-digit code to ${email}`)
  } catch (err: any) {
    notify(err?.message || 'Could not send the code', 'error')
  } finally {
    isEmailBusy.value = false
  }
}

async function confirmEmailCode() {
  const otp = emailOtp.value.trim()
  if (!/^\d{6}$/.test(otp)) return notify('Enter the 6-digit code', 'error')
  isEmailBusy.value = true
  try {
    const res = await api.account.confirmEmailChange(newEmail.value, otp)
    const result = unwrapData(res)
    const email = result?.email || newEmail.value
    if (myProfile.value) myProfile.value = { ...myProfile.value, email }
    // Keep the copy of the user kept for the whole app in step
    if (authStore.user) authStore.setUser({ ...authStore.user, emailId: email })
    cancelEmailChange()
    notify('Your email address was updated!')
  } catch (err: any) {
    notify(err?.message || 'Could not verify the code', 'error')
  } finally {
    isEmailBusy.value = false
  }
}

async function toggleOnlineStatus() {
  try {
    isOnline.value = !isOnline.value
    await api.partner.setOnlineStatus({ isOnline: isOnline.value })
    notify(`You are now ${isOnline.value ? 'ONLINE' : 'OFFLINE'}`)
  } catch (err: any) {
    isOnline.value = !isOnline.value
    notify('Failed to update status: ' + err.message, 'error')
  }
}

async function saveSchedule() {
  try {
    await api.partner.updateSchedule({
      startTime: shiftStart.value,
      endTime: shiftEnd.value,
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    })
    notify('Working schedule updated successfully!')
  } catch (err: any) {
    notify('Failed to update schedule: ' + err.message, 'error')
  }
}

function handleDocFile(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    kycFile.value = target.files[0] || null
  }
}

async function uploadKycDoc() {
  if (!kycFile.value) {
    notify('Please select a file to upload', 'error')
    return
  }
  try {
    const fd = new FormData()
    fd.append('file', kycFile.value)
    fd.append('documentType', kycDocType.value)
    await api.partner.uploadDocument(fd)
    notify('Document submitted for admin verification!')
    kycFile.value = null
  } catch (err: any) {
    notify('Upload failed: ' + err.message, 'error')
  }
}

// ── Orders Operations ──────────────────────────────────────────────────
async function fetchOrders() {
  try {
    const res = await api.orders.getPartnerOrders()
    const raw = (res as any)?.data ?? res
    partnerOrders.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    notify('Failed to fetch orders: ' + err.message, 'error')
  }
}

async function acceptOrderWithToken() {
  if (!acceptToken.value.trim()) return
  try {
    await api.orders.accept(acceptToken.value.trim())
    notify('Order accepted successfully!')
    acceptToken.value = ''
    await fetchOrders()
  } catch (err: any) {
    notify('Failed to accept order: ' + err.message, 'error')
  }
}

async function submitArrivalOtp(orderId: string) {
  if (!arrivalOtpInput.value.trim()) {
    notify('Enter customer arrival OTP', 'error')
    return
  }
  try {
    await api.orders.verifyArrival(orderId, arrivalOtpInput.value.trim())
    notify('Arrival verified! Job started.')
    arrivalOtpInput.value = ''
    await fetchOrders()
  } catch (err: any) {
    notify('Invalid arrival OTP: ' + err.message, 'error')
  }
}

async function togglePause(order: Order) {
  try {
    if (order.status === 'IN_PROGRESS') {
      await api.orders.pause(order.orderId, pauseReason.value || 'Waiting for replacement parts')
      notify('Order paused')
    } else {
      await api.orders.resume(order.orderId)
      notify('Order resumed')
    }
    await fetchOrders()
  } catch (err: any) {
    notify('Action failed: ' + err.message, 'error')
  }
}

async function previewAddCharges(orderId: string) {
  try {
    const res = await api.orders.previewAddCharges(orderId, {
      amount: extraChargesForm.value.amount,
      description: extraChargesForm.value.description,
    })
    extraChargePreview.value = (res as any)?.data ?? res
    notify('Charge preview calculated')
  } catch (err: any) {
    notify('Preview failed: ' + err.message, 'error')
  }
}

async function commitExtraCharges(orderId: string) {
  try {
    await api.orders.addCharges(orderId, {
      amount: extraChargesForm.value.amount,
      description: extraChargesForm.value.description,
    })
    notify('Extra charges added to order!')
    extraChargePreview.value = null
    await fetchOrders()
  } catch (err: any) {
    notify('Failed to add charges: ' + err.message, 'error')
  }
}

async function completeOrder(orderId: string) {
  if (!completionOtpInput.value.trim()) {
    notify('Customer completion OTP is required', 'error')
    return
  }
  try {
    await api.orders.complete(orderId, { otp: completionOtpInput.value.trim() })
    notify('Order completed successfully! Earnings transferred to wallet.')
    completionOtpInput.value = ''
    await fetchOrders()
  } catch (err: any) {
    notify('Failed to complete order: ' + err.message, 'error')
  }
}

async function partnerCancelOrder(orderId: string) {
  const reason = prompt('Provide cancellation reason:')
  if (!reason) return
  try {
    await api.orders.partnerCancel(orderId, reason)
    notify('Order cancelled by partner')
    await fetchOrders()
  } catch (err: any) {
    notify('Cancellation failed: ' + err.message, 'error')
  }
}

// ── Reworks ────────────────────────────────────────────────────────────
async function fetchReworks() {
  try {
    const res = await api.orders.getPartnerReworks()
    const raw = (res as any)?.data ?? res
    reworks.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    notify('Failed to load reworks: ' + err.message, 'error')
  }
}

async function submitClarification(reworkId: string) {
  if (!reworkClarification.value.trim()) return
  try {
    await api.orders.clarifyRework(reworkId, { clarification: reworkClarification.value.trim() })
    notify('Clarification submitted to Ground Manager')
    reworkClarification.value = ''
    activeReworkId.value = ''
    await fetchReworks()
  } catch (err: any) {
    notify('Failed to submit: ' + err.message, 'error')
  }
}

// ── Payouts & Bank Accounts ────────────────────────────────────────────
async function fetchPayoutData() {
  isLoadingWallet.value = true
  try {
    const [bRes, wRes, walletRes, txRes] = await Promise.allSettled([
      api.bank.getDetails(),
      api.withdrawals.getMyWithdrawals(),
      api.wallet.get(),
      api.wallet.getTransactions(),
    ])
    if (bRes.status === 'fulfilled') {
      const raw = (bRes.value as any)?.data ?? bRes.value
      bankAccounts.value = Array.isArray(raw) ? raw : []
    }
    if (wRes.status === 'fulfilled') {
      const raw = (wRes.value as any)?.data ?? wRes.value
      withdrawals.value = Array.isArray(raw) ? raw : []
    }
    if (walletRes.status === 'fulfilled') {
      wallet.value = (walletRes.value as any)?.data ?? walletRes.value
    }
    if (txRes.status === 'fulfilled') {
      // Server wraps the list as { data: { data: [...] } }
      const body = (txRes.value as any)?.data ?? txRes.value
      const list = body?.data ?? body
      transactions.value = Array.isArray(list) ? list : []
    } else {
      notify('Could not load wallet transactions: ' + (txRes.reason?.message || 'unknown error'), 'error')
    }
  } catch (err: any) {
    notify('Error loading payout data: ' + err.message, 'error')
  } finally {
    isLoadingWallet.value = false
  }
}

// ── Wallet display helpers ─────────────────────────────────────────────
const bonusBalance = computed(() => Number(wallet.value?.nonWithdrawableBalance ?? wallet.value?.nonWithdrawableAmount ?? 0))
const withdrawableBalance = computed(() => Number(wallet.value?.balance ?? 0))
const totalWalletBalance = computed(() => withdrawableBalance.value + bonusBalance.value)

function inr(v?: number | null): string {
  return `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function txDateTime(v?: string): string {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TX_LABELS: Record<string, string> = {
  RECHARGE: 'Wallet recharge',
  ORDER_PAYMENT: 'Order payment',
  WITHDRAWAL: 'Withdrawal',
  PARTNER_SETTLEMENT: 'Order earnings',
  PENALTY: 'Rework penalty',
  REFUND: 'Refund',
  CANCELLATION_CHARGE: 'Cancellation charge',
  CANCELLATION_COMPENSATION: 'Cancellation compensation',
  WELCOME_BONUS: 'Welcome bonus',
}

// amount is always positive; the type (and, for settlements, the description) says which way the money moved
function isCredit(t: WalletTransactionItem): boolean {
  if (t.transactionType === 'PARTNER_SETTLEMENT') return !/debit/i.test(t.description || '')
  return ['RECHARGE', 'REFUND', 'CANCELLATION_COMPENSATION', 'WELCOME_BONUS'].includes(t.transactionType)
}

function txStatusClass(status?: string): string {
  switch ((status || '').toUpperCase()) {
    case 'SUCCESS':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-red-50 text-red-700 border-red-200'
  }
}

// ── Add money to wallet ────────────────────────────────────────────────
function unwrapData(res: any): any {
  // The server wraps results as { message, data: { data: {...} } }
  const body = res?.data ?? res
  return body?.data ?? body
}

async function startRecharge() {
  const amount = Number(rechargeForm.value.amount)
  const email = rechargeForm.value.email.trim()
  const phone = rechargeForm.value.phone.replace(/\D/g, '')
  if (!(amount > 0)) return notify('Enter an amount greater than 0', 'error')
  if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/.test(email)) return notify('Enter a valid email address', 'error')
  if (phone.length !== 10) return notify('Enter a valid 10-digit mobile number', 'error')

  isStartingRecharge.value = true
  let pay: any
  try {
    const res = await api.wallet.recharge({
      orderAmount: amount,
      customerEmail: email,
      customerPhone: phone,
      customerName: authStore.user?.name || undefined,
    })
    pay = unwrapData(res)
    if (!pay?.orderId) throw new Error('The server did not return a payment order')
    const canUseSdk = pay.provider === 'CASHFREE' && !!pay.paymentSessionId
    if (!canUseSdk && !pay.paymentUrl) {
      throw new Error(`The ${pay.provider || 'payment'} gateway returned no checkout link, so it cannot be opened here`)
    }
    pendingRecharge.value = { orderId: pay.orderId, amount, paymentUrl: pay.paymentUrl || null }
  } catch (err: any) {
    notify('Could not start recharge: ' + (err?.message || 'unknown error'), 'error')
    return
  } finally {
    isStartingRecharge.value = false
  }

  await openPaymentPage(pay)
}

// Cashfree's SDK opens the payment page as a modal on this page: no popup blocker, no leaving the dashboard.
// If it can't load or fails, fall back to opening the hosted page in a new tab.
async function openPaymentPage(pay: any) {
  if (pay.provider === 'CASHFREE' && pay.paymentSessionId) {
    try {
      // The server's checkout link points at the test host when it is in sandbox mode
      const mode = String(pay.paymentUrl || '').includes('payments-test') ? 'sandbox' : 'production'
      const cashfree = await loadCashfree({ mode })
      if (!cashfree) throw new Error('Cashfree checkout is not available in this environment')
      // Resolves when the customer finishes or closes the payment window
      const result = await cashfree.checkout({ paymentSessionId: pay.paymentSessionId, redirectTarget: '_modal' })
      if (result?.error) console.warn('Cashfree checkout reported:', result.error)
      await checkRecharge()
      return
    } catch (err: any) {
      console.error('Cashfree checkout failed, using the hosted page:', err)
    }
  }
  if (pay.paymentUrl) {
    window.open(pay.paymentUrl, '_blank', 'noopener')
    notify('Complete the payment in the new tab, then come back here.')
  }
}

async function checkRecharge(silent = false) {
  const pending = pendingRecharge.value
  if (!pending || isCheckingRecharge.value) return
  isCheckingRecharge.value = true
  try {
    const res = await api.wallet.verifyRecharge({ orderID: pending.orderId })
    const result = unwrapData(res)
    const status = String(result?.status || '').toUpperCase()
    if (status === 'SUCCESS') {
      notify(`₹${pending.amount} added to your wallet!`)
      pendingRecharge.value = null
      await fetchPayoutData()
    } else if (['FAILED', 'CANCELLED', 'USER_DROPPED'].includes(status)) {
      notify('The payment was not completed. No money was added.', 'error')
      pendingRecharge.value = null
    } else if (!silent) {
      notify('Payment is still pending. Finish it in the payment tab, then check again.')
    }
  } catch (err: any) {
    if (!silent) notify('Could not check the payment: ' + (err?.message || 'unknown error'), 'error')
  } finally {
    isCheckingRecharge.value = false
  }
}

// Coming back from the payment tab: check once automatically
function onTabVisible() {
  if (document.visibilityState === 'visible' && pendingRecharge.value) checkRecharge(true)
}
onMounted(() => document.addEventListener('visibilitychange', onTabVisible))
onUnmounted(() => document.removeEventListener('visibilitychange', onTabVisible))

async function saveBankAccount() {
  if (!newBank.value.accountNumber || !newBank.value.ifscCode) return
  try {
    await api.bank.add(newBank.value)
    notify('Bank account added successfully!')
    newBank.value.accountNumber = ''
    newBank.value.accountHolderName = ''
    await fetchPayoutData()
  } catch (err: any) {
    notify('Failed to add bank: ' + err.message, 'error')
  }
}

async function deleteBank(id: string) {
  try {
    await api.bank.delete(id)
    notify('Bank account removed')
    await fetchPayoutData()
  } catch (err: any) {
    notify('Delete failed: ' + err.message, 'error')
  }
}

async function requestPayout() {
  if (!withdrawAmount.value || Number(withdrawAmount.value) <= 0) {
    notify('Enter a valid withdrawal amount', 'error')
    return
  }
  try {
    await api.withdrawals.request(Number(withdrawAmount.value), selectedBankId.value || undefined)
    notify(`Withdrawal request of ₹${withdrawAmount.value} submitted for admin approval!`)
    await fetchPayoutData()
    await loadPartnerData()
  } catch (err: any) {
    notify('Withdrawal request failed: ' + err.message, 'error')
  }
}

// ── Reviews ────────────────────────────────────────────────────────────
async function fetchReviews() {
  try {
    const res = await api.reviews.getMyPartnerReviews()
    reviewStats.value = (res as any)?.data ?? res
  } catch (err: any) {
    notify('Failed to load reviews: ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Quick Status Hero -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md">
          <Wrench class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ profile?.name || 'Service Partner Dashboard' }}</h2>
          <p class="text-xs text-slate-500">Rating: ⭐ {{ profile?.rating || '4.9' }} • Completed: {{ profile?.completedOrdersCount || '48' }} jobs</p>
        </div>
      </div>

      <!-- Online / Offline Switcher -->
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold uppercase" :class="isOnline ? 'text-emerald-600' : 'text-slate-400'">
          ● {{ isOnline ? 'Ready for Dispatch' : 'Offline' }}
        </span>
        <button
          @click="toggleOnlineStatus"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          :class="isOnline ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'"
        >
          {{ isOnline ? 'Go Offline' : 'Go Online Now' }}
        </button>
      </div>
    </div>

    <!-- ── TAB 1: ASSIGNED ORDERS ────────────────────────────────────── -->
    <div v-if="activeTab === 'jobs'" class="space-y-4 max-w-5xl mx-auto">
      <PartnerOrdersView />
    </div>

    <!-- ── TAB 2: SHIFT & VERIFICATION ───────────────────────────────── -->
    <div v-if="activeTab === 'profile'" class="max-w-4xl mx-auto space-y-6">
      <!-- My profile -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h3 class="text-base font-bold text-slate-800">My profile</h3>
          <p class="text-xs text-slate-500">This is how customers see you.</p>
        </div>

        <div class="flex items-center gap-4">
          <img
            v-if="profileImagePreview || myProfile?.imageId"
            :src="profileImagePreview || myProfile?.imageId"
            alt="Profile photo"
            class="w-20 h-20 rounded-full object-cover border border-slate-200"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center text-xl font-black"
          >
            {{ (profileForm.name || 'P').trim().charAt(0).toUpperCase() }}
          </div>
          <div class="space-y-1.5">
            <label class="inline-block px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
              {{ profileImageFile ? 'Choose a different photo' : 'Change photo' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleProfileImage" />
            </label>
            <button
              v-if="profileImageFile"
              type="button"
              class="ml-2 text-xs font-semibold text-slate-500 hover:text-red-600"
              @click="clearProfileImage"
            >
              Remove
            </button>
            <p class="text-[11px] text-slate-400">JPG, PNG or WebP, up to 5 MB.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Full name</label>
            <input v-model="profileForm.name" type="text" maxlength="100" class="w-full text-xs rounded-lg border-slate-300" />
          </div>
          <Select v-model="profileForm.gender" label="Gender" placeholder="Select gender" :options="GENDER_OPTIONS" />
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Date of birth</label>
            <input v-model="profileForm.dob" type="date" class="w-full text-xs rounded-lg border-slate-300" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span class="block font-semibold text-slate-600 mb-1">Email</span>
            <div class="flex items-center gap-2">
              <p class="flex-1 min-w-0 truncate px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                {{ myProfile?.email || 'Not added yet' }}
              </p>
              <button
                v-if="emailStep === 'idle'"
                type="button"
                class="shrink-0 px-3 py-2 text-xs font-bold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                @click="emailStep = 'enter'"
              >
                {{ myProfile?.email ? 'Change' : 'Add' }}
              </button>
            </div>

            <div v-if="emailStep !== 'idle'" class="mt-2 p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl space-y-2">
              <template v-if="emailStep === 'enter'">
                <label class="block font-semibold text-slate-600">New email address</label>
                <input
                  v-model="newEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full text-xs rounded-lg border-slate-300 h-6 p-2"
                  @keyup.enter="sendEmailCode"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    :disabled="isEmailBusy"
                    class="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-black disabled:opacity-50"
                    @click="sendEmailCode"
                  >
                    {{ isEmailBusy ? 'Sending...' : 'Send code' }}
                  </button>
                  <button type="button" class="px-3 py-1.5 text-slate-600 rounded-lg font-semibold hover:bg-slate-100" @click="cancelEmailChange">
                    Cancel
                  </button>
                </div>
              </template>

              <template v-else>
                <p class="text-slate-600">Enter the 6-digit code we sent to <strong class="break-all">{{ newEmail }}</strong>.</p>
                <input
                  v-model="emailOtp"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="123456"
                  autocomplete="one-time-code"
                  class="w-full text-sm tracking-[0.4em] text-center font-mono rounded-lg border-slate-300"
                  @keyup.enter="confirmEmailCode"
                />
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    :disabled="isEmailBusy"
                    class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                    @click="confirmEmailCode"
                  >
                    {{ isEmailBusy ? 'Verifying...' : 'Verify and update' }}
                  </button>
                  <button
                    type="button"
                    :disabled="isEmailBusy || resendSeconds > 0"
                    class="px-3 py-1.5 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    @click="sendEmailCode"
                  >
                    {{ resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code' }}
                  </button>
                  <button type="button" class="px-3 py-1.5 text-slate-600 rounded-lg font-semibold hover:bg-slate-100" @click="emailStep = 'enter'">
                    Use a different email
                  </button>
                  <button type="button" class="px-3 py-1.5 text-slate-500 rounded-lg font-semibold hover:bg-slate-100" @click="cancelEmailChange">
                    Cancel
                  </button>
                </div>
              </template>
            </div>
          </div>
          <div>
            <span class="block font-semibold text-slate-600 mb-1">Mobile number</span>
            <p class="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">{{ myProfile?.phone || authStore.user?.mobileNo || '-' }}</p>
          </div>
        </div>
        <p class="text-[11px] text-slate-400 -mt-2">A new email is saved only after you enter the code we send to it. Your mobile number can't be changed here.</p>

        <button
          type="button"
          :disabled="isSavingProfile"
          class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50"
          @click="saveProfile"
        >
          {{ isSavingProfile ? 'Saving...' : 'Save profile' }}
        </button>
      </div>

      <!-- Schedule -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-800">Operational Work Schedule</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Shift Start Time</label>
            <input type="time" v-model="shiftStart" class="w-full text-xs rounded-lg border-slate-300" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Shift End Time</label>
            <input type="time" v-model="shiftEnd" class="w-full text-xs rounded-lg border-slate-300" />
          </div>
        </div>
        <button
          @click="saveSchedule"
          class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black"
        >
          Save Shift Schedule
        </button>
      </div>

      <!-- KYC Documents -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-800">Upload KYC & Certification Documents</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Document Type</label>
            <select v-model="kycDocType" class="w-full text-xs rounded-lg border-slate-300">
              <option value="AADHAAR">Aadhaar Card (Identity)</option>
              <option value="PAN">PAN Card (Tax Payouts)</option>
              <option value="CERTIFICATE">Trade Certificate</option>
              <option value="POLICE_VERIFICATION">Police Clearance</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Select File</label>
            <input type="file" @change="handleDocFile" class="w-full text-xs" />
          </div>
        </div>
        <button
          @click="uploadKycDoc"
          class="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
        >
          Submit Document
        </button>
      </div>
    </div>

    <!-- ── TAB 3: REWORK DISPUTES ────────────────────────────────────── -->
    <div v-if="activeTab === 'reworks'" class="max-w-4xl mx-auto space-y-4">
      <h3 class="text-base font-bold text-slate-800">Assigned Rework Claims</h3>

      <div v-if="reworks.length === 0" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
        No customer rework disputes currently reported. Great work maintaining quality!
      </div>

      <div
        v-for="rw in reworks"
        :key="rw.reworkId"
        class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
      >
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <span class="text-xs font-bold text-slate-800">Order #{{ rw.orderId }}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 uppercase">
            {{ rw.status }}
          </span>
        </div>
        <p class="text-xs text-slate-600 font-medium">Customer Claim: {{ rw.reason }}</p>

        <div v-if="rw.clarification" class="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
          <span class="font-bold">Your Submitted Clarification:</span> {{ rw.clarification }}
        </div>

        <div v-else class="space-y-2 pt-2 border-t border-slate-100">
          <textarea
            v-model="reworkClarification"
            placeholder="Write your explanation or rebuttal to the Ground Manager..."
            class="w-full text-xs rounded-xl border-slate-300 p-2.5"
            rows="2"
          ></textarea>
          <button
            @click="submitClarification(rw.reworkId)"
            class="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
          >
            Submit Clarification
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB 4: WALLET ONLY ──────────────────────────────────────── -->
    <div v-if="activeTab === 'wallet'" class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900">Wallet & Earnings</h3>
          <p class="text-xs text-slate-500">Track your service revenue, bonuses, and ledger statement.</p>
        </div>
        <button
          @click="fetchPayoutData"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingWallet }" />
          Refresh
        </button>
      </div>

      <!-- Wallet balances -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Withdrawable balance</p>
          <p class="text-2xl font-black text-emerald-600 mt-1">{{ inr(withdrawableBalance) }}</p>
          <p class="text-[11px] text-slate-400 mt-1">Available for bank transfer</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bonus balance</p>
          <p class="text-2xl font-black text-amber-600 mt-1">{{ inr(bonusBalance) }}</p>
          <p class="text-[11px] text-slate-400 mt-1">Spendable on platform, non-withdrawable</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in wallet</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ inr(totalWalletBalance) }}</p>
          <p class="text-[11px] text-slate-400 mt-1">{{ isLoadingWallet ? 'Refreshing...' : 'Withdrawable + bonus' }}</p>
        </div>
      </div>

      <!-- Add money -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 class="text-base font-bold text-slate-800">Add money to wallet</h3>
          <p class="text-xs text-slate-500">Pay online; the amount is added once the payment succeeds.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="a in QUICK_AMOUNTS"
            :key="a"
            type="button"
            class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors"
            :class="Number(rechargeForm.amount) === a
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
            @click="rechargeForm.amount = a"
          >
            ₹{{ a }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Amount (₹)</label>
            <input type="number" min="1" v-model="rechargeForm.amount" class="w-full text-xs rounded-lg border-slate-300 font-bold" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input type="email" v-model="rechargeForm.email" placeholder="you@example.com" class="w-full text-xs rounded-lg border-slate-300" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Mobile number</label>
            <input type="tel" maxlength="10" v-model="rechargeForm.phone" placeholder="10-digit number" class="w-full text-xs rounded-lg border-slate-300 font-mono" />
          </div>
        </div>

        <button
          type="button"
          :disabled="isStartingRecharge"
          class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          @click="startRecharge"
        >
          {{ isStartingRecharge ? 'Creating payment...' : `Add ₹${Number(rechargeForm.amount) || 0} to wallet` }}
        </button>

        <!-- Waiting for the payment -->
        <div v-if="pendingRecharge" class="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
          <p class="font-bold text-amber-800">Payment of ₹{{ pendingRecharge.amount }} is waiting</p>
          <p class="text-amber-700">Finish paying in the payment tab, then check the payment here. It also checks when you come back to this page.</p>
          <div class="flex flex-wrap gap-2">
            <a
              v-if="pendingRecharge.paymentUrl"
              :href="pendingRecharge.paymentUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg font-bold hover:bg-amber-100"
            >
              Open payment page
            </a>
            <button
              type="button"
              :disabled="isCheckingRecharge"
              class="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 disabled:opacity-50"
              @click="checkRecharge()"
            >
              {{ isCheckingRecharge ? 'Checking...' : 'Check payment' }}
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-amber-700 rounded-lg font-semibold hover:bg-amber-100"
              @click="pendingRecharge = null"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction history -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800">Wallet transactions</h3>
          <span class="text-[11px] text-slate-400">{{ transactions.length }} total</span>
        </div>
        <div v-if="transactions.length === 0" class="py-6 text-center text-xs text-slate-400">
          {{ isLoadingWallet ? 'Loading transactions...' : 'No wallet transactions yet.' }}
        </div>
        <ul v-else class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          <li v-for="t in transactions" :key="t.id" class="py-3 flex items-start justify-between gap-4 text-xs">
            <div class="min-w-0">
              <p class="font-bold text-slate-800">{{ TX_LABELS[t.transactionType] || t.transactionType }}</p>
              <p v-if="t.description" class="text-slate-500 mt-0.5">{{ t.description }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">{{ txDateTime(t.createdAt) }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="font-black" :class="isCredit(t) ? 'text-emerald-600' : 'text-red-600'">
                {{ isCredit(t) ? '+' : '-' }}{{ inr(t.amount) }}
              </p>
              <span v-if="t.status" class="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border" :class="txStatusClass(t.status)">
                {{ t.status }}
              </span>
              <p v-if="t.totalBalance != null" class="text-[10px] text-slate-400 mt-0.5">Balance {{ inr(t.totalBalance) }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── TAB 5: WITHDRAWALS ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'withdrawals'" class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900">Withdrawals & Payouts</h3>
          <p class="text-xs text-slate-500">Request payout transfers to your linked bank account and track status.</p>
        </div>
        <button
          @click="fetchPayoutData"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingWallet }" />
          Refresh
        </button>
      </div>

      <!-- Request Payout Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800">Request Bank Transfer</h3>
          <p class="text-xs text-slate-500">
            Withdrawable Balance: <span class="font-bold text-emerald-600 text-sm">₹{{ wallet?.balance ?? 0 }}</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Amount to Withdraw (₹)</label>
            <input
              type="number"
              v-model="withdrawAmount"
              :max="wallet?.balance ?? 0"
              min="100"
              class="w-full text-xs rounded-xl border-slate-300 font-bold p-2.5"
              placeholder="Enter amount (min ₹100)"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Destination Bank Account</label>
            <select
              v-model="selectedBankId"
              class="w-full text-xs rounded-xl border-slate-300 p-2.5 bg-white font-medium"
            >
              <option v-if="bankAccounts.length === 0" value="" disabled>No bank account linked</option>
              <option v-for="b in bankAccounts" :key="b.bankId" :value="b.bankId">
                {{ b.accountHolderName }} • {{ b.bankName || 'Bank' }} ({{ b.accountNumber.slice(-4) }})
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <RouterLink
            to="/?tab=bank"
            class="text-xs text-indigo-600 hover:underline font-semibold"
          >
            + Add or manage bank accounts
          </RouterLink>

          <button
            @click="requestPayout"
            :disabled="!withdrawAmount || withdrawAmount <= 0 || (wallet?.balance ?? 0) < withdrawAmount"
            class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Request Bank Transfer
          </button>
        </div>
      </div>

      <!-- Withdrawal requests History -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800">Withdrawal Request History</h3>
          <span class="text-[11px] text-slate-400">{{ withdrawals.length }} total</span>
        </div>
        <div v-if="withdrawals.length === 0" class="py-6 text-center text-xs text-slate-400">
          You haven't requested any withdrawals yet.
        </div>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="w in withdrawals" :key="w.requestId" class="py-3 flex items-start justify-between gap-4 text-xs">
            <div>
              <p class="font-bold text-slate-800 text-sm">{{ inr(w.amount) }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">{{ txDateTime(w.createdAt) }}</p>
              <p v-if="w.reason" class="text-slate-500 mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[11px]">
                <strong>Note:</strong> {{ w.reason }}
              </p>
            </div>
            <span
              class="self-start text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
              :class="w.status === 'APPROVED' || w.status === 'TRANSFERRED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : w.status === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'"
            >
              {{ w.status }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── TAB 6: BANK ACCOUNTS ───────────────────────────────────────── -->
    <div v-if="activeTab === 'bank'" class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900">Linked Bank Accounts</h3>
          <p class="text-xs text-slate-500">Manage bank accounts and payout destinations for your earnings.</p>
        </div>
        <button
          @click="fetchPayoutData"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingWallet }" />
          Refresh
        </button>
      </div>

      <!-- Add Bank Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-800">Add New Bank Account</h3>
        <form @submit.prevent="saveBankAccount" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Account Holder Name *</label>
              <input
                v-model="newBank.accountHolderName"
                placeholder="e.g. Rahul Sharma"
                required
                class="w-full text-xs rounded-xl border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
              <input
                v-model="newBank.bankName"
                placeholder="e.g. HDFC Bank / State Bank of India"
                class="w-full text-xs rounded-xl border-slate-300 p-2.5"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Account Number *</label>
              <input
                v-model="newBank.accountNumber"
                placeholder="Account Number"
                required
                class="w-full text-xs rounded-xl border-slate-300 font-mono p-2.5"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">IFSC Code *</label>
              <input
                v-model="newBank.ifscCode"
                placeholder="e.g. HDFC0001234"
                required
                class="w-full text-xs rounded-xl border-slate-300 font-mono uppercase p-2.5"
              />
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="submit"
              :disabled="!newBank.accountHolderName || !newBank.accountNumber || !newBank.ifscCode"
              class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
            >
              Save Bank Account
            </button>
          </div>
        </form>
      </div>

      <!-- Saved Bank Accounts List -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800">Your Bank Accounts ({{ bankAccounts.length }})</h3>
          <span class="text-xs text-slate-400">Withdrawals are credited to verified accounts.</span>
        </div>

        <div v-if="bankAccounts.length === 0" class="py-8 text-center text-xs text-slate-400">
          No bank accounts linked yet. Add your account above to receive withdrawals.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" v-else>
          <div
            v-for="b in bankAccounts"
            :key="b.bankId"
            class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs shadow-xs"
          >
            <div class="space-y-0.5">
              <p class="font-bold text-slate-900">{{ b.accountHolderName }}</p>
              <p class="text-slate-600 font-medium">{{ b.bankName || 'Bank' }}</p>
              <p class="text-slate-400 font-mono text-[11px]">
                A/C: •••• {{ b.accountNumber.slice(-4) }} • IFSC: {{ b.ifscCode }}
              </p>
            </div>
            <button
              @click="deleteBank(b.bankId)"
              class="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove account"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 5: REVIEWS ────────────────────────────────────────────── -->
    <div v-if="activeTab === 'reviews'" class="max-w-4xl mx-auto space-y-4">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-800">Partner Reputation Score</h3>
          <p class="text-xs text-slate-500">Based on verified completed service bookings</p>
        </div>
        <div class="text-right">
          <h2 class="text-3xl font-black text-amber-500">⭐ {{ reviewStats?.averageRating || '4.9' }}</h2>
          <p class="text-xs text-slate-400">{{ reviewStats?.totalReviews || 12 }} verified ratings</p>
        </div>
      </div>
    </div>
  </div>
</template>
