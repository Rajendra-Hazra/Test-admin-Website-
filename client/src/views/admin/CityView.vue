<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { City } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import {
  Plus,
  Pen,
  MapPin,
  Radar,
  Search,
  Navigation,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-vue-next'

// ── State ─────────────────────────────────────────────────────────────
const items = ref<City[]>([])
const isLoading = ref(false)
const error = ref('')
const search = ref('')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

const isModalOpen = ref(false)
const isEditing = ref(false)
const editingCityId = ref<string | null>(null)
const isSubmitting = ref(false)
const isLocating = ref(false)

const radiusPresets = [5, 10, 15, 25, 50]

const formData = ref<{
  name: string
  latitude: number | ''
  longitude: number | ''
  radius: number | ''
  isActive: boolean
}>({
  name: '',
  latitude: '',
  longitude: '',
  radius: 10,
  isActive: true,
})

const headers: Header[] = [
  { key: 'index', title: '#', align: 'center', sortable: false, width: '60px' },
  { key: 'name', title: 'City Name', align: 'left', sortable: true },
  { key: 'latitude', title: 'Latitude (Lat)', align: 'center', sortable: true },
  { key: 'longitude', title: 'Longitude (Lon)', align: 'center', sortable: true },
  { key: 'radius', title: 'Radiation / Radius (km)', align: 'center', sortable: true },
  { key: 'isActive', title: 'Status', align: 'center', sortable: true },
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

// ── Computed ──────────────────────────────────────────────────────────
const counts = computed(() => {
  const total = items.value.length
  const active = items.value.filter((c) => c.isActive).length
  const inactive = total - active
  return { total, active, inactive }
})

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter((city) => {
    if (statusFilter.value === 'ACTIVE' && !city.isActive) return false
    if (statusFilter.value === 'INACTIVE' && city.isActive) return false
    if (!q) return true
    const matchName = (city.name || '').toLowerCase().includes(q)
    const matchCoords =
      String(city.latitude ?? '').includes(q) || String(city.longitude ?? '').includes(q)
    return matchName || matchCoords
  })
})

const coordinateError = computed(() => {
  const lat = formData.value.latitude
  const lon = formData.value.longitude
  if (lat !== '' && (Number(lat) < -90 || Number(lat) > 90)) {
    return 'Latitude must be between -90 and 90.'
  }
  if (lon !== '' && (Number(lon) < -180 || Number(lon) > 180)) {
    return 'Longitude must be between -180 and 180.'
  }
  return ''
})

