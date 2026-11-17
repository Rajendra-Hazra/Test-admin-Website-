import { http } from '@/api/client'
import type {
  ApiResponse,
  HealthStatus,
  OtpResponse,
  AuthVerifyResponse,
  LoginPayload,
  RegisterPayload,
  AuthTokenResponse,
  FirebaseLoginRequest,
  FirebaseLoginResponse,
  City,
  ServiceType,
  ServiceCategory,
  ServiceProblem,
  ServiceProblemCity,
  ServiceAddon,
  AddToCartPayload,
  Cart,
  UserProfile,
  UserLocation,
  UserAddress,
  PartnerProfile,
  PartnerMedia,
  AdminOrderPage,
  AdminOrder,
  Order,
  Wallet,
  WalletTransactionItem,
  BankAccount,
  WithdrawalRequestItem,
  Coupon,
  NotificationItem,
  ReworkCase,
  ReworkStats,
  ApproveReworkPayload,
  CancelReworkPayload,
  AddReworkNotePayload,
  ScratchCard,
  ScratchCouponPrize,
  OrderReview,
  PartnerReviewStats,
  CreateGroundManagerPayload,
  AssignGroundManagerPayload,
  GroundManagerAssignment,
  AdminReferralStats,
  AdminReferralDetail,
  ReferralCodeSummary,
  ReferralTransaction,
  ReferralFraudAlert,
  CampaignConfig,
  HeroBanner,
  BannerStats,
  PushNotificationStats,
  NotificationCampaign,
  AudienceTargetingCriteria,
  RecipientEstimation,
  RecipientPreviewItem,
  CreateCampaignPayload,
  SubscriptionStats,
  CustomerPlan,
  PartnerPlan,
  CreateCustomerPlanPayload,
  CreatePartnerPlanPayload,
  UserSubscriptionItem,
  UserSubscriptionDetail,
  SubscriptionTransaction,
  SubscriptionReports,
  ExtendSubscriptionPayload,
  ChangePlanPayload,
  CancelSubscriptionPayload,
  SendReminderPayload,
  CustomerReviewVideo,
  CustomerReviewVideoStats,
  CreateCustomerReviewVideoPayload,
  PartnerTrainingVideo,
  PartnerTrainingStats,
  CreatePartnerTrainingVideoPayload,
  UpdateTrainingProgressPayload,
  FinanceOverview,
  FinanceChartsData,
  CustomerWalletItem,
  PartnerWalletItem,
  UserWalletDetail,
  AdminWithdrawalItem,
  RevenueAnalyticsData,
  ApproveWithdrawalPayload,
  CommissionRule,
  CreateCommissionRulePayload,
  CommissionPreviewRequest,
  CommissionPreviewResponse,
  CancellationRule,
  CreateCancellationRulePayload,
  CancellationPreviewRequest,
  CancellationPreviewResponse,
  IncentiveCampaign,
  CreateIncentiveCampaignPayload,
  FinancialSettingsAuditLog,
  PartnerFinancialSettingsSummary,
  AppIconItem,
  IconUploadPayload,
  AppIconHistoryItem,
} from '@/types/api'

