<script setup lang="ts">
import { ref } from 'vue'
import type { City, ServiceType, ServiceCategory } from '@/types/api'
import { MapPin, CheckCircle, XCircle } from 'lucide-vue-next'
import { http } from '@/api/client'

const latitude = ref<number | ''>(22.417211)
const longitude = ref<number | ''>(87.758191)
const isLoading = ref(false)
const errorMsg = ref('')

const detectedCity = ref<City | null>(null)
const availableCategories = ref<ServiceType[]>([])
const subcategoriesCache = ref<Record<string, ServiceCategory[]>>({})

async function checkAvailability() {
  if (latitude.value === '' || longitude.value === '') {
    errorMsg.value = 'Please enter both latitude and longitude.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  detectedCity.value = null
  availableCategories.value = []
  subcategoriesCache.value = {}

  try {
    // 1. Find Nearest City
    const cityResp = await http.get('/api/v1/customer/catalog/cities/nearest', {
      params: { latitude: latitude.value, longitude: longitude.value },
    })

    detectedCity.value =
      (cityResp as any)?.data?.data?.city ||
      (cityResp as any)?.data?.city ||
      cityResp?.data?.city

    if (!detectedCity.value) {
      throw new Error('No city data returned.')
    }

    // 2. Fetch Available Categories
    const catResp = await http.get(
      `/api/v1/customer/catalog/cities/${detectedCity.value.uniqueId}/categories`
    )
    availableCategories.value =
      (catResp as any)?.data?.data?.categories ||
      (catResp as any)?.data?.categories ||
      catResp?.data?.categories ||
      []

    // 3. Fetch Sub-categories for each available Category
    for (const cat of availableCategories.value) {
      const subResp = await http.get(
        `/api/v1/customer/catalog/cities/${detectedCity.value.uniqueId}/categories/${cat.uniqueId}/subcategories`
      )
      const subs =
        (subResp as any)?.data?.data?.subcategories ||
        (subResp as any)?.data?.subcategories ||
        subResp?.data?.subcategories ||
        []
      subcategoriesCache.value[cat.uniqueId] = subs
    }
  } catch (err: any) {
    if (err?.response?.status === 404) {
      errorMsg.value = 'No active city services this location.'
    } else {
      errorMsg.value = err?.message || 'An error occurred while checking availability.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#202124]">Availability Checker</h1>
      <p class="text-sm text-[#6B7280] mt-1">Check if services are available at a specific coordinate</p>
    </div>

    <!-- Coordinate Input Form -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] p-6 max-w-2xl">
      <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-[#202124] mb-1">Latitude</label>
          <input
            v-model.number="latitude"
            type="number"
            step="any"
            placeholder="e.g. 28.6139"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-semibold text-[#202124] mb-1">Longitude</label>
          <input
            v-model.number="longitude"
            type="number"
            step="any"
            placeholder="e.g. 77.2090"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>
        <button
          type="button"
          @click="checkAvailability"
          :disabled="isLoading"
          class="px-5 py-2 bg-[#800020] hover:bg-[#6B001B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 h-10 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <MapPin :size="15" />
          {{ isLoading ? 'Checking...' : 'Check Availability' }}
        </button>
      </div>

      <div
        v-if="errorMsg"
        class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2"
      >
        <XCircle :size="15" class="shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- Results -->
    <div v-if="detectedCity" class="space-y-6">
      <div class="p-4 bg-white border border-[#E5E7EB] rounded-xl flex items-center gap-3">
        <div class="p-2.5 bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 rounded-lg shrink-0">
          <MapPin :size="20" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-[#202124]">Coverage Found: {{ detectedCity.name }}</h3>
          <p class="text-xs text-[#6B7280] mt-0.5">This location is serviced by the operational hub of {{ detectedCity.name }}.</p>
        </div>
      </div>

      <div
        v-if="availableCategories.length === 0"
        class="p-8 text-center bg-white rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm"
      >
        No active categories found for this city.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="cat in availableCategories"
          :key="cat.uniqueId"
          class="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-3"
        >
          <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h4 class="font-bold text-sm text-[#202124]">{{ cat.name }}</h4>
            <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
              <CheckCircle :size="12" /> Available
            </span>
          </div>

          <ul class="space-y-2">
            <li
              v-if="!subcategoriesCache[cat.uniqueId] || subcategoriesCache[cat.uniqueId]!.length === 0"
              class="text-xs text-[#6B7280] italic"
            >
              No sub-categories available
            </li>
            <li
              v-for="sub in subcategoriesCache[cat.uniqueId]"
              :key="sub.uniqueId"
              class="flex items-center gap-2 text-xs text-[#202124]"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-[#800020] shrink-0"></div>
              <span>{{ sub.name }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
