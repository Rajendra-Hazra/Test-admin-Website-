// Common API Response Wrappers
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: any[]
  timestamp?: string
  [key: string]: any
}

// Health Check
export interface HealthStatus {
  status: string
  service: string
  timestamp: string
}

// Authentication Types
export interface OtpResponse {
  message: string // contains JWT token or status
  targetIdentifier: string
  sent: boolean
}

export type UserRole = 'CUSTOMER' | 'PARTNER' | 'ORGANISATION' | 'ADMIN' | 'GROUND_MANAGER'

export interface AuthUser {
  userId: string
  name: string | null
  mobileNo: string | null
  emailId: string | null
  role: UserRole
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'PENDING_VERIFICATION'
  refreshToken: string | null
  isVerified: boolean | null
}

export interface AuthVerifyResponse {
  message?: string
  accessToken?: string
  signupToken?: string
  user?: AuthUser
  // legacy flat fields (login flow)
  userId?: string
  role?: UserRole
  name?: string
  mobileNo?: string
}

export interface LoginPayload {
  identifier: string // mobile number or email address
  password: string
}

export interface RegisterPayload {
  name: string
  mobileNo: string
  emailId: string
  password: string
  gender?: string
  dob?: string
  referralCode?: string
}

export interface AuthTokenResponse {
  accessToken: string
  refreshToken: string
  userId: string
  role: UserRole
  name: string
  mobileNo: string
  email?: string
  emailVerified?: boolean
  newUser?: boolean
}

export interface FirebaseLoginRequest {
  fcmToken?: string
  deviceType?: 'WEB' | 'MOBILE'
  referralCode?: string
}

export interface FirebaseLoginUserData {
  id: string
  email: string | null
  fullName: string | null
  userType: 'NORMAL' | 'CUSTOMER' | 'PARTNER' | 'ORGANISATION' | 'ADMIN' | 'GROUND_MANAGER'
  isEmailVerified: boolean
  mobileNo: string | null
}

export interface FirebaseLoginResponse {
  status: number
  message: string
  accessToken: string
  refreshToken: string
  data: FirebaseLoginUserData
}

// City Types
export interface City {
  uniqueId: string
  name: string
  latitude: number
  longitude: number
  radius: number
  isActive: boolean
  boundary?: any
}

// Service Catalog Types
export interface ServiceType {
  uniqueId: string
  name: string
  image?: string
  imagePublicId?: string
  isActive: boolean
}

export interface ServiceCategory {
  uniqueId: string
  serviceTypeId: string
  name: string
  image?: string
  imagePublicId?: string
  isActive: boolean
  heroBannerImage?: string
  heroBannerUrl?: string
  heroBanners?: Array<{ id: string; url: string; caption?: string }>
  isHeroBannerEnabled?: boolean
  videoUrl?: string
  heroVideos?: Array<{ id: string; url: string; title?: string }>
  isVideoEnabled?: boolean
}

export type PricingType = 'QUANTITY_BASED' | 'TIME_BASED'

export interface ServiceProblem {
  uniqueId: string
  serviceCategoryId: string
  name: string
  description?: string
  image?: string
  imagePublicId?: string
  pricingType: PricingType
  isActive: boolean
  isConfigurable?: boolean
}

export interface ServiceProblemCity {
  uniqueId: string
  serviceProblemId: string
  cityId: string
  price: number
  originalPrice?: number
  partnerPayout?: number
  reworkWindowDays?: number
  isActive: boolean
}

export interface ServiceAddon {
  uniqueId: string
  parentProblemId: string
  name: string
  price: number
  description?: string
  isActive: boolean
}

// Cart Types
export interface AddToCartPayload {
  serviceProblemCityId: string
  serviceTypeId: string
  pricingType: PricingType
  unitPrice: number
  partnerPayout?: number
  quantity?: number
  durationMinutes?: number
}

export interface CartItem {
  uniqueId: string
  serviceProblemCityId: string
  serviceTypeId: string
  pricingType: PricingType
  unitPrice?: number
  partnerPayout?: number
  quantity?: number
  totalPrice: number
}

export interface Cart {
  uniqueId: string
  userId: string
  userName?: string
  savedLocationId?: string
  customAddress?: string
  customLatitude?: number
  customLongitude?: number
  status?: string
  couponCode?: string
  discountPer?: number
  uptoAmount?: number
  totalAmount: number
  paymentMode?: string
  mobileNo?: string
  tip?: number
  originalTip?: number
  orderTiming?: string
  scheduleTime?: string
  createdAt?: string
  updatedAt?: string
  items: CartItem[]
}

