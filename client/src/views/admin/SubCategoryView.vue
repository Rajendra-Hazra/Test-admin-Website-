<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '@/api'
import type { ServiceType, ServiceCategory } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Toggle from '@/components/common/Toggle.vue'
import Popup from '@/components/common/Popup.vue'
import Select from '@/components/common/Select.vue'
import { showToast } from '@/utils/toast'
import {
  Pen,
  Plus,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  XCircle,
  Film
} from 'lucide-vue-next'

interface BannerItem {
  id: string
  url: string
  caption?: string
  file?: File | null
  preview?: string
}

interface VideoItem {
  id: string
  url: string
  title?: string
}

const types = ref<ServiceType[]>([])
const typeOptions = computed(() => types.value.map(t => ({ label: t.name, value: t.uniqueId })))
const items = ref<ServiceCategory[]>([])
const selectedTypeId = ref('')
const isLoadingTypes = ref(false)
const isLoading = ref(false)
const error = ref('')
const search = ref('')

// Add Modal State
const isAddModalOpen = ref(false)
const isSubmitting = ref(false)
const addImagePreview = ref<string>('')

const formData = ref({
  name: '',
  serviceTypeId: '',
  isActive: true,
  imageFile: null as File | null,
  // Unlimited Hero Banner Images
  isHeroBannerEnabled: false,
  heroBanners: [] as BannerItem[],
  // Unlimited Hero Videos
  isVideoEnabled: false,
  heroVideos: [] as VideoItem[],
})

const baseHeaders: Header[] = [
  { key: 'image', title: 'Icon', align: 'center', sortable: false, width: '70px' },
  { key: 'name', title: 'Sub-Category Name', align: 'left', sortable: true },
  { key: 'heroBanners', title: 'Hero Banners (Unlimited)', align: 'center', sortable: false },
  { key: 'heroVideos', title: 'Hero Videos (Unlimited)', align: 'center', sortable: false },
  { key: 'isActive', title: 'Is Active', align: 'center', sortable: true }, 
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

function getStoredSubCatMedia(uniqueId: string) {
  if (!uniqueId) return null
  try {
    const raw = localStorage.getItem('omibay_subcat_media_' + uniqueId)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load subcat media:', e)
  }
  return null
}

function saveStoredSubCatMedia(uniqueId: string, data: any) {
  if (!uniqueId) return
  try {
    localStorage.setItem('omibay_subcat_media_' + uniqueId, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save subcat media:', e)
  }
}

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

async function fetchCategories(typeId: string) {
  if (!typeId) return
  isLoading.value = true
  error.value = ''
  try {
    const resp = await api.services.getCategoriesByType(typeId)
    const raw = (resp as any)?.data ?? resp
    const catList: ServiceCategory[] = Array.isArray(raw) ? raw : []
    items.value = catList.map(cat => {
      const stored = getStoredSubCatMedia(cat.uniqueId)
      return {
        ...cat,
        isHeroBannerEnabled: stored ? Boolean(stored.isHeroBannerEnabled) : Boolean(cat.isHeroBannerEnabled),
        heroBanners: stored?.heroBanners || (cat.heroBanners || (cat.heroBannerUrl ? [{ id: 'b-0', url: cat.heroBannerUrl }] : [])),
        isVideoEnabled: stored ? Boolean(stored.isVideoEnabled) : Boolean(cat.isVideoEnabled),
        heroVideos: stored?.heroVideos || (cat.heroVideos || (cat.videoUrl ? [{ id: 'v-0', url: cat.videoUrl }] : []))
      }
    })
  } catch (e: any) {
    error.value = e?.message || 'Failed to load subcategories'
    items.value = []
  } finally {
    isLoading.value = false
  }
}

watch(selectedTypeId, (id) => { if (id) fetchCategories(id) })
onMounted(async () => {
  await fetchTypes()
  if (selectedTypeId.value) fetchCategories(selectedTypeId.value)
})

function handleFile(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    const file = target.files[0] || null
    formData.value.imageFile = file
    if (file) addImagePreview.value = URL.createObjectURL(file)
  }
}

// Unlimited Banner Helpers (Add Modal)
function addHeroBanner() {
  formData.value.heroBanners.push({
    id: 'banner-' + Date.now(),
    url: '',
    caption: '',
    file: null,
    preview: ''
  })
}
function removeHeroBanner(idx: number) {
  formData.value.heroBanners.splice(idx, 1)
}
function handleBannerFile(e: Event, banner: BannerItem) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    const file = target.files[0]
    if (file) {
      banner.file = file
      banner.preview = URL.createObjectURL(file)
    }
  }
}

