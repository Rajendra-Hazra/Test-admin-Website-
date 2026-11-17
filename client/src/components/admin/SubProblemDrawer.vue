<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  type SubProblemSectionsData,
  createDefaultSubProblemSections,
  type SeeTheDifferenceItem,
  type ServiceProcessStepItem,
  type CoveredSurfaceItem,
  type InclusionItem,
  type CustomerPrepItem,
  type BrandItem,
  type PartnerToolItem,
  type BeforeAfterGalleryItem,
  type FaqItem,
  type GalleryImageItem,
  type ServiceSelectionSectionItem,
  type ServiceOptionItem,
  type SelectionType
} from '@/types/subCategorySections'
import { getStoredSubProblemSections } from '@/utils/subCategorySectionsStorage'
import type { PricingType } from '@/types/api'
import Toggle from '@/components/common/Toggle.vue'
import Select from '@/components/common/Select.vue'
import {
  X,
  Check,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Image,
  DollarSign,
  Gift,
  Scale,
  GitBranch,
  ShieldCheck,
  Grid,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Tag,
  Ban,
  UserCheck,
  Wrench,
  SplitSquareVertical,
  MessageSquare,
  Share2,
  Star,
  PackagePlus
} from 'lucide-vue-next'

interface Props {
  isOpen: boolean
  isEdit?: boolean
  typeOptions: Array<{ label: string; value: string }>
  categoryOptions: Array<{ label: string; value: string }>
  initialServiceTypeId?: string
  initialServiceCategoryId?: string
  initialData?: {
    uniqueId?: string
    name: string
    serviceTypeId?: string
    serviceCategoryId: string
    description?: string
    pricingType?: PricingType
    isActive: boolean
    isConfigurable?: boolean
    image?: string
  }
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  isEdit: false,
  initialServiceTypeId: '',
  initialServiceCategoryId: '',
  isSaving: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'typeChange', typeId: string): void
  (e: 'save', payload: {
    name: string
    serviceTypeId: string
    serviceCategoryId: string
    description: string
    pricingType: PricingType
    isActive: boolean
    isConfigurable: boolean
    imageFile: File | null
    sections: SubProblemSectionsData
    uniqueId?: string
  }): void
}>()

// Core Form State
const name = ref('')
const serviceTypeId = ref('')
const serviceCategoryId = ref('')
const description = ref('')
const pricingType = ref<PricingType>('QUANTITY_BASED')
const isActive = ref(true)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')
const sections = ref<SubProblemSectionsData>(createDefaultSubProblemSections())

// Active tab in navigation (1 to 20)
const activeSection = ref(1)

// Initialize or sync when the modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.initialData) {
        name.value = props.initialData.name || ''
        serviceTypeId.value = props.initialData.serviceTypeId || props.initialServiceTypeId || ''
        serviceCategoryId.value = props.initialData.serviceCategoryId || props.initialServiceCategoryId || ''
        description.value = props.initialData.description || ''
        pricingType.value = props.initialData.pricingType || 'QUANTITY_BASED'
        isActive.value = props.initialData.isActive ?? true
        imagePreview.value = props.initialData.image || ''
        imageFile.value = null
        sections.value = getStoredSubProblemSections(props.initialData.uniqueId || '', props.initialData.name || '')
        if (props.initialData.isConfigurable !== undefined) {
          sections.value.selectionConfig.isConfigurable = props.initialData.isConfigurable
        }
      } else {
        name.value = ''
        serviceTypeId.value = props.initialServiceTypeId || ''
        serviceCategoryId.value = props.initialServiceCategoryId || ''
        description.value = ''
        pricingType.value = 'QUANTITY_BASED'
        isActive.value = true
        imagePreview.value = ''
        imageFile.value = null
        sections.value = createDefaultSubProblemSections('')
      }
      activeSection.value = 1
    }
  },
  { immediate: true }
)

// When category dropdown changes, notify parent to fetch subcategories
watch(serviceTypeId, (newTypeId) => {
  if (newTypeId) {
    emit('typeChange', newTypeId)
  }
})

// Sync name to Section 2 Title if newly typed
watch(name, (newVal) => {
  if (!props.isEdit && sections.value.titlePricing.title === 'Premium Service') {
    sections.value.titlePricing.title = newVal
  }
})

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    const file = target.files[0]
    if (file) {
      imageFile.value = file
      imagePreview.value = URL.createObjectURL(file)
    }
  }
}

