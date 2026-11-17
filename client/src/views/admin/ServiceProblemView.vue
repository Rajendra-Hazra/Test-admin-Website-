<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '@/api'
import type { ServiceType, ServiceCategory, ServiceProblem, PricingType } from '@/types/api'
import type { SubProblemSectionsData } from '@/types/subCategorySections'
import Table, { type Header } from '@/components/common/Table.vue'
import Toggle from '@/components/common/Toggle.vue'
import SubProblemDrawer from '@/components/admin/SubProblemDrawer.vue'
import {
  getStoredSubProblemSections,
  saveStoredSubProblemSections,
  formatCustomerAppSubProblemPayload
} from '@/utils/subCategorySectionsStorage'
import { showToast } from '@/utils/toast'
import { Pen, Plus, Layers, Sparkles } from 'lucide-vue-next'

const types = ref<ServiceType[]>([])
const categories = ref<ServiceCategory[]>([])
const modalCategories = ref<ServiceCategory[]>([])
const items = ref<ServiceProblem[]>([])
const selectedTypeId = ref('')
const selectedCategoryId = ref('')
const isLoadingTypes = ref(false)
const isLoadingCats = ref(false)
const isLoading = ref(false)
const error = ref('')
const search = ref('')

const typeOptions = computed(() => types.value.map(t => ({ label: t.name, value: t.uniqueId })))
const categoryOptions = computed(() => categories.value.map(c => ({ label: c.name, value: c.uniqueId })))
const drawerCategoryOptions = computed(() => modalCategories.value.map(c => ({ label: c.name, value: c.uniqueId })))

// Right-Side Drawer State
const isDrawerOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const selectedProblemData = ref<{
  uniqueId: string
  name: string
  serviceTypeId: string
  serviceCategoryId: string
  description?: string
  pricingType: PricingType
  isActive: boolean
  isConfigurable?: boolean
  image?: string
} | null>(null)

