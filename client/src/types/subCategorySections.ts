export interface GalleryImageItem {
  imageUrl: string
  caption?: string
  sortOrder?: number
}

export interface SeeTheDifferenceItem {
  id: string
  title: string
  description: string
  imageUrl: string
}

export interface ServiceProcessStepItem {
  stepNumber: number
  title: string
  description: string
  imageUrl?: string
  caption?: string
}

export interface CoveredSurfaceItem {
  id: string
  title: string
  imageUrl: string
  description?: string
}

export interface InclusionItem {
  title: string
  description?: string
  imageUrl?: string
}

export interface CustomerPrepItem {
  instruction: string
  isMandatory: boolean
  tip?: string
}

export interface BrandItem {
  id: string
  name: string
  logoUrl?: string
}

export interface PartnerToolItem {
  name: string
  description?: string
  iconUrl?: string
  imageUrl?: string
  isCustomerProvided: boolean
}

export interface BeforeAfterGalleryItem {
  id: string
  title?: string
  description?: string
  beforeImageUrl: string
  afterImageUrl: string
}

export interface FaqItem {
  question: string
  answer: string
}

// ── Add-on & Configuration Selection Types ─────────────────────
export type SelectionType = 'single' | 'multiple' | 'optionalAddon' | 'quantityBased'

export interface ServiceOptionItem {
  id: string
  title: string
  description?: string
  imageUrl?: string
  price: number
  minQuantity: number
  maxQuantity: number
  isDefault: boolean
  isPropertyDetail: boolean
  isActive: boolean
}

export interface ServiceSelectionSectionItem {
  id: string
  title: string
  displayOrder: number
  selectionType: SelectionType
  isRequired: boolean
  isExpanded: boolean
  helperText?: string
  options: ServiceOptionItem[]
}

export interface SubProblemSectionsData {
  // ── Add-ons & Extra Things Configuration Popup ──────────────
  selectionConfig: {
    isConfigurable: boolean // Master toggle: whether this sub problem opens the add-on/extras popup
    sections: ServiceSelectionSectionItem[]
  }

  // 1. Hero Media
  heroMedia: {
    enabled: boolean
    heroImageUrl: string
    videoUrl: string
    galleryImages: GalleryImageItem[]
  }

  // 2. Title, Duration & Pricing
  titlePricing: {
    enabled: boolean
    title: string
    description: string
    estimatedDurationMinutes: number
    complexityLevel: string
    basePrice: number
    originalPrice: number
    discountPercentage: number
    priceDropAmount: number
    priceDropBadgeText: string
  }

  // 3. Free Offer / Complimentary Service
  freeOffer: {
    enabled: boolean
    title: string
    description: string
    originalPrice: string
    badgeText: string
    iconUrl: string
    validityNote: string
  }

  // 4. See the Difference (OmiBay vs Local)
  seeTheDifference: {
    enabled: boolean
    heading: string
    items: SeeTheDifferenceItem[]
  }

  // 5. Service Process Steps
  serviceProcess: {
    enabled: boolean
    heading: string
    steps: ServiceProcessStepItem[]
  }

  // 6. Warranty & Protection (OmiBay Cover)
  warranty: {
    enabled: boolean
    warrantyDays: number
    warrantyPolicyTitle: string
    warrantyTerms: string
  }

  // 7. Surfaces We Cover
  surfacesCovered: {
    enabled: boolean
    heading: string
    surfaces: CoveredSurfaceItem[]
  }

  // 8. Inclusions (What is Covered)
  inclusions: {
    enabled: boolean
    heading: string
    items: InclusionItem[]
  }

  // 9. Please Note (Important Disclaimers)
  pleaseNotes: {
    enabled: boolean
    heading: string
    notes: string[]
  }

  // 10. Exclusions (What isn't Covered)
  exclusions: {
    enabled: boolean
    heading: string
    items: string[]
  }

  // 11. Customer Preparation (What We Need From You)
  customerPreparation: {
    enabled: boolean
    heading: string
    preparations: CustomerPrepItem[]
  }

  // 12. Supported Brands
  supportedBrands: {
    enabled: boolean
    heading: string
    brands: BrandItem[]
  }

  // 13. Unsupported Brands
  unsupportedBrands: {
    enabled: boolean
    heading: string
    brands: BrandItem[]
  }

  // 14. Verified Professional Banner
  professional: {
    enabled: boolean
    title: string
    subtitle: string
    photoUrl: string
    experienceText: string
    badgeText: string
    highlights: string[]
  }

  // 15. Partner Tools & Equipment
  partnerTools: {
    enabled: boolean
    heading: string
    tools: PartnerToolItem[]
  }

  // 16. Before & After Gallery
  beforeAfterGallery: {
    enabled: boolean
    heading: string
    pairs: BeforeAfterGalleryItem[]
  }