// 20 Sections Metadata Configuration (19 Customer App sections + Add-ons/Extras Popup)
const sectionMeta = [
  { id: 20, title: 'Add-ons Popup (Extras)', icon: Sparkles, count: () => sections.value.selectionConfig.isConfigurable ? (sections.value.selectionConfig.sections.reduce((acc, s) => acc + s.options.length, 0) + ' extras') : 'Off' },
  { id: 1, title: 'Hero Media', icon: Image, count: () => (sections.value.heroMedia.galleryImages.length + (sections.value.heroMedia.heroImageUrl ? 1 : 0)) + ' media' },
  { id: 2, title: 'Title & Pricing', icon: DollarSign, count: () => '₹' + sections.value.titlePricing.basePrice },
  { id: 3, title: 'Free Offer', icon: Gift, count: () => sections.value.freeOffer.enabled ? 'Active' : 'Off' },
  { id: 4, title: 'See Difference', icon: Scale, count: () => sections.value.seeTheDifference.items.length + ' items' },
  { id: 5, title: 'Our Process', icon: GitBranch, count: () => sections.value.serviceProcess.steps.length + ' steps' },
  { id: 6, title: 'OmiBay Cover', icon: ShieldCheck, count: () => sections.value.warranty.warrantyDays + ' days' },
  { id: 7, title: 'Surfaces Covered', icon: Grid, count: () => sections.value.surfacesCovered.surfaces.length + ' surfaces' },
  { id: 8, title: 'What is Included', icon: CheckCircle2, count: () => sections.value.inclusions.items.length + ' items' },
  { id: 9, title: 'Please Note', icon: AlertCircle, count: () => sections.value.pleaseNotes.notes.length + ' notes' },
  { id: 10, title: "What Isn't Covered", icon: XCircle, count: () => sections.value.exclusions.items.length + ' items' },
  { id: 11, title: 'Customer Prep', icon: HelpCircle, count: () => sections.value.customerPreparation.preparations.length + ' preps' },
  { id: 12, title: 'Supported Brands', icon: Tag, count: () => sections.value.supportedBrands.brands.length + ' brands' },
  { id: 13, title: 'Unsupported Brands', icon: Ban, count: () => sections.value.unsupportedBrands.brands.length + ' brands' },
  { id: 14, title: 'Verified Pro', icon: UserCheck, count: () => sections.value.professional.highlights.length + ' points' },
  { id: 15, title: 'Partner Tools', icon: Wrench, count: () => sections.value.partnerTools.tools.length + ' tools' },
  { id: 16, title: 'Before & After', icon: SplitSquareVertical, count: () => sections.value.beforeAfterGallery.pairs.length + ' pairs' },
  { id: 17, title: 'FAQs', icon: MessageSquare, count: () => sections.value.faqs.items.length + ' FAQs' },
  { id: 18, title: 'Share & Referral', icon: Share2, count: () => sections.value.shareService.enabled ? 'Active' : 'Off' },
  { id: 19, title: 'Reviews & Rating', icon: Star, count: () => sections.value.reviewsConfig.averageRating + '★' },
]

const enabledSectionsCount = computed(() => {
  let count = 0
  if (sections.value.selectionConfig.isConfigurable) count++
  if (sections.value.heroMedia.enabled) count++
  if (sections.value.titlePricing.enabled) count++
  if (sections.value.freeOffer.enabled) count++
  if (sections.value.seeTheDifference.enabled) count++
  if (sections.value.serviceProcess.enabled) count++
  if (sections.value.warranty.enabled) count++
  if (sections.value.surfacesCovered.enabled) count++
  if (sections.value.inclusions.enabled) count++
  if (sections.value.pleaseNotes.enabled) count++
  if (sections.value.exclusions.enabled) count++
  if (sections.value.customerPreparation.enabled) count++
  if (sections.value.supportedBrands.enabled) count++
  if (sections.value.unsupportedBrands.enabled) count++
  if (sections.value.professional.enabled) count++
  if (sections.value.partnerTools.enabled) count++
  if (sections.value.beforeAfterGallery.enabled) count++
  if (sections.value.faqs.enabled) count++
  if (sections.value.shareService.enabled) count++
  if (sections.value.reviewsConfig.enabled) count++
  return count
})

// ── Section 20 (Add-ons & Extras) Helpers ─────────────────────────
function addSelectionSection() {
  sections.value.selectionConfig.sections.push({
    id: 'sec-' + Date.now(),
    title: 'Additional Options & Extras',
    displayOrder: sections.value.selectionConfig.sections.length + 1,
    selectionType: 'optionalAddon',
    isRequired: false,
    isExpanded: true,
    helperText: 'Select any extra areas or additions you need',
    options: []
  })
}

function removeSelectionSection(sIdx: number) {
  sections.value.selectionConfig.sections.splice(sIdx, 1)
}

function addOptionToSection(sIdx: number) {
  const sec = sections.value.selectionConfig.sections[sIdx]
  if (sec) {
    sec.options.push({
      id: 'opt-' + Date.now(),
      title: '',
      description: '',
      imageUrl: '',
      price: 199,
      minQuantity: 0,
      maxQuantity: 5,
      isDefault: false,
      isPropertyDetail: false,
      isActive: true
    })
  }
}

function removeOptionFromSection(sIdx: number, oIdx: number) {
  const sec = sections.value.selectionConfig.sections[sIdx]
  if (sec) {
    sec.options.splice(oIdx, 1)
  }
}

// ── Section 1..19 Helpers ──────────────────────────────────────────
function addGalleryImage() {
  sections.value.heroMedia.galleryImages.push({ imageUrl: '', caption: '' })
}
function removeGalleryImage(idx: number) {
  sections.value.heroMedia.galleryImages.splice(idx, 1)
}

function addDifferenceItem() {
  sections.value.seeTheDifference.items.push({
    id: 'diff-' + Date.now(),
    title: '',
    description: '',
    imageUrl: ''
  })
}
function removeDifferenceItem(idx: number) {
  sections.value.seeTheDifference.items.splice(idx, 1)
}

function addProcessStep() {
  const nextNum = sections.value.serviceProcess.steps.length + 1
  sections.value.serviceProcess.steps.push({
    stepNumber: nextNum,
    title: 'Step ' + nextNum,
    description: '',
    imageUrl: '',
    caption: ''
  })
}
function removeProcessStep(idx: number) {
  sections.value.serviceProcess.steps.splice(idx, 1)
  sections.value.serviceProcess.steps.forEach((s, i) => { s.stepNumber = i + 1 })
}

function addSurface() {
  sections.value.surfacesCovered.surfaces.push({
    id: 'surf-' + Date.now(),
    title: '',
    imageUrl: '',
    description: ''
  })
}
function removeSurface(idx: number) {
  sections.value.surfacesCovered.surfaces.splice(idx, 1)
}

