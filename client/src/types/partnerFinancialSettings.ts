export interface CommissionRule {
  id: string
  ruleName: string
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  cityId?: string
  cityName?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  serviceSubcategoryId?: string
  serviceSubcategoryName?: string
  partnerId?: string
  partnerName?: string
  priority: number
  startDate?: string
  endDate?: string
  isActive: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCommissionRulePayload {
  ruleName: string
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  cityId?: string
  cityName?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  serviceSubcategoryId?: string
  serviceSubcategoryName?: string
  partnerId?: string
  partnerName?: string
  priority?: number
  startDate?: string
  endDate?: string
  isActive?: boolean
  notes?: string
}

export interface CommissionPreviewRequest {
  bookingAmount: number
  cityId?: string
  serviceCategoryId?: string
  serviceSubcategoryId?: string
  partnerId?: string
}

export interface CommissionPreviewResponse {
  bookingAmount: number
  matchedRuleId: string
  matchedRuleName: string
  matchedRuleScope: string
  priorityScore: number
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  commissionDeduction: number
  partnerEarnings: number
  effectiveCommissionPercent: number
}

export interface CancellationRule {
  id: string
  ruleName: string
  userType: 'CUSTOMER' | 'PARTNER'
  chargeType: 'PERCENTAGE' | 'FIXED'
  chargeValue: number
  maxCap?: number
  freeWindowMinutes: number
  freeWindowHoursBeforeSlot: number
  applicableStatus?: string
  cityId?: string
  cityName?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  effectiveDate?: string
  isActive: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCancellationRulePayload {
  ruleName: string
  userType: 'CUSTOMER' | 'PARTNER'
  chargeType: 'PERCENTAGE' | 'FIXED'
  chargeValue: number
  maxCap?: number
  freeWindowMinutes?: number
  freeWindowHoursBeforeSlot?: number
  applicableStatus?: string
  cityId?: string
  cityName?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  effectiveDate?: string
  isActive?: boolean
  notes?: string
}

export interface CancellationPreviewRequest {
  userType: 'CUSTOMER' | 'PARTNER'
  bookingAmount: number
  orderTiming: 'INSTANT' | 'SCHEDULED'
  minutesSinceAcceptance?: number
  hoursBeforeSlot?: number
  bookingStatus?: string
  cityId?: string
  serviceCategoryId?: string
}

export interface CancellationPreviewResponse {
  userType: string
  bookingAmount: number
  isFreeCancellation: boolean
  freeCancellationReason: string
  matchedRuleName: string
  cancellationCharge: number
  customerRefundAmount: number
  partnerCompensationOrPenalty: number
  financialImpactSummary: string
}

export interface IncentiveSlab {
  tier: number
  minCompletedJobs: number
  minBookingValue?: number
  incentiveAmount: number
}

export interface IncentiveCampaign {
  id: string
  campaignName: string
  description?: string
  startDate: string
  endDate: string
  weeklyPeriod: string
  cityIds?: string
  categoryIds?: string
  eligiblePartnerTypes: string
  minCompletedJobs: number
  minBookingValue?: number
  incentiveAmount: number
  maxIncentivePerPartner?: number
  slabsJson?: string
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'EXPIRED' | string
  createdAt?: string
  updatedAt?: string
}

export interface CreateIncentiveCampaignPayload {
  campaignName: string
  description?: string
  startDate: string
  endDate: string
  weeklyPeriod?: string
  cityIds?: string
  categoryIds?: string
  eligiblePartnerTypes?: string
  minCompletedJobs?: number
  minBookingValue?: number
  incentiveAmount: number
  maxIncentivePerPartner?: number
  slabsJson?: string
  status?: string
}

export interface FinancialSettingsAuditLog {
  id: string
  module: string
  action: string
  entityId?: string
  entityName?: string
  changedBy?: string
  previousValue?: string
  newValue?: string
  createdAt: string
}

export interface PartnerFinancialSettingsSummary {
  activeCommissionRules: number
  activeCancellationRules: number
  activeIncentiveCampaigns: number
  defaultPlatformCommissionPercent: number
  defaultCustomerCancellationChargePercent: number
  defaultPartnerCancellationChargePercent: number
}

