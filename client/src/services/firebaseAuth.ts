import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '@/config/FirebaseConfig'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { FirebaseLoginResponse, AuthUser } from '@/types/api'

/**
 * Format phone numbers to E.164 required by Firebase Auth.
 * Defaults to +91 (India) for 10-digit numbers matching standard mobile format.
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.trim().replace(/[\s-]/g, '')
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`
  }
  return cleaned
}

/**
 * Persists token and user info across Pinia stores and localStorage.
 */
export function applyAuthSuccess(response: FirebaseLoginResponse): void {
  const authStore = useAuthStore()
  const appStore = useAppStore()

  const accessToken = response.accessToken
  if (!accessToken) return

  const user = response.data
  const mappedUser: AuthUser = {
    userId: user.id,
    name: user.fullName,
    mobileNo: user.mobileNo,
    emailId: user.email,
    role: user.userType === 'NORMAL' ? 'CUSTOMER' : (user.userType as any),
    status: 'ACTIVE',
    refreshToken: response.refreshToken || null,
    isVerified: user.isEmailVerified ?? true,
  }

  authStore.setAuth(accessToken, mappedUser)
  appStore.setToken(accessToken)
}

/**
 * Sign in with Google using Firebase Auth popup, then authenticate with backend.
 */
export async function loginWithGoogle(
  role: 'CUSTOMER' | 'PARTNER',
  referralCode?: string
): Promise<FirebaseLoginResponse> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const credential = await signInWithPopup(auth, provider)
  const firebaseIdToken = await credential.user.getIdToken(true)

  const response = await api.auth.firebaseLogin(role, firebaseIdToken, {
    deviceType: 'WEB',
    referralCode: referralCode?.trim() || undefined,
  })

  applyAuthSuccess(response)
  return response
}

/**
 * Set up invisible RecaptchaVerifier for Phone OTP verification.
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
}

/**
 * Send SMS OTP using Firebase Phone Auth.
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const formatted = formatPhoneNumber(phoneNumber)
  return await signInWithPhoneNumber(auth, formatted, appVerifier)
}

/**
 * Verify SMS OTP and complete login with backend.
 */
export async function verifyFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string,
  role: 'CUSTOMER' | 'PARTNER',
  referralCode?: string
): Promise<FirebaseLoginResponse> {
  const credential = await confirmationResult.confirm(otpCode.trim())
  const firebaseIdToken = await credential.user.getIdToken(true)

  const response = await api.auth.firebaseLogin(role, firebaseIdToken, {
    deviceType: 'WEB',
    referralCode: referralCode?.trim() || undefined,
  })

  applyAuthSuccess(response)
  return response
}

/**
 * Sign out from Firebase and clear application auth state.
 */
export async function logoutUser(): Promise<void> {
  const authStore = useAuthStore()
  const appStore = useAppStore()

  try {
    await firebaseSignOut(auth)
  } catch (err) {
    console.error('Firebase signout failed:', err)
  }

  authStore.clearAuth()
  appStore.clearAuth()
}

