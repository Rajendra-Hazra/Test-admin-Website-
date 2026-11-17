<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { PartnerTrainingVideo, ServiceCategory } from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  Play,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  Check,
  GraduationCap,
  Flame,
  CheckCheck,
  Video,
} from 'lucide-vue-next'

// ── AUTH & STATE ─────────────────────────────────────────────────────────────
const authStore = useAuthStore()
const partnerId = computed(() => authStore.userId || 'partner-current')

const isLoading = ref(false)
const isUpdatingProgress = ref(false)
const videos = ref<PartnerTrainingVideo[]>([])
const categories = ref<ServiceCategory[]>([])

// ── FILTERS ──────────────────────────────────────────────────────────────────
type CurriculumFilter = 'ALL' | 'MANDATORY' | 'GENERAL' | 'SERVICE_CATEGORY' | 'SAFETY_QUALITY'
const selectedCurriculum = ref<CurriculumFilter>('ALL')
const selectedCategoryId = ref<string>('ALL')
const selectedStatus = ref<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')
const searchQuery = ref('')

// ── PLAYER MODAL ─────────────────────────────────────────────────────────────
const isPlayerOpen = ref(false)
const activeVideo = ref<PartnerTrainingVideo | null>(null)

// ── DATA FETCHING ────────────────────────────────────────────────────────────
async function loadTrainingData() {
  isLoading.value = true
  try {
    const [vidRes, catRes] = await Promise.all([
      api.partnerTraining.getPartnerVideos({ partnerId: partnerId.value }),
      api.catalogCustomer.getCategories(),
    ])

    const rawVideos = (vidRes as any)?.data ?? vidRes
    videos.value = Array.isArray(rawVideos) ? rawVideos : []

    const rawCats = (catRes as any)?.data ?? catRes
    categories.value = Array.isArray(rawCats) ? rawCats : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to load training academy curriculum', 'error')
  } finally {
    isLoading.value = false
  }
}

// ── COMPUTED METRICS ─────────────────────────────────────────────────────────
const totalVideosCount = computed(() => videos.value.length)
const completedVideosCount = computed(() => videos.value.filter((v) => v.isCompleted).length)
const mandatoryVideos = computed(() => videos.value.filter((v) => v.isMandatory))
const mandatoryTotalCount = computed(() => mandatoryVideos.value.length)
const mandatoryCompletedCount = computed(() => mandatoryVideos.value.filter((v) => v.isCompleted).length)
const mandatoryPendingCount = computed(() => Math.max(0, mandatoryTotalCount.value - mandatoryCompletedCount.value))

const completionPercentage = computed(() => {
  if (totalVideosCount.value === 0) return 0
  return Math.round((completedVideosCount.value / totalVideosCount.value) * 100)
})

const totalWatchTimeDisplay = computed(() => {
  const totalSecs = videos.value.reduce((acc, v) => acc + (v.durationSeconds || 0), 0)
  const mins = Math.floor(totalSecs / 60)
  if (mins >= 60) {
    const hrs = (mins / 60).toFixed(1)
    return `${hrs} hrs`
  }
  return `${mins} mins`
})

// ── FILTERED VIDEOS ──────────────────────────────────────────────────────────
const filteredVideos = computed(() => {
  return videos.value.filter((v) => {
    // Curriculum tab
    if (selectedCurriculum.value === 'MANDATORY' && !v.isMandatory) return false
    if (selectedCurriculum.value === 'GENERAL' && v.trainingType !== 'GENERAL') return false
    if (selectedCurriculum.value === 'SERVICE_CATEGORY' && v.trainingType !== 'SERVICE_CATEGORY') return false
    if (selectedCurriculum.value === 'SAFETY_QUALITY' && v.trainingType !== 'SAFETY_QUALITY') return false

    // Category filter
    if (selectedCategoryId.value !== 'ALL' && v.serviceCategoryId !== selectedCategoryId.value) return false

    // Completion Status
    if (selectedStatus.value === 'COMPLETED' && !v.isCompleted) return false
    if (selectedStatus.value === 'PENDING' && v.isCompleted) return false

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchTitle = v.title?.toLowerCase().includes(q)
      const matchDesc = v.description?.toLowerCase().includes(q)
      const matchCat = v.serviceCategoryName?.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc && !matchCat) return false
    }

    return true
  })
})

// ── ACTIONS ──────────────────────────────────────────────────────────────────
function openPlayer(video: PartnerTrainingVideo) {
  activeVideo.value = video
  isPlayerOpen.value = true
}

function closePlayer() {
  isPlayerOpen.value = false
  activeVideo.value = null
}

