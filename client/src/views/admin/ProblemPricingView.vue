<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '@/api'
import type { City, ServiceType, ServiceCategory, ServiceProblem, ServiceProblemCity } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Toggle from '@/components/common/Toggle.vue'
import { Settings2, Pencil, X } from 'lucide-vue-next'
import { showToast } from '@/utils/toast'

const cities = ref<City[]>([])
const selectedCityId = ref('')

const types = ref<ServiceType[]>([])
const selectedTypeId = ref('')

const categories = ref<ServiceCategory[]>([])
const selectedCategoryId = ref('')

const problems = ref<ServiceProblem[]>([])
const isLoading = ref(false)

const isModalOpen = ref(false)
const isFetchingPricing = ref(false)
const isSaving = ref(false)
const currentProblem = ref<ServiceProblem | null>(null)

// Configured Pricing
const configuredPricing = ref<ServiceProblemCity[]>([])
const isLoadingConfigured = ref(false)
const problemNamesCache = ref<Record<string, string>>({})

// Pricing Form Data
const hasExistingPricing = ref(false)
const formData = ref({
  uniqueId: '',
  serviceProblemId: '',
  cityId: '',
  price: 0,
  originalPrice: 0,
  partnerPayout: 0,
  reworkWindowDays: 30,
  isActive: true,
})

const baseHeaders: Header[] = [
  { key: 'name', title: 'Problem Name', align: 'left', sortable: true },
  { key: 'pricingType', title: 'Pricing Type', align: 'center', sortable: true },
  { key: 'action', title: 'City Pricing', align: 'center', sortable: false },
]