export const api = {
  // ─── 1. Health & System Check ──────────────────────────────
  health: {
    check: () => http.get<ApiResponse<HealthStatus>>('/api/v1/public/health'),
  },

  // ─── 2. Authentication ──────────────────────────────────────
  auth: {
    sendOtp: (emailOrPhone: string) =>
      http.post<OtpResponse>('/api/v1/auth/otp/send', null, {
        params: { email: emailOrPhone },
      }),

    verifyOtp: (
      userType: 'CUSTOMER' | 'PARTNER' = 'CUSTOMER',
      payload: {
        targetIdentifier: string
        otp: string
        isExistingUser?: boolean
        appliedReferralCode?: string
      },
      otpValidationToken?: string
    ) =>
      http.post<AuthVerifyResponse>(`/api/v1/auth/otp/verify/${userType}`, payload, {
        headers: otpValidationToken ? { otp_validation: otpValidationToken } : {},
      }),

    firebaseLogin: (
      userType: 'CUSTOMER' | 'PARTNER' = 'CUSTOMER',
      firebaseIdToken: string,
      payload?: FirebaseLoginRequest
    ) =>
      http.post<FirebaseLoginResponse>(
        `/api/v1/auth/firebase-login/${userType}`,
        payload ?? { deviceType: 'WEB' },
        {
          headers: {
            Authorization: `Bearer ${firebaseIdToken}`,
          },
        }
      ),

    oauthCallback: (
      userType: 'CUSTOMER' | 'PARTNER' = 'CUSTOMER',
      payload: { code: string; provider?: string }
    ) => http.post<AuthVerifyResponse>(`/api/v1/auth/oauth/callback/login/${userType}`, payload),

    refresh: (refreshToken?: string) =>
      http.post<AuthVerifyResponse>('/api/v1/auth/refresh', { refreshToken }),

    logout: () => http.post<ApiResponse<void>>('/api/v1/auth/logout'),

    upgradeToPartner: (payload?: Record<string, any>) =>
      http.patch<ApiResponse<any>>('/api/v1/auth/role/partner', payload),

    // Email / Mobile & Password Authentication
    login: (payload: LoginPayload) =>
      http.post<ApiResponse<AuthTokenResponse>>('/api/v1/auth/login', payload),

    registerCustomer: (payload: RegisterPayload) =>
      http.post<ApiResponse<AuthTokenResponse>>('/api/v1/auth/register/customer', payload),

    registerPartner: (payload: RegisterPayload) =>
      http.post<ApiResponse<AuthTokenResponse>>('/api/v1/auth/register/partner', payload),
  },

  // ─── 3. User Profile & Addresses ───────────────────────────
  users: {
    getProfile: () => http.get<ApiResponse<UserProfile>>('/api/v1/users/profile'),

    updateProfile: (data: Partial<UserProfile>) =>
      http.put<ApiResponse<UserProfile>>('/api/v1/users', data),

    updateProfileWithImage: (formData: FormData) =>
      http.put<ApiResponse<UserProfile>>('/api/v1/users', formData),

    deleteAccount: () => http.delete<ApiResponse<void>>('/api/v1/users'),

    search: (query: Record<string, any>) =>
      http.get<ApiResponse<UserProfile[]>>('/api/v1/users/search', { params: query }),

    saveToken: (token: string) =>
      http.patch<ApiResponse<void>>('/api/v1/users/token', null, { params: { token } }),

    saveFcmToken: (fcmToken: string) =>
      http.post<ApiResponse<void>>('/api/v1/users/fcm-token', { fcmToken }),

    addAddress: (address: UserAddress) =>
      http.post<ApiResponse<UserAddress>>('/api/v1/users/addresses', address),

    getAddresses: () => http.get<ApiResponse<UserAddress[]>>('/api/v1/users/addresses'),
  },

  // ─── 4. User Locations & Places ────────────────────────────
  locations: {
    create: (data: Partial<UserLocation>) =>
      http.post<ApiResponse<UserLocation>>('/api/v1/user/locations', data),

    getAll: () => http.get<ApiResponse<UserLocation[]>>('/api/v1/user/locations'),

    getPrimary: () => http.get<ApiResponse<UserLocation>>('/api/v1/user/locations/primary'),

    markPrimary: (locationId: string) =>
      http.put<ApiResponse<void>>(`/api/v1/user/locations/${locationId}/primary`),

    update: (locationId: string, data: Partial<UserLocation>) =>
      http.patch<ApiResponse<UserLocation>>(`/api/v1/user/locations/${locationId}`, data),

    delete: (locationId: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/user/locations/${locationId}`),

    searchPlaces: (query: string) =>
      http.get<any>('/api/locations/search', { params: { query } }),

    getPlaceDetails: (placeId: string) =>
      http.get<any>('/api/locations/details', { params: { placeId } }),
  },

  // ─── 5. Partner Operations ─────────────────────────────────
  partner: {
    getProfile: () => http.get<ApiResponse<PartnerProfile>>('/api/v1/partners/profile'),

    setOnlineStatus: (status: { isOnline: boolean }) =>
      http.put<ApiResponse<any>>('/api/v1/partners/status/online', status),

    updateProfileStatus: (payload: { status: string }) =>
      http.patch<ApiResponse<any>>('/api/v1/partners/status/profile', payload),

    updateSchedule: (schedule: Record<string, any>) =>
      http.patch<ApiResponse<any>>('/api/v1/partners/schedule', schedule),

    uploadDocument: (formData: FormData) =>
      http.post<ApiResponse<any>>('/api/v1/partners/document', formData),

    getMyDocuments: () =>
      http.get<ApiResponse<Pick<PartnerMedia, 'documents'>>>('/api/v1/partners/documents'),

    updateDocumentStatus: (payload: { docId?: string; document?: string; partnerID?: string; status: string; statusReason?: string }) =>
      http.patch<ApiResponse<any>>('/api/v1/partners/document', {
        partnerID: payload.partnerID,
        document: payload.document || payload.docId,
        status: payload.status,
        statusReason: payload.statusReason,
      }),

    // multipart fields: serviceCategoryId (required), serviceTypeId, title, description, videoFile (required)
    uploadSkillVideo: (formData: FormData) =>
      http.post<ApiResponse<any>>('/api/v1/partners/skill-videos', formData),

    getMySkillVideos: () =>
      http.get<ApiResponse<Pick<PartnerMedia, 'skillVideos'>>>('/api/v1/partners/skill-videos'),
  },

  // ─── 6. Catalog (Customer Facing) ──────────────────────────
  catalogCustomer: {
    getNearestCity: (lat: number, lng: number) =>
      http.get<ApiResponse<City>>('/api/v1/customer/catalog/cities/nearest', {
        params: { lat, lng },
      }),

    getCategories: () =>
      http.get<ApiResponse<ServiceCategory[]>>('/api/v1/customer/catalog/categories'),

    getSubcategories: (categoryId: string) =>
      http.get<ApiResponse<ServiceCategory[]>>(
        `/api/v1/customer/catalog/categories/${categoryId}/subcategories`
      ),

    getProblems: (subcategoryId: string) =>
      http.get<ApiResponse<ServiceProblem[]>>(
        `/api/v1/customer/catalog/subcategories/${subcategoryId}/problems`
      ),

    getCityCategories: (cityId: string) =>
      http.get<ApiResponse<ServiceCategory[]>>(
        `/api/v1/customer/catalog/cities/${cityId}/categories`
      ),

    getCitySubcategories: (cityId: string, categoryId: string) =>
      http.get<ApiResponse<ServiceCategory[]>>(
        `/api/v1/customer/catalog/cities/${cityId}/categories/${categoryId}/subcategories`
      ),
  },

  // ─── 7. Cities Management (Admin) ──────────────────────────
  cities: {
    getActive: () => http.get<City[]>('/api/v1/cities/active'),
    getAll: () => http.get<City[]>('/api/v1/cities'),
    getById: (id: string) => http.get<City>(`/api/v1/cities/${id}`),
    add: (city: Omit<City, 'uniqueId'>) => http.post<City>('/api/v1/cities', city),
    update: (city: Partial<City> & { uniqueId: string }) =>
      http.patch<City>('/api/v1/cities', city),
  },

  // ─── 8. Service Catalog (Admin) ────────────────────────────
  services: {
    // Types
    getAllTypes: () => http.get<ServiceType[]>('/api/v1/service/type'),
    getTypeById: (id: string) =>
      http.get<ServiceType>('/api/v1/service/type', { params: { id } }),
    addType: (formData: FormData) => http.post<ServiceType>('/api/v1/service/type', formData),
    updateType: (formData: FormData) => http.patch<ServiceType>('/api/v1/service/type', formData),

    // Categories
    getCategoriesByType: (serviceTypeId: string) =>
      http.get<ServiceCategory[]>('/api/v1/service/category', { params: { serviceTypeId } }),
    getCategoryById: (id: string) =>
      http.get<ServiceCategory>('/api/v1/service/category', { params: { id } }),
    addCategory: (formData: FormData) =>
      http.post<ServiceCategory>('/api/v1/service/category', formData),
    updateCategory: (formData: FormData) =>
      http.patch<ServiceCategory>('/api/v1/service/category', formData),

    // Problems
    getProblemsByCategory: (categoryId: string) =>
      http.get<ServiceProblem[]>('/api/v1/service/problem', { params: { categoryId } }),
    getProblemById: (id: string) =>
      http.get<ServiceProblem>('/api/v1/service/problem', { params: { id } }),
    addProblem: (formData: FormData) =>
      http.post<ServiceProblem>('/api/v1/service/problem', formData),
    updateProblem: (formData: FormData) =>
      http.patch<ServiceProblem>('/api/v1/service/problem', formData),

    // Problem-City Pricing
    getCityPricing: (serviceProblemId: string, cityId: string) =>
      http.get<ServiceProblemCity>('/api/v1/service/problem-city', {
        params: { serviceProblemId, cityId },
      }),
    getCityPricingByCity: (cityId: string) =>
      http.get<ServiceProblemCity[]>('/api/v1/service/problem-city', { params: { cityId } }),
    setCityPricing: (payload: Partial<ServiceProblemCity>) =>
      http.post<ServiceProblemCity>('/api/v1/service/problem-city', payload),
    updateCityPricing: (payload: Partial<ServiceProblemCity>) =>
      http.patch<ServiceProblemCity>('/api/v1/service/problem-city', payload),
  },

  // ─── 9. Service Addons ─────────────────────────────────────
  addons: {
    create: (addon: Partial<ServiceAddon>) =>
      http.post<ApiResponse<ServiceAddon>>('/api/v1/service/addon', addon),

    getByProblemId: (parentProblemId: string) =>
      http.get<ApiResponse<ServiceAddon[]>>(`/api/v1/service/addon/${parentProblemId}`),

    update: (addon: Partial<ServiceAddon>) =>
      http.put<ApiResponse<ServiceAddon>>('/api/v1/service/addon', addon),

    deactivate: (uniqueId: string) =>
      http.patch<ApiResponse<void>>(`/api/v1/service/addon/${uniqueId}/deactivate`),

    delete: (uniqueId: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/service/addon/${uniqueId}`),
  },

  // ─── 10. Cart Operations ───────────────────────────────────
  cart: {
    get: (userId?: string) =>
      http.get<Cart>(userId ? `/api/v1/cart/${userId}` : '/api/v1/cart'),
    manageItems: (payload: AddToCartPayload | any, userId?: string) =>
      http.post<Cart>(userId ? `/api/v1/cart/${userId}/items` : '/api/v1/cart/items', payload),
    updateUserData: (payload: { addressId?: string; notes?: string; slot?: string }) =>
      http.patch<Cart>('/api/v1/cart/userdata', payload),
    removeItem: (itemId: string) => http.delete<Cart>(`/api/v1/cart/items/${itemId}`),
    clear: (userId?: string) =>
      http.delete<void>(userId ? `/api/v1/cart/${userId}` : '/api/v1/cart'),
  },

  // ─── 11. Orders & Fulfillment ──────────────────────────────
  orders: {
    // Customer
    create: (payload?: any) => http.post<ApiResponse<Order>>('/api/v1/orders', payload ?? {}),
    getMyOrders: () => http.get<ApiResponse<Order[]>>('/api/v1/orders'),
    getOrderById: (orderId: string) => http.get<ApiResponse<Order>>(`/api/v1/orders/${orderId}`),
    cancel: (orderId: string, reason?: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/cancel/${orderId}`, { reason }),
    uploadProof: (orderId: string, proofType: string, formData: FormData) =>
      http.post<ApiResponse<any>>(`/api/v1/orders/${orderId}/proofs/${proofType}`, formData),
    getProofs: (orderId: string) =>
      http.get<ApiResponse<any[]>>(`/api/v1/orders/${orderId}/proofs`),
    requestRework: (orderId: string, payload: { reason: string; description?: string }) =>
      http.post<ApiResponse<any>>(`/api/v1/orders/${orderId}/rework`, payload),

    // Partner
    getPartnerOrders: () => http.get<ApiResponse<Order[]>>('/api/v1/orders/partner-orders'),
    accept: (token: string) => http.put<ApiResponse<any>>(`/api/v1/orders/accept/${token}`),
    addCharges: (orderId: string, payload: any) =>
      http.put<ApiResponse<any>>(`/api/v1/orders/add/${orderId}`, payload),
    previewAddCharges: (orderId: string, payload: any) =>
      http.post<ApiResponse<any>>(`/api/v1/orders/add/${orderId}/preview`, payload),
    generateArrivalOtp: (orderId: string) =>
      http.post<ApiResponse<{ otp: string }>>(`/api/v1/orders/${orderId}/arrival-otp`),
    verifyArrival: (orderId: string, otp: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/arrival/${orderId}`, { otp }),
    pause: (orderId: string, reason: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/pause/${orderId}`, { reason }),
    resume: (orderId: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/resume/${orderId}`),
    complete: (orderId: string, payload?: any) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/complete/${orderId}`, payload),
    partnerCancel: (orderId: string, reason: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/partner/cancel/${orderId}`, { reason }),
    getPartnerReworks: () =>
      http.get<ApiResponse<ReworkCase[]>>('/api/v1/orders/partner/reworks'),
    clarifyRework: (reworkId: string, payload: { clarification: string }) =>
      http.patch<ApiResponse<any>>(`/api/v1/orders/partner/reworks/${reworkId}/clarification`, payload),

    // Dispatch
    searchPartner: (orderId: string) =>
      http.post<ApiResponse<any>>(`/api/v1/orders/${orderId}/search-partner`),
  },

  // ─── 12. Payments & Webhooks ───────────────────────────────
  payments: {
    createOrderPayment: (payload: { orderId: string; gateway?: string }) =>
      http.post<ApiResponse<any>>('/api/v1/payments/orders', payload),

    verifyPayment: (payload: { orderId: string; paymentId?: string; signature?: string }) =>
      http.post<ApiResponse<any>>('/api/v1/payments/verify', payload),

    testCashfreeWebhook: (payload: any) =>
      http.post<any>('/api/v1/webhooks/payments/cashfree', payload),

    testRazorpayWebhook: (payload: any) =>
      http.post<any>('/api/v1/webhooks/payments/razorpay', payload),
  },

  // ─── 13. Wallet & Bank Accounts ────────────────────────────
  wallet: {
    get: () => http.get<ApiResponse<Wallet>>('/api/v1/wallet'),

    getTransactions: (page = 0, size = 20) =>
      http.get<ApiResponse<WalletTransactionItem[]>>('/api/v1/wallet/transactions', {
        params: { page, size },
      }),

    // Server needs orderAmount plus customerEmail and a 10-digit customerPhone (a bare number sends only the amount)
    recharge: (
      payload:
        | number
        | {
            orderAmount: number
            customerEmail: string
            customerPhone: string
            customerName?: string
            returnUrl?: string
          },
    ) =>
      http.post<ApiResponse<any>>(
        '/api/v1/wallet/recharge',
        typeof payload === 'number' ? { orderAmount: payload } : payload,
      ),

    // body: { orderID: "<orderId returned by recharge>" }
    verifyRecharge: (payload: any) =>
      http.post<ApiResponse<any>>('/api/v1/wallet/recharge/verify', payload),

    payOrder: (orderId: string, amount?: number) =>
      http.post<ApiResponse<any>>('/api/v1/wallet/pay-order', { orderId, amount }),
  },

  bank: {
    add: (payload: Partial<BankAccount>) =>
      http.post<ApiResponse<BankAccount>>('/api/v1/bank', payload),

    getDetails: () => http.get<ApiResponse<BankAccount[]>>('/api/v1/bank'),

    update: (bankId: string, payload: Partial<BankAccount>) =>
      http.put<ApiResponse<BankAccount>>(`/api/v1/bank/${bankId}`, payload),

    delete: (bankId: string) => http.delete<ApiResponse<void>>(`/api/v1/bank/${bankId}`),
  },

  // ─── 14. Withdrawals ───────────────────────────────────────
  withdrawals: {
    request: (amount: number, bankAccountId?: string) =>
      http.post<ApiResponse<WithdrawalRequestItem>>('/api/v1/withdrawals', {
        amount,
        bankAccountId,
      }),

    getMyWithdrawals: () =>
      http.get<ApiResponse<WithdrawalRequestItem[]>>('/api/v1/withdrawals'),

    getAll: () =>
      http.get<ApiResponse<WithdrawalRequestItem[]>>('/api/v1/withdrawals/all'),

    approve: (requestId: string) =>
      http.put<ApiResponse<any>>(`/api/v1/withdrawals/${requestId}/approve`),

    reject: (requestId: string, reason: string) =>
      http.put<ApiResponse<any>>(`/api/v1/withdrawals/${requestId}/reject`, { reason }),
  },

  // ─── 15. Coupons ───────────────────────────────────────────
  coupons: {
    getMyCoupons: () => http.get<ApiResponse<Coupon[]>>('/api/v1/coupons/my'),

    claimWelcome: (code: string) =>
      http.post<ApiResponse<any>>(`/api/v1/coupons/${code}/claim`),

    validate: (payload: { code: string; cartValue: number }) =>
      http.post<ApiResponse<any>>('/api/v1/coupons/validate', payload),

    // Admin
    adminCreate: (coupon: Partial<Coupon>) =>
      http.post<ApiResponse<Coupon>>('/api/v1/admin/coupons', coupon),

    adminUpdate: (couponId: string, coupon: Partial<Coupon>) =>
      http.put<ApiResponse<Coupon>>(`/api/v1/admin/coupons/${couponId}`, coupon),

    adminGetAll: () => http.get<ApiResponse<Coupon[]>>('/api/v1/admin/coupons'),

    adminGetById: (couponId: string) =>
      http.get<ApiResponse<Coupon>>(`/api/v1/admin/coupons/${couponId}`),

    adminSetActive: (couponId: string, isActive: boolean) =>
      http.patch<ApiResponse<any>>(`/api/v1/admin/coupons/${couponId}/active`, null, {
        params: { active: isActive },
      }),

    adminAssignUsers: (couponId: string, userIds: string[]) =>
      http.post<ApiResponse<any>>(`/api/v1/admin/coupons/${couponId}/users`, { userIds }),

    adminGetAssignedUsers: (couponId: string) =>
      http.get<ApiResponse<string[]>>(`/api/v1/admin/coupons/${couponId}/users`),

    adminUnassignUser: (couponId: string, userId: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/coupons/${couponId}/users/${userId}`),
  },

  // ─── 15b. Scratch Cards & Prizes ───────────────────────────
  scratchCards: {
    getMyCards: () => http.get<ApiResponse<ScratchCard[]>>('/api/v1/scratch-cards/my'),
    scratch: (cardId: string) =>
      http.post<ApiResponse<ScratchCard>>(`/api/v1/scratch-cards/${cardId}/scratch`),
  },

  adminScratchCoupons: {
    createPrize: (payload: Partial<ScratchCouponPrize>) =>
      http.post<ApiResponse<ScratchCouponPrize>>('/api/v1/admin/scratch-coupons', payload),
    updatePrize: (prizeId: string, payload: Partial<ScratchCouponPrize>) =>
      http.put<ApiResponse<ScratchCouponPrize>>(`/api/v1/admin/scratch-coupons/${prizeId}`, payload),
    getAllPrizes: () => http.get<ApiResponse<ScratchCouponPrize[]>>('/api/v1/admin/scratch-coupons'),
    getPrize: (prizeId: string) =>
      http.get<ApiResponse<ScratchCouponPrize>>(`/api/v1/admin/scratch-coupons/${prizeId}`),
    setActive: (prizeId: string, active: boolean) =>
      http.patch<ApiResponse<any>>(`/api/v1/admin/scratch-coupons/${prizeId}/active`, null, {
        params: { active },
      }),
  },

  // ─── 15c. Reviews & Ratings ────────────────────────────────
  reviews: {
    reviewOrder: (orderId: string, payload: { rating: number; comment?: string }) =>
      http.post<ApiResponse<OrderReview>>(`/api/v1/reviews/orders/${orderId}`, payload),
    getOrderReview: (orderId: string) =>
      http.get<ApiResponse<OrderReview>>(`/api/v1/reviews/orders/${orderId}`),
    getMyPartnerReviews: () =>
      http.get<ApiResponse<PartnerReviewStats>>('/api/v1/reviews/partner/me'),
  },

  // ─── 16. Ground Manager & Dispute Reworks ──────────────────
  groundManager: {
    /** New ground manager account (email + password) for a city; they get an email naming the city. */
    adminRegister: (payload: CreateGroundManagerPayload) =>
      http.post<ApiResponse<GroundManagerAssignment>>('/api/v1/admin/ground-managers/register', payload),

    /** Promote an existing CUSTOMER account to ground manager of a city. */
    adminAssign: (payload: AssignGroundManagerPayload) =>
      http.post<ApiResponse<GroundManagerAssignment>>('/api/v1/admin/ground-managers', payload),

    adminGetReworks: () => http.get<ApiResponse<ReworkCase[]>>('/api/v1/admin/reworks'),

    adminApproveRework: (reworkId: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/admin/reworks/${reworkId}/approve`),

    adminCancelRework: (reworkId: string, reason?: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/admin/reworks/${reworkId}/cancel`, { reason }),

    gmGetReworks: () =>
      http.get<ApiResponse<ReworkCase[]>>('/api/v1/ground-manager/reworks'),

    gmApproveRework: (reworkId: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/ground-manager/reworks/${reworkId}/approve`),

    gmCancelRework: (reworkId: string, reason?: string) =>
      http.patch<ApiResponse<any>>(`/api/v1/ground-manager/reworks/${reworkId}/cancel`, { reason }),
  },

  // ─── 17. Notifications ─────────────────────────────────────
  notifications: {
    getMyNotifications: () =>
      http.get<ApiResponse<NotificationItem[]>>('/api/v1/notifications'),

    getUnreadCount: () =>
      http.get<ApiResponse<{ count: number }>>('/api/v1/notifications/unread-count'),

    markAsRead: (id: string) =>
      http.patch<ApiResponse<void>>(`/api/v1/notifications/${id}/read`),

    sendNotification: (payload: { userId: string; title: string; message: string }) =>
      http.post<ApiResponse<any>>('/api/v1/notifications/send', payload),
  },

  // ─── 18. Files & Storage ───────────────────────────────────
  files: {
    getPresignedUploadUrl: (filename: string, contentType = 'image/jpeg') =>
      http.post<ApiResponse<{ uploadUrl: string; fileUrl: string }>>(
        '/api/v1/files/presigned-upload-url',
        { filename, contentType }
      ),
  },

  // ─── 19. System Settings ───────────────────────────────────
  settings: {
    get: (key: string) => http.get<ApiResponse<any>>(`/api/v1/admin/settings/${key}`),
    update: (key: string, value: any) =>
      http.post<ApiResponse<any>>(`/api/v1/admin/settings/${key}`, { value }),
  },

  // ─── 22. Account (change own email with an OTP sent to the new address) ───
  account: {
    // Step 1: emails a 6-digit code to the new address
    requestEmailChange: (email: string) =>
      http.post<ApiResponse<any>>('/api/v1/account/email/otp', { email }),
    // Step 2: the email changes only if the code is right
    confirmEmailChange: (email: string, otp: string) =>
      http.post<ApiResponse<any>>('/api/v1/account/email/verify', { email, otp }),
  },

  // ─── 21. Admin Orders ───────────────────────────────────────
  adminOrders: {
    // status omitted = every status; page is zero-based, size 1..50
    getAll: (params: { status?: string; page?: number; size?: number }) =>
      http.get<ApiResponse<AdminOrderPage>>('/api/v1/admin/orders', {
        params: { ...params, status: params.status || undefined },
      }),
    // Full detail of one order: items, pauses, proof files, customer, partner
    getById: (orderId: string) =>
      http.get<ApiResponse<AdminOrder>>(`/api/v1/admin/orders/${orderId}`),
  },

  // ─── 20. Admin User Management ──────────────────────────────
  // ─── 23. Admin Referral Management ──────────────────────────────
  adminReferral: {
    getStats: (params?: { period?: string; startDate?: string; endDate?: string }) =>
      http.get<ApiResponse<AdminReferralStats>>('/api/v1/admin/referrals/stats', { params }),
    getAll: (params?: { query?: string; status?: string; city?: string; startDate?: string; endDate?: string }) =>
      http.get<ApiResponse<AdminReferralDetail[]>>('/api/v1/admin/referrals', { params }),
    getById: (id: string) =>
      http.get<ApiResponse<AdminReferralDetail>>(`/api/v1/admin/referrals/${id}`),
    updateStatus: (id: string, payload: { status: string; reason?: string }) =>
      http.patch<ApiResponse<AdminReferralDetail>>(`/api/v1/admin/referrals/${id}/status`, payload),
    getCodes: (params?: { query?: string; status?: string }) =>
      http.get<ApiResponse<ReferralCodeSummary[]>>('/api/v1/admin/referrals/codes', { params }),
    setCodeStatus: (code: string, active: boolean) =>
      http.patch<ApiResponse<void>>(`/api/v1/admin/referrals/codes/${code}/status`, null, { params: { active } }),
    getTransactions: () =>
      http.get<ApiResponse<ReferralTransaction[]>>('/api/v1/admin/referrals/transactions'),
    getFraudAlerts: () =>
      http.get<ApiResponse<ReferralFraudAlert[]>>('/api/v1/admin/referrals/fraud-alerts'),
    resolveFraudAlert: (id: string, action: string, reason?: string) =>
      http.post<ApiResponse<void>>(`/api/v1/admin/referrals/fraud-alerts/${id}/action`, { action, reason }),
    getCampaign: () =>
      http.get<ApiResponse<CampaignConfig>>('/api/v1/admin/referrals/campaign'),
    updateCampaign: (payload: Partial<CampaignConfig>) =>
      http.post<ApiResponse<CampaignConfig>>('/api/v1/admin/referrals/campaign', payload),
  },

  adminUsers: {
    getAll: (role?: string) =>
      http.get<ApiResponse<UserProfile[]>>('/api/v1/admin/users', {
        params: role && role !== 'ALL' ? { role } : undefined,
      }),
    updateStatus: (userId: string, status: string) =>
      http.patch<ApiResponse<UserProfile>>(`/api/v1/admin/users/${userId}/status`, null, {
        params: { status },
      }),
    approve: (userId: string) =>
      http.post<ApiResponse<UserProfile>>(`/api/v1/admin/users/${userId}/approve`),
    // Partner KYC documents and skill videos ({userId} may also be the partner id)
    getPartnerDocuments: (userId: string) =>
      http.get<ApiResponse<Pick<PartnerMedia, 'documents'>>>(`/api/v1/partners/${userId}/documents`),
    getPartnerSkillVideos: (userId: string) =>
      http.get<ApiResponse<Pick<PartnerMedia, 'skillVideos'>>>(`/api/v1/partners/${userId}/skill-videos`),
  },

  banners: {
    getStats: () => http.get<ApiResponse<BannerStats>>('/api/v1/admin/banners/stats'),
    getAll: (params?: { cityId?: string; status?: string }) =>
      http.get<ApiResponse<HeroBanner[]>>('/api/v1/admin/banners', { params }),
    getById: (id: string) => http.get<ApiResponse<HeroBanner>>(`/api/v1/admin/banners/${id}`),
    create: (formData: FormData) => http.post<ApiResponse<HeroBanner>>('/api/v1/admin/banners', formData),
    update: (id: string, formData: FormData) =>
      http.put<ApiResponse<HeroBanner>>(`/api/v1/admin/banners/${id}`, formData),
    toggleStatus: (id: string, active: boolean) =>
      http.patch<ApiResponse<HeroBanner>>(`/api/v1/admin/banners/${id}/status`, null, { params: { active } }),
    delete: (id: string) => http.delete<ApiResponse<void>>(`/api/v1/admin/banners/${id}`),
    getCustomerBanners: (cityId?: string) =>
      http.get<ApiResponse<HeroBanner[]>>('/api/v1/customer/catalog/banners', { params: cityId ? { cityId } : undefined }),
  },

  pushNotifications: {
    getStats: (period?: string, startDate?: string, endDate?: string) =>
      http.get<ApiResponse<PushNotificationStats>>('/api/v1/admin/notifications/stats', {
        params: { period, startDate, endDate },
      }),
    getCampaigns: (period?: string) =>
      http.get<ApiResponse<NotificationCampaign[]>>('/api/v1/admin/notifications/campaigns', {
        params: period ? { period } : undefined,
      }),
    estimate: (criteria: AudienceTargetingCriteria) =>
      http.post<ApiResponse<RecipientEstimation>>('/api/v1/admin/notifications/estimate', criteria),
    previewRecipients: (criteria: AudienceTargetingCriteria, limit = 20) =>
      http.post<ApiResponse<RecipientPreviewItem[]>>('/api/v1/admin/notifications/preview-recipients', criteria, {
        params: { limit },
      }),
    send: (payload: CreateCampaignPayload) =>
      http.post<ApiResponse<NotificationCampaign>>('/api/v1/admin/notifications/send', payload),
    cancel: (id: string) =>
      http.post<ApiResponse<NotificationCampaign>>(`/api/v1/admin/notifications/campaigns/${id}/cancel`),
  },
  // ─── 27. Admin Rework Management & Disputes ──────────────────
  adminReworks: {
    getStats: () =>
      http.get<ApiResponse<ReworkStats>>('/api/v1/admin/reworks/stats'),
    getAll: (params?: { status?: string }) =>
      http.get<ApiResponse<ReworkCase[]>>('/api/v1/admin/reworks', { params }),
    getById: (reworkId: string) =>
      http.get<ApiResponse<ReworkCase>>(`/api/v1/admin/reworks/${reworkId}`),
    approve: (reworkId: string, payload?: ApproveReworkPayload) =>
      http.patch<ApiResponse<ReworkCase>>(`/api/v1/admin/reworks/${reworkId}/approve`, payload),
    cancel: (reworkId: string, payload: CancelReworkPayload) =>
      http.patch<ApiResponse<ReworkCase>>(`/api/v1/admin/reworks/${reworkId}/cancel`, payload),
    escalate: (reworkId: string, payload?: AddReworkNotePayload) =>
      http.patch<ApiResponse<ReworkCase>>(`/api/v1/admin/reworks/${reworkId}/escalate`, payload),
    addNote: (reworkId: string, payload: AddReworkNotePayload) =>
      http.post<ApiResponse<ReworkCase>>(`/api/v1/admin/reworks/${reworkId}/notes`, payload),
  },

  // ─── 28. Subscription & Membership Management ────────────────
  subscriptions: {
    getStats: (params?: { period?: string; startDate?: string; endDate?: string }) =>
      http.get<ApiResponse<SubscriptionStats>>('/api/v1/admin/subscriptions/stats', { params }),

    // Customer Plans
    getCustomerPlans: () =>
      http.get<ApiResponse<CustomerPlan[]>>('/api/v1/admin/subscriptions/plans/customer'),
    createCustomerPlan: (payload: CreateCustomerPlanPayload) =>
      http.post<ApiResponse<CustomerPlan>>('/api/v1/admin/subscriptions/plans/customer', payload),
    updateCustomerPlan: (planId: string, payload: CreateCustomerPlanPayload) =>
      http.put<ApiResponse<CustomerPlan>>(`/api/v1/admin/subscriptions/plans/customer/${planId}`, payload),
    updateCustomerPlanStatus: (planId: string, isActive: boolean) =>
      http.patch<ApiResponse<CustomerPlan>>(`/api/v1/admin/subscriptions/plans/customer/${planId}/status`, { isActive }),
    duplicateCustomerPlan: (planId: string) =>
      http.post<ApiResponse<CustomerPlan>>(`/api/v1/admin/subscriptions/plans/customer/${planId}/duplicate`),

    // Partner Plans
    getPartnerPlans: () =>
      http.get<ApiResponse<PartnerPlan[]>>('/api/v1/admin/subscriptions/plans/partner'),
    createPartnerPlan: (payload: CreatePartnerPlanPayload) =>
      http.post<ApiResponse<PartnerPlan>>('/api/v1/admin/subscriptions/plans/partner', payload),
    updatePartnerPlan: (planId: string, payload: CreatePartnerPlanPayload) =>
      http.put<ApiResponse<PartnerPlan>>(`/api/v1/admin/subscriptions/plans/partner/${planId}`, payload),
    updatePartnerPlanStatus: (planId: string, isActive: boolean) =>
      http.patch<ApiResponse<PartnerPlan>>(`/api/v1/admin/subscriptions/plans/partner/${planId}/status`, { isActive }),
    duplicatePartnerPlan: (planId: string) =>
      http.post<ApiResponse<PartnerPlan>>(`/api/v1/admin/subscriptions/plans/partner/${planId}/duplicate`),

    // User Subscriptions
    getUserSubscriptions: (params?: {
      subscriberType?: string
      status?: string
      city?: string
      planId?: string
      query?: string
      expiringDays?: number
      startDate?: string
      endDate?: string
    }) =>
      http.get<ApiResponse<UserSubscriptionItem[]>>('/api/v1/admin/subscriptions/user-subscriptions', { params }),
    getById: (id: string) =>
      http.get<ApiResponse<UserSubscriptionDetail>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}`),
    extend: (id: string, payload: ExtendSubscriptionPayload) =>
      http.patch<ApiResponse<UserSubscriptionItem>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}/extend`, payload),
    changePlan: (id: string, payload: ChangePlanPayload) =>
      http.patch<ApiResponse<UserSubscriptionItem>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}/change-plan`, payload),
    cancel: (id: string, payload: CancelSubscriptionPayload) =>
      http.patch<ApiResponse<UserSubscriptionItem>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}/cancel`, payload),
    suspend: (id: string, payload: CancelSubscriptionPayload) =>
      http.patch<ApiResponse<UserSubscriptionItem>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}/suspend`, payload),
    sendReminder: (id: string, payload?: SendReminderPayload) =>
      http.post<ApiResponse<boolean>>(`/api/v1/admin/subscriptions/user-subscriptions/${id}/remind`, payload),
    sendBulkReminder: (expiringDays: number = 7) =>
      http.post<ApiResponse<{ dispatchedCount: number }>>('/api/v1/admin/subscriptions/notifications/send-bulk-reminder', undefined, {
        params: { expiringDays },
      }),

    // Transactions & Reports
    getTransactions: (params?: {
      query?: string
      userType?: string
      paymentStatus?: string
      startDate?: string
      endDate?: string
    }) =>
      http.get<ApiResponse<SubscriptionTransaction[]>>('/api/v1/admin/subscriptions/transactions', { params }),
    getReports: (params?: { period?: string; startDate?: string; endDate?: string }) =>
      http.get<ApiResponse<SubscriptionReports>>('/api/v1/admin/subscriptions/reports', { params }),
  },

  // ─── 29. Customer Review Videos (Manual Video Uploads) ─────────
  customerVideos: {
    getStats: () =>
      http.get<ApiResponse<CustomerReviewVideoStats>>('/api/v1/admin/customer-videos/stats'),
    getAll: (params?: { status?: string; city?: string; categoryId?: string; query?: string }) =>
      http.get<ApiResponse<CustomerReviewVideo[]>>('/api/v1/admin/customer-videos', { params }),
    getById: (id: string) =>
      http.get<ApiResponse<CustomerReviewVideo>>(`/api/v1/admin/customer-videos/${id}`),
    create: (payload: CreateCustomerReviewVideoPayload) =>
      http.post<ApiResponse<CustomerReviewVideo>>('/api/v1/admin/customer-videos', payload),
    update: (id: string, payload: CreateCustomerReviewVideoPayload) =>
      http.put<ApiResponse<CustomerReviewVideo>>(`/api/v1/admin/customer-videos/${id}`, payload),
    updateStatus: (id: string, status: string) =>
      http.patch<ApiResponse<CustomerReviewVideo>>(`/api/v1/admin/customer-videos/${id}/status`, { status }),
    delete: (id: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/customer-videos/${id}`),
    getPublished: (params?: { city?: string; categoryId?: string }) =>
      http.get<ApiResponse<CustomerReviewVideo[]>>('/api/v1/public/customer-videos', { params }),
  },

  // ─── 30. Partner Training Videos (YouTube URLs Only) ───────────
  partnerTraining: {
    getStats: () =>
      http.get<ApiResponse<PartnerTrainingStats>>('/api/v1/admin/partner-training/stats'),
    getAll: (params?: { status?: string; type?: string; categoryId?: string; isMandatory?: boolean; query?: string }) =>
      http.get<ApiResponse<PartnerTrainingVideo[]>>('/api/v1/admin/partner-training', { params }),
    getById: (id: string) =>
      http.get<ApiResponse<PartnerTrainingVideo>>(`/api/v1/admin/partner-training/${id}`),
    create: (payload: CreatePartnerTrainingVideoPayload) =>
      http.post<ApiResponse<PartnerTrainingVideo>>('/api/v1/admin/partner-training', payload),
    update: (id: string, payload: CreatePartnerTrainingVideoPayload) =>
      http.put<ApiResponse<PartnerTrainingVideo>>(`/api/v1/admin/partner-training/${id}`, payload),
    updateStatus: (id: string, status: string) =>
      http.patch<ApiResponse<PartnerTrainingVideo>>(`/api/v1/admin/partner-training/${id}/status`, { status }),
    delete: (id: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/partner-training/${id}`),
    getPartnerVideos: (params?: { partnerId?: string; type?: string; categoryId?: string }) =>
      http.get<ApiResponse<PartnerTrainingVideo[]>>('/api/v1/partners/training-videos', { params }),
    updateProgress: (id: string, payload: UpdateTrainingProgressPayload, partnerId?: string) =>
      http.post<ApiResponse<void>>(`/api/v1/partners/training-videos/${id}/progress`, payload, {
        params: { partnerId },
      }),
  },
  // ─── 31. Wallet & Revenue Management (Admin) ───────────────────
  finance: {
    getOverview: () =>
      http.get<ApiResponse<FinanceOverview>>('/api/v1/admin/finance/overview'),
    getCharts: (period?: string) =>
      http.get<ApiResponse<FinanceChartsData>>('/api/v1/admin/finance/charts', { params: { period } }),
    getCustomerWallets: (params?: { query?: string; balanceFilter?: string; status?: string }) =>
      http.get<ApiResponse<CustomerWalletItem[]>>('/api/v1/admin/finance/wallets/customers', { params }),
    getPartnerWallets: (params?: { query?: string; balanceFilter?: string; status?: string }) =>
      http.get<ApiResponse<PartnerWalletItem[]>>('/api/v1/admin/finance/wallets/partners', { params }),
    getUserWalletDetail: (userId: string) =>
      http.get<ApiResponse<UserWalletDetail>>(`/api/v1/admin/finance/wallets/${userId}/details`),
    getWithdrawals: (params?: { userType?: string; status?: string; query?: string }) =>
      http.get<ApiResponse<AdminWithdrawalItem[]>>('/api/v1/admin/finance/withdrawals', { params }),
    approveWithdrawal: (requestId: string, payload?: ApproveWithdrawalPayload) =>
      http.post<ApiResponse<void>>(`/api/v1/admin/finance/withdrawals/${requestId}/approve`, payload),
    rejectWithdrawal: (requestId: string, reason: string) =>
      http.post<ApiResponse<void>>(`/api/v1/admin/finance/withdrawals/${requestId}/reject`, { reason }),
    getRevenueAnalytics: (period?: string) =>
      http.get<ApiResponse<RevenueAnalyticsData>>('/api/v1/admin/finance/revenue/analytics', { params: { period } }),
  },
  // ─── 32. Partner Financial Settings (Admin) ────────────────────
  partnerFinancialSettings: {
    getSummary: () =>
      http.get<ApiResponse<PartnerFinancialSettingsSummary>>('/api/v1/admin/partner-financial-settings/summary'),
    getCommissionRules: () =>
      http.get<ApiResponse<CommissionRule[]>>('/api/v1/admin/partner-financial-settings/commission-rules'),
    createCommissionRule: (payload: CreateCommissionRulePayload) =>
      http.post<ApiResponse<CommissionRule>>('/api/v1/admin/partner-financial-settings/commission-rules', payload),
    updateCommissionRule: (id: string, payload: CreateCommissionRulePayload) =>
      http.put<ApiResponse<CommissionRule>>(`/api/v1/admin/partner-financial-settings/commission-rules/${id}`, payload),
    toggleCommissionRule: (id: string, active: boolean) =>
      http.patch<ApiResponse<CommissionRule>>(`/api/v1/admin/partner-financial-settings/commission-rules/${id}/active`, null, { params: { active } }),
    deleteCommissionRule: (id: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/partner-financial-settings/commission-rules/${id}`),
    previewCommission: (payload: CommissionPreviewRequest) =>
      http.post<ApiResponse<CommissionPreviewResponse>>('/api/v1/admin/partner-financial-settings/commission-rules/preview', payload),
    getCancellationRules: (userType?: string) =>
      http.get<ApiResponse<CancellationRule[]>>('/api/v1/admin/partner-financial-settings/cancellation-rules', { params: { userType } }),
    createCancellationRule: (payload: CreateCancellationRulePayload) =>
      http.post<ApiResponse<CancellationRule>>('/api/v1/admin/partner-financial-settings/cancellation-rules', payload),
    updateCancellationRule: (id: string, payload: CreateCancellationRulePayload) =>
      http.put<ApiResponse<CancellationRule>>(`/api/v1/admin/partner-financial-settings/cancellation-rules/${id}`, payload),
    toggleCancellationRule: (id: string, active: boolean) =>
      http.patch<ApiResponse<CancellationRule>>(`/api/v1/admin/partner-financial-settings/cancellation-rules/${id}/active`, null, { params: { active } }),
    deleteCancellationRule: (id: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/partner-financial-settings/cancellation-rules/${id}`),
    previewCancellation: (payload: CancellationPreviewRequest) =>
      http.post<ApiResponse<CancellationPreviewResponse>>('/api/v1/admin/partner-financial-settings/cancellation-rules/preview', payload),
    getIncentiveCampaigns: (status?: string) =>
      http.get<ApiResponse<IncentiveCampaign[]>>('/api/v1/admin/partner-financial-settings/incentive-campaigns', { params: { status } }),
    createIncentiveCampaign: (payload: CreateIncentiveCampaignPayload) =>
      http.post<ApiResponse<IncentiveCampaign>>('/api/v1/admin/partner-financial-settings/incentive-campaigns', payload),
    updateIncentiveCampaign: (id: string, payload: CreateIncentiveCampaignPayload) =>
      http.put<ApiResponse<IncentiveCampaign>>(`/api/v1/admin/partner-financial-settings/incentive-campaigns/${id}`, payload),
    updateIncentiveCampaignStatus: (id: string, status: string) =>
      http.patch<ApiResponse<IncentiveCampaign>>(`/api/v1/admin/partner-financial-settings/incentive-campaigns/${id}/status`, null, { params: { status } }),
    deleteIncentiveCampaign: (id: string) =>
      http.delete<ApiResponse<void>>(`/api/v1/admin/partner-financial-settings/incentive-campaigns/${id}`),
    getAuditLogs: (module?: string) =>
      http.get<ApiResponse<FinancialSettingsAuditLog[]>>('/api/v1/admin/partner-financial-settings/audit-logs', { params: { module } }),
  },

  // ─── 24. App Icon Management ──────────────────────────────
  appIcons: {
    getIcons: (appType: 'CUSTOMER' | 'PARTNER') =>
      http.get<ApiResponse<AppIconItem[]>>('/api/v1/admin/app-icons', { params: { appType } }),
    uploadIcon: (payload: IconUploadPayload) =>
      http.post<ApiResponse<AppIconItem>>('/api/v1/admin/app-icons', payload),
    activateIcon: (id: string, scheduledAt?: string | null) =>
      http.post<ApiResponse<AppIconItem>>(`/api/v1/admin/app-icons/${id}/activate`, { scheduledAt }),
    deactivateIcon: (id: string) =>
      http.post<ApiResponse<AppIconItem>>(`/api/v1/admin/app-icons/${id}/deactivate`),
    restoreDefault: (appType: 'CUSTOMER' | 'PARTNER') =>
      http.post<ApiResponse<AppIconItem>>('/api/v1/admin/app-icons/restore-default', { appType }),
    getHistory: (appType?: 'CUSTOMER' | 'PARTNER') =>
      http.get<ApiResponse<AppIconHistoryItem[]>>('/api/v1/admin/app-icons/history', { params: { appType } }),
  },
}