// ── Data Fetching ─────────────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  error.value = ''
  try {
    const resp = await api.cities.getAll()
    const raw = (resp as any)?.data ?? resp
    items.value = Array.isArray(raw) ? raw : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load cities'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────
function openAddModal() {
  isEditing.value = false
  editingCityId.value = null
  formData.value = {
    name: '',
    latitude: '',
    longitude: '',
    radius: 10,
    isActive: true,
  }
  isModalOpen.value = true
}

function openEditModal(city: City) {
  isEditing.value = true
  editingCityId.value = city.uniqueId
  formData.value = {
    name: city.name || '',
    latitude: city.latitude ?? 0,
    longitude: city.longitude ?? 0,
    radius: city.radius ?? 0,
    isActive: Boolean(city.isActive),
  }
  isModalOpen.value = true
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error')
    return
  }
  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      formData.value.latitude = Number(pos.coords.latitude.toFixed(6))
      formData.value.longitude = Number(pos.coords.longitude.toFixed(6))
      isLocating.value = false
      showToast('Coordinates detected from your current location', 'info')
    },
    (err) => {
      isLocating.value = false
      showToast(err.message || 'Unable to retrieve your location', 'error')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

async function saveCity() {
  const trimmedName = formData.value.name.trim()
  const lat = Number(formData.value.latitude)
  const lon = Number(formData.value.longitude)
  const rad = Number(formData.value.radius)

  if (!trimmedName) {
    showToast('Please enter a city name', 'warning')
    return
  }
  if (
    formData.value.latitude === '' ||
    formData.value.longitude === '' ||
    Number.isNaN(lat) ||
    Number.isNaN(lon)
  ) {
    showToast('Please enter valid latitude and longitude coordinates', 'warning')
    return
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    showToast('Coordinates out of valid range (Lat: -90..90, Lon: -180..180)', 'warning')
    return
  }
  if (formData.value.radius === '' || Number.isNaN(rad) || rad <= 0) {
    showToast('Please enter a valid radiation / radius greater than 0 km', 'warning')
    return
  }

  isSubmitting.value = true
  try {
    if (isEditing.value && editingCityId.value) {
      await api.cities.update({
        uniqueId: editingCityId.value,
        name: trimmedName,
        latitude: lat,
        longitude: lon,
        radius: rad,
        isActive: formData.value.isActive,
      })
      showToast(`City "${trimmedName}" updated successfully`, 'success')
    } else {
      await api.cities.add({
        name: trimmedName,
        latitude: lat,
        longitude: lon,
        radius: rad,
        isActive: formData.value.isActive,
      })
      showToast(`City "${trimmedName}" added successfully`, 'success')
    }
    isModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    showToast(
      e?.message || (isEditing.value ? 'Failed to update city' : 'Failed to add city'),
      'error'
    )
  } finally {
    isSubmitting.value = false
  }
}

async function toggleCityStatus(city: City, nextValue: boolean) {
  const previous = city.isActive
  city.isActive = nextValue
  try {
    await api.cities.update({
      uniqueId: city.uniqueId,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      radius: city.radius,
      isActive: nextValue,
    })
    showToast(
      `${city.name} marked as ${nextValue ? 'Active' : 'Inactive'}`,
      'success'
    )
  } catch (e: any) {
    city.isActive = previous
    showToast(e?.message || 'Failed to update city status', 'error')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6 bg-white text-[#202124]">
    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="p-2 bg-[#FAF0F2] text-[#800020] rounded-lg border border-[#800020]/10">
            <MapPin class="size-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-[#202124]">City & Service Zones</h1>
            <p class="text-sm text-[#6B7280]">
              Add and manage serviceable cities by city name, latitude, longitude, and radiation radius.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="fetchData"
          :disabled="isLoading"
          class="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>

        <button
          type="button"
          @click="openAddModal"
          class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#800020] text-white rounded-lg hover:bg-[#6B001B] transition cursor-pointer shadow-none"
        >
          <Plus class="size-4" />
          <span>Add City</span>
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        type="button"
        @click="statusFilter = 'ALL'"
        class="text-left p-4 rounded-xl border transition-all cursor-pointer bg-white"
        :class="
          statusFilter === 'ALL'
            ? 'border-[#800020] ring-1 ring-[#800020]'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
        "
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Total Cities</span>
          <MapPin class="size-4 text-[#800020]" />
        </div>
        <p class="text-2xl font-bold text-[#202124] mt-1">{{ counts.total }}</p>
      </button>

      <button
        type="button"
        @click="statusFilter = 'ACTIVE'"
        class="text-left p-4 rounded-xl border transition-all cursor-pointer bg-white"
        :class="
          statusFilter === 'ACTIVE'
            ? 'border-emerald-600 ring-1 ring-emerald-600'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
        "
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Active Zones</span>
          <CheckCircle2 class="size-4 text-emerald-600" />
        </div>
        <p class="text-2xl font-bold text-emerald-700 mt-1">{{ counts.active }}</p>
      </button>

      <button
        type="button"
        @click="statusFilter = 'INACTIVE'"
        class="text-left p-4 rounded-xl border transition-all cursor-pointer bg-white"
        :class="
          statusFilter === 'INACTIVE'
            ? 'border-rose-600 ring-1 ring-rose-600'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
        "
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Inactive Zones</span>
          <XCircle class="size-4 text-rose-500" />
        </div>
        <p class="text-2xl font-bold text-rose-600 mt-1">{{ counts.inactive }}</p>
      </button>
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E7EB]">
      <div class="relative flex-1 max-w-md">
        <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input
          v-model="search"
          type="text"
          placeholder="Search by city name, latitude, or longitude..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Filter:</span>
        <select
          v-model="statusFilter"
          class="text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
        >
          <option value="ALL">All Cities</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="px-4 py-3 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm"
    >
      {{ error }}
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <div
        v-if="!isLoading && filteredItems.length === 0"
        class="p-12 text-center text-[#6B7280] space-y-2"
      >
        <MapPin class="size-8 mx-auto text-slate-300" />
        <p class="text-sm font-medium text-[#202124]">No cities found</p>
        <p class="text-xs text-[#6B7280]">
          Click "Add City" to configure a city with latitude, longitude, and radiation radius.
        </p>
      </div>

      <Table
        v-else
        :items="filteredItems"
        :headers="headers"
        :loading="isLoading"
        itemKey="uniqueId"
        paginate
        :itemsPerPage="10"
      >
        <template #row="{ item, index }">
          <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 font-medium border-b border-[#E5E7EB] last:border-0 bg-white">
            <td class="py-3.5 px-4 text-sm text-[#6B7280] text-center">
              {{ index + 1 }}
            </td>

            <td class="py-3.5 px-4 text-sm text-[#202124] text-left">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 rounded-md bg-[#FAF0F2] text-[#800020] shrink-0 border border-[#800020]/10">
                  <MapPin class="size-4" />
                </div>
                <div>
                  <p class="font-semibold text-[#202124]">{{ item.name }}</p>
                  <a
                    :href="`https://www.google.com/maps?q=${item.latitude},${item.longitude}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-[11px] text-[#800020] hover:underline"
                  >
                    <span>View on Map</span>
                    <ExternalLink class="size-3" />
                  </a>
                </div>
              </div>
            </td>

            <td class="py-3.5 px-4 text-sm text-[#202124] text-center font-mono">
              {{ item.latitude }}
            </td>

            <td class="py-3.5 px-4 text-sm text-[#202124] text-center font-mono">
              {{ item.longitude }}
            </td>

            <td class="py-3.5 px-4 text-sm text-center">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF0F2] text-[#800020] border border-[#800020]/20">
                <Radar class="size-3.5" />
                {{ item.radius }} km
              </span>
            </td>

            <td class="py-3.5 px-4 text-sm text-center">
              <div class="flex items-center justify-center gap-2">
                <Toggle
                  :modelValue="Boolean(item.isActive)"
                  @update:modelValue="(val) => toggleCityStatus(item as City, val)"
                />
                <span
                  class="px-2 py-0.5 text-xs rounded-full font-medium"
                  :class="
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-[#F7F7F8] text-[#6B7280] border border-[#E5E7EB]'
                  "
                >
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </td>

            <td class="py-3.5 px-4 text-sm text-center">
              <button
                type="button"
                @click="openEditModal(item as City)"
                class="p-1.5 hover:bg-[#FAF0F2] rounded-md text-[#800020] hover:text-[#6B001B] transition inline-flex items-center justify-center cursor-pointer"
                title="Edit City"
              >
                <Pen class="size-4" />
              </button>
            </td>
          </tr>
        </template>
      </Table>
    </div>

    <!-- Add / Edit City Modal -->
    <Popup
      v-model="isModalOpen"
      :title="isEditing ? 'Edit City Zone' : 'Add New City Zone'"
      size="md"
    >
      <form @submit.prevent="saveCity" class="space-y-4">
        <!-- City Name -->
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">
            City Name <span class="text-rose-600">*</span>
          </label>
          <input
            v-model="formData.name"
            required
            type="text"
            placeholder="e.g. Kolkata, New Delhi, Mumbai"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>

        <!-- Coordinates Header + GPS Helper -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-[#202124]">
              Center Coordinates (Lat & Lon) <span class="text-rose-600">*</span>
            </label>
            <button
              type="button"
              @click="useCurrentLocation"
              :disabled="isLocating"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800020] hover:underline cursor-pointer disabled:opacity-50"
            >
              <Navigation class="size-3.5" />
              <span>{{ isLocating ? 'Detecting...' : 'Use Current Location' }}</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-[#6B7280] mb-1">
                Latitude (-90 to 90)
              </label>
              <input
                v-model.number="formData.latitude"
                required
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="e.g. 22.5726"
                class="w-full px-3 py-2 text-sm font-mono border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-[#6B7280] mb-1">
                Longitude (-180 to 180)
              </label>
              <input
                v-model.number="formData.longitude"
                required
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="e.g. 88.3639"
                class="w-full px-3 py-2 text-sm font-mono border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
              />
            </div>
          </div>

          <p v-if="coordinateError" class="text-xs text-rose-600">
            {{ coordinateError }}
          </p>
        </div>

        <!-- Radiation / Service Radius (km) -->
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">
            Service Radiation / Radius (km) <span class="text-rose-600">*</span>
          </label>
          <div class="relative">
            <input
              v-model.number="formData.radius"
              required
              type="number"
              min="0.1"
              step="any"
              placeholder="e.g. 15"
              class="w-full px-3 py-2 pr-12 text-sm border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6B7280]">
              km
            </span>
          </div>

          <!-- Quick Presets -->
          <div class="flex items-center gap-1.5 flex-wrap mt-2">
            <span class="text-xs text-[#6B7280] mr-1">Quick set:</span>
            <button
              v-for="preset in radiusPresets"
              :key="preset"
              type="button"
              @click="formData.radius = preset"
              class="px-2.5 py-1 text-xs font-medium rounded-md border transition cursor-pointer"
              :class="
                Number(formData.radius) === preset
                  ? 'bg-[#800020] text-white border-[#800020]'
                  : 'bg-white text-[#202124] border-[#E5E7EB] hover:bg-[#F7F7F8]'
              "
            >
              {{ preset }} km
            </button>
          </div>
          <p class="text-xs text-[#6B7280] mt-1">
            Defines the circular coverage distance from the city center coordinate.
          </p>
        </div>

        <!-- Active Status Toggle -->
        <div class="p-3 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[#202124]">Active Service Zone</p>
            <p class="text-xs text-[#6B7280]">Enable or disable customer orders in this city</p>
          </div>
          <Toggle v-model="formData.isActive" />
        </div>

        <!-- Modal Actions -->
        <div class="pt-4 border-t border-[#E5E7EB] flex justify-end gap-3">
          <button
            type="button"
            @click="isModalOpen = false"
            class="px-4 py-2 text-sm font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || !!coordinateError"
            class="px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition disabled:opacity-50 cursor-pointer shadow-none"
          >
            {{ isSubmitting ? 'Saving...' : isEditing ? 'Update City' : 'Add City' }}
          </button>
        </div>
      </form>
    </Popup>
  </div>
</template>
