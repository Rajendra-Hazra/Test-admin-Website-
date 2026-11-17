<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from '@/utils/toast'
import {
  Percent,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
} from 'lucide-vue-next'

interface OfferImageItem {
  id: string
  dataUrl: string
  name: string
  width: number
  height: number
  createdAt: string
}

const STORAGE_KEY = 'admin_offer_discount_images_v1'

const images = ref<OfferImageItem[]>([])
const imageError = ref('')
const isDragging = ref(false)

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        images.value = parsed
      }
    }
  } catch {
    images.value = []
  }
})

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images.value))
  } catch {
    showToast('Storage limit reached. Remove an existing image before adding more.', 'error')
  }
}

function processFile(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    imageError.value = 'Choose a JPG, PNG, or WebP image.'
    showToast(imageError.value, 'error')
    return
  }

  const objectUrl = URL.createObjectURL(file)
  const img = new Image()

  img.onload = () => {
    const width = img.naturalWidth
    const height = img.naturalHeight
    const ratio = width / height

    if (!width || !height || Math.abs(ratio - 16 / 9) > 0.08) {
      imageError.value = `Invalid aspect ratio (${width} × ${height}px). Please upload a 16:9 ratio image (e.g. 1920 × 1080 or 1280 × 720).`
      showToast('Only 16:9 ratio images are allowed', 'error')
      URL.revokeObjectURL(objectUrl)
      return
    }

    // Render to canvas for clean storage
    const canvas = document.createElement('canvas')
    const maxW = 1920
    const maxH = 1080
    let targetW = width
    let targetH = height
    if (targetW > maxW || targetH > maxH) {
      targetW = maxW
      targetH = maxH
    }
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(objectUrl)
      return
    }
    ctx.drawImage(img, 0, 0, targetW, targetH)
    const dataUrl = canvas.toDataURL('image/webp', 0.88)
    URL.revokeObjectURL(objectUrl)

    const newItem: OfferImageItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl,
      name: file.name,
      width,
      height,
      createdAt: new Date().toISOString(),
    }

    images.value.unshift(newItem)
    imageError.value = ''
    saveToStorage()
    showToast('16:9 offer image added', 'success')
  }

  img.onerror = () => {
    imageError.value = 'The selected image could not be opened. Choose another image.'
    URL.revokeObjectURL(objectUrl)
  }

  img.src = objectUrl
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    Array.from(files).forEach((file) => processFile(file))
  }
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    Array.from(files).forEach((file) => processFile(file))
  }
}

function removeImage(id: string) {
  images.value = images.value.filter((item) => item.id !== id)
  saveToStorage()
  showToast('Image removed', 'info')
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-12">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#800020]">
          <Percent class="size-4" />
          Offer &amp; Discount
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-[#202124]">Offer &amp; Discount</h1>
      </div>
      <span class="inline-flex w-fit items-center rounded-full bg-[#FAF0F2] px-3 py-1 text-xs font-semibold text-[#800020]">
        16:9 Ratio Only
      </span>
    </header>

    <!-- 16:9 Image Upload Box -->
    <section class="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <label
        for="offer-discount-image-input"
        class="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors"
        :class="
          isDragging
            ? 'border-[#800020] bg-[#FAF0F2]/60'
            : 'border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#800020] hover:bg-[#FAF0F2]/40'
        "
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input
          id="offer-discount-image-input"
          class="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="handleFileSelect"
        />
        <UploadCloud class="size-8 text-[#800020]" />
        <span class="mt-2.5 text-sm font-semibold text-[#202124]">
          Click to upload or drag &amp; drop 16:9 image
        </span>
        <span class="mt-1 text-xs text-[#6B7280]">
          JPG, PNG, or WebP · Strict 16:9 aspect ratio (e.g. 1920 × 1080)
        </span>
      </label>

      <p v-if="imageError" class="mt-3 text-xs font-medium text-rose-700" role="alert">
        {{ imageError }}
      </p>
    </section>

    <!-- Uploaded 16:9 Images Grid -->
    <section v-if="images.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="item in images"
        :key="item.id"
        class="group relative aspect-video overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]"
      >
        <img
          :src="item.dataUrl"
          :alt="item.name"
          class="size-full object-cover"
        />
        <button
          type="button"
          class="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition-opacity hover:bg-white cursor-pointer"
          @click="removeImage(item.id)"
        >
          <Trash2 class="size-3.5" />
          Remove
        </button>
        <div class="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
          {{ item.width }} × {{ item.height }} · 16:9
        </div>
      </div>
    </section>

    <div
      v-else
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-white py-12 text-center"
    >
      <ImageIcon class="size-8 text-[#9CA3AF]" />
      <p class="mt-2 text-sm font-medium text-[#6B7280]">No 16:9 images added yet</p>
    </div>
  </div>
</template>
