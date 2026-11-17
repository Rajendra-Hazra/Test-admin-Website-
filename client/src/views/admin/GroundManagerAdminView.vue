<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { City, GroundManagerAssignment } from '@/types/api'

type Mode = 'create' | 'promote'

const cities = ref<City[]>([])
const isLoadingCities = ref(false)
const mode = ref<Mode>('create')

const isSubmitting = ref(false)
const error = ref('')
const success = ref('')
const showPassword = ref(false)

/** Created / promoted in this session (there is no list API yet). */
const recent = ref<GroundManagerAssignment[]>([])

const createForm = ref({ name: '', email: '', password: '', mobileNo: '', cityId: '' })
const promoteForm = ref({ userId: '', cityId: '' })

const activeCities = computed(() => cities.value.filter((c) => c.isActive))

const passwordError = computed(() => {
  const p = createForm.value.password
  if (!p) return ''
  if (p.length < 8) return 'At least 8 characters'
  if (p.length > 72) return 'At most 72 characters'
  return ''
})

const mobileError = computed(() => {
  const m = createForm.value.mobileNo.trim()
  return m && !/^[0-9+]{10,15}$/.test(m) ? '10–15 digits' : ''
})

async function fetchCities() {
  isLoadingCities.value = true
  try {
    const resp = await api.cities.getAll()
    const raw = (resp as any)?.data ?? resp
    cities.value = Array.isArray(raw) ? raw : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load cities'
  } finally {
    isLoadingCities.value = false
  }
}

function switchMode(next: Mode) {
  mode.value = next
  error.value = ''
  success.value = ''
}

function cityName(cityId: string) {
  return cities.value.find((c) => c.uniqueId === cityId)?.name ?? cityId
}

async function createGroundManager() {
  if (passwordError.value || mobileError.value) return
  isSubmitting.value = true
  error.value = ''
  success.value = ''
  try {
    const f = createForm.value
    const resp = await api.groundManager.adminRegister({
      name: f.name.trim(),
      email: f.email.trim(),
      password: f.password,
      mobileNo: f.mobileNo.trim() || undefined,
      cityId: f.cityId,
    })
    const created = resp?.data
    if (created) recent.value.unshift(created)
    success.value = `${f.email.trim()} is now ground manager of ${cityName(f.cityId)}. An email has been sent to them — share the password separately.`
    createForm.value = { name: '', email: '', password: '', mobileNo: '', cityId: '' }
    showPassword.value = false
  } catch (e: any) {
    error.value = e?.message || 'Failed to create ground manager'
  } finally {
    isSubmitting.value = false
  }
}