const baseHeaders: Header[] = [
  { key: 'image', title: 'Icon', align: 'center', sortable: false, width: '70px' },
  { key: 'name', title: 'Sub-Problem Name', align: 'left', sortable: true },
  { key: 'isConfigurable', title: 'Add-ons Popup (Extras)', align: 'center', sortable: false },
  { key: 'sections', title: 'App Sections', align: 'center', sortable: false },
  { key: 'pricingType', title: 'Pricing Type', align: 'center', sortable: true },
  { key: 'isActive', title: 'Is Active', align: 'center', sortable: true }, 
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

async function fetchTypes() {
  isLoadingTypes.value = true
  try {
    const resp = await api.services.getAllTypes()
    const raw = (resp as any)?.data ?? resp
    types.value = Array.isArray(raw) ? raw : []
    if (types.value.length > 0 && !selectedTypeId.value) {
      selectedTypeId.value = types.value[0]!.uniqueId
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load categories'
  } finally {
    isLoadingTypes.value = false
  }
}

async function fetchCategories(typeId: string, context: 'main' | 'drawer' = 'main') {
  if (!typeId) return
  if (context === 'main') {
    isLoadingCats.value = true
    categories.value = []
    items.value = []
    selectedCategoryId.value = ''
  }
  try {
    const resp = await api.services.getCategoriesByType(typeId)
    const raw = (resp as any)?.data ?? resp
    const catList = Array.isArray(raw) ? raw : []
    if (context === 'drawer') {
      modalCategories.value = catList
    } else {
      categories.value = catList
      modalCategories.value = catList
      if (categories.value.length > 0) {
        selectedCategoryId.value = categories.value[0]!.uniqueId
      }
    }
  } catch (e: any) {
    if (context === 'main') error.value = e?.message || 'Failed to load subcategories'
  } finally {
    if (context === 'main') isLoadingCats.value = false
  }
}

async function fetchProblems(categoryId: string) {
  if (!categoryId) return
  isLoading.value = true
  error.value = ''
  try {
    const resp = await api.services.getProblemsByCategory(categoryId)
    const raw = (resp as any)?.data ?? resp
    const probList: ServiceProblem[] = Array.isArray(raw) ? raw : []
    
    // Enrich each problem with its stored add-on configuration toggle
    items.value = probList.map(prob => {
      const stored = getStoredSubProblemSections(prob.uniqueId, prob.name)
      return {
        ...prob,
        isConfigurable: stored.selectionConfig?.isConfigurable ?? (prob.isConfigurable ?? false)
      }
    })
  } catch (e: any) {
    error.value = e?.message || 'Failed to load sub-problems'
    items.value = []
  } finally {
    isLoading.value = false
  }
}

watch(selectedTypeId, (id) => { if (id) fetchCategories(id, 'main') })
watch(selectedCategoryId, (id) => { if (id) fetchProblems(id) })

onMounted(async () => {
  await fetchTypes()
  if (selectedTypeId.value) {
    await fetchCategories(selectedTypeId.value, 'main')
    if (selectedCategoryId.value) fetchProblems(selectedCategoryId.value)
  }
})

function openAddDrawer() {
  modalCategories.value = [...categories.value]
  selectedProblemData.value = null
  isEditing.value = false
  isDrawerOpen.value = true
}

async function openEditDrawer(item: any) {
  modalCategories.value = [...categories.value]
  selectedProblemData.value = {
    uniqueId: item.uniqueId,
    name: item.name,
    serviceTypeId: selectedTypeId.value,
    serviceCategoryId: item.serviceCategoryId || selectedCategoryId.value,
    description: item.description || '',
    pricingType: item.pricingType || 'QUANTITY_BASED',
    isActive: Boolean(item.isActive),
    isConfigurable: Boolean(item.isConfigurable),
    image: item.image || ''
  }
  isEditing.value = true
  isDrawerOpen.value = true
}

async function handleDrawerTypeChange(typeId: string) {
  await fetchCategories(typeId, 'drawer')
}

// Inline toggle for whether a sub-problem opens the add-ons/extras popup
async function handleToggleConfigurable(item: any) {
  const currentSections = getStoredSubProblemSections(item.uniqueId, item.name)
  currentSections.selectionConfig.isConfigurable = Boolean(item.isConfigurable)
  saveStoredSubProblemSections(item.uniqueId, currentSections)

  try {
    const data = new FormData()
    data.append('uniqueId', item.uniqueId)
    data.append('name', item.name)
    data.append('serviceCategoryId', item.serviceCategoryId || selectedCategoryId.value)
    data.append('pricingType', item.pricingType)
    data.append('isActive', String(item.isActive))
    data.append('isConfigurable', String(item.isConfigurable))
    data.append('sections', JSON.stringify(currentSections))
    await api.services.updateProblem(data)
  } catch (e) {
    console.warn('Backend update problem note:', e)
  }

  showToast(
    `Add-ons popup ${item.isConfigurable ? 'enabled' : 'disabled'} for "${item.name}"`,
    item.isConfigurable ? 'success' : 'info'
  )
}

async function handleDrawerSave(payload: {
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
}) {
  isSaving.value = true
  try {
    const data = new FormData()
    if (payload.uniqueId) {
      data.append('uniqueId', payload.uniqueId)
    }
    data.append('name', payload.name)
    data.append('serviceCategoryId', payload.serviceCategoryId)
    if (payload.description) data.append('description', payload.description)
    data.append('pricingType', payload.pricingType)
    data.append('isActive', String(payload.isActive))
    data.append('isConfigurable', String(payload.isConfigurable))
    if (payload.imageFile) {
      data.append('imageFile', payload.imageFile)
    }

    // Attach structured customer app payload with selectionSections and 19 sections
    const customerAppPayload = formatCustomerAppSubProblemPayload(payload.sections, payload.name)
    data.append('sections', JSON.stringify(payload.sections))
    data.append('customerAppPayload', JSON.stringify(customerAppPayload))

    let savedId = payload.uniqueId || ''
    if (payload.uniqueId) {
      await api.services.updateProblem(data)
      showToast('Sub-problem & sections updated successfully', 'success')
    } else {
      const resp = await api.services.addProblem(data)
      const resData = (resp as any)?.data ?? resp
      savedId = resData?.uniqueId || resData?.id || 'prob_' + Date.now()
      showToast('New sub-problem & sections created successfully', 'success')
    }

    // Persist sections in localStorage
    if (savedId) {
      saveStoredSubProblemSections(savedId, payload.sections)
    }

    isDrawerOpen.value = false

    // Refresh problem list
    if (selectedCategoryId.value === payload.serviceCategoryId) {
      await fetchProblems(selectedCategoryId.value)
    } else {
      selectedTypeId.value = payload.serviceTypeId
      selectedCategoryId.value = payload.serviceCategoryId
    }
  } catch (e: any) {
    showToast(e?.message || 'Failed to save sub-problem', 'error')
  } finally {
    isSaving.value = false
  }
}

const filtered = () =>
  items.value.filter(i => i.name.toLowerCase().includes(search.value.toLowerCase()))
</script>

<template>
  <div class="space-y-6 bg-white text-[#202124]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-[#202124]">Service Problem</h1>
        <p class="text-sm text-[#6B7280] mt-0.5">
          Manage sub-problems, 19 dynamic app sections, and extra add-ons popup (e.g. Balcony, Extra Kitchen)
        </p>
      </div>

      <button
        @click="openAddDrawer"
        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors cursor-pointer shadow-none"
      >
        <Plus class="w-4 h-4" />
        Add Sub-Problem
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-[#6B7280]">Category:</label>
          <select
            v-model="selectedTypeId"
            class="text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          >
            <option v-if="isLoadingTypes" value="">Loading...</option>
            <option v-for="t in types" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-[#6B7280]">Sub-Category:</label>
          <select
            v-model="selectedCategoryId"
            class="text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
            :disabled="categories.length === 0"
          >
            <option v-if="isLoadingCats" value="">Loading...</option>
            <option v-if="!isLoadingCats && categories.length === 0" value="">No subcategories</option>
            <option v-for="c in categories" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <input
        v-model="search"
        type="text"
        placeholder="Search sub-problems..."
        class="w-64 text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
      />
    </div>

    <div v-if="error" class="px-4 py-3 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm">{{ error }}</div>

    <!-- Problems Table -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <Table :headers="baseHeaders" :items="filtered()">
        <template #row="{ item }">
          <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 font-medium border-b border-[#E5E7EB] last:border-0 bg-white">
            <!-- Icon -->
            <td class="py-3 px-4 text-sm text-[#202124] text-center">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="h-10 w-10 object-cover rounded-md mx-auto border border-[#E5E7EB]">
              <div v-else class="h-10 w-10 bg-[#F7F7F8] rounded-md mx-auto flex items-center justify-center text-[#6B7280] text-xs border border-[#E5E7EB]">N/A</div>
            </td>

            <!-- Name -->
            <td class="py-3 px-4 text-sm text-[#202124] text-left font-semibold">
              {{ item.name }}
            </td>

            <!-- Add-ons Popup Toggle Column -->
            <td class="py-3 px-4 text-sm text-center">
              <div class="inline-flex items-center gap-2">
                <Toggle
                  v-model="item.isConfigurable"
                  @change="handleToggleConfigurable(item)"
                />
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="item.isConfigurable ? 'bg-[#FAF0F2] text-[#800020] border border-[#F5D8DE]' : 'bg-gray-100 text-gray-500 border border-gray-200'"
                >
                  {{ item.isConfigurable ? 'Popup ON' : 'Direct Add' }}
                </span>
              </div>
            </td>

            <!-- 19 Sections Pill Button -->
            <td class="py-3 px-4 text-sm text-center">
              <button
                type="button"
                @click="openEditDrawer(item)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FAF0F2] text-[#800020] hover:bg-[#F5D8DE] border border-[#F5D8DE] cursor-pointer transition-colors"
                title="Configure 19 Customer App Sections & Add-ons"
              >
                <Layers class="w-3.5 h-3.5" />
                <span>19 Sections</span>
              </button>
            </td>

            <!-- Pricing Type -->
            <td class="py-3 px-4 text-sm text-center">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB]">
                {{ item.pricingType === 'QUANTITY_BASED' ? 'Quantity' : 'Time' }}
              </span>
            </td>

            <!-- Active Status Toggle -->
            <td class="py-3 px-4 text-sm text-center">
              <div class="flex justify-center">
                <Toggle v-model="item.isActive" />
              </div>
            </td>

            <!-- Action -->
            <td class="py-3 px-4 text-sm text-center">
              <button
                @click="openEditDrawer(item)"
                title="Edit Sub-Problem & Sections"
                class="text-[#800020] hover:text-[#6B001B] transition-colors p-1.5 rounded-md hover:bg-[#FAF0F2] inline-flex items-center justify-center cursor-pointer"
              >
                <Pen :size="16" />
              </button>
            </td>
          </tr>
        </template>
      </Table>
    </div>

    <!-- Centered Modal for Sub-Problem & Add-ons -->
    <SubProblemDrawer
      :is-open="isDrawerOpen"
      :is-edit="isEditing"
      :type-options="typeOptions"
      :category-options="drawerCategoryOptions"
      :initial-service-type-id="selectedTypeId"
      :initial-service-category-id="selectedCategoryId"
      :initial-data="selectedProblemData || undefined"
      :is-saving="isSaving"
      @close="isDrawerOpen = false"
      @type-change="handleDrawerTypeChange"
      @save="handleDrawerSave"
    />
  </div>
</template>
