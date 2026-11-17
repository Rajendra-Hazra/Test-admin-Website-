<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { UserProfile, PartnerMedia } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Select from '@/components/common/Select.vue'
import {
  Users,
  Search,
  Briefcase,
  Compass,
  Building2,
  Mail,
  Phone,
  Copy,
  Check,
  User as UserIcon,
  FileText,
  Video,
  X,
  ShieldCheck,
} from 'lucide-vue-next'

const users = ref<UserProfile[]>([])
const isLoading = ref(false)
const search = ref('')
const selectedRole = ref<string>('ALL')
const selectedStatus = ref<string>('ALL')

const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const copiedId = ref<string | null>(null)

// Detail modal
const selectedUser = ref<UserProfile | null>(null)
const isDetailModalOpen = ref(false)
const isUpdatingStatus = ref(false)

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  notification.value = { type, message }
  setTimeout(() => {
    if (notification.value?.message === message) {
      notification.value = null
    }
  }, 4000)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  copiedId.value = text
  setTimeout(() => {
    if (copiedId.value === text) copiedId.value = null
  }, 2000)
}

const headers: Header[] = [
  { key: 'user', title: 'User Profile', align: 'left', sortable: true },
  { key: 'contact', title: 'Contact Information', align: 'left', sortable: false },
  { key: 'role', title: 'Role', align: 'center', sortable: true },
  { key: 'status', title: 'Status', align: 'center', sortable: true },
  { key: 'referral', title: 'Referral Code', align: 'center', sortable: false },
  { key: 'joined', title: 'Joined On', align: 'center', sortable: true },
  { key: 'action', title: 'Actions', align: 'center', sortable: false },
]

async function fetchUsers() {
  isLoading.value = true
  try {
    const res = await api.adminUsers.getAll(selectedRole.value !== 'ALL' ? selectedRole.value : undefined)
    const raw = (res as any)?.data ?? res
    users.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    showNotification(err?.message || 'Failed to fetch users', 'error')
  } finally {
    isLoading.value = false
  }
}

// Role counts
const counts = computed(() => {
  const all = users.value.length
  let customer = 0
  let partner = 0
  let gm = 0
  let admin = 0
  let org = 0

  for (const u of users.value) {
    const r = (u.role || '').toUpperCase()
    if (r === 'CUSTOMER') customer++
    else if (r === 'PARTNER') partner++
    else if (r === 'GROUND_MANAGER') gm++
    else if (r === 'ADMIN') admin++
    else if (r === 'ORGANIZATION') org++
  }

  return { all, customer, partner, gm, admin, org }
})

// Filtered users list
const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    // Role filter
    if (selectedRole.value !== 'ALL') {
      if ((u.role || '').toUpperCase() !== selectedRole.value) return false
    }

    // Status filter
    if (selectedStatus.value !== 'ALL') {
      if ((u.status || '').toUpperCase() !== selectedStatus.value) return false
    }

    // Search query
    const q = search.value.trim().toLowerCase()
    if (q) {
      const matchName = (u.name || '').toLowerCase().includes(q)
      const matchEmail = (u.email || '').toLowerCase().includes(q)
      const matchPhone = (u.phone || '').toLowerCase().includes(q)
      const matchId = (u.uniqueId || '').toLowerCase().includes(q) || (u.displayId || '').toLowerCase().includes(q)
      const matchRef = (u.referralCode || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchPhone && !matchId && !matchRef) return false
    }

    return true
  })
})

const statusOptions = [
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'INACTIVE', value: 'INACTIVE' },
  { label: 'SUSPENDED', value: 'SUSPENDED' },
  { label: 'PENDING VERIFICATION', value: 'PENDING_VERIFICATION' },
]

async function changeStatus(u: any, newStatus: string) {
  const userId = u.uniqueId
  if (!userId) return
  isUpdatingStatus.value = true
  try {
    await api.adminUsers.updateStatus(userId, newStatus)
    u.status = newStatus
    if (selectedUser.value && selectedUser.value.uniqueId === userId) {
      selectedUser.value.status = newStatus
    }
    showNotification(`Status of ${u.name || 'user'} updated to ${newStatus}`)
  } catch (err: any) {
    showNotification(err?.message || 'Failed to update user status', 'error')
  } finally {
    isUpdatingStatus.value = false
  }
}

const partnerMedia = ref<PartnerMedia | null>(null)
const isLoadingMedia = ref(false)
const mediaError = ref('')
const previewImage = ref<string | null>(null)