async function promoteCustomer() {
  isSubmitting.value = true
  error.value = ''
  success.value = ''
  try {
    const f = promoteForm.value
    const resp = await api.groundManager.adminAssign({ userId: f.userId.trim(), cityId: f.cityId })
    const assigned = resp?.data
    if (assigned) recent.value.unshift(assigned)
    success.value = `User is now ground manager of ${cityName(f.cityId)}. They get the new role on their next sign-in.`
    promoteForm.value = { userId: '', cityId: '' }
  } catch (e: any) {
    error.value = e?.message || 'Failed to assign ground manager'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchCities)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#202124]">Ground Managers</h1>
      <p class="text-sm text-[#6B7280] mt-1">Create ground manager accounts and assign each one an operational city</p>
    </div>

    <!-- Mode switch -->
    <div class="inline-flex p-1 bg-white border border-[#E5E7EB] rounded-lg">
      <button
        type="button"
        @click="switchMode('create')"
        class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer"
        :class="mode === 'create' ? 'bg-[#FAF0F2] text-[#800020] border border-[#800020]/20' : 'text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
      >
        New Account
      </button>
      <button
        type="button"
        @click="switchMode('promote')"
        class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer"
        :class="mode === 'promote' ? 'bg-[#FAF0F2] text-[#800020] border border-[#800020]/20' : 'text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
      >
        Promote Existing Customer
      </button>
    </div>

    <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{{ error }}</div>
    <div v-if="success" class="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs">{{ success }}</div>

    <!-- New account form -->
    <div v-if="mode === 'create'" class="bg-white rounded-xl border border-[#E5E7EB] p-6 max-w-2xl">
      <form @submit.prevent="createGroundManager" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Full Name</label>
            <input
              v-model="createForm.name"
              required
              maxlength="100"
              type="text"
              class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Email (Login ID)</label>
            <input
              v-model="createForm.email"
              required
              maxlength="255"
              type="email"
              autocomplete="off"
              class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Password</label>
            <div class="relative">
              <input
                v-model="createForm.password"
                required
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                class="w-full px-3 py-2 pr-16 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#800020] hover:underline cursor-pointer"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p v-if="passwordError" class="text-xs text-red-600 mt-1">{{ passwordError }}</p>
            <p v-else class="text-[11px] text-[#6B7280] mt-1">8–72 characters. Not included in the email.</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Mobile <span class="text-[#6B7280] font-normal">(optional)</span></label>
            <input
              v-model="createForm.mobileNo"
              type="tel"
              maxlength="15"
              class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
            />
            <p v-if="mobileError" class="text-xs text-red-600 mt-1">{{ mobileError }}</p>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#202124] mb-1">Operational City</label>
          <select
            v-model="createForm.cityId"
            required
            :disabled="isLoadingCities"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] disabled:bg-[#F7F7F8]"
          >
            <option value="" disabled>{{ isLoadingCities ? 'Loading cities...' : 'Select a city' }}</option>
            <option v-for="c in activeCities" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
          </select>
        </div>
        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            :disabled="isSubmitting || !!passwordError || !!mobileError"
            class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? 'Creating...' : 'Create Ground Manager' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Promote existing customer -->
    <div v-else class="bg-white rounded-xl border border-[#E5E7EB] p-6 max-w-2xl">
      <form @submit.prevent="promoteCustomer" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[#202124] mb-1">User ID</label>
          <input
            v-model="promoteForm.userId"
            required
            type="text"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
          />
          <p class="text-[11px] text-[#6B7280] mt-1">Must be an active customer account. If they have an email on file, they will be notified.</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#202124] mb-1">Operational City</label>
          <select
            v-model="promoteForm.cityId"
            required
            :disabled="isLoadingCities"
            class="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020] disabled:bg-[#F7F7F8]"
          >
            <option value="" disabled>{{ isLoadingCities ? 'Loading cities...' : 'Select a city' }}</option>
            <option v-for="c in activeCities" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
          </select>
        </div>
        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? 'Assigning...' : 'Make Ground Manager' }}
          </button>
        </div>
      </form>
    </div>

    <!-- This session -->
    <div v-if="recent.length" class="space-y-3">
      <h2 class="text-sm font-bold text-[#202124]">Added in this session</h2>
      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-white border-b border-[#E5E7EB]">
              <th class="px-4 py-3 text-left font-semibold text-[#202124]">Name</th>
              <th class="px-4 py-3 text-left font-semibold text-[#202124]">Email</th>
              <th class="px-4 py-3 text-left font-semibold text-[#202124]">Mobile</th>
              <th class="px-4 py-3 text-left font-semibold text-[#202124]">City</th>
              <th class="px-4 py-3 text-left font-semibold text-[#202124]">User ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gm in recent" :key="gm.assignmentId" class="border-t border-[#E5E7EB] hover:bg-[#F7F7F8]">
              <td class="px-4 py-3 font-semibold text-[#202124]">{{ gm.name || '—' }}</td>
              <td class="px-4 py-3 text-[#6B7280]">{{ gm.email || '—' }}</td>
              <td class="px-4 py-3 text-[#6B7280]">{{ gm.mobileNo || '—' }}</td>
              <td class="px-4 py-3 text-[#6B7280]">{{ gm.cityName || cityName(gm.cityId) }}</td>
              <td class="px-4 py-3 font-mono text-[#6B7280]">{{ gm.userId }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
