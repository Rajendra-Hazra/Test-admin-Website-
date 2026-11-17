
// ── Subscription Management Interfaces ───────────────────────────────────
export interface SubscriptionStats {
  totalActiveSubscriptions: number
  activeCustomerSubscriptions: number
  activePartnerSubscriptions: number
  totalSubscriptionRevenue: number
  customerSubscriptionRevenue: number
  partnerSubscriptionRevenue: number
  expiringSubscriptions: number
  expiredSubscriptions: number
  pendingPayments: number
  expiring7Days: number
  expiring3Days: number
  expiringTomorrow: number
  monthlyGrowthRate: number
  renewalRate: number
  cancellationRate: number
}

export interface CustomerPlan {
  planId: string
  customerSubId?: string
  name: string
  description?: string
  price: number
  durationDays: number
  discountPercent: number
  maxDiscountAmount: number
  minBookingAmount?: number
  benefits?: string
  isActive: boolean
  autoRenewAvailable?: boolean
  activeSubscribersCount: number
  createdAt?: string
}

export interface PartnerPlan {
  planId: string
  partnerSubId?: string
  name: string
  description?: string
  price: number
  durationDays: number
  platformChargePercent: number
  standardPlatformChargePercent: number
  commissionBenefitPercent: number
  autoAcceptOrderLimit: number
  isAutoOnlineIncluded: boolean
  benefits?: string
  isActive: boolean
  activeSubscribersCount: number
  createdAt?: string
}

export interface CreateCustomerPlanPayload {
  name: string
  description?: string
  price: number
  durationDays: number
  discountPercent: number
  maxDiscountAmount: number
  minBookingAmount?: number
  benefits?: string
  isActive?: boolean
  autoRenewAvailable?: boolean
}

export interface CreatePartnerPlanPayload {
  name: string
  description?: string
  price: number
  durationDays: number
  platformChargePercent: number
  autoAcceptOrderLimit?: number
  isAutoOnlineIncluded?: boolean
  benefits?: string
  isActive?: boolean
}

export interface UserSubscriptionItem {
  id: string
  userId: string
  userDisplayId?: string
  userName: string
  userMobile: string
  userEmail?: string
  cityName?: string
  subscriberType: 'CUSTOMER' | 'PARTNER'
  subscriptionId: string
  subscriptionPlanId?: string
  planName: string
  planDurationDays: number
  price: number
  discountPercent?: number
  maxDiscountAmount?: number
  platformChargePercent?: number
  commissionBenefitPercent?: number
  autoAcceptOrderLimit?: number
  isAutoOnlineIncluded?: boolean
  serviceCategories?: string[]
  transactionId?: string
  startDate?: string
  endDate?: string
  daysRemaining: number
  isActive: boolean
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING'
  autoRenew: boolean
  createdAt?: string
}

export interface SubscriptionTimelineEvent {
  title: string
  description: string
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'DANGER'
  timestamp: string
}

export interface SubscriptionTransaction {
  transactionId: string
  userId: string
  userType: 'CUSTOMER' | 'PARTNER'
  userName: string
  userMobile?: string
  subscriptionPlan: string
  amount: number
  paymentMethod: string
  paymentGateway: string
  paymentStatus: string
  transactionDate: string
}

export interface UserSubscriptionDetail extends UserSubscriptionItem {
  planDescription?: string
  standardPlatformChargePercent?: number
  totalBookings: number
  totalDiscountUsed: number
  totalPartnerEarnings: number
  transactions: SubscriptionTransaction[]
  timeline: SubscriptionTimelineEvent[]
}

export interface ExtendSubscriptionPayload {
  additionalDays: number
  reason?: string
}

export interface ChangePlanPayload {
  newPlanId: string
  reason?: string
}

export interface CancelSubscriptionPayload {
  reason: string
}

export interface SendReminderPayload {
  title?: string
  message?: string
}

export interface SubscriptionReports {
  monthlyRevenue: {
    month: string
    customerRevenue: number
    partnerRevenue: number
    newSubscribers: number
  }[]
  planPerformance: {
    planName: string
    type: string
    subscriberCount: number
    totalRevenue: number
  }[]
  cityPerformance: {
    cityName: string
    activeSubscriptions: number
    totalRevenue: number
  }[]
  activeCount: number
  expiredCount: number
  cancelledCount: number
  renewalRate: number
  cancellationRate: number
}