// User Profile & Location Types
export interface UserProfile {
  uniqueId: string
  displayId?: string
  name: string
  email?: string
  phone?: string
  gender?: string
  role: string
  status?: string
  dob?: string
  imageId?: string
  referralCode?: string
  emailVerified?: boolean
  createdAt?: string
}

export interface UserLocation {
  uniqueId: string
  userId: string
  address: string
  latitude: number
  longitude: number
  isPrimary: boolean
  tag?: string
}

export interface UserAddress {
  uniqueId?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  pincode: string
  landmark?: string
  isDefault?: boolean
}

// Partner Types
export interface PartnerProfile {
  partnerId: string
  name?: string
  phone?: string
  email?: string
  isOnline: boolean
  status: string
  rating?: number
  completedOrdersCount?: number
  schedule?: Record<string, any>
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | string

export interface PartnerDocumentItem {
  uniqueId: string
  partnerId?: string
  documentType: string
  documentUrl: string
  verificationStatus?: VerificationStatus
  statusReason?: string
}

export interface PartnerSkillVideoItem {
  uniqueId: string
  partnerId?: string
  serviceCategoryId?: string
  serviceTypeId?: string
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  description?: string
  verificationStatus?: VerificationStatus
  statusReason?: string
  createdAt?: string
}

export interface PartnerMedia {
  documents: PartnerDocumentItem[]
  skillVideos: PartnerSkillVideoItem[]
}

// Order Types
export interface OrderItem {
  itemId?: string
  uniqueId?: string
  problemName?: string
  serviceProblemId?: string
  pricingType?: string
  quantity?: number
  durationMinutes?: number
  unitPrice?: number
  totalPrice?: number
  price?: number
  proofRequired?: boolean
}

export interface OrderProofItem {
  uniqueId: string
  orderId?: string
  proofType: string
  fileUrl: string
  fileType?: string
  fileName?: string
  createdAt?: string
}

export interface OrderCustomer {
  name?: string
  mobileNo?: string
  displayId?: string
  profileImageId?: string
}

export interface Order {
  orderId: string
  uniqueId?: string
  displayOrderId?: string
  customerId?: string
  userId?: string
  customer?: OrderCustomer
  partnerId?: string
  status: string
  totalAmount: number
  partnerPayAmount?: number
  customerPayAmount?: number
  clearAmount?: number
  dueAmount?: number
  paymentStatus?: string
  paymentMode?: string
  scheduledDate?: string
  scheduledTime?: string
  scheduleTime?: string
  locationMarker?: string
  address?: string
  items?: OrderItem[]
  proofs?: OrderProofItem[]
  arrivalOtp?: string
  createdAt?: string
  updatedAt?: string
}

// Admin order listing (GET /api/v1/admin/orders)
export type OrderStatusName =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTNER_NOT_FOUND'

export interface AdminOrderItem {
  uniqueId: string
  serviceProblemId?: string
  pricingType?: string
  quantity?: number
  durationMinutes?: number
  unitPrice?: number
  totalPrice?: number
  tipAmount?: number
}

export interface AdminOrderPause {
  uniqueId: string
  pauseAt?: string
  pauseReason?: string
  resumedAt?: string
}

export interface AdminOrderProof {
  uniqueId: string
  proofType?: string
  fileType?: string
  fileUrl: string
  fileName?: string
  createdAt?: string
}

export interface AdminOrderPerson {
  userId?: string
  partnerId?: string
  displayId?: string
  name?: string
  mobileNo?: string
  phone?: string
  averageRating?: number
  profileImageId?: string
  // partner only
  isOnline?: boolean
  isBusy?: boolean
  userStatus?: string
  totalCompletedServices?: number
}

export interface AdminOrder {
  uniqueId: string
  displayOrderId?: string
  userId?: string
  customer?: AdminOrderPerson
  partnerId?: string
  partner?: AdminOrderPerson
  status: OrderStatusName
  statusReason?: string
  couponCode?: string
  couponDiscount?: number
  totalAmount?: number
  platformCharge?: number
  tip?: number
  customerPayAmount?: number
  partnerPayAmount?: number
  clearAmount?: number
  dueAmount?: number
  locationMarker?: string
  mobileNo?: string
  paymentMode?: string
  paymentStatus?: string
  orderTiming?: string
  scheduleTime?: string
  isRework?: boolean
  acceptedAt?: string
  serviceStartedAt?: string
  orderCompletedAt?: string
  cancelledAt?: string
  cancelledBy?: string
  createdAt?: string
  items?: AdminOrderItem[]
  pauses?: AdminOrderPause[]
  proofs?: AdminOrderProof[]
}

export interface AdminOrderPage {
  status: OrderStatusName | null
  page: number
  size: number
  totalElements: number
  totalPages: number
  orders: AdminOrder[]
}

// Wallet & Payments
export interface Wallet {
  userId: string
  balance: number
  nonWithdrawableAmount: number
  totalBalance: number
  currency?: string
  // What GET /api/v1/wallet actually returns (bonus money that can be spent but never withdrawn)
  nonWithdrawableBalance?: number
}

export type WalletTransactionKind =
  | 'RECHARGE'
  | 'ORDER_PAYMENT'
  | 'WITHDRAWAL'
  | 'PARTNER_SETTLEMENT'
  | 'PENALTY'
  | 'REFUND'
  | 'CANCELLATION_CHARGE'
  | 'CANCELLATION_COMPENSATION'
  | 'WELCOME_BONUS'

// One row of GET /api/v1/wallet/transactions
export interface WalletTransactionItem {
  id: string
  orderId?: string
  referenceId?: string
  amount: number
  paymentMethod?: string
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'REJECTED'
  transactionType: WalletTransactionKind
  description?: string
  totalBalance?: number
  createdAt?: string
}

export interface WalletTransaction {
  transactionId: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  purpose: string
  balanceAfter: number
  createdAt: string
}

export interface BankAccount {
  bankId: string
  userId: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  bankName?: string
  isPrimary?: boolean
}

export interface WithdrawalRequestItem {
  requestId: string
  partnerId: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TRANSFERRED'
  bankAccountId?: string
  reason?: string
  createdAt?: string
}

// Coupon Types
export interface Coupon {
  id?: string
  couponId?: string
  code: string
  title?: string
  description?: string
  color?: string
  imageId?: string
  cityId?: string
  serviceTypeId?: string
  minOrderAmount?: number
  applyOnSingleOrder?: boolean
  isPrivate?: boolean
  type?: 'PERCENTAGE' | 'FLAT' | 'WELCOME'
  percentage?: number
  uptoAmount?: number
  fixAmount?: number
  validFrom?: string
  validTill?: string
  maxUsagePerCustomer?: number
  totalUsageLimit?: number
  usedCount?: number
  isActive: boolean
  isWelcomeCoupon?: boolean
  createdAt?: string
  usesLeft?: number
  assignedUserIds?: string[]
  discountType?: 'PERCENTAGE' | 'FLAT'
  discountValue?: number
  maxDiscount?: number
  expiresAt?: string
}

// Notifications
export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// Rework Cases & Disputes
export type ReworkStatusType =
  | 'PENDING_GROUND_MANAGER_REVIEW'
  | 'CANCELLED'
  | 'APPROVED_ORIGINAL_PARTNER'
  | 'PENDING_PARTNER_REVIEW'
  | 'ACCEPTED_BY_PARTNER'
  | 'ASSIGNED_NEW_PARTNER'
  | 'REJECTED_BY_PARTNER'
  | 'ADMIN_REVIEW'
  | 'APPROVED_BY_ADMIN'
  | 'REJECTED_BY_ADMIN'
  | 'COMPLETED'
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'INSPECTED'
  | 'APPROVED'
  | 'REJECTED'

export interface ReworkItem {
  orderItemId: string
  serviceProblemId?: string
}

export interface ReworkProof {
  uniqueId?: string
  fileType: 'IMAGE' | 'VIDEO'
  fileUrl: string
  fileName?: string
  fileSize?: number
  createdAt?: string
}

export interface ReworkCase {
  reworkId: string
  orderId: string
  customerId: string
  partnerId?: string
  cityId?: string
  description?: string
  reason?: string
  status: ReworkStatusType
  claimedAt?: string
  createdAt?: string
  partnerClarification?: string
  clarification?: string
  partnerClarifiedAt?: string

