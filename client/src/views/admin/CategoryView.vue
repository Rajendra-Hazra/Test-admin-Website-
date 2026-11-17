<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import type { ServiceType } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Toggle from '@/components/common/Toggle.vue'
import Popup from '@/components/common/Popup.vue'
import { Pen, Plus } from 'lucide-vue-next'

const items = ref<ServiceType[]>([])
const isLoading = ref(false)
const error = ref('')
const search = ref('')

const isAddModalOpen = ref(false)
const isSubmitting = ref(false)
const formData = ref({
  name: '',
  isActive: true,
  imageFile: null as File | null
})

const baseHeaders: Header[] = [
  { key: 'image', title: 'Image', align: 'center', sortable: false, width: '80px' },
  { key: 'name', title: 'Name', align: 'center', sortable: true },
  { key: 'isActive', title: 'Is Active', align: 'center', sortable: true }, 
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

async function fetchData() {
  isLoading.value = true
  error.value = ''
  try {
    const resp = await api.services.getAllTypes()
    const raw = (resp as any)?.data ?? resp
    items.value = Array.isArray(raw) ? raw : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load categories'
  } finally {
    isLoading.value = false
  }
}

function handleFile(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    formData.value.imageFile = target.files[0] || null
  }
}

async function addCategory() {
  isSubmitting.value = true
  try {
    const data = new FormData()
    data.append('name', formData.value.name)
    data.append('isActive', String(formData.value.isActive))
    if (formData.value.imageFile) {
      data.append('imageFile', formData.value.imageFile)
    }
    
    await api.services.addType(data)
    isAddModalOpen.value = false
    formData.value = { name: '', isActive: true, imageFile: null }
    await fetchData()
  } catch (e: any) {
    alert(e?.message || 'Failed to add category')
  } finally {
    isSubmitting.value = false
  }
}

// Edit Category State & Methods
const isEditModalOpen = ref(false)
const editFormData = ref({
  uniqueId: '',
  name: '',
  isActive: true,
  image: '',
  imageFile: null as File | null,
})
const editImagePreview = ref<string>('')

function openEditModal(item: any) {
  editFormData.value = {
    uniqueId: item.uniqueId,
    name: item.name,
    isActive: Boolean(item.isActive),
    image: item.image || '',
    imageFile: null,
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

async function updateCategory() {
  if (!editFormData.value.uniqueId) return
  isSubmitting.value = true
  try {
    const data = new FormData()
    data.append('uniqueId', editFormData.value.uniqueId)
    data.append('name', editFormData.value.name)
    data.append('isActive', String(editFormData.value.isActive))
    if (editFormData.value.imageFile) {
      data.append('imageFile', editFormData.value.imageFile)
    }

    await api.services.updateType(data)
    isEditModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    alert(e?.message || 'Failed to update category')
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActive(item: any) {
  try {
    const data = new FormData()
    data.append('uniqueId', item.uniqueId)
    data.append('name', item.name)
    data.append('isActive', String(item.isActive))
    await api.services.updateType(data)
  } catch (e: any) {
    item.isActive = !item.isActive
    alert(e?.message || 'Failed to update category status')
  }
}

const filtered = () =>
  items.value.filter(i => i.name.toLowerCase().includes(search.value.toLowerCase()))

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6 bg-white text-[#202124]">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-[#202124]">Category</h1>
        <p class="text-sm text-[#6B7280] mt-0.5">Manage top-level service categories</p>
      </div>

      <button
        @click="isAddModalOpen = true"
        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors cursor-pointer shadow-none"
      >
        <Plus class="w-4 h-4" />
        Add Category
      </button>
    </div>

    <div class="flex items-center justify-between">
      <input
        v-model="search"
        type="text"
        placeholder="Search categories..."
        class="w-64 text-sm px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
      />
    </div>

    <!-- Error -->
    <div v-if="error" class="px-4 py-3 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm">{{ error }}</div>

    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <Table :headers="baseHeaders" :items="filtered()">
        <template #row="{ item }">
          <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 font-medium border-b border-[#E5E7EB] last:border-0 bg-white">
            <td class="py-3 px-4 text-sm text-[#202124] text-center">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="h-10 w-10 object-cover rounded-md mx-auto border border-[#E5E7EB]">
              <div v-else class="h-10 w-10 bg-[#F7F7F8] rounded-md mx-auto flex items-center justify-center text-[#6B7280] text-xs border border-[#E5E7EB]">N/A</div>
            </td>
            <td class="py-3 px-4 text-sm text-[#202124] text-center font-semibold">{{ item.name }}</td>
            <td class="py-3 px-4 text-sm text-center">
              <div class="flex justify-center">
                <Toggle v-model="item.isActive" @update:modelValue="toggleActive(item)" />
              </div>
            </td>
            <td class="py-3 px-4 text-sm text-center">
              <button
                @click="openEditModal(item)"
                title="Edit Category"
                class="text-[#800020] hover:text-[#6B001B] transition-colors p-1.5 rounded-md hover:bg-[#FAF0F2] inline-flex items-center justify-center cursor-pointer"
              >
                <Pen :size="16" />
              </button>
            </td>
          </tr>
        </template>
      </Table>
    </div>

    <!-- Add Modal -->
    <Popup v-model="isAddModalOpen" title="Add Category">
      <form @submit.prevent="addCategory" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Name</label>
          <input
            v-model="formData.name"
            required
            type="text"
            class="w-full px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Image (Optional)</label>
          <input
            @change="handleFile"
            type="file"
            accept="image/*"
            class="w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] hover:file:bg-[#F5E6E8] cursor-pointer"
          />
        </div>
        <div class="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <div>
            <label for="catActive" class="text-sm font-medium text-[#202124] block">Is Active</label>
            <span class="text-xs text-[#6B7280]">Enable this category in customer catalog</span>
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
            {{ isSubmitting ? 'Saving...' : 'Save Category' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- Edit Modal -->
    <Popup v-model="isEditModalOpen" title="Edit Category">
      <form @submit.prevent="updateCategory" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Name</label>
          <input
            v-model="editFormData.name"
            required
            type="text"
            class="w-full px-3 py-2 border border-[#E5E7EB] bg-white text-[#202124] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-[#202124] mb-1">Image Preview</label>
          <div v-if="editImagePreview" class="mb-2 flex items-center gap-3">
            <img :src="editImagePreview" :alt="editFormData.name" class="h-14 w-14 object-cover rounded-lg border border-[#E5E7EB]" />
            <div>
              <span v-if="editFormData.imageFile" class="text-xs text-emerald-700 font-medium block">
                New image selected
              </span>
              <span v-else class="text-xs text-[#6B7280] block">
                Current image
              </span>
              <span class="text-[11px] text-[#6B7280]">Upload below to replace</span>
            </div>
          </div>
          <div v-else class="mb-2 text-xs text-[#6B7280]">No image currently set</div>
          <label class="block text-xs font-medium text-[#6B7280] mb-1">
            {{ editImagePreview ? 'Replace Image (Optional)' : 'Upload Image (Optional)' }}
          </label>
          <input
            @change="handleEditFile"
            type="file"
            accept="image/*"
            class="w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FAF0F2] file:text-[#800020] hover:file:bg-[#F5E6E8] cursor-pointer"
          />
        </div>
        <div class="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <div>
            <label for="editCatActive" class="text-sm font-medium text-[#202124] block">Is Active</label>
            <span class="text-xs text-[#6B7280]">Enable this category in customer catalog</span>
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
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-none"
          >
            {{ isSubmitting ? 'Updating...' : 'Update Category' }}
          </button>
        </div>
      </form>
    </Popup>
  </div>
</template>