function addInclusion() {
  sections.value.inclusions.items.push({ title: '', description: '' })
}
function removeInclusion(idx: number) {
  sections.value.inclusions.items.splice(idx, 1)
}

function addPleaseNote() {
  sections.value.pleaseNotes.notes.push('')
}
function removePleaseNote(idx: number) {
  sections.value.pleaseNotes.notes.splice(idx, 1)
}

function addExclusion() {
  sections.value.exclusions.items.push('')
}
function removeExclusion(idx: number) {
  sections.value.exclusions.items.splice(idx, 1)
}

function addPrep() {
  sections.value.customerPreparation.preparations.push({ instruction: '', isMandatory: false, tip: '' })
}
function removePrep(idx: number) {
  sections.value.customerPreparation.preparations.splice(idx, 1)
}

function addSupportedBrand() {
  sections.value.supportedBrands.brands.push({ id: 'brand-' + Date.now(), name: '', logoUrl: '' })
}
function removeSupportedBrand(idx: number) {
  sections.value.supportedBrands.brands.splice(idx, 1)
}

function addUnsupportedBrand() {
  sections.value.unsupportedBrands.brands.push({ id: 'ubrand-' + Date.now(), name: '', logoUrl: '' })
}
function removeUnsupportedBrand(idx: number) {
  sections.value.unsupportedBrands.brands.splice(idx, 1)
}

function addProHighlight() {
  sections.value.professional.highlights.push('')
}
function removeProHighlight(idx: number) {
  sections.value.professional.highlights.splice(idx, 1)
}

function addPartnerTool() {
  sections.value.partnerTools.tools.push({ name: '', description: '', isCustomerProvided: false })
}
function removePartnerTool(idx: number) {
  sections.value.partnerTools.tools.splice(idx, 1)
}

function addBeforeAfterPair() {
  sections.value.beforeAfterGallery.pairs.push({
    id: 'ba-' + Date.now(),
    title: '',
    description: '',
    beforeImageUrl: '',
    afterImageUrl: ''
  })
}
function removeBeforeAfterPair(idx: number) {
  sections.value.beforeAfterGallery.pairs.splice(idx, 1)
}

function addFaq() {
  sections.value.faqs.items.push({ question: '', answer: '' })
}
function removeFaq(idx: number) {
  sections.value.faqs.items.splice(idx, 1)
}