// Unlimited Video Helpers (Add Modal)
function addHeroVideo() {
  formData.value.heroVideos.push({
    id: 'video-' + Date.now(),
    url: '',
    title: ''
  })
}
function removeHeroVideo(idx: number) {
  formData.value.heroVideos.splice(idx, 1)
}

function openAddModal() {
  formData.value = {
    name: '',
    serviceTypeId: selectedTypeId.value,
    isActive: true,
    imageFile: null,
    isHeroBannerEnabled: false,
    heroBanners: [],
    isVideoEnabled: false,
    heroVideos: []
  }
  addImagePreview.value = ''
  isAddModalOpen.value = true
}

async function addSubCategory() {
  isSubmitting.value = true
  try {
    const data = new FormData()
    data.append('name', formData.value.name.trim())
    data.append('serviceTypeId', formData.value.serviceTypeId)
    data.append('isActive', String(formData.value.isActive))
    if (formData.value.imageFile) {
      data.append('imageFile', formData.value.imageFile)
    }

    // Hero Banner Data (Unlimited)
    data.append('isHeroBannerEnabled', String(formData.value.isHeroBannerEnabled))
    const bannersPayload = formData.value.heroBanners.map((b, idx) => ({
      id: b.id,
      url: b.url.trim() || b.preview || '',
      caption: b.caption?.trim()
    }))
    data.append('heroBanners', JSON.stringify(bannersPayload))
    if (bannersPayload.length > 0 && bannersPayload[0]?.url) {
      data.append('heroBannerUrl', bannersPayload[0].url)
    }

    // Video Data (Unlimited)
    data.append('isVideoEnabled', String(formData.value.isVideoEnabled))
    const videosPayload = formData.value.heroVideos.map((v) => ({
      id: v.id,
      url: v.url.trim(),
      title: v.title?.trim()
    }))
    data.append('heroVideos', JSON.stringify(videosPayload))
    if (videosPayload.length > 0 && videosPayload[0]?.url) {
      data.append('videoUrl', videosPayload[0].url)
    }
    
    const resp = await api.services.addCategory(data)
    const resData = (resp as any)?.data ?? resp
    const newId = resData?.uniqueId || resData?.id || 'new_' + Date.now()

    // Persist unlimited banners & videos locally
    saveStoredSubCatMedia(newId, {
      isHeroBannerEnabled: formData.value.isHeroBannerEnabled,
      heroBanners: bannersPayload,
      isVideoEnabled: formData.value.isVideoEnabled,
      heroVideos: videosPayload
    })

    showToast('Sub-category added successfully', 'success')
    isAddModalOpen.value = false

    if (selectedTypeId.value === formData.value.serviceTypeId) {
      await fetchCategories(selectedTypeId.value)
    } else {
      selectedTypeId.value = formData.value.serviceTypeId
    }
  } catch (e: any) {
    showToast(e?.message || 'Failed to add subcategory', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// ── Edit Modal State ────────────────────────────────────────────────
const isEditModalOpen = ref(false)
const isUpdating = ref(false)
const editFormData = ref({
  uniqueId: '',
  name: '',
  serviceTypeId: '',
  isActive: true,
  image: '',
  imageFile: null as File | null,
  isHeroBannerEnabled: false,
  heroBanners: [] as BannerItem[],
  isVideoEnabled: false,
  heroVideos: [] as VideoItem[],
})
const editImagePreview = ref<string>('')

function openEditModal(item: any) {
  const stored = getStoredSubCatMedia(item.uniqueId)
  
  // Format existing banners
  let banners: BannerItem[] = []
  if (stored?.heroBanners?.length) {
    banners = stored.heroBanners.map((b: any) => ({
      id: b.id || 'b-' + Math.random(),
      url: b.url || '',
      caption: b.caption || '',
      preview: b.url || ''
    }))
  } else if (item.heroBanners?.length) {
    banners = item.heroBanners.map((b: any) => ({
      id: b.id || 'b-' + Math.random(),
      url: b.url || '',
      caption: b.caption || '',
      preview: b.url || ''
    }))
  } else if (item.heroBannerUrl || item.heroBannerImage) {
    banners = [{
      id: 'b-default',
      url: item.heroBannerUrl || item.heroBannerImage || '',
      preview: item.heroBannerUrl || item.heroBannerImage || ''
    }]
  }

  // Format existing videos
  let videos: VideoItem[] = []
  if (stored?.heroVideos?.length) {
    videos = stored.heroVideos.map((v: any) => ({
      id: v.id || 'v-' + Math.random(),
      url: v.url || '',
      title: v.title || ''
    }))
  } else if (item.heroVideos?.length) {
    videos = item.heroVideos.map((v: any) => ({
      id: v.id || 'v-' + Math.random(),
      url: v.url || '',
      title: v.title || ''
    }))
  } else if (item.videoUrl) {
    videos = [{
      id: 'v-default',
      url: item.videoUrl,
      title: ''
    }]
  }

  editFormData.value = {
    uniqueId: item.uniqueId,
    name: item.name,
    serviceTypeId: item.serviceTypeId || selectedTypeId.value,
    isActive: Boolean(item.isActive),
    image: item.image || '',
    imageFile: null,
    isHeroBannerEnabled: stored ? Boolean(stored.isHeroBannerEnabled) : Boolean(item.isHeroBannerEnabled),
    heroBanners: banners,
    isVideoEnabled: stored ? Boolean(stored.isVideoEnabled) : Boolean(item.isVideoEnabled),
    heroVideos: videos
  }
  editImagePreview.value = item.image || ''
  isEditModalOpen.value = true
}

function handleEditFile(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    const file = target.files[0] || null
    editFormData.value.imageFile = file
    if (file) {
      editImagePreview.value = URL.createObjectURL(file)
    }
  }
}

// Unlimited Banner Helpers (Edit Modal)
function addEditHeroBanner() {
  editFormData.value.heroBanners.push({
    id: 'banner-' + Date.now(),
    url: '',
    caption: '',
    file: null,
    preview: ''
  })
}
function removeEditHeroBanner(idx: number) {
  editFormData.value.heroBanners.splice(idx, 1)
}

// Unlimited Video Helpers (Edit Modal)
function addEditHeroVideo() {
  editFormData.value.heroVideos.push({
    id: 'video-' + Date.now(),
    url: '',
    title: ''
  })
}
function removeEditHeroVideo(idx: number) {
  editFormData.value.heroVideos.splice(idx, 1)
}

async function updateSubCategory() {
  isUpdating.value = true
  try {
    const data = new FormData()
    data.append('uniqueId', editFormData.value.uniqueId)
    data.append('name', editFormData.value.name.trim())
    data.append('serviceTypeId', editFormData.value.serviceTypeId)
    data.append('isActive', String(editFormData.value.isActive))
    if (editFormData.value.imageFile) {
      data.append('imageFile', editFormData.value.imageFile)
    }

    // Hero Banner Data (Unlimited)
    data.append('isHeroBannerEnabled', String(editFormData.value.isHeroBannerEnabled))
    const bannersPayload = editFormData.value.heroBanners.map(b => ({
      id: b.id,
      url: b.url.trim() || b.preview || '',
      caption: b.caption?.trim()
    }))
    data.append('heroBanners', JSON.stringify(bannersPayload))
    if (bannersPayload.length > 0 && bannersPayload[0]?.url) {
      data.append('heroBannerUrl', bannersPayload[0].url)
    }

    // Video Data (Unlimited)
    data.append('isVideoEnabled', String(editFormData.value.isVideoEnabled))
    const videosPayload = editFormData.value.heroVideos.map(v => ({
      id: v.id,
      url: v.url.trim(),
      title: v.title?.trim()
    }))
    data.append('heroVideos', JSON.stringify(videosPayload))
    if (videosPayload.length > 0 && videosPayload[0]?.url) {
      data.append('videoUrl', videosPayload[0].url)
    }
    
    await api.services.updateCategory(data)

    // Persist media settings in localStorage
    saveStoredSubCatMedia(editFormData.value.uniqueId, {
      isHeroBannerEnabled: editFormData.value.isHeroBannerEnabled,
      heroBanners: bannersPayload,
      isVideoEnabled: editFormData.value.isVideoEnabled,
      heroVideos: videosPayload
    })

    showToast('Sub-category updated successfully', 'success')
    isEditModalOpen.value = false

    if (selectedTypeId.value === editFormData.value.serviceTypeId) {
      await fetchCategories(selectedTypeId.value)
    } else {
      selectedTypeId.value = editFormData.value.serviceTypeId
    }
  } catch (e: any) {
    showToast(e?.message || 'Failed to update subcategory', 'error')
  } finally {
    isUpdating.value = false
  }
}

const filtered = () =>
  items.value.filter(i => i.name.toLowerCase().includes(search.value.toLowerCase()))
</script>

<template>
  <div class="space-y-6 bg-white text-[#202124]">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-[#202124]">Sub-Category</h1>
        <p class="text-sm text-[#6B7280] mt-0.5">
          Manage subcategories with unlimited hero banner images and unlimited video options
        </p>
      </div>

      <button
        @click="openAddModal"
        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors cursor-pointer shadow-none"
      >
        <Plus class="w-4 h-4" />
        Add Sub-Category
      </button>
    </div>

    <!-- Filter by type & search -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-[#6B7280]">Category:</label>
        <select
          v-model="selectedTypeId"
          class="text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
        >
          <option v-if="isLoadingTypes" value="">Loading...</option>
          <option v-for="t in types" :key="t.uniqueId" :value="t.uniqueId">{{ t.name }}</option>
        </select>
      </div>

      <input
        v-model="search"
        type="text"
        placeholder="Search subcategories..."
        class="w-64 text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
      />
    </div>

    <div v-if="error" class="px-4 py-3 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm">{{ error }}</div>

    <!-- Subcategories Table -->
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

            <!-- Hero Banners Status & Previews (Unlimited) -->
            <td class="py-3 px-4 text-sm text-center">
              <div class="inline-flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full"
                  :class="item.isHeroBannerEnabled && (item.heroBanners?.length || item.heroBannerUrl)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'"
                >
                  <component :is="item.isHeroBannerEnabled ? CheckCircle2 : XCircle" class="w-3 h-3" />
                  <span>
                    {{ item.isHeroBannerEnabled ? ((item.heroBanners?.length || (item.heroBannerUrl ? 1 : 0)) + ' Banners (ON)') : 'Disabled' }}
                  </span>
                </span>
                
                <!-- Thumbnails preview row -->
                <div v-if="item.heroBanners?.length" class="flex items-center -space-x-1.5 overflow-hidden">
                  <img
                    v-for="(b, bIdx) in item.heroBanners.slice(0, 3)"
                    :key="bIdx"
                    :src="b.url"
                    class="w-6 h-6 rounded-md object-cover border border-white shadow-2xs"
                    :title="b.caption || 'Banner'"
                  />
                  <span
                    v-if="item.heroBanners.length > 3"
                    class="w-5 h-5 rounded-md bg-[#FAF0F2] text-[#800020] text-[9px] font-bold flex items-center justify-center border border-[#F5D8DE]"
                  >
                    +{{ item.heroBanners.length - 3 }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Hero Videos Status (Unlimited) -->
            <td class="py-3 px-4 text-sm text-center">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full"
                :class="item.isVideoEnabled && (item.heroVideos?.length || item.videoUrl)
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'"
              >
                <Film class="w-3 h-3" />
                <span>
                  {{ item.isVideoEnabled ? ((item.heroVideos?.length || (item.videoUrl ? 1 : 0)) + ' Videos (ON)') : 'Disabled' }}
                </span>
              </span>
            </td>

            <!-- Active Toggle -->
            <td class="py-3 px-4 text-sm text-center">
              <div class="flex justify-center">
                <Toggle v-model="item.isActive" />
              </div>
            </td>

            <!-- Action -->
            <td class="py-3 px-4 text-sm text-center">
              <button
                @click="openEditModal(item)"
                title="Edit Sub-Category"
                class="text-[#800020] hover:text-[#6B001B] transition-colors p-1.5 rounded-md hover:bg-[#FAF0F2] inline-flex items-center justify-center cursor-pointer"
              >
                <Pen :size="16" />
              </button>
            </td>
          </tr>
        </template>
      </Table>
    </div>

    <!-- Edit Modal (With Unlimited Banners & Unlimited Videos) -->
    <Popup v-model="isEditModalOpen" title="Edit Sub-Category" size="lg">
      <form @submit.prevent="updateSubCategory" class="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <Select v-model="editFormData.serviceTypeId" label="Parent Category" required :options="typeOptions" />
        
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Sub-Category Name</label>
          <input
            v-model="editFormData.name"
            required
            type="text"
            class="w-full px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>

        <!-- Thumbnail Icon -->
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Sub-Category Icon</label>
          <div v-if="editImagePreview" class="mb-2 flex items-center gap-3">
            <img
              :src="editImagePreview"
              :alt="editFormData.name"
              class="h-12 w-12 object-cover rounded-lg border border-[#E5E7EB]"
            />
            <div>
              <span v-if="editFormData.imageFile" class="text-xs text-emerald-700 font-medium block">
                New icon selected
              </span>
              <span v-else class="text-xs text-[#6B7280] block">
                Current icon
              </span>
              <span class="text-[11px] text-[#6B7280]">Upload below to replace</span>
            </div>
          </div>
          <input
            @change="handleEditFile"
            type="file"
            accept="image/*"
            class="w-full text-sm text-[#6B7280] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] hover:file:bg-[#F5E6E8] cursor-pointer"
          />
        </div>

        <!-- Unlimited Hero Banner Images Section -->
        <div class="p-4 bg-[#FAF0F2]/30 rounded-xl border border-[#E5E7EB] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ImageIcon class="w-4 h-4 text-[#800020]" />
              <div>
                <span class="text-sm font-semibold text-[#202124] block">Hero Banner Images (Unlimited)</span>
                <span class="text-xs text-[#6B7280]">Toggle ON to display wide carousel banners at the top of sub-category screen</span>
              </div>
            </div>
            <Toggle v-model="editFormData.isHeroBannerEnabled" />
          </div>

          <div v-if="editFormData.isHeroBannerEnabled" class="pt-3 border-t border-[#E5E7EB] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#202124]">
                Banner Images List ({{ editFormData.heroBanners.length }})
              </span>
              <button
                type="button"
                @click="addEditHeroBanner"
                class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" /> Add Another Banner
              </button>
            </div>

            <div v-if="!editFormData.heroBanners.length" class="text-xs text-[#6B7280] italic py-2">
              No banner images added yet. Click "+ Add Another Banner" to add your first banner image.
            </div>

            <!-- Banner Items List -->
            <div
              v-for="(banner, bIdx) in editFormData.heroBanners"
              :key="banner.id"
              class="p-3 bg-white rounded-lg border border-[#E5E7EB] space-y-2 shadow-2xs"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#800020]">Banner #{{ bIdx + 1 }}</span>
                <button
                  type="button"
                  @click="removeEditHeroBanner(bIdx)"
                  class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  title="Remove this banner"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Preview if available -->
              <div v-if="banner.preview || banner.url" class="flex items-center gap-3">
                <img
                  :src="banner.preview || banner.url"
                  class="h-14 w-28 object-cover rounded border border-[#E5E7EB]"
                  alt="Banner preview"
                />
                <span class="text-[11px] text-[#6B7280]">Banner Preview</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Image URL</label>
                  <input
                    v-model="banner.url"
                    type="text"
                    placeholder="https://example.com/banner.jpg"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Or Upload File</label>
                  <input
                    @change="handleBannerFile($event, banner)"
                    type="file"
                    accept="image/*"
                    class="w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] border border-[#E5E7EB] rounded bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <input
                  v-model="banner.caption"
                  type="text"
                  placeholder="Optional caption or headline for this banner"
                  class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Unlimited Hero Videos Section -->
        <div class="p-4 bg-[#FAF0F2]/30 rounded-xl border border-[#E5E7EB] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <VideoIcon class="w-4 h-4 text-[#800020]" />
              <div>
                <span class="text-sm font-semibold text-[#202124] block">Hero Videos (Unlimited)</span>
                <span class="text-xs text-[#6B7280]">Toggle ON to display video stream / promo players in customer sub-category</span>
              </div>
            </div>
            <Toggle v-model="editFormData.isVideoEnabled" />
          </div>

          <div v-if="editFormData.isVideoEnabled" class="pt-3 border-t border-[#E5E7EB] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#202124]">
                Videos List ({{ editFormData.heroVideos.length }})
              </span>
              <button
                type="button"
                @click="addEditHeroVideo"
                class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" /> Add Another Video
              </button>
            </div>

            <div v-if="!editFormData.heroVideos.length" class="text-xs text-[#6B7280] italic py-2">
              No videos added yet. Click "+ Add Another Video" to add video links.
            </div>

            <!-- Video Items List -->
            <div
              v-for="(video, vIdx) in editFormData.heroVideos"
              :key="video.id"
              class="p-3 bg-white rounded-lg border border-[#E5E7EB] space-y-2 shadow-2xs"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#800020]">Video #{{ vIdx + 1 }}</span>
                <button
                  type="button"
                  @click="removeEditHeroVideo(vIdx)"
                  class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  title="Remove this video"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Video URL (YouTube / MP4 / CDN)</label>
                  <input
                    v-model="video.url"
                    type="text"
                    placeholder="https://example.com/video.mp4"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Video Title / Caption (Optional)</label>
                  <input
                    v-model="video.title"
                    type="text"
                    placeholder="e.g. Service Demonstration"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <div>
            <label class="text-sm font-medium text-[#202124] block">Is Active</label>
            <span class="text-xs text-[#6B7280]">Enable this sub-category in customer catalog</span>
          </div>
          <Toggle v-model="editFormData.isActive" />
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isEditModalOpen = false"
            class="px-4 py-2 text-sm font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isUpdating"
            class="px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-none"
          >
            {{ isUpdating ? 'Updating...' : 'Update Sub-Category' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- Add Modal (With Unlimited Banners & Unlimited Videos) -->
    <Popup v-model="isAddModalOpen" title="Add Sub-Category" size="lg">
      <form @submit.prevent="addSubCategory" class="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <Select v-model="formData.serviceTypeId" label="Parent Category" required :options="typeOptions" />
        
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Sub-Category Name</label>
          <input
            v-model="formData.name"
            required
            type="text"
            placeholder="e.g. Split AC"
            class="w-full px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>

        <!-- Thumbnail Icon -->
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Icon / Thumbnail (Optional)</label>
          <div v-if="addImagePreview" class="mb-2 flex items-center gap-3">
            <img :src="addImagePreview" class="h-12 w-12 object-cover rounded-lg border border-[#E5E7EB]" />
            <span class="text-xs text-emerald-700 font-medium">Icon selected</span>
          </div>
          <input
            @change="handleFile"
            type="file"
            accept="image/*"
            class="w-full text-sm text-[#6B7280] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] hover:file:bg-[#F5E6E8] cursor-pointer"
          />
        </div>

        <!-- Unlimited Hero Banner Images Section -->
        <div class="p-4 bg-[#FAF0F2]/30 rounded-xl border border-[#E5E7EB] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ImageIcon class="w-4 h-4 text-[#800020]" />
              <div>
                <span class="text-sm font-semibold text-[#202124] block">Hero Banner Images (Unlimited)</span>
                <span class="text-xs text-[#6B7280]">Toggle ON to display wide carousel banners at the top of sub-category screen</span>
              </div>
            </div>
            <Toggle v-model="formData.isHeroBannerEnabled" />
          </div>

          <div v-if="formData.isHeroBannerEnabled" class="pt-3 border-t border-[#E5E7EB] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#202124]">
                Banner Images List ({{ formData.heroBanners.length }})
              </span>
              <button
                type="button"
                @click="addHeroBanner"
                class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" /> Add Another Banner
              </button>
            </div>

            <div v-if="!formData.heroBanners.length" class="text-xs text-[#6B7280] italic py-2">
              No banner images added yet. Click "+ Add Another Banner" to add your first banner image.
            </div>

            <!-- Banner Items List -->
            <div
              v-for="(banner, bIdx) in formData.heroBanners"
              :key="banner.id"
              class="p-3 bg-white rounded-lg border border-[#E5E7EB] space-y-2 shadow-2xs"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#800020]">Banner #{{ bIdx + 1 }}</span>
                <button
                  type="button"
                  @click="removeHeroBanner(bIdx)"
                  class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  title="Remove this banner"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Preview if available -->
              <div v-if="banner.preview || banner.url" class="flex items-center gap-3">
                <img
                  :src="banner.preview || banner.url"
                  class="h-14 w-28 object-cover rounded border border-[#E5E7EB]"
                  alt="Banner preview"
                />
                <span class="text-[11px] text-[#6B7280]">Banner Preview</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Image URL</label>
                  <input
                    v-model="banner.url"
                    type="text"
                    placeholder="https://example.com/banner.jpg"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Or Upload File</label>
                  <input
                    @change="handleBannerFile($event, banner)"
                    type="file"
                    accept="image/*"
                    class="w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] border border-[#E5E7EB] rounded bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <input
                  v-model="banner.caption"
                  type="text"
                  placeholder="Optional caption or headline for this banner"
                  class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Unlimited Hero Videos Section -->
        <div class="p-4 bg-[#FAF0F2]/30 rounded-xl border border-[#E5E7EB] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <VideoIcon class="w-4 h-4 text-[#800020]" />
              <div>
                <span class="text-sm font-semibold text-[#202124] block">Hero Videos (Unlimited)</span>
                <span class="text-xs text-[#6B7280]">Toggle ON to display video stream / promo players in customer sub-category</span>
              </div>
            </div>
            <Toggle v-model="formData.isVideoEnabled" />
          </div>

          <div v-if="formData.isVideoEnabled" class="pt-3 border-t border-[#E5E7EB] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#202124]">
                Videos List ({{ formData.heroVideos.length }})
              </span>
              <button
                type="button"
                @click="addHeroVideo"
                class="text-xs text-[#800020] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" /> Add Another Video
              </button>
            </div>

            <div v-if="!formData.heroVideos.length" class="text-xs text-[#6B7280] italic py-2">
              No videos added yet. Click "+ Add Another Video" to add video links.
            </div>

            <!-- Video Items List -->
            <div
              v-for="(video, vIdx) in formData.heroVideos"
              :key="video.id"
              class="p-3 bg-white rounded-lg border border-[#E5E7EB] space-y-2 shadow-2xs"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#800020]">Video #{{ vIdx + 1 }}</span>
                <button
                  type="button"
                  @click="removeHeroVideo(vIdx)"
                  class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  title="Remove this video"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Video URL (YouTube / MP4 / CDN)</label>
                  <input
                    v-model="video.url"
                    type="text"
                    placeholder="https://example.com/video.mp4"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#6B7280] mb-0.5">Video Title / Caption (Optional)</label>
                  <input
                    v-model="video.title"
                    type="text"
                    placeholder="e.g. Service Demonstration"
                    class="w-full text-xs px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-[#202124]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <div>
            <label class="text-sm font-medium text-[#202124] block">Is Active</label>
            <span class="text-xs text-[#6B7280]">Enable this sub-category in customer catalog</span>
          </div>
          <Toggle v-model="formData.isActive" />
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isAddModalOpen = false"
            class="px-4 py-2 text-sm font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-none"
          >
            {{ isSubmitting ? 'Saving...' : 'Save Sub-Category' }}
          </button>
        </div>
      </form>
    </Popup>
  </div>
</template>
