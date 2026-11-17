<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import {
  loginWithGoogle,
  setupRecaptcha,
  sendFirebasePhoneOtp,
  verifyFirebasePhoneOtp,
  formatPhoneNumber,
} from '@/services/firebaseAuth'
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth'
import {
  Shield,
  Key,
  Lock,
  UserPlus,
  LogIn,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  User,
} from 'lucide-vue-next'
import type { AuthUser, UserRole } from '@/types/api'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

// Hidden Admin Testing Portal State
const isAdminPortalOpen = ref(false)
const adminTab = ref<'LOGIN' | 'REGISTER'>('LOGIN')
const adminError = ref('')
const adminSuccess = ref('')
const isAdminLoading = ref(false)
const brandClickCount = ref(0)

const adminLoginForm = ref({
  email: 'admin@omibay.com',
  password: '',
  token: '',
})

const adminRegisterForm = ref({
  name: 'System Admin',
  email: 'admin@omibay.com',
  masterKey: 'OMIBAY_ADMIN_2026',
  role: 'ADMIN' as 'ADMIN' | 'GROUND_MANAGER' | 'ORGANISATION',
})

function triggerBrandClick() {
  brandClickCount.value++
  if (brandClickCount.value >= 3) {
    isAdminPortalOpen.value = true
    brandClickCount.value = 0
  }
}

function handleAdminLogin(rolePreset?: 'ADMIN' | 'GROUND_MANAGER' | 'ORGANISATION') {
  adminError.value = ''
  adminSuccess.value = ''
  isAdminLoading.value = true

  const targetRole = rolePreset || 'ADMIN'
  const email = rolePreset ? `${rolePreset.toLowerCase()}@omibay.com` : (adminLoginForm.value.email || 'admin@omibay.com')
  const customToken = adminLoginForm.value.token.trim() || `omibay_${targetRole.toLowerCase()}_token_${Date.now()}`

  try {
    const adminUser = {
      userId: `admin-${Date.now().toString().slice(-4)}`,
      name: rolePreset === 'GROUND_MANAGER' ? 'Ground Manager' : rolePreset === 'ORGANISATION' ? 'Corporate Org' : 'Super Administrator',
      mobileNo: '9876543210',
      emailId: email,
      role: targetRole,
      status: 'ACTIVE' as const,
      refreshToken: `mock-refresh-${targetRole.toLowerCase()}`,
      isVerified: true,
    }

    appStore.setToken(customToken)
    authStore.setAuth(customToken, adminUser)

    adminSuccess.value = `Logged in as ${targetRole}! Redirecting to dashboard...`
    setTimeout(() => {
      router.push('/')
    }, 800)
  } catch (err: any) {
    adminError.value = err?.message || 'Admin login failed'
  } finally {
    isAdminLoading.value = false
  }
}

function handleAdminRegister() {
  adminError.value = ''
  adminSuccess.value = ''
  isAdminLoading.value = true

  if (!adminRegisterForm.value.email || !adminRegisterForm.value.name) {
    adminError.value = 'Name and email are required'
    isAdminLoading.value = false
    return
  }

  try {
    const token = `omibay_${adminRegisterForm.value.role.toLowerCase()}_token_${Date.now()}`
    const newAdminUser = {
      userId: `admin-${Date.now().toString().slice(-4)}`,
      name: adminRegisterForm.value.name,
      mobileNo: '9876543210',
      emailId: adminRegisterForm.value.email,
      role: adminRegisterForm.value.role,
      status: 'ACTIVE' as const,
      refreshToken: `mock-refresh-${adminRegisterForm.value.role.toLowerCase()}`,
      isVerified: true,
    }

    appStore.setToken(token)
    authStore.setAuth(token, newAdminUser)

    adminSuccess.value = `Admin profile registered & authenticated! Redirecting...`
    setTimeout(() => {
      router.push('/')
    }, 800)
  } catch (err: any) {
    adminError.value = err?.message || 'Admin registration failed'
  } finally {
    isAdminLoading.value = false
  }
}