  // Decision & review
  reviewedBy?: string
  reviewedByRole?: string
  reviewedAt?: string
  reviewNote?: string
  assignedPartnerId?: string
  reworkOrderId?: string
  penaltyAmount?: number
  penaltyReason?: string
  penaltyAppliedAt?: string
  items?: ReworkItem[]
  proofs?: ReworkProof[]

  // Enriched Details
  displayOrderId?: string
  customerName?: string
  customerMobile?: string
  partnerName?: string
  partnerMobile?: string
  cityName?: string
  serviceTypeId?: string
  serviceCategoryName?: string
  orderTotalAmount?: number
  orderPaymentStatus?: string
  orderCreatedAt?: string
  orderCompletedAt?: string

  // Eligibility
  eligibilityStatus?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNDER_REVIEW'
  eligibilityRule?: string
  eligibilityExplanation?: string
  eligibilityDeadline?: string
}

export interface ReworkStats {
  totalRequests: number
  pendingRequests: number
  underReview: number
  approvedRequests: number
  rejectedRequests: number
  completedReworks: number
}

export interface ApproveReworkPayload {
  partnerId?: string
  note?: string
  penaltyAmount?: number
  penaltyReason?: string
}

export interface CancelReworkPayload {
  reason: string
}

export interface AddReworkNotePayload {
  note: string
}

// Scratch Cards & Prizes
export interface ScratchCard {
  id: string
  userId: string
  orderId?: string
  title?: string
  description?: string
  rewardAmount?: number
  isScratched: boolean
  scratchedAt?: string
  createdAt?: string
  expiresAt?: string
}

export interface ScratchCouponPrize {
  id?: string
  prizeId?: string
  title: string
  description?: string
  color?: string
  imageId?: string
  cityId?: string
  type?: 'PERCENTAGE' | 'FLAT'
  percentage?: number
  uptoAmount?: number
  fixAmount?: number
  minOrderAmount?: number
  serviceTypeId?: string
  applyOnSingleOrder?: boolean
  validityDays?: number
  isActive: boolean
  createdAt?: string
  minReward?: number
  maxReward?: number
  probability?: number
}

// Reviews & Ratings
export interface OrderReview {
  reviewId?: string
  orderId: string
  customerId?: string
  partnerId?: string
  rating: number
  review?: string
  comment?: string
  createdAt?: string
}

export interface PartnerReviewStats {
  averageRating: number
  totalReviews: number
  reviews: OrderReview[]
}

// Ground Managers (admin)
/** POST /api/v1/admin/ground-managers/register — new account (email + password) for one city. */
export interface CreateGroundManagerPayload {
  name: string
  email: string
  /** 8–72 characters; never emailed. */
  password: string
  /** Optional, 10–15 digits. */
  mobileNo?: string
  cityId: string
}

/** POST /api/v1/admin/ground-managers — promote an existing CUSTOMER account. */
export interface AssignGroundManagerPayload {
  userId: string
  cityId: string
}

export interface GroundManagerAssignment {
  assignmentId: string
  userId: string
  name?: string
  email?: string
  mobileNo?: string
  role: 'GROUND_MANAGER'
  cityId: string
  cityName?: string
  assignedAt?: string
}


// ── Referral Management (Admin) ──────────────────────────────
export interface AdminReferralStats {
  totalReferrals: number
  totalRegisteredUsers: number
  successfulReferrals: number
  pendingReferrals: number
  totalRewardsDistributed: number
  pendingRewards: number
  totalReferralDiscountsUsed: number
}

export interface AdminReferralDetail {
  uniqueId: string
  referrerUserId: string
  referrerName: string
  referrerMobile: string
  refereeUserId: string
  refereeName: string
  refereeMobile: string
  referralCode: string
  city: string
  registrationDate: string
  firstBookingId?: string
  bookingStatus?: string
  rewardAmount: number
  rewardStatus: 'PENDING' | 'APPROVED' | 'CREDITED' | 'REJECTED' | 'EXPIRED' | 'REVERSED' | 'FLAGGED_FRAUD'
  statusReason?: string
  creditedAt?: string
  isFlagged?: boolean
  flagReason?: string
}

export interface ReferralCodeSummary {
  referralCode: string
  userId: string
  userName: string
  mobileNumber?: string
  city?: string
  totalUses: number
  successfulReferrals: number
  creationDate: string
  active: boolean
}

export interface ReferralTransaction {
  transactionId: string
  referralId: string
  userId: string
  userName: string
  rewardAmount: number
  rewardType: string
  transactionDate: string
  transactionStatus: 'PENDING' | 'APPROVED' | 'CREDITED' | 'FAILED' | 'REVERSED'
  description?: string
}

export interface ReferralFraudAlert {
  alertId: string
  referralId: string
  referrerUserId: string
  referrerName: string
  referrerMobile: string
  refereeUserId: string
  refereeName: string
  refereeMobile: string
  fraudType: 'SELF_REFERRAL' | 'DUPLICATE_DEVICE' | 'RAPID_FREQUENCY' | 'SUSPICIOUS_PATTERN'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  details: string
  status: 'PENDING_REVIEW' | 'REVIEWED' | 'REJECTED' | 'DISMISSED'
  createdAt: string
}

export interface CampaignConfig {
  referrerRewardType: string
  referrerRewardAmount: number
  maxRewardsPerUser: number
  referrerEligibility: string