async function toggleProgress(video: PartnerTrainingVideo, targetStatus?: boolean) {
  const newStatus = targetStatus !== undefined ? targetStatus : !video.isCompleted
  isUpdatingProgress.value = true
  try {
    await api.partnerTraining.updateProgress(
      video.id,
      {
        isCompleted: newStatus,
        watchTimeSeconds: video.durationSeconds || 300,
      },
      partnerId.value
    )

    // Update in-place
    video.isCompleted = newStatus
    if (newStatus) {
      video.completedAt = new Date().toISOString()
      showToast(`Completed module: "${video.title}"`, 'success')
    } else {
      video.completedAt = undefined
      showToast(`Marked as pending: "${video.title}"`, 'info')
    }

    if (activeVideo.value && activeVideo.value.id === video.id) {
      activeVideo.value.isCompleted = newStatus
      activeVideo.value.completedAt = video.completedAt
    }
  } catch (err: any) {
    showToast(err?.message || 'Failed to update module progress', 'error')
  } finally {
    isUpdatingProgress.value = false
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '5:00 min'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s} min`
}

function getCurriculumBadgeClass(type: string): string {
  switch (type) {
    case 'GENERAL':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'SAFETY_QUALITY':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'SERVICE_CATEGORY':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getCurriculumLabel(type: string): string {
  switch (type) {
    case 'GENERAL':
      return 'General Onboarding'
    case 'SAFETY_QUALITY':
      return 'Safety & Quality SOP'
    case 'SERVICE_CATEGORY':
      return 'Trade Skill Training'
    default:
      return type
  }
}

onMounted(() => {
  loadTrainingData()
})
</script>

<template>
  <div class="min-h-screen bg-white text-[#202124] p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- Top Header -->
    <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
          <GraduationCap class="size-3.5" />
          <span>OmiBay Partner Academy</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight">
          Training & Learning Center
        </h1>
        <p class="text-sm sm:text-base text-[#6B7280] max-w-2xl leading-relaxed">
          Complete mandatory SOPs and trade skill modules to verify your profile, maintain an active verified badge, and unlock higher-tier customer bookings.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="loadTrainingData"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm font-medium text-[#202124] hover:bg-[#F7F7F8] active:bg-[#F0F0F1] transition shadow-xs disabled:opacity-60"
        >
          <RefreshCw class="size-4 text-[#6B7280]" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Mandatory Alert Banner if Pending -->
    <div
      v-if="mandatoryPendingCount > 0"
      class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 text-amber-900"
    >
      <div class="size-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
        <AlertTriangle class="size-5" />
      </div>
      <div class="flex-1">
        <h4 class="text-sm font-bold text-amber-900">
          Action Required: {{ mandatoryPendingCount }} Mandatory Training {{ mandatoryPendingCount === 1 ? 'Module' : 'Modules' }} Incomplete
        </h4>
        <p class="text-xs sm:text-sm text-amber-800 mt-0.5">
          Please finish watching all mandatory safety SOPs to prevent service dispatch pauses or job allocation restrictions.
        </p>
      </div>
      <button
        type="button"
        @click="selectedCurriculum = 'MANDATORY'"
        class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition"
      >
        View Pending
      </button>
    </div>

    <!-- Metrics Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Completed Modules -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Curriculum Progress</span>
          <div class="size-8 rounded-xl bg-[#800020]/10 flex items-center justify-center text-[#800020]">
            <Award class="size-4" />
          </div>
        </div>
        <div>
          <div class="text-2xl font-black text-[#202124]">
            {{ completedVideosCount }} <span class="text-sm font-normal text-[#6B7280]">/ {{ totalVideosCount }} Completed</span>
          </div>
          <div class="w-full bg-[#E5E7EB] h-2 rounded-full mt-3 overflow-hidden">
            <div
              class="bg-[#800020] h-full rounded-full transition-all duration-500"
              :style="{ width: `${completionPercentage}%` }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-xs text-[#6B7280] mt-1.5">
            <span>{{ completionPercentage }}% Mastered</span>
            <span>{{ totalVideosCount - completedVideosCount }} remaining</span>
          </div>
        </div>
      </div>

      <!-- 2. Mandatory SOPs -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Mandatory SOPs</span>
          <div class="size-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
            <ShieldCheck class="size-4" />
          </div>
        </div>
        <div>
          <div class="text-2xl font-black text-[#202124]">
            {{ mandatoryCompletedCount }} <span class="text-sm font-normal text-[#6B7280]">/ {{ mandatoryTotalCount }} Verified</span>
          </div>
          <p class="text-xs font-medium mt-3" :class="mandatoryPendingCount === 0 ? 'text-emerald-700' : 'text-amber-700'">
            {{ mandatoryPendingCount === 0 ? '✓ All mandatory requirements met' : `⚠ ${mandatoryPendingCount} pending completion` }}
          </p>
        </div>
      </div>

      <!-- 3. Total Learning Watch Time -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Total Learning Time</span>
          <div class="size-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
            <Clock class="size-4" />
          </div>
        </div>
        <div>
          <div class="text-2xl font-black text-[#202124]">
            {{ totalWatchTimeDisplay }}
          </div>
          <p class="text-xs text-[#6B7280] mt-3 flex items-center gap-1">
            <BookOpen class="size-3.5 text-blue-600" />
            <span>High-definition video lectures</span>
          </p>
        </div>
      </div>

      <!-- 4. Academy Status -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Certification Status</span>
          <div class="size-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckCircle2 class="size-4" />
          </div>
        </div>
        <div>
          <div class="text-xl font-black" :class="mandatoryPendingCount === 0 ? 'text-emerald-700' : 'text-amber-700'">
            {{ mandatoryPendingCount === 0 ? 'Active & Certified' : 'Onboarding Pending' }}
          </div>
          <p class="text-xs text-[#6B7280] mt-3 flex items-center gap-1">
            <Flame class="size-3.5 text-[#800020]" />
            <span>Top rated partner badge active</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <!-- Curriculum Tabs -->
      <div class="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-3">
        <button
          type="button"
          @click="selectedCurriculum = 'ALL'"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="selectedCurriculum === 'ALL' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          All Modules ({{ totalVideosCount }})
        </button>

        <button
          type="button"
          @click="selectedCurriculum = 'MANDATORY'"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5"
          :class="selectedCurriculum === 'MANDATORY' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <span>Mandatory Only</span>
          <span
            v-if="mandatoryPendingCount > 0"
            class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            :class="selectedCurriculum === 'MANDATORY' ? 'bg-white text-[#800020]' : 'bg-amber-100 text-amber-800'"
          >
            {{ mandatoryPendingCount }} pending
          </span>
        </button>

        <button
          type="button"
          @click="selectedCurriculum = 'GENERAL'"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="selectedCurriculum === 'GENERAL' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          General Onboarding
        </button>

        <button
          type="button"
          @click="selectedCurriculum = 'SERVICE_CATEGORY'"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="selectedCurriculum === 'SERVICE_CATEGORY' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          Trade Skill Training
        </button>

        <button
          type="button"
          @click="selectedCurriculum = 'SAFETY_QUALITY'"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="selectedCurriculum === 'SAFETY_QUALITY' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          Safety & SOPs
        </button>
      </div>

      <!-- Search & Granular Dropdowns -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Query -->
        <div class="relative lg:col-span-2">
          <Search class="size-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by topic, equipment, or SOP title..."
            class="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#202124] placeholder-[#6B7280] focus:outline-hidden focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition"
          />
        </div>

        <!-- Service Category Dropdown -->
        <div>
          <select
            v-model="selectedCategoryId"
            class="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020] transition"
          >
            <option value="ALL">All Service Categories</option>
            <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Completion Status Dropdown -->
        <div>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020] transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!isLoading && filteredVideos.length === 0"
      class="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center space-y-4"
    >
      <div class="size-16 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center mx-auto">
        <Video class="size-8" />
      </div>
      <div class="max-w-md mx-auto space-y-1">
        <h3 class="text-base font-bold text-[#202124]">No Training Modules Found</h3>
        <p class="text-sm text-[#6B7280]">
          No matching training videos were found for your current filter criteria. Try adjusting your search or category selection.
        </p>
      </div>
      <button
        type="button"
        @click="
          selectedCurriculum = 'ALL';
          selectedCategoryId = 'ALL';
          selectedStatus = 'ALL';
          searchQuery = '';
        "
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#66001a] transition"
      >
        Reset Filters
      </button>
    </div>

    <!-- Video Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="video in filteredVideos"
        :key="video.id"
        class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
      >
        <!-- Thumbnail & Play Overlay -->
        <div class="relative aspect-video bg-[#202124] overflow-hidden cursor-pointer" @click="openPlayer(video)">
          <img
            :src="video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`"
            :alt="video.title"
            class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />

          <!-- Play button overlay -->
          <div class="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition">
            <div class="size-12 sm:size-14 rounded-full bg-[#800020]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-[#800020] transition duration-200">
              <Play class="size-6 fill-white ml-1" />
            </div>
          </div>

          <!-- Duration Pill -->
          <div class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[11px] font-semibold tracking-wide backdrop-blur-xs flex items-center gap-1">
            <Clock class="size-3" />
            <span>{{ formatDuration(video.durationSeconds) }}</span>
          </div>

          <!-- Mandatory Tag -->
          <div
            v-if="video.isMandatory"
            class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-bold tracking-wide shadow-xs uppercase"
          >
            Mandatory
          </div>

          <!-- Completion status pill -->
          <div
            v-if="video.isCompleted"
            class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
          >
            <CheckCheck class="size-3" />
            <span>Completed</span>
          </div>
        </div>

        <!-- Video Details -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2.5">
            <!-- Curriculum Badge & Category -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                :class="getCurriculumBadgeClass(video.trainingType)"
              >
                {{ getCurriculumLabel(video.trainingType) }}
              </span>
              <span
                v-if="video.serviceCategoryName"
                class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700"
              >
                {{ video.serviceCategoryName }}
              </span>
            </div>

            <!-- Title -->
            <h3
              @click="openPlayer(video)"
              class="text-base font-bold text-[#202124] line-clamp-2 hover:text-[#800020] cursor-pointer transition"
            >
              {{ video.title }}
            </h3>

            <!-- Description -->
            <p v-if="video.description" class="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
              {{ video.description }}
            </p>
          </div>

          <!-- Bottom Action Row -->
          <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
            <button
              type="button"
              @click="openPlayer(video)"
              class="inline-flex items-center gap-1.5 text-xs font-bold text-[#800020] hover:text-[#66001a] transition"
            >
              <span>{{ video.isCompleted ? 'Review Module' : 'Start Watching' }}</span>
              <Play class="size-3 fill-current" />
            </button>

            <!-- Complete Toggle -->
            <button
              type="button"
              @click.stop="toggleProgress(video)"
              :disabled="isUpdatingProgress"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              :class="
                video.isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8]'
              "
            >
              <Check class="size-3.5" :class="video.isCompleted ? 'text-emerald-700' : 'text-[#6B7280]'" />
              <span>{{ video.isCompleted ? 'Completed' : 'Mark Done' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive YouTube Player Modal -->
    <Popup
      v-model="isPlayerOpen"
      :title="activeVideo?.title || 'Partner Video Training'"
      size="xl"
    >
      <div v-if="activeVideo" class="space-y-5">
        <!-- Responsive YouTube Iframe (Strict White Theme Container) -->
        <div class="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-[#E5E7EB]">
          <iframe
            :src="`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`"
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>

        <!-- Video Info & Meta -->
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                :class="getCurriculumBadgeClass(activeVideo.trainingType)"
              >
                {{ getCurriculumLabel(activeVideo.trainingType) }}
              </span>
              <span
                v-if="activeVideo.serviceCategoryName"
                class="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700"
              >
                Category: {{ activeVideo.serviceCategoryName }}
              </span>
              <span
                v-if="activeVideo.isMandatory"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-200"
              >
                Mandatory Certification
              </span>
            </div>

            <!-- YouTube External Link -->
            <a
              :href="activeVideo.youtubeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#800020] transition"
            >
              <span>Watch on YouTube</span>
              <ExternalLink class="size-3.5" />
            </a>
          </div>

          <h2 class="text-xl font-extrabold text-[#202124]">
            {{ activeVideo.title }}
          </h2>

          <p v-if="activeVideo.description" class="text-sm text-[#6B7280] leading-relaxed whitespace-pre-line bg-[#F7F7F8] p-4 rounded-xl border border-[#E5E7EB]">
            {{ activeVideo.description }}
          </p>
        </div>

        <!-- Completion Status Footer -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-xl flex items-center justify-center shrink-0"
              :class="activeVideo.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-[#6B7280]'"
            >
              <CheckCircle2 class="size-5" />
            </div>
            <div>
              <div class="text-sm font-bold text-[#202124]">
                {{ activeVideo.isCompleted ? 'Module Completed' : 'Pending Completion' }}
              </div>
              <div class="text-xs text-[#6B7280]">
                {{
                  activeVideo.isCompleted && activeVideo.completedAt
                    ? `Verified completed on ${new Date(activeVideo.completedAt).toLocaleDateString()}`
                    : 'Watch this lecture to completion and confirm below.'
                }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              @click="toggleProgress(activeVideo, !activeVideo.isCompleted)"
              :disabled="isUpdatingProgress"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs disabled:opacity-60"
              :class="
                activeVideo.isCompleted
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-[#800020] text-white hover:bg-[#66001a]'
              "
            >
              <Check class="size-4" />
              <span>{{ activeVideo.isCompleted ? 'Completed ✓ (Click to Undo)' : 'Mark Module as Completed' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Popup>
  </div>
</template>

