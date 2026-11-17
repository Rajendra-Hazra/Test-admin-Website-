// ── Customer Review Videos (Manual Video Uploads) ──────────────────────
export interface CustomerReviewVideo {
  id: string
  title: string
  customerName: string
  customerProfileImage?: string
  customerReview?: string
  videoUrl: string
  videoPublicId?: string
  thumbnailUrl?: string
  customerCity?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  isFeatured: boolean
  displayOrder: number
  publicationStatus: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED'
  hasConsent: boolean
  likeCount: number
  rating: number
  createdAt?: string
  updatedAt?: string
}

export interface CustomerReviewVideoStats {
  totalVideos: number
  publishedVideos: number
  draftVideos: number
  featuredVideos: number
}

export interface CreateCustomerReviewVideoPayload {
  title: string
  customerName: string
  customerProfileImage?: string
  customerReview?: string
  videoUrl: string
  videoPublicId?: string
  thumbnailUrl?: string
  customerCity?: string
  serviceCategoryId?: string
  serviceCategoryName?: string
  isFeatured?: boolean
  displayOrder?: number
  publicationStatus?: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED'
  hasConsent: boolean
  rating?: number
}

// ── Partner Training Videos (YouTube URLs Only) ─────────────────────────
export interface PartnerTrainingVideo {
  id: string
  title: string
  description?: string
  youtubeUrl: string
  youtubeVideoId: string
  thumbnailUrl?: string
  trainingType: 'GENERAL' | 'SERVICE_CATEGORY' | 'SAFETY_QUALITY'
  serviceCategoryId?: string
  serviceCategoryName?: string
  serviceSubcategoryId?: string
  serviceSubcategoryName?: string
  isMandatory: boolean
  displayOrder: number
  publicationStatus: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  durationSeconds?: number
  viewCount: number
  createdAt?: string
  updatedAt?: string
  isCompleted?: boolean
  watchTimeSeconds?: number
  completedAt?: string
}

export interface PartnerTrainingStats {
  totalVideos: number
  publishedVideos: number
  mandatoryVideos: number
  generalVideos: number
  categoryVideos: number
  safetyVideos: number
}

export interface CreatePartnerTrainingVideoPayload {
  title: string
  description?: string
  youtubeUrl: string
  youtubeVideoId?: string
  thumbnailUrl?: string
  trainingType: 'GENERAL' | 'SERVICE_CATEGORY' | 'SAFETY_QUALITY'
  serviceCategoryId?: string
  serviceCategoryName?: string
  serviceSubcategoryId?: string
  serviceSubcategoryName?: string
  isMandatory?: boolean
  displayOrder?: number
  publicationStatus?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  durationSeconds?: number
}

export interface UpdateTrainingProgressPayload {
  isCompleted: boolean
  watchTimeSeconds?: number
}