// State
const authMethod = ref<'OTP' | 'PASSWORD_LOGIN' | 'PASSWORD_REGISTER'>('OTP')
const step = ref<'INPUT' | 'OTP'>('INPUT')
const targetIdentifier = ref('')
const otp = ref('')
const referralCode = ref('')
const userRole = ref<'CUSTOMER' | 'PARTNER'>('CUSTOMER')
const isExistingUser = ref(false)
const otpToken = ref('') // JWT otp_validation token if returned in backend body

// Password Authentication Form States
const showPassword = ref(false)
const passwordLoginForm = ref({
  identifier: '',
  password: '',
})
const passwordRegisterForm = ref({
  name: '',
  emailId: '',
  mobileNo: '',
  password: '',
  referralCode: '',
})

// Firebase Phone Auth state
const isFirebasePhoneFlow = ref(false)
let recaptchaVerifier: RecaptchaVerifier | null = null
let confirmationResult: ConfirmationResult | null = null

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isPhone = computed(() => {
  const val = targetIdentifier.value.trim()
  return !val.includes('@') && /^[+]?[\d\s-]{10,15}$/.test(val)
})

// --- Google Sign-In with Firebase ---
async function handleGoogleLogin() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    await loginWithGoogle(userRole.value, referralCode.value)
    successMessage.value = 'Signed in with Google successfully! Redirecting...'
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') {
      errorMessage.value = 'Sign-in popup was closed before completing.'
    } else if (err?.code === 'auth/popup-blocked') {
      errorMessage.value = 'Popup was blocked by the browser. Please allow popups for this site.'
    } else if (err?.code === 'auth/cancelled-popup-request') {
      // Ignored: new popup opened
    } else {
      errorMessage.value = err?.message || 'Google sign-in failed. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

// --- Step 1: Send OTP (Firebase SMS for Phone, Backend API for Email) ---
async function handleSendOtp() {
  errorMessage.value = ''
  successMessage.value = ''

  const identifier = targetIdentifier.value.trim()
  if (!identifier) {
    errorMessage.value = 'Please enter your mobile number or email address.'
    return
  }

  isLoading.value = true

  try {
    if (isPhone.value) {
      // Firebase Phone Auth Flow
      if (!recaptchaVerifier) {
        recaptchaVerifier = setupRecaptcha('recaptcha-container')
      }
      confirmationResult = await sendFirebasePhoneOtp(identifier, recaptchaVerifier)
      isFirebasePhoneFlow.value = true
      successMessage.value = `SMS OTP sent to ${formatPhoneNumber(identifier)}`
      step.value = 'OTP'
    } else {
      // Backend Email OTP Flow
      isFirebasePhoneFlow.value = false
      const data = await api.auth.sendOtp(identifier)

      if (data?.message) {
        otpToken.value = data.message
      }
      isExistingUser.value = (data as any)?.isExistingUser ?? false

      successMessage.value = `OTP has been sent to ${identifier}`
      step.value = 'OTP'
    }
  } catch (err: any) {
    // Reset recaptcha if phone verification failed
    if (isPhone.value && recaptchaVerifier) {
      try {
        recaptchaVerifier.clear()
      } catch {}
      recaptchaVerifier = null
    }

    if (err?.code === 'auth/invalid-phone-number') {
      errorMessage.value = 'The phone number format is invalid. Please enter a valid number.'
    } else if (err?.code === 'auth/too-many-requests') {
      errorMessage.value = 'Too many requests. Please try again later.'
    } else {
      errorMessage.value = err?.message || 'Failed to send OTP. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

// --- Step 2: Verify OTP ---
async function handleVerifyOtp() {
  errorMessage.value = ''
  successMessage.value = ''

  const otpCode = otp.value.trim()
  if (!otpCode || otpCode.length < 4) {
    errorMessage.value = 'Please enter a valid OTP code.'
    return
  }

  isLoading.value = true

  try {
    if (isFirebasePhoneFlow.value && confirmationResult) {
      // Firebase Phone Verification
      await verifyFirebasePhoneOtp(
        confirmationResult,
        otpCode,
        userRole.value,
        referralCode.value
      )
      successMessage.value = 'Phone verification successful! Redirecting...'
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      // Backend OTP Verification
      const payload = {
        targetIdentifier: targetIdentifier.value.trim(),
        otp: otpCode,
        isExistingUser: isExistingUser.value,
        appliedReferralCode: referralCode.value.trim() || undefined,
      }

      const resp = await api.auth.verifyOtp(userRole.value, payload, otpToken.value)
      const body = (resp as any)?.data ?? resp

      const accessToken = body?.accessToken || body?.signupToken
      if (accessToken) {
        appStore.setToken(accessToken)
        if (body?.user) {
          authStore.setAuth(accessToken, body.user)
        } else {
          authStore.setToken(accessToken)
        }
      }

      successMessage.value = 'Verification successful! Redirecting...'
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (err: any) {
    if (err?.code === 'auth/invalid-verification-code') {
      errorMessage.value = 'Incorrect OTP entered. Please check and try again.'
    } else if (err?.code === 'auth/code-expired') {
      errorMessage.value = 'The OTP code has expired. Please request a new one.'
    } else {
      errorMessage.value = err?.message || 'Verification failed. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  step.value = 'INPUT'
  otp.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  confirmationResult = null
  isFirebasePhoneFlow.value = false
}

// --- Password Login Flow ---
async function handlePasswordLogin() {
  errorMessage.value = ''
  successMessage.value = ''

  const identifier = passwordLoginForm.value.identifier.trim()
  const password = passwordLoginForm.value.password

  if (!identifier || !password) {
    errorMessage.value = 'Please enter your mobile or email, and password.'
    return
  }

  isLoading.value = true
  try {
    const resp = await api.auth.login({
      identifier,
      password,
    })

    const data: any = (resp as any)?.data ?? resp
    const accessToken = data?.accessToken

    if (!accessToken) {
      throw new Error(data?.message || 'Login failed: No access token received.')
    }

    const authUser: AuthUser = {
      userId: data.userId || `user-${Date.now().toString().slice(-4)}`,
      name: data.name || (identifier.includes('@') ? identifier.split('@')[0] : 'User'),
      mobileNo: data.mobileNo || (identifier.includes('@') ? '' : identifier),
      emailId: data.email || (identifier.includes('@') ? identifier : null),
      role: (data.role as UserRole) || userRole.value,
      status: 'ACTIVE',
      refreshToken: data.refreshToken || null,
      isVerified: data.emailVerified ?? true,
    }

    appStore.setToken(accessToken)
    authStore.setAuth(accessToken, authUser)

    successMessage.value = 'Signed in successfully! Redirecting...'
    setTimeout(() => {
      router.push('/')
    }, 800)
  } catch (err: any) {
    if (err?.status === 404 || err?.message?.includes('404')) {
      errorMessage.value =
        'Backend route POST /api/v1/auth/login is currently disabled/commented out in AuthController.java.'
    } else {
      errorMessage.value = err?.message || 'Invalid credentials or login failed.'
    }
  } finally {
    isLoading.value = false
  }
}

// --- Password Registration Flow (Enforced Role: CUSTOMER) ---
async function handlePasswordRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  const { name, emailId, mobileNo, password, referralCode: refCode } = passwordRegisterForm.value

  if (!name.trim() || !emailId.trim() || !mobileNo.trim() || !password) {
    errorMessage.value = 'Please fill in all required fields (Name, Email, Mobile, Password).'
    return
  }

  isLoading.value = true
  try {
    const payload = {
      name: name.trim(),
      emailId: emailId.trim(),
      mobileNo: mobileNo.trim(),
      password,
      referralCode: refCode.trim() || undefined,
    }

    // Explicitly enforce role as CUSTOMER for email/password registration
    userRole.value = 'CUSTOMER'
    const resp = await api.auth.registerCustomer(payload)

    const data: any = (resp as any)?.data ?? resp
    const accessToken = data?.accessToken

    if (accessToken) {
      const authUser: AuthUser = {
        userId: data.userId || `user-${Date.now().toString().slice(-4)}`,
        name: data.name || name.trim(),
        mobileNo: data.mobileNo || mobileNo.trim(),
        emailId: data.email || emailId.trim(),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        refreshToken: data.refreshToken || null,
        isVerified: data.emailVerified ?? false,
      }

      appStore.setToken(accessToken)
      authStore.setAuth(accessToken, authUser)
      successMessage.value = 'Customer account registered successfully! Redirecting...'
      setTimeout(() => {
        router.push('/')
      }, 800)
    } else {
      successMessage.value = data?.message || 'Customer registered successfully! Please sign in with your password.'
      authMethod.value = 'PASSWORD_LOGIN'
      userRole.value = 'CUSTOMER'
      passwordLoginForm.value.identifier = emailId.trim()
    }
  } catch (err: any) {
    if (err?.status === 404 || err?.message?.includes('404')) {
      errorMessage.value = 'Backend route POST /api/v1/auth/register/customer is currently disabled/commented out in AuthController.java.'
    } else {
      errorMessage.value = err?.message || 'Registration failed. Please check your information.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4 py-12">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 border border-[#E5E7EB]">
      
      <!-- Brand Header (click 3x as secret trigger) -->
      <div class="text-center mb-8">
        <h1
          @click="triggerBrandClick"
          class="text-3xl font-extrabold tracking-tight cursor-pointer select-none"
          title="Click 3 times for Admin Testing Portal"
        >
          <span class="text-[#202124]">OMI</span><span class="text-[#800020]">BAY</span>
        </h1>
        <p class="text-xs text-[#800020] font-semibold tracking-wider mt-1 uppercase">
          Service Marketplace
        </p>
        <p class="text-sm text-[#6B7280] mt-2">
          {{
            authMethod === 'OTP'
              ? (step === 'INPUT' ? 'Sign in with Phone, Email or Google' : 'Enter the verification code sent to you')
              : (authMethod === 'PASSWORD_LOGIN' ? 'Sign in with your email/mobile & password' : 'Create an account with password')
          }}
        </p>
      </div>



      <!-- Authentication Method Switcher -->
      <div class="grid grid-cols-3 gap-1 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB] p-1 mb-6 text-xs font-semibold">
        <button
          type="button"
          :class="[
            'py-2 px-1 rounded-lg text-center transition-all cursor-pointer',
            authMethod === 'OTP' ? 'bg-white text-[#800020] shadow-xs font-bold border-b-2 border-[#800020]' : 'text-[#6B7280] hover:text-[#202124]'
          ]"
          @click="authMethod = 'OTP'; errorMessage = ''; successMessage = ''"
        >
          OTP / Phone
        </button>
        <button
          type="button"
          :class="[
            'py-2 px-1 rounded-lg text-center transition-all cursor-pointer',
            authMethod === 'PASSWORD_LOGIN' ? 'bg-white text-[#800020] shadow-xs font-bold border-b-2 border-[#800020]' : 'text-[#6B7280] hover:text-[#202124]'
          ]"
          @click="authMethod = 'PASSWORD_LOGIN'; errorMessage = ''; successMessage = ''"
        >
          Password Login
        </button>
        <button
          type="button"
          :class="[
            'py-2 px-1 rounded-lg text-center transition-all cursor-pointer',
            authMethod === 'PASSWORD_REGISTER' ? 'bg-white text-[#800020] shadow-xs font-bold border-b-2 border-[#800020]' : 'text-[#6B7280] hover:text-[#202124]'
          ]"
          @click="authMethod = 'PASSWORD_REGISTER'; userRole = 'CUSTOMER'; errorMessage = ''; successMessage = ''"
        >
          Register
        </button>
      </div>

      <!-- Alerts -->
      <div v-if="errorMessage" class="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="mb-4 p-3.5 rounded-xl bg-[#FAF0F2] border border-[#800020]/20 text-[#800020] text-sm">
        {{ successMessage }}
      </div>

      <!-- ── METHOD 1: OTP / GOOGLE AUTH ───────────────────────── -->
      <template v-if="authMethod === 'OTP'">
        <!-- Step 1: Input -->
        <div v-if="step === 'INPUT'" class="space-y-4">
          <!-- Google Sign-In with Firebase -->
          <button
            type="button"
            :disabled="isLoading"
            @click="handleGoogleLogin"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#E5E7EB] rounded-xl bg-white hover:bg-[#F7F7F8] text-[#202124] font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <!-- Divider -->
          <div class="relative my-4 flex items-center justify-center">
            <div class="border-t border-[#E5E7EB] w-full"></div>
            <span class="bg-white px-3 text-xs uppercase tracking-wider text-[#6B7280] font-medium">or with phone / email</span>
          </div>

          <form @submit.prevent="handleSendOtp" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
                Mobile Number or Email
              </label>
              <input
                v-model="targetIdentifier"
                type="text"
                placeholder="e.g. 9876543210 or name@example.com"
                required
                class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
              />
              <p v-if="isPhone" class="mt-1 text-[11px] text-[#800020] font-medium">
                Mobile number detected — will send SMS OTP via Firebase
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
                Referral Code (Optional)
              </label>
              <input
                v-model="referralCode"
                type="text"
                placeholder="Have a referral code?"
                class="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3.5 px-4 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
            >
              {{ isLoading ? 'Sending OTP...' : (isPhone ? 'Send Firebase SMS OTP' : 'Send OTP') }}
            </button>
          </form>
        </div>

        <!-- Step 2: Verify OTP -->
        <form v-else @submit.prevent="handleVerifyOtp" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-[#202124] uppercase tracking-wider">
                One-Time Password (OTP)
              </label>
              <button
                type="button"
                @click="resetForm"
                class="text-xs font-semibold text-[#800020] hover:underline cursor-pointer"
              >
                Change {{ targetIdentifier.includes('@') ? 'Email' : 'Number' }}
              </button>
            </div>
            <input
              v-model="otp"
              type="text"
              maxlength="6"
              placeholder="Enter 6-digit OTP"
              required
              autofocus
              class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
              Referral Code (Optional)
            </label>
            <input
              v-model="referralCode"
              type="text"
              placeholder="Have a referral code?"
              class="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
          >
            {{ isLoading ? 'Verifying...' : 'Verify & Continue' }}
          </button>

          <div class="text-center pt-2">
            <button
              type="button"
              :disabled="isLoading"
              @click="handleSendOtp"
              class="text-xs font-medium text-[#6B7280] hover:text-[#202124] transition-colors cursor-pointer"
            >
              Didn't receive code? Resend OTP
            </button>
          </div>
        </form>
      </template>

      <!-- ── METHOD 2: PASSWORD LOGIN ──────────────────────────── -->
      <template v-else-if="authMethod === 'PASSWORD_LOGIN'">
        <form @submit.prevent="handlePasswordLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
              Mobile Number or Email
            </label>
            <div class="relative">
              <input
                v-model="passwordLoginForm.identifier"
                type="text"
                placeholder="name@example.com or 9876543210"
                required
                class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-[#202124] uppercase tracking-wider">
                Password
              </label>
            </div>
            <div class="relative">
              <input
                v-model="passwordLoginForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                required
                class="w-full px-4 py-3 pr-10 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm font-mono"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#202124] cursor-pointer"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
          >
            {{ isLoading ? 'Signing In...' : 'Sign In with Password' }}
          </button>

          <div class="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              @click="authMethod = 'PASSWORD_REGISTER'; errorMessage = ''; successMessage = ''"
              class="font-medium text-[#800020] hover:underline cursor-pointer"
            >
              Need an account? Register
            </button>
            <button
              type="button"
              @click="authMethod = 'OTP'; errorMessage = ''; successMessage = ''"
              class="text-[#6B7280] hover:text-[#202124] cursor-pointer"
            >
              Sign in with OTP / SMS
            </button>
          </div>
        </form>
      </template>

      <!-- ── METHOD 3: PASSWORD REGISTRATION ───────────────────── -->
      <template v-else-if="authMethod === 'PASSWORD_REGISTER'">
        <form @submit.prevent="handlePasswordRegister" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              v-model="passwordRegisterForm.name"
              type="text"
              placeholder="e.g. John Doe"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <input
                v-model="passwordRegisterForm.mobileNo"
                type="tel"
                placeholder="9876543210"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm font-mono"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                v-model="passwordRegisterForm.emailId"
                type="email"
                placeholder="name@example.com"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div class="relative">
              <input
                v-model="passwordRegisterForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Choose a secure password"
                required
                minlength="6"
                class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm font-mono"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#202124] cursor-pointer"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
              Referral Code (Optional)
            </label>
            <input
              v-model="passwordRegisterForm.referralCode"
              type="text"
              placeholder="Referral or invite code"
              class="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[#202124] placeholder-[#9CA3AF] text-sm"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm cursor-pointer mt-2"
          >
            {{ isLoading ? 'Creating Customer Account...' : 'Register as Customer' }}
          </button>

          <div class="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              @click="authMethod = 'PASSWORD_LOGIN'; errorMessage = ''; successMessage = ''"
              class="font-medium text-[#800020] hover:underline cursor-pointer"
            >
              Already have an account? Sign in
            </button>
            <button
              type="button"
              @click="authMethod = 'OTP'; errorMessage = ''; successMessage = ''"
              class="text-[#6B7280] hover:text-[#202124] cursor-pointer"
            >
              Sign in with OTP / SMS
            </button>
          </div>
        </form>
      </template>

      <!-- Invisible reCAPTCHA container for Firebase Phone Auth -->
      <div id="recaptcha-container"></div>

      <!-- Hidden Admin Testing Mode Trigger -->
      <div class="mt-6 pt-4 border-t border-[#E5E7EB] text-center">
        <button
          type="button"
          @click="isAdminPortalOpen = true"
          class="text-[11px] text-[#6B7280] hover:text-[#800020] transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium cursor-pointer"
        >
          <Lock class="w-3 h-3 text-[#6B7280]" />
          Admin Testing Portal (Temporary)
        </button>
      </div>

    </div>

    <!-- ── HIDDEN ADMIN LOGIN & REGISTER TESTING MODAL ────────────────── -->
    <div
      v-if="isAdminPortalOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 border border-[#E5E7EB] space-y-5">
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-[#E5E7EB] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#FAF0F2] text-[#800020] flex items-center justify-center border border-[#800020]/20 font-bold">
              <Shield class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-[#202124]">Admin Testing Portal</h3>
              <p class="text-[11px] text-[#6B7280]">Testing utility for Admin Login & Registration</p>
            </div>
          </div>
          <button
            type="button"
            @click="isAdminPortalOpen = false"
            class="p-1 rounded-lg text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Mode Toggle: Login vs Register -->
        <div class="flex rounded-xl bg-[#F7F7F8] border border-[#E5E7EB] p-1">
          <button
            type="button"
            :class="[
              'w-1/2 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              adminTab === 'LOGIN' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'
            ]"
            @click="adminTab = 'LOGIN'"
          >
            <LogIn class="w-3.5 h-3.5" />
            Admin Login
          </button>
          <button
            type="button"
            :class="[
              'w-1/2 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              adminTab === 'REGISTER' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'
            ]"
            @click="adminTab = 'REGISTER'"
          >
            <UserPlus class="w-3.5 h-3.5" />
            Admin Register
          </button>
        </div>

        <!-- Alerts -->
        <div v-if="adminError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ adminError }}</span>
        </div>
        <div v-if="adminSuccess" class="p-3 rounded-xl bg-[#FAF0F2] border border-[#800020]/20 text-[#800020] text-xs flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 shrink-0" />
          <span>{{ adminSuccess }}</span>
        </div>

        <!-- TAB A: ADMIN LOGIN -->
        <div v-if="adminTab === 'LOGIN'" class="space-y-4">
          <!-- Quick 1-Click Role Presets for Testing -->
          <div>
            <label class="block text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">
              ⚡ 1-Click Fast Presets (Testing)
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="handleAdminLogin('ADMIN')"
                class="p-2.5 rounded-xl border border-[#800020]/30 bg-[#FAF0F2] hover:bg-[#FAF0F2]/80 text-[#800020] text-left transition-colors cursor-pointer"
              >
                <p class="text-xs font-bold flex items-center gap-1">
                  <Shield class="w-3 h-3 text-[#800020]" />
                  Super Admin
                </p>
                <p class="text-[10px] text-[#800020]/80 mt-0.5">Full privileges</p>
              </button>

              <button
                type="button"
                @click="handleAdminLogin('GROUND_MANAGER')"
                class="p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F7F8] text-[#202124] text-left transition-colors cursor-pointer"
              >
                <p class="text-xs font-bold flex items-center gap-1">
                  <Sparkles class="w-3 h-3 text-[#800020]" />
                  Ground Mgr
                </p>
                <p class="text-[10px] text-[#6B7280] mt-0.5">Dispute mediator</p>
              </button>

              <button
                type="button"
                @click="handleAdminLogin('ORGANISATION')"
                class="p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F7F8] text-[#202124] text-left transition-colors cursor-pointer"
              >
                <p class="text-xs font-bold flex items-center gap-1">
                  <Key class="w-3 h-3 text-[#800020]" />
                  Corporate Org
                </p>
                <p class="text-[10px] text-[#6B7280] mt-0.5">Bulk corporate</p>
              </button>
            </div>
          </div>

          <!-- Divider -->
          <div class="relative my-2 flex items-center justify-center">
            <div class="border-t border-[#E5E7EB] w-full"></div>
            <span class="bg-white px-2 text-[10px] uppercase tracking-wider text-[#6B7280] font-medium">or custom credentials</span>
          </div>

          <!-- Form inputs -->
          <form @submit.prevent="handleAdminLogin()" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Admin Email</label>
              <input
                v-model="adminLoginForm.email"
                type="email"
                placeholder="admin@omibay.com"
                class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] font-mono focus:outline-none focus:border-[#800020] text-[#202124]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Password</label>
              <input
                v-model="adminLoginForm.password"
                type="password"
                placeholder="••••••••"
                class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] font-mono focus:outline-none focus:border-[#800020] text-[#202124]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Custom JWT Token (Optional Override)</label>
              <input
                v-model="adminLoginForm.token"
                type="text"
                placeholder="Bearer eyJhbGciOiJIUzI1NiIs..."
                class="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] font-mono text-[#6B7280] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <button
              type="submit"
              :disabled="isAdminLoading"
              class="w-full py-2.5 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              {{ isAdminLoading ? 'Authenticating...' : 'Sign in as Admin' }}
            </button>
          </form>
        </div>

        <!-- TAB B: ADMIN REGISTER -->
        <div v-else class="space-y-3">
          <form @submit.prevent="handleAdminRegister" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Admin Full Name</label>
              <input
                v-model="adminRegisterForm.name"
                type="text"
                placeholder="e.g. System Administrator"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Admin Email Address</label>
              <input
                v-model="adminRegisterForm.email"
                type="email"
                placeholder="admin@omibay.com"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] font-mono text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Target Role</label>
                <select
                  v-model="adminRegisterForm.role"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#202124] focus:outline-none focus:border-[#800020]"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="GROUND_MANAGER">GROUND_MANAGER</option>
                  <option value="ORGANISATION">ORGANISATION</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Master Key Code</label>
                <input
                  v-model="adminRegisterForm.masterKey"
                  type="text"
                  placeholder="OMIBAY_ADMIN_2026"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] font-mono text-[#202124] focus:outline-none focus:border-[#800020]"
                />
              </div>
            </div>

            <button
              type="submit"
              :disabled="isAdminLoading"
              class="w-full py-2.5 bg-[#800020] hover:bg-[#6b001b] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              {{ isAdminLoading ? 'Creating Profile...' : 'Register & Enter Dashboard' }}
            </button>
          </form>
        </div>

        <!-- Footer Back to Normal Login -->
        <div class="pt-2 text-center border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isAdminPortalOpen = false"
            class="text-xs text-[#6B7280] hover:text-[#202124] font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            Back to Customer Login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