const configuredHeaders: Header[] = [
  { key: 'name', title: 'Problem Name', align: 'left', sortable: true },
  { key: 'price', title: 'Final Price', align: 'center', sortable: true },
  { key: 'originalPrice', title: 'Original Price', align: 'center', sortable: true },
  { key: 'partnerPayout', title: 'Partner Payout', align: 'center', sortable: true },
  { key: 'reworkWindowDays', title: 'Warranty (Days)', align: 'center', sortable: true },
  { key: 'status', title: 'Status', align: 'center', sortable: false },
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

onMounted(async () => {
  try {
    const [cityResp, typeResp] = await Promise.all([
      api.cities.getAll(),
      api.services.getAllTypes(),
    ])
    cities.value = (cityResp as any)?.data ?? cityResp
    types.value = ((typeResp as any)?.data ?? typeResp).filter((t: any) => t.isActive)
  } catch (e) {
    console.error('Failed to load initial data', e)
    showToast('Failed to load initial pricing configuration', 'error')
  }
})

watch(selectedTypeId, async (id) => {
  selectedCategoryId.value = ''
  problems.value = []
  if (!id) {
    categories.value = []
    return
  }
  try {
    const resp = await api.services.getCategoriesByType(id)
    categories.value = ((resp as any)?.data ?? resp).filter((c: any) => c.isActive)
  } catch (e) {
    console.error('Failed to load subcategories', e)
  }
})

watch(selectedCategoryId, async (id) => {
  if (!id) {
    problems.value = []
    return
  }
  isLoading.value = true
  try {
    const resp = await api.services.getProblemsByCategory(id)
    problems.value = ((resp as any)?.data ?? resp).filter((p: any) => p.isActive)

    // update cache
    problems.value.forEach((p) => {
      problemNamesCache.value[p.uniqueId] = p.name
    })
  } catch (e) {
    console.error('Failed to load problems', e)
  } finally {
    isLoading.value = false
  }
})

watch(selectedCityId, async (id) => {
  configuredPricing.value = []
  if (!id) return
  loadConfiguredPricing(id)
})

async function loadConfiguredPricing(cityId: string) {
  isLoadingConfigured.value = true
  try {
    const resp = await api.services.getCityPricingByCity(cityId)
    const data = (resp as any)?.data ?? resp
    configuredPricing.value = Array.isArray(data) ? data : []

    // Resolve missing names
    for (const item of configuredPricing.value) {
      if (!problemNamesCache.value[item.serviceProblemId]) {
        try {
          const pResp = await api.services.getProblemById(item.serviceProblemId)
          const pData = (pResp as any)?.data ?? pResp
          if (pData) {
            problemNamesCache.value[item.serviceProblemId] = pData.name
          }
        } catch {
          problemNamesCache.value[item.serviceProblemId] = 'Unknown Problem'
        }
      }
    }
  } catch (e) {
    console.error('Failed to load configured pricing', e)
  } finally {
    isLoadingConfigured.value = false
  }
}

async function openConfigureModal(problem: any) {
  if (!selectedCityId.value) {
    showToast('Please select a City first.', 'warning')
    return
  }
  currentProblem.value = problem
  isModalOpen.value = true
  isFetchingPricing.value = true
  hasExistingPricing.value = false

  // Reset Form
  formData.value = {
    uniqueId: '',
    serviceProblemId: problem.uniqueId,
    cityId: selectedCityId.value,
    price: 0,
    originalPrice: 0,
    partnerPayout: 0,
    reworkWindowDays: 30,
    isActive: true,
  }

  try {
    const resp = await api.services.getCityPricing(problem.uniqueId, selectedCityId.value)
    const data = (resp as any)?.data ?? resp
    if (data && data.uniqueId) {
      hasExistingPricing.value = true
      formData.value = { ...data }
    }
  } catch {
    // 404 means no pricing configured yet, which is fine
  } finally {
    isFetchingPricing.value = false
  }
}

async function openEditPricingModal(pricing: ServiceProblemCity) {
  const problemName = problemNamesCache.value[pricing.serviceProblemId] || 'Unknown Problem'
  currentProblem.value = { uniqueId: pricing.serviceProblemId, name: problemName } as any

  isModalOpen.value = true
  hasExistingPricing.value = true
  isFetchingPricing.value = false

  formData.value = {
    ...pricing,
    originalPrice: pricing.originalPrice || 0,
    partnerPayout: pricing.partnerPayout || 0,
    reworkWindowDays: pricing.reworkWindowDays || 30,
  }
}

async function savePricing() {
  isSaving.value = true
  try {
    if (hasExistingPricing.value) {
      await api.services.updateCityPricing(formData.value)
      showToast('Pricing updated successfully', 'success')
    } else {
      await api.services.setCityPricing(formData.value)
      showToast('Pricing created successfully', 'success')
    }
    isModalOpen.value = false
    // Refresh the configured list
    if (selectedCityId.value) {
      loadConfiguredPricing(selectedCityId.value)
    }
  } catch (e: any) {
    showToast(e?.message || 'Failed to save city pricing', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#202124]">City Pricing</h1>
      <p class="text-sm text-[#6B7280] mt-1">Manage service problem pricing based on city location</p>
    </div>

    <!-- Filters Card -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4 flex-wrap">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Target City</label>
        <select
          v-model="selectedCityId"
          class="text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124] min-w-[200px]"
        >
          <option value="">-- Select City --</option>
          <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
        </select>
      </div>

      <div class="h-10 w-px bg-[#E5E7EB] mx-2 hidden sm:block"></div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</label>
        <select
          v-model="selectedTypeId"
          class="text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124] min-w-[200px]"
        >
          <option value="">-- Select Category --</option>
          <option v-for="t in types" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Sub-Category</label>
        <select
          v-model="selectedCategoryId"
          :disabled="!selectedTypeId"
          class="text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124] min-w-[200px] disabled:bg-[#F7F7F8] disabled:cursor-not-allowed"
        >
          <option value="">-- Select Sub-Category --</option>
          <option v-for="c in categories" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <!-- Configuration Table (Add New) -->
    <div class="space-y-3">
      <h2 class="text-base font-bold text-[#202124]">Available Problems</h2>
      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div v-if="!selectedCityId || !selectedCategoryId" class="p-12 text-center text-[#6B7280] text-sm">
          Please select a City and Sub-Category to configure pricing.
        </div>
        <div v-else-if="isLoading" class="p-12 text-center text-[#6B7280] text-sm">Loading problems...</div>
        <div v-else-if="problems.length === 0" class="p-12 text-center text-[#6B7280] text-sm">No active problems found in this sub-category.</div>
        <Table v-else :headers="baseHeaders" :items="problems">
          <template #row="{ item }">
            <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
              <td class="py-3 px-4 text-sm font-medium text-[#202124] text-left">{{ item.name }}</td>
              <td class="py-3 px-4 text-sm text-[#6B7280] text-center">
                <span class="px-2 py-0.5 bg-[#F7F7F8] border border-[#E5E7EB] rounded text-xs font-medium text-[#202124]">
                  {{ item.pricingType === 'QUANTITY_BASED' ? 'Quantity' : 'Time' }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm text-center">
                <button
                  type="button"
                  @click="openConfigureModal(item)"
                  class="text-[#800020] hover:text-[#6B001B] hover:bg-[#FAF0F2] transition-colors px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-[#E5E7EB] hover:border-[#800020]/30 cursor-pointer text-xs font-semibold"
                >
                  <Settings2 :size="14" /> Configure
                </button>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>

    <!-- Already Configured Pricing Table -->
    <div v-if="selectedCityId" class="space-y-3">
      <h2 class="text-base font-bold text-[#202124]">Configured in Selected City</h2>
      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div v-if="isLoadingConfigured" class="p-12 text-center text-[#6B7280] text-sm">Loading configured pricing...</div>
        <div v-else-if="configuredPricing.length === 0" class="p-12 text-center text-[#6B7280] text-sm">No pricing configured for this city yet.</div>
        <Table v-else :headers="configuredHeaders" :items="configuredPricing">
          <template #row="{ item }">
            <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
              <td class="py-3 px-4 text-sm font-medium text-[#202124] text-left">{{ problemNamesCache[item.serviceProblemId] || 'Loading...' }}</td>
              <td class="py-3 px-4 text-sm font-semibold text-[#202124] text-center">₹{{ item.price }}</td>
              <td class="py-3 px-4 text-sm text-[#6B7280] text-center line-through">₹{{ item.originalPrice || 0 }}</td>
              <td class="py-3 px-4 text-sm text-[#6B7280] text-center">₹{{ item.partnerPayout || 0 }}</td>
              <td class="py-3 px-4 text-sm text-[#6B7280] text-center">{{ item.reworkWindowDays || 0 }}</td>
              <td class="py-3 px-4 text-sm text-center">
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold border"
                  :class="item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'"
                >
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm text-center">
                <button
                  type="button"
                  @click="openEditPricingModal(item as any)"
                  class="text-[#6B7280] hover:text-[#800020] hover:bg-[#FAF0F2] transition-colors p-1.5 rounded-lg border border-transparent hover:border-[#800020]/20 cursor-pointer"
                  title="Edit Pricing"
                >
                  <Pencil :size="15" />
                </button>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>

    <!-- Pricing Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-white">
          <div>
            <h2 class="text-base font-bold text-[#202124]">City Pricing</h2>
            <p class="text-xs text-[#800020] font-semibold mt-0.5">{{ currentProblem?.name }}</p>
          </div>
          <button
            type="button"
            @click="isModalOpen = false"
            class="text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="isFetchingPricing" class="p-12 text-center text-[#6B7280] text-sm">Loading current pricing...</div>

        <form v-else @submit.prevent="savePricing" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-white">
          <div class="p-3 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-between">
            <span class="text-xs font-semibold text-[#202124]">Available in this City?</span>
            <Toggle :modelValue="!!formData.isActive" @update:modelValue="(val) => (formData.isActive = val)" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Final Price (₹)</label>
              <input
                v-model.number="formData.price"
                required
                type="number"
                step="0.01"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Original Price (₹)</label>
              <input
                v-model.number="formData.originalPrice"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Partner Payout (₹)</label>
              <input
                v-model.number="formData.partnerPayout"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#202124] mb-1">Warranty (Days)</label>
              <input
                v-model.number="formData.reworkWindowDays"
                required
                type="number"
                class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-2 sticky bottom-0 bg-white border-t border-[#E5E7EB]">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSaving ? 'Saving...' : (hasExistingPricing ? 'Update Pricing' : 'Add Pricing') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