  refereeDiscountType: string
  refereeDiscountValue: number
  refereeMinBookingAmount: number
  refereeMaxDiscount: number
  couponValidityDays: number

  firstBookingOnly: boolean
  completionRequired: boolean
  paymentRequired: boolean
  cancellationHandled: boolean
  campaignActive: boolean
}

// ── Hero Banner Management Types ───────────────────────────────────────
export type BannerRedirectType =
  | 'SERVICE_CATEGORY'
  | 'SERVICE_SUBCATEGORY'
  | 'SERVICE_PROBLEM'
  | 'OFFER_COUPON'
  | 'CUSTOM_URL'
  | 'INTERNAL_SCREEN'

export type BannerStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE'

export interface HeroBanner {
  id: string
  title: string
  campaignName?: string
  description?: string
  cityId?: string
  imageUrl?: string
  imagePublicId?: string
  redirectType: BannerRedirectType
  link?: string
  startDate?: string
  expireAt?: string
  displayOrder?: number
  isActive: boolean
  status: BannerStatus
  createdAt?: string
  updatedAt?: string
}

export interface BannerStats {
  total: number
  active: number
  scheduled: number
  inactive: number
}

// ── Smart Push Notification Management Types ─────────────────────────
export type PushNotificationAudience = 'CUSTOMERS' | 'PARTNERS' | 'BOTH'

export type PushNotificationType =
  | 'PROMOTIONAL'
  | 'SERVICE_REMINDER'
  | 'BOOKING_UPDATE'
  | 'PARTNER_UPDATE'
  | 'GENERAL_ANNOUNCEMENT'

export type PushCampaignStatus = 'SENT' | 'SCHEDULED' | 'FAILED' | 'CANCELLED'

export interface PushNotificationStats {
  totalSent: number
  successfullyDelivered: number
  failedNotifications: number
  totalCustomersTargeted: number
  totalPartnersTargeted: number
  scheduledNotifications: number
}

export interface NotificationCampaign {
  id: string
  campaignName: string
  title: string
  message: string
  imageUrl?: string
  deepLink?: string
  notificationType: PushNotificationType
  audienceType: PushNotificationAudience
  targetCities?: string
  targetCategories?: string
  totalTargeted: number
  totalCustomersTargeted?: number
  totalPartnersTargeted?: number
  deliveredCount: number
  failedCount: number
  campaignStatus: PushCampaignStatus
  scheduledAt?: string
  sentAt?: string
  createdAt: string
}

export interface AudienceTargetingCriteria {
  audienceType: PushNotificationAudience
  cityNamesOrIds?: string[]
  allCities?: boolean
  serviceCategoryId?: string
  subcategoryId?: string
  bookingDateFilter?: string
  customStartDate?: string
  customEndDate?: string
  bookingStatusFilter?: string
  bookingFrequencyFilter?: string
  partnerStatusFilter?: string
  partnerActivityFilter?: string
  workingAvailabilityFilter?: string
  matchMode?: 'ALL' | 'ANY'
}

export interface RecipientEstimation {
  totalCustomers: number
  customersWithToken: number
  totalPartners: number
  partnersWithToken: number
  totalTargeted: number
  eligibleWithToken: number
  excludedNoToken: number
  excludedSuspended: number
  selectedCities: string[]
  selectedCategory: string
  selectedBookingPeriod: string
}

export interface RecipientPreviewItem {
  userId: string
  name: string
  maskedMobile: string
  role: 'CUSTOMER' | 'PARTNER'
  city: string
  hasToken: boolean
  deviceType?: string
}

export interface CreateCampaignPayload {
  campaignName: string
  title: string
  message: string
  imageUrl?: string
  deepLink?: string
  notificationType: string
  targeting: AudienceTargetingCriteria
  scheduleLater?: boolean
  scheduledAt?: string
}

export * from './subscription'

export * from './video'

export * from './finance'

export * from './partnerFinancialSettings'

export * from './appIcon'
