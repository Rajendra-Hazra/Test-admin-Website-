import type { WalletTransactionItem } from './api'

export interface FinanceOverview {
  totalCustomerBalance: number
  totalPartnerBalance: number
  combinedWalletBalance: number
  recognizedRevenue: number
  todayRevenue: number
  monthlyRevenue: number
  pendingWithdrawalAmount: number
  completedWithdrawalAmount: number
  totalCustomerWithdrawals: number
  totalPartnerWithdrawals: number
  customerBalanceChange?: number
  partnerBalanceChange?: number
  revenueChange?: number
  pendingWithdrawalChange?: number
  availableBalance: number
  reservedBalance: number
  activeCustomerWalletsCount: number
  activePartnerWalletsCount: number
  pendingWithdrawalCount: number
}

export interface RevenueTrendPoint {
  date: string
  totalRevenue: number
  orderCommissions: number
  subscriptionRevenue: number
  gmv: number
}

export interface WalletBalanceComparison {
  customerBalance: number
  partnerBalance: number
  combinedBalance: number
  reservedBalance: number
}

export interface RevenueBreakdown {
  bookingCommissions: number
  customerMemberships: number
  partnerSubscriptions: number
  cancellationCharges: number
  other: number
}

export interface WithdrawalAnalytics {
  customerWithdrawals: number
  partnerWithdrawals: number
  pendingAmount: number
  completedAmount: number
  rejectedAmount: number
  pendingCount: number
  completedCount: number
  rejectedCount: number
}

export interface FinanceChartsData {
  revenueTrend: RevenueTrendPoint[]
  walletBalanceComparison: WalletBalanceComparison
  revenueBreakdown: RevenueBreakdown
  withdrawalAnalytics: WithdrawalAnalytics
}

export interface CustomerWalletItem {
  userId: string
  displayId: string
  name: string
  mobileNo: string
  emailId: string
  availableBalance: number
  nonWithdrawableBalance: number
  reservedBalance: number
  totalBalance: number
  totalCredits: number
  totalDebits: number
  walletStatus: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | string
  lastTransactionAt?: string
  lastTransactionDesc?: string
}

export interface PartnerWalletItem {
  userId: string
  displayId: string
  name: string
  mobileNo: string
  emailId: string
  availableBalance: number
  reservedBalance: number
  totalBalance: number
  totalEarnings: number
  totalWithdrawals: number
  pendingWithdrawals: number
  walletStatus: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | string
  lastTransactionAt?: string
  lastTransactionDesc?: string
}

export interface UserWalletDetail {
  userId: string
  displayId: string
  name: string
  mobileNo: string
  emailId: string
  role: 'CUSTOMER' | 'PARTNER' | string
  userStatus: string
  availableBalance: number
  nonWithdrawableBalance: number
  reservedBalance: number
  totalBalance: number
  totalCredits: number
  totalDebits: number
  refunds: number
  cashback: number
  referralRewards: number
  totalEarnings: number
  commissionDeductions: number
  penalties: number
  completedPayouts: number
  pendingPayouts: number
  bankHolderName?: string
  bankAccountMasked?: string
  ifsc?: string
  transactions: WalletTransactionItem[]
}

export interface AdminWithdrawalItem {
  id: string
  userType: 'CUSTOMER' | 'PARTNER' | string
  userId: string
  displayId: string
  userName: string
  mobileNo: string
  requestedAmount: number
  availableBalanceAtRequest: number
  paymentMethod: string
  bankAccountMasked: string
  ifsc: string
  bankUserName: string
  status: 'PENDING' | 'SUCCESS' | 'REJECTED' | 'FAILED' | string
  statusReason?: string
  transactionId?: string // UTR
  requestedAt: string
  processedAt?: string
}

export interface PeriodicRevenueRow {
  period: string
  gmv: number
  recognizedRevenue: number
  bookingCommissions: number
  subscriptions: number
  refunds: number
  discounts: number
  netRevenue: number
}

export interface RevenueAnalyticsData {
  gmv: number
  recognizedRevenue: number
  bookingCommissionRevenue: number
  customerMembershipRevenue: number
  partnerSubscriptionRevenue: number
  refunds: number
  discounts: number
  promotionalExpenses: number
  netRevenue: number
  periodicBreakdown: PeriodicRevenueRow[]
}

export interface ApproveWithdrawalPayload {
  utrReference?: string
  remarks?: string
}

