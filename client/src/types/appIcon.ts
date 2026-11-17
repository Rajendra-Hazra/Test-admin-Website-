export type AppType = 'CUSTOMER' | 'PARTNER'

export type PlatformCompatibility = 'ANDROID_ONLY' | 'IOS_ONLY' | 'BOTH' | 'NONE'

export type IconActivationStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'PENDING_BUILD'

export type DeviceDeploymentStatus = 'APPLIED' | 'PENDING' | 'BUILD_REQUIRED' | 'FAILED'

export interface AppIconItem {
  id: string
  appType: AppType
  iconIdentifier: string
  name: string
  description: string
  version: string
  iconUrl: string
  platformCompatibility: PlatformCompatibility
  bundledInAndroid: boolean
  bundledInIos: boolean
  minSupportedAppVersion: string
  status: IconActivationStatus
  isActive: boolean
  isDefault: boolean
  scheduledAt?: string
  activatedAt?: string
  createdAt: string
  createdBy: string
}

export interface IconUploadPayload {
  appType: AppType
  name: string
  iconIdentifier: string
  description: string
  version: string
  iconUrl: string
  bundledInAndroid: boolean
  bundledInIos: boolean
  minSupportedAppVersion: string
  scheduleActivation?: boolean
  scheduledDate?: string
}

export interface AppIconHistoryItem {
  id: string
  appType: AppType
  previousIconName: string
  previousIconUrl: string
  newIconName: string
  newIconUrl: string
  newIconIdentifier: string
  action: 'ACTIVATE' | 'SCHEDULE' | 'DEACTIVATE' | 'RESTORE'
  platform: string
  changedBy: string
  changeDate: string
  status: string
  deviceApplicationStatus: DeviceDeploymentStatus
  deviceConfirmedCount: number
  devicePendingCount: number
  deviceBuildRequiredCount: number
}

export interface AppIconSummary {
  customerActiveIcon: AppIconItem | null
  partnerActiveIcon: AppIconItem | null
  totalIcons: number
  customerIconsCount: number
  partnerIconsCount: number
  scheduledChangesCount: number
  recentHistory: AppIconHistoryItem[]
}

