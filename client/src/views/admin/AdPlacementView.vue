<script setup lang="ts">
import { computed, onUnmounted, ref, type Component } from 'vue'
import {
  Check,
  ClipboardList,
  Grid2X2,
  House,
  Info,
  Megaphone,
  Trash2,
  UploadCloud,
  Wrench,
} from 'lucide-vue-next'

type PlacementId = 'home' | 'service' | 'service-detail' | 'booking-history'

interface AdPlacement {
  id: PlacementId
  title: string
  screen: string
  description: string
  format: string
  previewTitle: string
  previewText: string
  icon: Component
}

const placements: AdPlacement[] = [
  {
    id: 'home',
    title: 'Home screen',
    screen: 'Customer home',
    description: 'Reach customers as they open the marketplace and browse featured content.',
    format: 'Hero banner',
    previewTitle: 'Featured offer',
    previewText: 'A prominent banner near the top of the home feed.',
    icon: House,
  },
  {
    id: 'service',
    title: 'Service screen',
    screen: 'Service discovery',
    description: 'Show promotions while customers explore service categories and listings.',
    format: 'Sponsored service card',
    previewTitle: 'Explore services',
    previewText: 'A sponsored card within the service browsing experience.',
    icon: Grid2X2,
  },
  {
    id: 'service-detail',
    title: 'Specific service screen',
    screen: 'Service details',
    description: 'Place a relevant promotion on an individual service detail page.',
    format: 'Inline promotion',
    previewTitle: 'Related offer',
    previewText: 'A contextual promotion alongside service information.',
    icon: Wrench,
  },
  {
    id: 'booking-history',
    title: 'Booking history screen',
    screen: 'My bookings',
    description: 'Reach customers viewing their past and upcoming bookings.',
    format: 'Booking feed card',
    previewTitle: 'Recommended for you',
    previewText: 'A compact promotion within the booking history feed.',
    icon: ClipboardList,
  },
]

const selectedPlacementIds = ref<PlacementId[]>([])
const selectedCount = computed(() => selectedPlacementIds.value.length)
const allSelected = computed(() => selectedCount.value === placements.length)
const imagePreviewUrl = ref<string | null>(null)
const imageName = ref('')
const imageDimensions = ref<{ width: number; height: number } | null>(null)
const imageError = ref('')

function selectAll() {
  selectedPlacementIds.value = placements.map((placement) => placement.id)
}

function clearSelection() {
  selectedPlacementIds.value = []
}

function previewImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    imageError.value = 'Choose a JPG, PNG, or WebP image.'
    return
  }

  const previewUrl = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    const width = image.naturalWidth
    const height = image.naturalHeight
    const ratio = width / height

    if (!width || !height || Math.abs(ratio - 16 / 9) > 0.08) {
      imageError.value = 'This image does not match the required 16:9 ratio. Choose a 16:9 image such as 1920 × 1080.'
      URL.revokeObjectURL(previewUrl)
      return
    }

    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = previewUrl
    imageName.value = file.name
    imageDimensions.value = { width, height }
    imageError.value = ''
  }

  image.onerror = () => {
    imageError.value = 'The selected image could not be opened. Choose another image.'
    URL.revokeObjectURL(previewUrl)
  }

  image.src = previewUrl
}

function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) previewImage(file)
}

function handleImageDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  if (file) previewImage(file)
}

function removeImage() {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = null
  imageName.value = ''
  imageDimensions.value = null
  imageError.value = ''
}