  // 17. Frequently Asked Questions (FAQ)
  faqs: {
    enabled: boolean
    heading: string
    items: FaqItem[]
  }

  // 18. Share Service With Friends / Referral
  shareService: {
    enabled: boolean
    shareTitle: string
    shareMessage: string
    referralBonusText: string
  }

  // 19. Ratings & Customer Reviews
  reviewsConfig: {
    enabled: boolean
    averageRating: number
    totalReviews: number
    showVerifiedBadge: boolean
    featuredReview: {
      userName: string
      userAvatar?: string
      rating: number
      comment: string
      dateText: string
    }
  }
}

// Type alias for backward compatibility
export type SubCategorySectionsData = SubProblemSectionsData

export function createDefaultSubProblemSections(name: string = ''): SubProblemSectionsData {
  return {
    selectionConfig: {
      isConfigurable: false, // Default toggle is OFF, admin can turn ON for any sub-problem
      sections: [
        {
          id: 'sec-addon-1',
          title: 'Add Extra Areas & Add-ons',
          displayOrder: 1,
          selectionType: 'optionalAddon',
          isRequired: false,
          isExpanded: true,
          helperText: 'Select any extra areas or appliances you would like added to your service',
          options: [
            {
              id: 'opt-balcony',
              title: 'Balcony Deep Clean',
              description: 'Floor scrub, railing wash, and drain cleaning',
              imageUrl: '',
              price: 199,
              minQuantity: 0,
              maxQuantity: 5,
              isDefault: false,
              isPropertyDetail: false,
              isActive: true
            },
            {
              id: 'opt-kitchen',
              title: 'Extra Kitchen / Utility Area',
              description: 'Countertop degreasing, sink scrub, and tiles wash',
              imageUrl: '',
              price: 349,
              minQuantity: 0,
              maxQuantity: 3,
              isDefault: false,
              isPropertyDetail: false,
              isActive: true
            },
            {
              id: 'opt-chimney',
              title: 'Chimney / Exhaust Degreasing',
              description: 'Filter removal and carbon buildup degreasing',
              imageUrl: '',
              price: 299,
              minQuantity: 0,
              maxQuantity: 2,
              isDefault: false,
              isPropertyDetail: false,
              isActive: true
            }
          ]
        }
      ]
    },
    heroMedia: {
      enabled: true,
      heroImageUrl: '',
      videoUrl: '',
      galleryImages: []
    },
    titlePricing: {
      enabled: true,
      title: name || 'Premium Service',
      description: 'Comprehensive expert service delivered by certified professionals using industry standard tools and eco-friendly products.',
      estimatedDurationMinutes: 60,
      complexityLevel: 'Standard',
      basePrice: 499,
      originalPrice: 699,
      discountPercentage: 28,
      priceDropAmount: 200,
      priceDropBadgeText: 'Limited Period Offer'
    },
    freeOffer: {
      enabled: true,
      title: 'Free Sanitization & Inspection',
      description: 'Complimentary high-touch point sanitization and complete 10-point checkup included with every booking.',
      originalPrice: '₹199',
      badgeText: 'FREE BONUS',
      iconUrl: '',
      validityNote: 'Valid on today\'s booking'
    },
    seeTheDifference: {
      enabled: true,
      heading: 'See the OmiBay Difference',
      items: [
        {
          id: 'diff-1',
          title: 'OmiBay Certified Experts',
          description: 'Background-verified, trained technicians using specialized gear and genuine parts.',
          imageUrl: ''
        },
        {
          id: 'diff-2',
          title: 'Standardized Pricing',
          description: 'Transparent upfront quote with zero hidden charges or on-spot negotiation.',
          imageUrl: ''
        }
      ]
    },
    serviceProcess: {
      enabled: true,
      heading: 'How It Works',
      steps: [
        {
          stepNumber: 1,
          title: 'Doorstep Inspection',
          description: 'Our certified professional arrives with all tools and evaluates the service requirements.',
          imageUrl: '',
          caption: 'Pre-service diagnosis'
        },
        {
          stepNumber: 2,
          title: 'Precision Execution',
          description: 'Thorough cleaning and repair carried out strictly following OmiBay standard operating procedures.',
          imageUrl: '',
          caption: 'Step-by-step service'
        },
        {
          stepNumber: 3,
          title: 'Quality Check & Handover',
          description: 'Final post-service check in your presence to ensure complete 100% satisfaction before payment.',
          imageUrl: '',
          caption: 'Customer sign-off'
        }
      ]
    },
    warranty: {
      enabled: true,
      warrantyDays: 30,
      warrantyPolicyTitle: '30-Day OmiBay Assurance & Damage Protection',
      warrantyTerms: 'Free rework or full refund guarantee if any issues persist within 30 days of service completion.'
    },
    surfacesCovered: {
      enabled: true,
      heading: 'Surfaces & Appliances We Cover',
      surfaces: [
        {
          id: 'surf-1',
          title: 'Residential Units',
          imageUrl: '',
          description: 'Apartments, villas, and independent houses'
        },
        {
          id: 'surf-2',
          title: 'Commercial Workspaces',
          imageUrl: '',
          description: 'Offices, clinics, and retail establishments'
        }
      ]
    },
    inclusions: {
      enabled: true,
      heading: 'What is Included',
      items: [
        { title: 'Complete deep cleaning of all functional parts', description: 'Internal components treated with anti-bacterial solution' },
        { title: 'High-pressure vacuum & filter decontamination', description: 'Removes 99.9% dust mites and allergens' },
        { title: 'Post-service cleanup of surrounding area', description: 'No mess left behind after the work is done' }
      ]
    },
    pleaseNotes: {
      enabled: true,
      heading: 'Please Note',
      notes: [
        'Please ensure uninterrupted water and electricity supply during service.',
        'Pets and children should be kept at a safe distance while equipment is running.',
        'High ceilings above 10 ft may require a ladder to be arranged.'
      ]
    },
    exclusions: {
      enabled: true,
      heading: 'What Isn\'t Covered',
      items: [
        'Replacement of internal physical hardware spare parts (billed separately if requested)',
        'Civil alterations or masonry drill repairs not part of standard scope',
        'Pre-existing structural damages not caused by the service'
      ]
    },
    customerPreparation: {
      enabled: true,
      heading: 'What We Need From You',
      preparations: [
        { instruction: 'Keep continuous water & power outlet available', isMandatory: true, tip: 'Needed for operating cleaning pumps' },
        { instruction: 'Clear fragile items from the immediate service area', isMandatory: false, tip: 'Helps technician work swiftly' }
      ]
    },
    supportedBrands: {
      enabled: true,
      heading: 'We Service All Major Brands',
      brands: [
        { id: 'b-1', name: 'LG', logoUrl: '' },
        { id: 'b-2', name: 'Samsung', logoUrl: '' },
        { id: 'b-3', name: 'Daikin', logoUrl: '' },
        { id: 'b-4', name: 'Voltas', logoUrl: '' },
        { id: 'b-5', name: 'Whirlpool', logoUrl: '' },
        { id: 'b-6', name: 'Bosch', logoUrl: '' }
      ]
    },
    unsupportedBrands: {
      enabled: false,
      heading: 'Brands Not Covered',
      brands: []
    },
    professional: {
      enabled: true,
      title: 'OmiBay Verified Specialist',
      subtitle: 'Police background verified & 100+ hours certified training',
      photoUrl: '',
      experienceText: '5+ Years Field Experience',
      badgeText: 'CERTIFIED MASTER',
      highlights: [
        'Criminal background & government ID verified',
        'Trained on advanced multi-brand diagnostic tools',
        'Adheres to strict contact-free safety standards'
      ]
    },
    partnerTools: {
      enabled: true,
      heading: 'Specialized Tools & Equipment',
      tools: [
        { name: 'Industrial Grade Vacuum Pump', description: 'High CFM suction equipment', isCustomerProvided: false },
        { name: 'Eco-Friendly Chemical Disinfectant', description: 'Non-toxic, safe for pets and kids', isCustomerProvided: false }
      ]
    },
    beforeAfterGallery: {
      enabled: true,
      heading: 'Real Service Transformations',
      pairs: [
        {
          id: 'ba-1',
          title: 'Deep Coil & Filter Restoration',
          description: 'Restores airflow efficiency and eliminates foul odors',
          beforeImageUrl: '',
          afterImageUrl: ''
        }
      ]
    },
    faqs: {
      enabled: true,
      heading: 'Frequently Asked Questions',
      items: [
        {
          question: 'How long does the service take?',
          answer: 'Standard service takes approximately 45 to 60 minutes depending on condition.'
        },
        {
          question: 'Do I need to arrange any cleaning material or tools?',
          answer: 'No, our professionals carry all necessary machines, tools, and chemical supplies.'
        },
        {
          question: 'What if I am not satisfied with the service?',
          answer: 'We provide a 30-day rework warranty. If you notice any defect, we will send an expert free of cost.'
        }
      ]
    },
    shareService: {
      enabled: true,
      shareTitle: 'Book Verified Home Services with OmiBay',
      shareMessage: 'Hey, I recommend OmiBay services. Book now and get instant discount!',
      referralBonusText: 'Earn ₹100 wallet credit for every successful friend referral.'
    },
    reviewsConfig: {
      enabled: true,
      averageRating: 4.8,
      totalReviews: 240,
      showVerifiedBadge: true,
      featuredReview: {
        userName: 'Priya Sharma',
        rating: 5,
        comment: 'Outstanding professionalism! Punctual, polite, and left my unit working like brand new. Highly recommended!',
        dateText: '2 days ago'
      }
    }
  }
}

export const createDefaultSubCategorySections = createDefaultSubProblemSections