const isPartnerSelected = computed(() => (selectedUser.value?.role || '').toUpperCase() === 'PARTNER')

function isImageUrl(url?: string): boolean {
  return !!url && /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url)
}

function verificationClass(status?: string): string {
  const s = (status || '').toUpperCase()
  if (s === 'VERIFIED' || s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'REJECTED') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

async function loadPartnerMedia(userId: string) {
  isLoadingMedia.value = true
  mediaError.value = ''
  partnerMedia.value = null
  try {
    const [docsRes, videosRes] = await Promise.all([
      api.adminUsers.getPartnerDocuments(userId),
      api.adminUsers.getPartnerSkillVideos(userId),
    ])
    if (selectedUser.value?.uniqueId !== userId) return
    partnerMedia.value = {
      documents: ((docsRes as any)?.data ?? docsRes)?.documents ?? [],
      skillVideos: ((videosRes as any)?.data ?? videosRes)?.skillVideos ?? [],
    }
  } catch (err: any) {
    if (selectedUser.value?.uniqueId !== userId) return
    mediaError.value = err?.message || 'Failed to load partner documents and videos'
  } finally {
    if (selectedUser.value?.uniqueId === userId) isLoadingMedia.value = false
  }
}

function openDetail(u: any) {
  selectedUser.value = u
  isDetailModalOpen.value = true
  partnerMedia.value = null
  mediaError.value = ''
  isLoadingMedia.value = false
  if ((u.role || '').toUpperCase() === 'PARTNER' && u.uniqueId) loadPartnerMedia(u.uniqueId)
}

function closeDetail() {
  isDetailModalOpen.value = false
  previewImage.value = null
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U'
  const parts = name.trim().split(/\s+/)
  const first = parts[0] || ''
  if (parts.length === 1) return first.substring(0, 2).toUpperCase()
  const second = parts[1] || ''
  return ((first[0] || '') + (second[0] || '')).toUpperCase() || 'U'
}

onMounted(fetchUsers)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <div class="p-2 bg-[#FAF0F2] text-[#800020] rounded-lg border border-[#800020]/20">
            <Users class="w-5 h-5" />
          </div>
          <h1 class="text-xl font-bold text-[#202124]">User Directory & Roles</h1>
        </div>
        <p class="text-sm text-[#6B7280] mt-1">
          Inspect, search, and manage registered Customers, Service Partners, Ground Managers, and Administrators.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="fetchUsers"
          class="px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#202124] border border-[#E5E7EB] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Refresh Users
        </button>
      </div>
    </div>

    <!-- Notifications -->
    <div
      v-if="notification"
      class="px-4 py-3 rounded-lg border flex items-center gap-3 transition-all text-xs font-semibold"
      :class="
        notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      "
    >
      <span>{{ notification.message }}</span>
    </div>

    <!-- Role Filter Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      <!-- All Users -->
      <button
        type="button"
        @click="selectedRole = 'ALL'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'ALL'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">All Accounts</p>
          <Users class="w-4 h-4" :class="selectedRole === 'ALL' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'ALL' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.all }}
        </p>
      </button>

      <!-- Customers -->
      <button
        type="button"
        @click="selectedRole = 'CUSTOMER'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'CUSTOMER'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">Customers</p>
          <UserIcon class="w-4 h-4" :class="selectedRole === 'CUSTOMER' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'CUSTOMER' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.customer }}
        </p>
      </button>

      <!-- Partners -->
      <button
        type="button"
        @click="selectedRole = 'PARTNER'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'PARTNER'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">Partners</p>
          <Briefcase class="w-4 h-4" :class="selectedRole === 'PARTNER' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'PARTNER' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.partner }}
        </p>
      </button>

      <!-- Ground Managers -->
      <button
        type="button"
        @click="selectedRole = 'GROUND_MANAGER'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'GROUND_MANAGER'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">Ground Mgrs</p>
          <Compass class="w-4 h-4" :class="selectedRole === 'GROUND_MANAGER' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'GROUND_MANAGER' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.gm }}
        </p>
      </button>

      <!-- Admins -->
      <button
        type="button"
        @click="selectedRole = 'ADMIN'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'ADMIN'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">Admins</p>
          <ShieldCheck class="w-4 h-4" :class="selectedRole === 'ADMIN' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'ADMIN' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.admin }}
        </p>
      </button>

      <!-- Organizations -->
      <button
        type="button"
        @click="selectedRole = 'ORGANIZATION'"
        class="p-4 rounded-xl border text-left transition-all cursor-pointer"
        :class="selectedRole === 'ORGANIZATION'
          ? 'bg-[#FAF0F2] border-[#800020] ring-1 ring-[#800020]'
          : 'bg-white border-[#E5E7EB] hover:bg-[#F7F7F8]'"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[#6B7280]">Organizations</p>
          <Building2 class="w-4 h-4" :class="selectedRole === 'ORGANIZATION' ? 'text-[#800020]' : 'text-[#6B7280]'" />
        </div>
        <p class="text-xl font-bold mt-1" :class="selectedRole === 'ORGANIZATION' ? 'text-[#800020]' : 'text-[#202124]'">
          {{ counts.org }}
        </p>
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E7EB]">
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input
          v-model="search"
          type="text"
          placeholder="Search by name, email, phone, ID, referral code..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
        />
      </div>

      <div class="flex items-center gap-3">
        <!-- Status Filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status:</label>
          <select
            v-model="selectedStatus"
            class="text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table Card -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <Table :headers="headers" :items="filteredUsers">
        <template #row="{ item }">
          <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
            <!-- User Profile (Avatar + Name + IDs) -->
            <td class="py-3.5 px-4 text-left">
              <div class="flex items-center gap-3">
                <img
                  v-if="item.imageId"
                  :src="item.imageId"
                  :alt="item.name"
                  class="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] shrink-0"
                />
                <div
                  v-else
                  class="w-10 h-10 rounded-full bg-[#FAF0F2] text-[#800020] font-bold text-xs flex items-center justify-center shrink-0 border border-[#800020]/20"
                >
                  {{ getInitials(item.name) }}
                </div>

                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-sm text-[#202124]">{{ item.name || 'Unnamed User' }}</span>
                    <span v-if="item.gender" class="text-[10px] text-[#6B7280] font-normal">({{ item.gender }})</span>
                  </div>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span class="font-mono text-[11px] text-[#6B7280]">{{ item.displayId || item.uniqueId }}</span>
                    <button
                      type="button"
                      @click="copyToClipboard(item.uniqueId)"
                      title="Copy User UUID"
                      class="text-[#6B7280] hover:text-[#202124] p-0.5 cursor-pointer"
                    >
                      <Check v-if="copiedId === item.uniqueId" class="w-3 h-3 text-emerald-600" />
                      <Copy v-else class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </td>

            <!-- Contact Information -->
            <td class="py-3.5 px-4 text-left text-xs">
              <div class="space-y-1">
                <div v-if="item.email" class="flex items-center gap-1 text-[#202124]">
                  <Mail class="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                  <span>{{ item.email }}</span>
                  <span
                    v-if="item.emailVerified"
                    title="Verified Email"
                    class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                  ></span>
                </div>
                <div v-if="item.phone" class="flex items-center gap-1 text-[#6B7280]">
                  <Phone class="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                  <span>{{ item.phone }}</span>
                </div>
              </div>
            </td>

            <!-- Role Badge -->
            <td class="py-3.5 px-4 text-center">
              <span
                class="px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider inline-flex items-center gap-1 border"
                :class="{
                  'bg-sky-50 text-sky-800 border-sky-200': (item.role || '').toUpperCase() === 'CUSTOMER',
                  'bg-emerald-50 text-emerald-800 border-emerald-200': (item.role || '').toUpperCase() === 'PARTNER',
                  'bg-amber-50 text-amber-800 border-amber-200': (item.role || '').toUpperCase() === 'GROUND_MANAGER',
                  'bg-[#FAF0F2] text-[#800020] border-[#800020]/20': (item.role || '').toUpperCase() === 'ADMIN',
                  'bg-blue-50 text-blue-800 border-blue-200': (item.role || '').toUpperCase() === 'ORGANIZATION',
                  'bg-gray-50 text-[#202124] border-[#E5E7EB]': !['CUSTOMER', 'PARTNER', 'GROUND_MANAGER', 'ADMIN', 'ORGANIZATION'].includes((item.role || '').toUpperCase())
                }"
              >
                {{ (item.role || 'CUSTOMER').replace('_', ' ') }}
              </span>
            </td>

            <!-- Status with inline dropdown -->
            <td class="py-3.5 px-4 text-center">
              <Select
                :model-value="item.status || 'ACTIVE'"
                :options="statusOptions"
                size="sm"
                :select-class="{
                  'bg-emerald-50 text-emerald-800 border-emerald-300': (item.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
                  'bg-red-50 text-red-800 border-red-300': (item.status || '').toUpperCase() === 'SUSPENDED' || (item.status || '').toUpperCase() === 'BLOCKED',
                  'bg-amber-50 text-amber-800 border-amber-300': (item.status || '').toUpperCase() === 'PENDING_VERIFICATION',
                  'bg-gray-50 text-[#202124] border-[#E5E7EB]': (item.status || '').toUpperCase() === 'INACTIVE'
                }"
                @update:model-value="changeStatus(item, $event)"
              />
            </td>

            <!-- Referral Code -->
            <td class="py-3.5 px-4 text-center text-xs">
              <span v-if="item.referralCode" class="font-mono bg-[#F7F7F8] px-2 py-0.5 rounded border border-[#E5E7EB] text-[#202124]">
                {{ item.referralCode }}
              </span>
              <span v-else class="text-[#6B7280]">-</span>
            </td>

            <!-- Joined Date -->
            <td class="py-3.5 px-4 text-center text-xs text-[#6B7280]">
              {{ formatDateDisplay(item.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="py-3.5 px-4 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button
                  v-if="(item.status || '').toUpperCase() === 'PENDING_VERIFICATION'"
                  type="button"
                  @click="changeStatus(item, 'ACTIVE')"
                  class="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                  title="Approve User / Partner"
                >
                  <Check class="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  @click="openDetail(item)"
                  class="px-2.5 py-1 text-xs font-semibold text-[#800020] hover:text-[#6B001B] hover:bg-[#FAF0F2] rounded-lg border border-[#E5E7EB] hover:border-[#800020]/30 transition-colors cursor-pointer"
                >
                  Inspect
                </button>
              </div>
            </td>
          </tr>
        </template>
      </Table>

      <div v-if="!isLoading && filteredUsers.length === 0" class="text-center py-12">
        <Users class="w-10 h-10 text-[#6B7280] mx-auto mb-2" />
        <p class="text-[#202124] font-medium text-sm">No users found matching your filters</p>
        <p class="text-[#6B7280] text-xs mt-1">Try switching role tabs or adjusting your search term.</p>
      </div>
    </div>

    <!-- User Profile Details Modal -->
    <div
      v-if="isDetailModalOpen && selectedUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center shrink-0 bg-white">
          <div class="flex items-center gap-3">
            <img
              v-if="selectedUser.imageId"
              :src="selectedUser.imageId"
              class="w-10 h-10 rounded-full object-cover border border-[#E5E7EB]"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-[#FAF0F2] text-[#800020] font-bold text-xs flex items-center justify-center border border-[#800020]/20"
            >
              {{ getInitials(selectedUser.name) }}
            </div>
            <div>
              <h2 class="text-base font-bold text-[#202124]">{{ selectedUser.name || 'Unnamed User' }}</h2>
              <p class="text-xs text-[#6B7280]">{{ selectedUser.role }}</p>
            </div>
          </div>
          <button
            type="button"
            @click="closeDetail"
            class="text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto flex-1 text-sm bg-white">
          <!-- IDs -->
          <div class="bg-white p-3 rounded-lg border border-[#E5E7EB] space-y-2">
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Unique User UUID</span>
              <div class="flex items-center justify-between mt-0.5">
                <span class="font-mono text-xs text-[#202124] break-all">{{ selectedUser.uniqueId }}</span>
                <button
                  type="button"
                  @click="copyToClipboard(selectedUser.uniqueId)"
                  class="text-[#6B7280] hover:text-[#202124] ml-2 cursor-pointer"
                >
                  <Copy class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="selectedUser.displayId">
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Display ID</span>
              <span class="font-mono text-xs text-[#202124]">{{ selectedUser.displayId }}</span>
            </div>
          </div>

          <!-- Contact & Personal -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Email Address</span>
              <span class="text-xs font-medium text-[#202124]">{{ selectedUser.email || 'None' }}</span>
            </div>
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Phone Number</span>
              <span class="text-xs font-medium text-[#202124]">{{ selectedUser.phone || 'None' }}</span>
            </div>
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Gender</span>
              <span class="text-xs font-medium text-[#202124]">{{ selectedUser.gender || 'Unspecified' }}</span>
            </div>
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Date of Birth</span>
              <span class="text-xs font-medium text-[#202124]">{{ selectedUser.dob || 'Unspecified' }}</span>
            </div>
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Referral Code</span>
              <span class="text-xs font-mono font-medium text-[#202124]">{{ selectedUser.referralCode || 'None' }}</span>
            </div>
            <div>
              <span class="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Registration Date</span>
              <span class="text-xs font-medium text-[#202124]">{{ formatDateDisplay(selectedUser.createdAt) }}</span>
            </div>
          </div>

          <!-- Partner documents & skill videos -->
          <template v-if="isPartnerSelected">
            <div v-if="isLoadingMedia" class="pt-4 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
              Loading documents and skill videos...
            </div>
            <div v-else-if="mediaError" class="pt-4 border-t border-[#E5E7EB]">
              <div class="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{{ mediaError }}</div>
            </div>
            <template v-else-if="partnerMedia">
              <!-- Documents -->
              <div class="pt-4 border-t border-[#E5E7EB]">
                <h3 class="flex items-center gap-1.5 text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">
                  <FileText class="w-4 h-4 text-[#800020]" /> Documents ({{ partnerMedia.documents.length }})
                </h3>
                <p v-if="!partnerMedia.documents.length" class="text-xs text-[#6B7280]">No documents uploaded.</p>
                <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div v-for="d in partnerMedia.documents" :key="d.uniqueId" class="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                    <button
                      v-if="isImageUrl(d.documentUrl)"
                      type="button"
                      class="block w-full h-28 bg-[#F7F7F8] cursor-zoom-in"
                      @click="previewImage = d.documentUrl"
                    >
                      <img :src="d.documentUrl" :alt="d.documentType" class="w-full h-full object-cover" loading="lazy" />
                    </button>
                    <a
                      v-else
                      :href="d.documentUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="h-28 bg-[#F7F7F8] flex flex-col items-center justify-center gap-1 text-xs text-[#800020] hover:bg-[#FAF0F2]"
                    >
                      <FileText class="w-6 h-6" /> Open file
                    </a>
                    <div class="p-2 space-y-1 border-t border-[#E5E7EB]">
                      <p class="text-xs font-semibold text-[#202124] truncate">{{ d.documentType.replace(/_/g, ' ') }}</p>
                      <span class="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border" :class="verificationClass(d.verificationStatus)">
                        {{ d.verificationStatus || 'PENDING' }}
                      </span>
                      <p v-if="d.statusReason" class="text-[11px] text-[#6B7280]">{{ d.statusReason }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Skill videos -->
              <div class="pt-4 border-t border-[#E5E7EB]">
                <h3 class="flex items-center gap-1.5 text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">
                  <Video class="w-4 h-4 text-[#800020]" /> Skill Videos ({{ partnerMedia.skillVideos.length }})
                </h3>
                <p v-if="!partnerMedia.skillVideos.length" class="text-xs text-[#6B7280]">No skill videos uploaded.</p>
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-for="v in partnerMedia.skillVideos" :key="v.uniqueId" class="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                    <video
                      :src="v.videoUrl"
                      :poster="v.thumbnailUrl"
                      controls
                      preload="metadata"
                      class="w-full aspect-video bg-black"
                    ></video>
                    <div class="p-2 space-y-1 border-t border-[#E5E7EB]">
                      <p class="text-xs font-semibold text-[#202124] truncate">{{ v.title || 'Untitled video' }}</p>
                      <p v-if="v.description" class="text-[11px] text-[#6B7280]">{{ v.description }}</p>
                      <span class="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border" :class="verificationClass(v.verificationStatus)">
                        {{ v.verificationStatus || 'PENDING' }}
                      </span>
                      <p v-if="v.statusReason" class="text-[11px] text-[#6B7280]">{{ v.statusReason }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- Change Status in Modal -->
          <div class="pt-4 border-t border-[#E5E7EB]">
            <label class="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">Change Account Status</label>
            <div class="flex items-center gap-2">
              <select
                :value="selectedUser.status || 'ACTIVE'"
                @change="changeStatus(selectedUser, ($event.target as HTMLSelectElement).value)"
                class="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] bg-white text-[#202124]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
              </select>
            </div>
          </div>
        </div>

        <div class="px-6 py-3 bg-white border-t border-[#E5E7EB] flex justify-between items-center shrink-0">
          <div>
            <button
              v-if="(selectedUser.status || '').toUpperCase() === 'PENDING_VERIFICATION'"
              type="button"
              @click="changeStatus(selectedUser, 'ACTIVE')"
              :disabled="isUpdatingStatus"
              class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Check class="w-4 h-4" />
              Approve Account
            </button>
          </div>
          <button
            type="button"
            @click="closeDetail"
            class="px-4 py-2 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Full-size photo viewer -->
    <div
      v-if="previewImage"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
      @click="previewImage = null"
    >
      <img :src="previewImage" alt="Document preview" class="max-w-full max-h-full rounded-lg shadow-2xl" />
    </div>
  </div>
</template>