onUnmounted(() => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
})
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-12">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#800020]">
          <Megaphone class="size-4" />
          Advertising
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-[#202124]">Ad placements</h1>
        <p class="mt-1 max-w-2xl text-sm text-[#6B7280]">
          Choose which customer app screens to include in your advertising plan.
        </p>
      </div>
      <span class="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
        <span class="size-2 rounded-full bg-amber-500" />
        Planning preview
      </span>
    </header>

    <div class="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <Info class="mt-0.5 size-4 shrink-0" />
      <p>
        This is a UI-only preview. Selections and the uploaded image are temporary and do not change live customer ads.
      </p>
    </div>

    <section class="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="font-bold text-[#202124]">Ad image</h2>
          <p class="mt-1 text-xs text-[#6B7280]">Upload the creative to preview it in your selected app placements.</p>
        </div>
        <span class="rounded-full bg-[#FAF0F2] px-3 py-1 text-xs font-semibold text-[#800020]">
          Fixed 16:9 ratio
        </span>
      </div>

      <div class="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <label
          for="ad-placement-image"
          class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-5 text-center transition-colors hover:border-[#800020] hover:bg-[#FAF0F2]/40 focus-within:ring-2 focus-within:ring-[#800020]/30"
          @dragover.prevent
          @drop.prevent="handleImageDrop"
        >
          <input
            id="ad-placement-image"
            class="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="handleImageSelect"
          />
          <UploadCloud class="size-7 text-[#800020]" />
          <span class="mt-2 text-sm font-semibold text-[#202124]">Choose an image or drop it here</span>
          <span class="mt-1 text-xs text-[#6B7280]">JPG, PNG, or WebP · 16:9 · Recommended 1920 × 1080</span>
        </label>

        <div class="min-w-0">
          <div v-if="imagePreviewUrl" class="relative aspect-video overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
            <img :src="imagePreviewUrl" :alt="imageName" class="size-full object-cover" />
            <button
              type="button"
              class="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-white"
              @click="removeImage"
            >
              <Trash2 class="size-3.5" />
              Remove
            </button>
          </div>
          <div v-else class="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-center">
            <div class="px-4">
              <p class="text-sm font-semibold text-[#6B7280]">16:9 creative preview</p>
              <p class="mt-1 text-xs text-[#9CA3AF]">Your valid image will appear here.</p>
            </div>
          </div>
          <p v-if="imageError" class="mt-2 text-xs font-medium text-rose-700" role="alert">
            {{ imageError }}
          </p>
          <p v-else-if="imageDimensions" class="mt-2 truncate text-xs text-emerald-700">
            {{ imageName }} · {{ imageDimensions.width }} × {{ imageDimensions.height }} px · 16:9
          </p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Placement summary">
      <div class="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p class="text-xs font-medium text-[#6B7280]">Available placements</p>
        <p class="mt-1 text-2xl font-bold text-[#202124]">{{ placements.length }}</p>
      </div>
      <div class="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p class="text-xs font-medium text-[#6B7280]">Selected for this plan</p>
        <p class="mt-1 text-2xl font-bold text-[#800020]">{{ selectedCount }}</p>
      </div>
      <div class="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p class="text-xs font-medium text-[#6B7280]">Customer app surfaces</p>
        <p class="mt-1 text-2xl font-bold text-[#202124]">4</p>
      </div>
    </section>

    <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
      <section class="min-w-0 space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-[#202124]">Choose placements</h2>
            <p class="mt-1 text-xs text-[#6B7280]">Select one or more screens to include in the draft plan.</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-xs font-semibold text-[#800020] hover:bg-[#FAF0F2]"
              :disabled="allSelected"
              @click="selectAll"
            >
              Select all
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="selectedCount === 0"
              @click="clearSelection"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label
            v-for="placement in placements"
            :key="placement.id"
            class="block cursor-pointer rounded-xl border bg-white p-4 transition-colors"
            :class="selectedPlacementIds.includes(placement.id)
              ? 'border-[#800020] ring-1 ring-[#800020]/20'
              : 'border-[#E5E7EB] hover:border-[#D1D5DB]'"
          >
            <input
              v-model="selectedPlacementIds"
              class="sr-only"
              type="checkbox"
              :value="placement.id"
            />
            <div class="flex items-start gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF0F2] text-[#800020]">
                <component :is="placement.icon" class="size-5" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="font-semibold text-[#202124]">{{ placement.title }}</h3>
                    <p class="mt-0.5 text-xs text-[#6B7280]">{{ placement.screen }}</p>
                  </div>
                  <span
                    class="flex size-5 shrink-0 items-center justify-center rounded border"
                    :class="selectedPlacementIds.includes(placement.id)
                      ? 'border-[#800020] bg-[#800020] text-white'
                      : 'border-[#D1D5DB] bg-white text-transparent'"
                    aria-hidden="true"
                  >
                    <Check class="size-3.5" />
                  </span>
                </div>
                <p class="mt-3 min-h-10 text-xs leading-relaxed text-[#6B7280]">
                  {{ placement.description }}
                </p>
                <div class="mt-4 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                  <div class="flex items-center justify-between gap-2 px-3 py-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Placement preview</span>
                    <span class="truncate rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                      {{ placement.format }}
                    </span>
                  </div>
                  <div class="relative aspect-video bg-white">
                    <img
                      v-if="imagePreviewUrl"
                      :src="imagePreviewUrl"
                      :alt="`${imageName} preview in ${placement.title}`"
                      class="size-full object-cover"
                    />
                    <div v-else class="flex size-full flex-col justify-center px-3">
                      <p class="text-xs font-semibold text-[#202124]">{{ placement.previewTitle }}</p>
                      <p class="mt-1 text-[11px] leading-relaxed text-[#6B7280]">{{ placement.previewText }}</p>
                    </div>
                    <span class="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                      Ad
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </label>
        </div>
      </section>

      <aside class="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-5 xl:sticky xl:top-20">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-bold text-[#202124]">Draft plan</h2>
            <p class="mt-1 text-xs text-[#6B7280]">{{ selectedCount }} of {{ placements.length }} placements selected</p>
          </div>
          <span class="flex size-9 items-center justify-center rounded-lg bg-[#FAF0F2] text-[#800020]">
            <Megaphone class="size-4" />
          </span>
        </div>

        <div v-if="selectedCount" class="mt-5 space-y-3">
          <div
            v-for="placement in placements.filter((item) => selectedPlacementIds.includes(item.id))"
            :key="placement.id"
            class="flex items-center gap-3 rounded-lg bg-[#F9FAFB] p-3"
          >
            <component :is="placement.icon" class="size-4 shrink-0 text-[#800020]" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-[#202124]">{{ placement.title }}</p>
              <p class="text-xs text-[#6B7280]">{{ placement.format }}</p>
            </div>
          </div>
        </div>
        <div v-else class="mt-5 rounded-lg border border-dashed border-[#D1D5DB] p-4 text-center">
          <p class="text-sm font-medium text-[#202124]">No placements selected</p>
          <p class="mt-1 text-xs leading-relaxed text-[#6B7280]">
            Select a screen to see it included in your draft plan.
          </p>
        </div>

        <div class="mt-5 border-t border-[#E5E7EB] pt-4">
          <p class="text-xs leading-relaxed text-[#6B7280]">
            {{ imagePreviewUrl ? 'The 16:9 image is previewed in the selected placements.' : 'Upload a 16:9 image to preview the ad creative in the selected placements.' }}
          </p>
          <p class="mt-2 text-[11px] text-[#9CA3AF]">Nothing is saved or published from this preview.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