function handleSave() {
  if (!name.value.trim()) {
    alert('Please enter a Sub-Problem name')
    return
  }
  if (!serviceCategoryId.value) {
    alert('Please select a Sub-Category')
    return
  }
  emit('save', {
    name: name.value.trim(),
    serviceTypeId: serviceTypeId.value,
    serviceCategoryId: serviceCategoryId.value,
    description: description.value.trim(),
    pricingType: pricingType.value,
    isActive: isActive.value,
    isConfigurable: sections.value.selectionConfig.isConfigurable,
    imageFile: imageFile.value,
    sections: sections.value,
    uniqueId: props.initialData?.uniqueId
  })
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-2 sm:p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      @click="emit('close')"
    ></div>

    <div class="relative z-10 h-[calc(100vh-1rem)] w-full max-w-[1440px] sm:h-[calc(100vh-2rem)]">
      <div class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-2xl">
        
        <!-- Modal Header -->
        <div class="px-3 py-3 sm:px-6 sm:py-4 bg-white border-b border-[#E5E7EB] flex flex-col gap-3 md:flex-row md:items-center md:justify-between z-20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#FAF0F2] flex items-center justify-center text-[#800020] border border-[#F5D8DE]">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold text-[#202124]">
                  {{ isEdit ? 'Edit Sub-Problem' : 'Add New Sub-Problem' }}
                </h2>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#FAF0F2] text-[#800020] border border-[#F5D8DE]">
                  19 Sections + Add-ons
                </span>
              </div>
              <p class="text-xs text-[#6B7280] mt-0.5">
                Configure sub-problem, dynamic sections, and extra add-ons popup (balcony, extra kitchen, etc.)
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="handleSave"
              :disabled="isSaving"
              class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check v-if="!isSaving" class="w-4 h-4" />
              <span>{{ isSaving ? 'Saving...' : 'Save Sub-Problem' }}</span>
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="p-2 text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Sub-Problem Core Details Card (Sticky bar below header) -->
        <div class="px-6 py-3 bg-[#FAF0F2]/40 border-b border-[#E5E7EB] grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Category *</label>
            <select
              v-model="serviceTypeId"
              class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
            >
              <option value="" disabled>Select Category</option>
              <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Sub-Category *</label>
            <select
              v-model="serviceCategoryId"
              class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
              :disabled="categoryOptions.length === 0"
            >
              <option value="" disabled>{{ categoryOptions.length ? 'Select Sub-Category' : 'No Sub-Categories' }}</option>
              <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Sub-Problem Name *</label>
            <input
              v-model="name"
              type="text"
              placeholder="e.g. 1 BHK Deep Cleaning"
              class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-[#6B7280] mb-1">Pricing Type</label>
            <select
              v-model="pricingType"
              class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
            >
              <option value="QUANTITY_BASED">Quantity Based</option>
              <option value="TIME_BASED">Time Based</option>
            </select>
          </div>

          <!-- Add-ons Popup Toggle in Header Bar -->
          <div class="flex items-center justify-between md:justify-center gap-2 pt-2 md:pt-0 border-l border-[#E5E7EB] pl-2">
            <div>
              <span class="text-xs font-semibold text-[#800020] block">Add-ons Popup</span>
              <span class="text-[10px] text-[#6B7280]">{{ sections.selectionConfig.isConfigurable ? 'Opens Extras' : 'No Popup' }}</span>
            </div>
            <Toggle v-model="sections.selectionConfig.isConfigurable" />
          </div>

          <div class="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0">
            <div class="text-right">
              <span class="text-xs font-medium text-[#202124] block">Active</span>
              <span class="text-[10px] text-[#6B7280]">Live</span>
            </div>
            <Toggle v-model="isActive" />
          </div>
        </div>

        <!-- Main Body: Navigation Sidebar + Section Editor -->
        <div class="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
          
          <!-- Left Index / Navigation Column (20 Items) -->
          <div class="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#E5E7EB] bg-[#FAF0F2]/20 flex flex-col overflow-y-auto">
            <div class="p-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
              <span class="text-xs font-semibold text-[#202124] uppercase tracking-wider">
                Configuration
              </span>
              <span class="text-[11px] font-bold text-[#800020] bg-[#FAF0F2] px-2 py-0.5 rounded-full border border-[#F5D8DE]">
                {{ enabledSectionsCount }} Active
              </span>
            </div>

            <div class="p-2 space-y-1">
              <button
                v-for="sec in sectionMeta"
                :key="sec.id"
                type="button"
                @click="activeSection = sec.id"
                class="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs font-medium transition-colors cursor-pointer"
                :class="activeSection === sec.id
                  ? 'bg-[#800020] text-white shadow-xs'
                  : sec.id === 20 && sections.selectionConfig.isConfigurable
                    ? 'bg-[#FAF0F2] text-[#800020] font-semibold border border-[#F5D8DE]'
                    : 'text-[#202124] hover:bg-[#FAF0F2]'"
              >
                <div class="flex items-center gap-2.5 truncate">
                  <span
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    :class="activeSection === sec.id ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#202124]'"
                  >
                    {{ sec.id === 20 ? '★' : sec.id }}
                  </span>
                  <component :is="sec.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ sec.title }}</span>
                </div>
                <span
                  class="text-[10px] font-normal px-1.5 py-0.5 rounded shrink-0 ml-1"
                  :class="activeSection === sec.id ? 'bg-white/20 text-white' : 'text-[#6B7280] bg-[#E5E7EB]/50'"
                >
                  {{ sec.count() }}
                </span>
              </button>
            </div>
          </div>

          <!-- Right Content: Active Section Editor -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">

            <!-- 20. Add-ons & Extra Things Configuration Popup -->
            <div v-show="activeSection === 20" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">★</span>
                    Add-ons & Extra Options Popup
                  </h3>
                  <p class="text-xs text-[#6B7280]">
                    Configure whether this sub-problem triggers the extra options popup (e.g. Balcony, Extra Kitchen, Chimney) in the customer app
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-[#800020]">Show Add-ons Popup</span>
                  <Toggle v-model="sections.selectionConfig.isConfigurable" />
                </div>
              </div>

              <!-- Information Banner -->
              <div class="p-3 bg-[#FAF0F2] rounded-xl border border-[#F5D8DE] flex items-start gap-2.5">
                <Sparkles class="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                <div class="text-xs text-[#6B7280]">
                  <strong class="text-[#202124] block">How it works on Customer App:</strong>
                  When a customer taps this sub-problem (e.g. <span class="font-medium text-[#800020]">1 BHK Deep Cleaning</span>), if this toggle is <strong class="text-emerald-700">ON</strong>, the customer app opens a bottom sheet asking them to select optional or required extras (such as <span class="font-medium">Balcony Cleaning</span>, <span class="font-medium">Extra Kitchen</span>, <span class="font-medium">Fridge / Oven Deep Clean</span>) before adding to cart. If <strong class="text-gray-600">OFF</strong>, it adds directly.
                </div>
              </div>

              <div v-if="sections.selectionConfig.isConfigurable" class="space-y-5">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider">
                    Add-on Selection Sections
                  </h4>
                  <button
                    type="button"
                    @click="addSelectionSection"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Section (e.g. Balconies, Rooms)
                  </button>
                </div>

                <!-- Sections list -->
                <div
                  v-for="(sec, sIdx) in sections.selectionConfig.sections"
                  :key="sec.id"
                  class="p-4 bg-white rounded-xl border-2 border-[#FAF0F2] shadow-xs space-y-3"
                >
                  <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-full bg-[#800020] text-white text-[10px] flex items-center justify-center font-bold">
                        {{ sIdx + 1 }}
                      </span>
                      <input
                        v-model="sec.title"
                        type="text"
                        placeholder="Section Title (e.g. Add Extra Areas & Add-ons)"
                        class="text-xs font-bold px-2 py-1 border border-[#E5E7EB] rounded bg-white text-[#202124] w-64"
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        @click="removeSelectionSection(sIdx)"
                        class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer text-xs flex items-center gap-1"
                        title="Delete Section"
                      >
                        <Trash2 class="w-3.5 h-3.5" /> Remove Section
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Selection Type</label>
                      <select
                        v-model="sec.selectionType"
                        class="w-full text-xs px-2 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                      >
                        <option value="optionalAddon">Optional Add-ons (Multiple Checkboxes)</option>
                        <option value="quantityBased">Quantity Based (with +/- Stepper)</option>
                        <option value="single">Single Select (Radio Option)</option>
                        <option value="multiple">Multiple Select</option>
                      </select>
                    </div>

                    <div class="sm:col-span-2">
                      <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Customer Helper Text</label>
                      <input
                        v-model="sec.helperText"
                        type="text"
                        placeholder="e.g. Select any additional areas or appliances you would like cleaned"
                        class="w-full text-xs px-2 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                      />
                    </div>
                  </div>

                  <!-- Options list inside section -->
                  <div class="space-y-2 pt-2 border-t border-[#E5E7EB]">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-[#202124]">
                        Extra Items / Add-ons ({{ sec.options.length }})
                      </span>
                      <button
                        type="button"
                        @click="addOptionToSection(sIdx)"
                        class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus class="w-3.5 h-3.5" /> Add Extra Item (e.g. Balcony)
                      </button>
                    </div>

                    <div v-if="!sec.options.length" class="text-xs text-[#6B7280] italic py-2">
                      No extra items configured in this section yet. Click "+ Add Extra Item" above.
                    </div>

                    <!-- Individual Option Card -->
                    <div
                      v-for="(opt, oIdx) in sec.options"
                      :key="opt.id"
                      class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 flex-1">
                          <PackagePlus class="w-4 h-4 text-[#800020] shrink-0" />
                          <input
                            v-model="opt.title"
                            type="text"
                            placeholder="Option Name (e.g. Balcony Cleaning)"
                            class="text-xs font-semibold px-2 py-1 border border-[#E5E7EB] rounded bg-white text-[#202124] flex-1 max-w-sm"
                          />
                        </div>
                        <div class="flex items-center gap-3">
                          <div class="flex items-center gap-1 text-[11px] text-[#202124]">
                            <span>Active:</span>
                            <input type="checkbox" v-model="opt.isActive" class="rounded text-[#800020]" />
                          </div>
                          <button
                            type="button"
                            @click="removeOptionFromSection(sIdx, oIdx)"
                            class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Delete Option"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label class="block text-[10px] font-medium text-[#6B7280]">Extra Price (₹)</label>
                          <input
                            v-model.number="opt.price"
                            type="number"
                            placeholder="199"
                            class="w-full text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                          />
                        </div>

                        <div>
                          <label class="block text-[10px] font-medium text-[#6B7280]">Max Quantity</label>
                          <input
                            v-model.number="opt.maxQuantity"
                            type="number"
                            placeholder="5"
                            class="w-full text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                          />
                        </div>

                        <div class="sm:col-span-2">
                          <label class="block text-[10px] font-medium text-[#6B7280]">Description / Scope</label>
                          <input
                            v-model="opt.description"
                            type="text"
                            placeholder="e.g. Railing wash, floor scrub & drain flush"
                            class="w-full text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 1. Hero Media -->
            <div v-show="activeSection === 1" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">1</span>
                    Hero Media & Carousel Banner
                  </h3>
                  <p class="text-xs text-[#6B7280]">Displayed at the top of the customer sub-service popup</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.heroMedia.enabled" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Hero Image URL</label>
                  <input
                    v-model="sections.heroMedia.heroImageUrl"
                    type="text"
                    placeholder="https://example.com/hero.jpg"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                  />
                  <span class="text-[11px] text-[#6B7280] mt-1 block">Main hero banner image displayed at top</span>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Hero Video URL (Optional)</label>
                  <input
                    v-model="sections.heroMedia.videoUrl"
                    type="text"
                    placeholder="https://example.com/preview.mp4"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                  />
                  <span class="text-[11px] text-[#6B7280] mt-1 block">Video player item in the media carousel</span>
                </div>
              </div>

              <!-- Gallery Images -->
              <div class="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-semibold text-[#202124]">Additional Carousel Gallery Images</label>
                  <button
                    type="button"
                    @click="addGalleryImage"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Image
                  </button>
                </div>
                <div v-if="!sections.heroMedia.galleryImages.length" class="text-xs text-[#6B7280] italic py-2">
                  No additional carousel images added.
                </div>
                <div v-for="(img, idx) in sections.heroMedia.galleryImages" :key="idx" class="flex items-center gap-2 bg-[#FAF0F2]/30 p-2 rounded-lg border border-[#E5E7EB]">
                  <input
                    v-model="img.imageUrl"
                    type="text"
                    placeholder="Image URL"
                    class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white rounded"
                  />
                  <input
                    v-model="img.caption"
                    type="text"
                    placeholder="Caption (optional)"
                    class="w-40 text-xs px-2.5 py-1.5 border border-[#E5E7EB] bg-white rounded"
                  />
                  <button
                    type="button"
                    @click="removeGalleryImage(idx)"
                    class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. Title, Duration & Pricing -->
            <div v-show="activeSection === 2" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">2</span>
                    Title, Duration & Pricing Details
                  </h3>
                  <p class="text-xs text-[#6B7280]">Service title, summary description, duration, and price breakdown</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.titlePricing.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Service Display Title</label>
                  <input
                    v-model="sections.titlePricing.title"
                    type="text"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Comprehensive Description</label>
                  <textarea
                    v-model="sections.titlePricing.description"
                    rows="3"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Duration (Minutes)</label>
                    <input
                      v-model.number="sections.titlePricing.estimatedDurationMinutes"
                      type="number"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Complexity Level</label>
                    <select
                      v-model="sections.titlePricing.complexityLevel"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Standard">Standard</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Heavy Duty">Heavy Duty</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Base Price (₹) *</label>
                    <input
                      v-model.number="sections.titlePricing.basePrice"
                      type="number"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Original MRP Price (₹)</label>
                    <input
                      v-model.number="sections.titlePricing.originalPrice"
                      type="number"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Discount %</label>
                    <input
                      v-model.number="sections.titlePricing.discountPercentage"
                      type="number"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Price Drop Badge</label>
                    <input
                      v-model="sections.titlePricing.priceDropBadgeText"
                      type="text"
                      placeholder="e.g. Special Offer"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-1 focus:ring-[#800020] bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. Free Offer / Complimentary Service -->
            <div v-show="activeSection === 3" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">3</span>
                    Free Offer / Complimentary Service
                  </h3>
                  <p class="text-xs text-[#6B7280]">Highlight a free add-on or gift included with the service</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.freeOffer.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Offer Title</label>
                    <input
                      v-model="sections.freeOffer.title"
                      type="text"
                      placeholder="e.g. Free Sanitization & 10-Point Check"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Badge Tag</label>
                    <input
                      v-model="sections.freeOffer.badgeText"
                      type="text"
                      placeholder="e.g. FREE BONUS"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Offer Description</label>
                  <textarea
                    v-model="sections.freeOffer.description"
                    rows="2"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Worth / Original Price</label>
                    <input
                      v-model="sections.freeOffer.originalPrice"
                      type="text"
                      placeholder="₹199"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Icon URL</label>
                    <input
                      v-model="sections.freeOffer.iconUrl"
                      type="text"
                      placeholder="https://..."
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Validity Note</label>
                    <input
                      v-model="sections.freeOffer.validityNote"
                      type="text"
                      placeholder="Valid today"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. See the Difference -->
            <div v-show="activeSection === 4" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">4</span>
                    See the Difference (OmiBay vs Local)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Visual comparison cards highlighting OmiBay quality advantages</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.seeTheDifference.enabled" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Section Heading</label>
                <input
                  v-model="sections.seeTheDifference.heading"
                  type="text"
                  class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Comparison Items</span>
                  <button
                    type="button"
                    @click="addDifferenceItem"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Difference Item
                  </button>
                </div>

                <div v-for="(item, idx) in sections.seeTheDifference.items" :key="item.id" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#800020]">Item #{{ idx + 1 }}</span>
                    <button
                      type="button"
                      @click="removeDifferenceItem(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="item.title"
                      type="text"
                      placeholder="Title (e.g. Certified Professionals)"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="item.imageUrl"
                      type="text"
                      placeholder="Illustrative Image URL"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                  </div>
                  <textarea
                    v-model="item.description"
                    rows="2"
                    placeholder="Description comparison"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 5. Our Process -->
            <div v-show="activeSection === 5" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">5</span>
                    Our Process (Step-by-Step Workflow)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Ordered service execution stages shown to the customer</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.serviceProcess.enabled" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#202124] mb-1">Section Heading</label>
                <input
                  v-model="sections.serviceProcess.heading"
                  type="text"
                  class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Steps List</span>
                  <button
                    type="button"
                    @click="addProcessStep"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Process Step
                  </button>
                </div>

                <div v-for="(step, idx) in sections.serviceProcess.steps" :key="idx" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#800020]">Step {{ step.stepNumber }}</span>
                    <button
                      type="button"
                      @click="removeProcessStep(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="step.title"
                      type="text"
                      placeholder="Step Title"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="step.imageUrl"
                      type="text"
                      placeholder="Step Image URL (optional)"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                  </div>
                  <textarea
                    v-model="step.description"
                    rows="2"
                    placeholder="Step Description"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 6. OmiBay Cover (Warranty & Protection) -->
            <div v-show="activeSection === 6" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">6</span>
                    OmiBay Cover (Warranty & Protection)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Service warranty period and rework guarantee protection terms</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.warranty.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Warranty Days</label>
                    <input
                      v-model.number="sections.warranty.warrantyDays"
                      type="number"
                      placeholder="30"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Policy Headline</label>
                    <input
                      v-model="sections.warranty.warrantyPolicyTitle"
                      type="text"
                      placeholder="30-Day Free Rework Guarantee & Damage Cover"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Detailed Terms & Protection Rules</label>
                  <textarea
                    v-model="sections.warranty.warrantyTerms"
                    rows="3"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 7. Surfaces We Cover -->
            <div v-show="activeSection === 7" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">7</span>
                    Surfaces & Areas We Cover
                  </h3>
                  <p class="text-xs text-[#6B7280]">Applicable surfaces, appliance units, or architectural areas</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.surfacesCovered.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Covered Surfaces</span>
                  <button
                    type="button"
                    @click="addSurface"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Surface
                  </button>
                </div>

                <div v-for="(surf, idx) in sections.surfacesCovered.surfaces" :key="surf.id" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#800020]">Surface #{{ idx + 1 }}</span>
                    <button
                      type="button"
                      @click="removeSurface(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="surf.title"
                      type="text"
                      placeholder="Title (e.g. Split AC Indoor Unit)"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="surf.imageUrl"
                      type="text"
                      placeholder="Surface Image URL"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                  </div>
                  <input
                    v-model="surf.description"
                    type="text"
                    placeholder="Brief description (optional)"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- 8. What is Covered (Inclusions) -->
            <div v-show="activeSection === 8" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">8</span>
                    What is Covered (Inclusions)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Checklist of service deliverables included in the booking</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.inclusions.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Inclusions List</span>
                  <button
                    type="button"
                    @click="addInclusion"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Inclusion
                  </button>
                </div>

                <div v-for="(item, idx) in sections.inclusions.items" :key="idx" class="p-2.5 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center gap-2">
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      v-model="item.title"
                      type="text"
                      placeholder="Inclusion title"
                      class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <button
                      type="button"
                      @click="removeInclusion(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    v-model="item.description"
                    type="text"
                    placeholder="Additional detail (optional)"
                    class="w-full text-xs px-2.5 py-1 border border-[#E5E7EB] rounded bg-white ml-6 max-w-[calc(100%-24px)]"
                  />
                </div>
              </div>
            </div>

            <!-- 9. Please Note (Important Disclaimers) -->
            <div v-show="activeSection === 9" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">9</span>
                    Please Note (Important Disclaimers)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Customer precautions, safety guidance, and critical notes</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.pleaseNotes.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Notes List</span>
                  <button
                    type="button"
                    @click="addPleaseNote"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Note
                  </button>
                </div>

                <div v-for="(note, idx) in sections.pleaseNotes.notes" :key="idx" class="flex items-center gap-2">
                  <AlertCircle class="w-4 h-4 text-amber-600 shrink-0" />
                  <input
                    v-model="sections.pleaseNotes.notes[idx]"
                    type="text"
                    placeholder="Disclaimer note"
                    class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  />
                  <button
                    type="button"
                    @click="removePleaseNote(idx)"
                    class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 10. What Isn't Covered (Exclusions) -->
            <div v-show="activeSection === 10" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">10</span>
                    What Isn't Covered (Exclusions)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Explicit list of tasks not included in the standard price</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.exclusions.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Exclusions List</span>
                  <button
                    type="button"
                    @click="addExclusion"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Exclusion
                  </button>
                </div>

                <div v-for="(excl, idx) in sections.exclusions.items" :key="idx" class="flex items-center gap-2">
                  <XCircle class="w-4 h-4 text-rose-500 shrink-0" />
                  <input
                    v-model="sections.exclusions.items[idx]"
                    type="text"
                    placeholder="Excluded task (e.g. Spare parts cost)"
                    class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  />
                  <button
                    type="button"
                    @click="removeExclusion(idx)"
                    class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 11. Customer Preparation -->
            <div v-show="activeSection === 11" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">11</span>
                    What We Will Need From You (Customer Preparation)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Arrangements required by the technician before arrival</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.customerPreparation.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Preparation Items</span>
                  <button
                    type="button"
                    @click="addPrep"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Preparation
                  </button>
                </div>

                <div v-for="(prep, idx) in sections.customerPreparation.preparations" :key="idx" class="p-2.5 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="prep.instruction"
                      type="text"
                      placeholder="Instruction (e.g. Keep water supply on)"
                      class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <label class="flex items-center gap-1 text-[11px] text-[#202124] shrink-0 cursor-pointer">
                      <input type="checkbox" v-model="prep.isMandatory" class="rounded text-[#800020]" />
                      Mandatory
                    </label>
                    <button
                      type="button"
                      @click="removePrep(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    v-model="prep.tip"
                    type="text"
                    placeholder="Helpful tip (optional)"
                    class="w-full text-xs px-2.5 py-1 border border-[#E5E7EB] rounded bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- 12. Supported Brands -->
            <div v-show="activeSection === 12" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">12</span>
                    We Service All Brands (Supported Brands)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Appliance or device manufacturer brands covered under this service</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.supportedBrands.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Brands Grid</span>
                  <button
                    type="button"
                    @click="addSupportedBrand"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Brand
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div v-for="(b, idx) in sections.supportedBrands.brands" :key="b.id" class="flex items-center gap-2 p-2 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB]">
                    <input
                      v-model="b.name"
                      type="text"
                      placeholder="Brand Name"
                      class="flex-1 text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="b.logoUrl"
                      type="text"
                      placeholder="Logo URL"
                      class="w-32 text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white"
                    />
                    <button
                      type="button"
                      @click="removeSupportedBrand(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 13. Unsupported Brands -->
            <div v-show="activeSection === 13" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">13</span>
                    Brands We Do Not Cover (Unsupported Brands)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Specific brands not serviced (prevents customer dispute)</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.unsupportedBrands.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Unsupported Brands Grid</span>
                  <button
                    type="button"
                    @click="addUnsupportedBrand"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Brand
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div v-for="(b, idx) in sections.unsupportedBrands.brands" :key="b.id" class="flex items-center gap-2 p-2 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB]">
                    <input
                      v-model="b.name"
                      type="text"
                      placeholder="Brand Name"
                      class="flex-1 text-xs px-2 py-1 border border-[#E5E7EB] rounded bg-white"
                    />
                    <button
                      type="button"
                      @click="removeUnsupportedBrand(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 14. Verified Professional Banner -->
            <div v-show="activeSection === 14" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">14</span>
                    Verified Professionals Banner
                  </h3>
                  <p class="text-xs text-[#6B7280]">Technician background check and expertise verification credentials</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.professional.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Headline</label>
                    <input
                      v-model="sections.professional.title"
                      type="text"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Badge Tag</label>
                    <input
                      v-model="sections.professional.badgeText"
                      type="text"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Subtitle / Training Credential</label>
                    <input
                      v-model="sections.professional.subtitle"
                      type="text"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Experience Text</label>
                    <input
                      v-model="sections.professional.experienceText"
                      type="text"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Professional Photo / Avatar URL</label>
                  <input
                    v-model="sections.professional.photoUrl"
                    type="text"
                    placeholder="https://..."
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  />
                </div>

                <div class="space-y-2 pt-2 border-t border-[#E5E7EB]">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-[#202124]">Trust Highlights</span>
                    <button
                      type="button"
                      @click="addProHighlight"
                      class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus class="w-3.5 h-3.5" /> Add Highlight
                    </button>
                  </div>
                  <div v-for="(h, idx) in sections.professional.highlights" :key="idx" class="flex items-center gap-2">
                    <Check class="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      v-model="sections.professional.highlights[idx]"
                      type="text"
                      placeholder="Trust point (e.g. Police background verified)"
                      class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <button
                      type="button"
                      @click="removeProHighlight(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 15. Partner Tools & Equipment -->
            <div v-show="activeSection === 15" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">15</span>
                    Our Service Equipment & Tools
                  </h3>
                  <p class="text-xs text-[#6B7280]">Advanced equipment and eco-friendly supplies carried by partner</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.partnerTools.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Tools List</span>
                  <button
                    type="button"
                    @click="addPartnerTool"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Tool
                  </button>
                </div>

                <div v-for="(tool, idx) in sections.partnerTools.tools" :key="idx" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <input
                      v-model="tool.name"
                      type="text"
                      placeholder="Tool Name (e.g. High Pressure Suction Pump)"
                      class="flex-1 text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white mr-2"
                    />
                    <button
                      type="button"
                      @click="removePartnerTool(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    v-model="tool.description"
                    type="text"
                    placeholder="Tool description or function"
                    class="w-full text-xs px-2.5 py-1 border border-[#E5E7EB] rounded bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- 16. See the Before & After -->
            <div v-show="activeSection === 16" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">16</span>
                    See the Before & After Gallery
                  </h3>
                  <p class="text-xs text-[#6B7280]">Interactive comparison pairs showing actual service outcome</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.beforeAfterGallery.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">Before & After Pairs</span>
                  <button
                    type="button"
                    @click="addBeforeAfterPair"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add Image Pair
                  </button>
                </div>

                <div v-for="(pair, idx) in sections.beforeAfterGallery.pairs" :key="pair.id" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#800020]">Pair #{{ idx + 1 }}</span>
                    <button
                      type="button"
                      @click="removeBeforeAfterPair(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="pair.title"
                      type="text"
                      placeholder="Title (e.g. Deep Filter Restoration)"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="pair.description"
                      type="text"
                      placeholder="Description"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Before Image URL</label>
                      <input
                        v-model="pair.beforeImageUrl"
                        type="text"
                        placeholder="https://...before.jpg"
                        class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                      />
                    </div>
                    <div>
                      <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">After Image URL</label>
                      <input
                        v-model="pair.afterImageUrl"
                        type="text"
                        placeholder="https://...after.jpg"
                        class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 17. Frequently Asked Questions (FAQ) -->
            <div v-show="activeSection === 17" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">17</span>
                    Frequently Asked Questions (FAQ)
                  </h3>
                  <p class="text-xs text-[#6B7280]">Expandable question and answer accordion items</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.faqs.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-[#202124]">FAQ Items</span>
                  <button
                    type="button"
                    @click="addFaq"
                    class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" /> Add FAQ
                  </button>
                </div>

                <div v-for="(faq, idx) in sections.faqs.items" :key="idx" class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#800020]">Q{{ idx + 1 }}</span>
                    <button
                      type="button"
                      @click="removeFaq(idx)"
                      class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    v-model="faq.question"
                    type="text"
                    placeholder="Question"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white font-medium"
                  />
                  <textarea
                    v-model="faq.answer"
                    rows="2"
                    placeholder="Detailed Answer"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 18. Share Service With Friends -->
            <div v-show="activeSection === 18" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">18</span>
                    Share Service / Referral Banner
                  </h3>
                  <p class="text-xs text-[#6B7280]">Card encouraging customer to share the service link with peers</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.shareService.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Share Card Title</label>
                  <input
                    v-model="sections.shareService.shareTitle"
                    type="text"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Default Pre-filled Share Message</label>
                  <textarea
                    v-model="sections.shareService.shareMessage"
                    rows="2"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-[#202124] mb-1">Referral Reward Notice</label>
                  <input
                    v-model="sections.shareService.referralBonusText"
                    type="text"
                    class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- 19. Ratings & Customer Reviews -->
            <div v-show="activeSection === 19" class="space-y-4">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div>
                  <h3 class="text-base font-bold text-[#202124] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center">19</span>
                    Ratings & Customer Reviews
                  </h3>
                  <p class="text-xs text-[#6B7280]">Verified customer rating statistics and sample highlight testimonial</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[#6B7280]">Enable Section</span>
                  <Toggle v-model="sections.reviewsConfig.enabled" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Average Star Rating (e.g. 4.8)</label>
                    <input
                      v-model.number="sections.reviewsConfig.averageRating"
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#202124] mb-1">Total Reviews Count</label>
                    <input
                      v-model.number="sections.reviewsConfig.totalReviews"
                      type="number"
                      class="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    />
                  </div>
                  <div class="flex items-center justify-between pt-5">
                    <span class="text-xs font-medium text-[#202124]">Show Verified Badge</span>
                    <Toggle v-model="sections.reviewsConfig.showVerifiedBadge" />
                  </div>
                </div>

                <div class="p-3 bg-[#FAF0F2]/30 rounded-lg border border-[#E5E7EB] space-y-2">
                  <span class="text-xs font-bold text-[#800020]">Featured Review Testimonial</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="sections.reviewsConfig.featuredReview.userName"
                      type="text"
                      placeholder="Customer Name"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                    <input
                      v-model="sections.reviewsConfig.featuredReview.dateText"
                      type="text"
                      placeholder="Time (e.g. 2 days ago)"
                      class="text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                    />
                  </div>
                  <textarea
                    v-model="sections.reviewsConfig.featuredReview.comment"
                    rows="2"
                    placeholder="Customer testimonial comment"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex items-center justify-between z-20">
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="activeSection <= 1 && activeSection !== 20"
              @click="activeSection = activeSection === 20 ? 1 : Math.max(1, activeSection - 1)"
              class="px-3 py-1.5 text-xs font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft class="w-3.5 h-3.5" /> Previous Section
            </button>
            <button
              type="button"
              :disabled="activeSection >= 20"
              @click="activeSection = Math.min(20, activeSection + 1)"
              class="px-3 py-1.5 text-xs font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              Next Section <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 text-xs font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSave"
              :disabled="isSaving"
              class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check v-if="!isSaving" class="w-4 h-4" />
              <span>{{ isSaving ? 'Saving...' : 'Save Sub-Problem & Sections' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
