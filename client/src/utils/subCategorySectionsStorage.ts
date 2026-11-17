import {
  type SubProblemSectionsData,
  createDefaultSubProblemSections
} from '@/types/subCategorySections'

const STORAGE_PREFIX = 'omibay_subproblem_sections_'

export function getStoredSubProblemSections(subProblemId: string, defaultName?: string): SubProblemSectionsData {
  if (!subProblemId) return createDefaultSubProblemSections(defaultName)
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + subProblemId) || localStorage.getItem('omibay_subcat_sections_' + subProblemId)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...createDefaultSubProblemSections(defaultName),
        ...parsed,
        selectionConfig: {
          ...createDefaultSubProblemSections(defaultName).selectionConfig,
          ...(parsed.selectionConfig || {})
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse sub-problem sections from localStorage:', e)
  }
  return createDefaultSubProblemSections(defaultName)
}

export function saveStoredSubProblemSections(subProblemId: string, data: SubProblemSectionsData): void {
  if (!subProblemId) return
  try {
    localStorage.setItem(STORAGE_PREFIX + subProblemId, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save sub-problem sections to localStorage:', e)
  }
}

// Backward compatibility aliases
export const getStoredSubCategorySections = getStoredSubProblemSections
export const saveStoredSubCategorySections = saveStoredSubProblemSections

/**
 * Converts SubProblemSectionsData to the format consumed by the customer app
 * (SubServiceProblemDetails model schema)
 */
export function formatCustomerAppSubProblemPayload(sections: SubProblemSectionsData, subProblemName: string) {
  return {
    title: sections.titlePricing.title || subProblemName,
    description: sections.titlePricing.description,
    estimatedDurationMinutes: sections.titlePricing.estimatedDurationMinutes,
    complexityLevel: sections.titlePricing.complexityLevel,
    isConfigurable: sections.selectionConfig?.isConfigurable ?? false,
    selectionSections: sections.selectionConfig?.isConfigurable ? sections.selectionConfig.sections : [],
    heroImageUrl: sections.heroMedia.heroImageUrl || undefined,
    videoUrl: sections.heroMedia.videoUrl || undefined,
    galleryImages: sections.heroMedia.galleryImages,
    pricing: {
      basePrice: sections.titlePricing.basePrice,
      originalPrice: sections.titlePricing.originalPrice,
      discountPercentage: sections.titlePricing.discountPercentage,
      priceDropAmount: sections.titlePricing.priceDropAmount,
      priceDropBadgeText: sections.titlePricing.priceDropBadgeText,
      hasPriceDrop: (sections.titlePricing.priceDropAmount || 0) > 0
    },
    freeService: sections.freeOffer.enabled ? sections.freeOffer : null,
    seeTheDifference: sections.seeTheDifference.enabled ? sections.seeTheDifference.items : [],
    processSteps: sections.serviceProcess.enabled ? sections.serviceProcess.steps : [],
    warrantyDays: sections.warranty.enabled ? sections.warranty.warrantyDays : null,
    warrantyPolicyTitle: sections.warranty.enabled ? sections.warranty.warrantyPolicyTitle : null,
    warrantyTerms: sections.warranty.enabled ? sections.warranty.warrantyTerms : null,
    surfacesCovered: sections.surfacesCovered.enabled ? sections.surfacesCovered.surfaces : [],
    inclusions: sections.inclusions.enabled ? sections.inclusions.items.map(i => i.title) : [],
    inclusionItems: sections.inclusions.enabled ? sections.inclusions.items : [],
    pleaseNotes: sections.pleaseNotes.enabled ? sections.pleaseNotes.notes : [],
    exclusions: sections.exclusions.enabled ? sections.exclusions.items : [],
    customerPreparations: sections.customerPreparation.enabled ? sections.customerPreparation.preparations : [],
    supportedBrands: sections.supportedBrands.enabled ? sections.supportedBrands.brands : [],
    unsupportedBrands: sections.unsupportedBrands.enabled ? sections.unsupportedBrands.brands : [],
    professionalDetails: sections.professional.enabled ? sections.professional : null,
    partnerTools: sections.partnerTools.enabled ? sections.partnerTools.tools : [],
    beforeAfterGallery: sections.beforeAfterGallery.enabled ? sections.beforeAfterGallery.pairs : [],
    faqs: sections.faqs.enabled ? sections.faqs.items : [],
    shareSettings: sections.shareService.enabled ? sections.shareService : null,
    ratingDetails: sections.reviewsConfig.enabled
      ? {
          averageRating: sections.reviewsConfig.averageRating,
          totalReviews: sections.reviewsConfig.totalReviews,
          featuredReview: sections.reviewsConfig.featuredReview
        }
      : null
  }
}
