<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { api } from '@/api'
import type { ReworkCase } from '@/types/api'
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  UserCheck,
} from 'lucide-vue-next'

const reworks = ref<ReworkCase[]>([])
const isLoading = ref(false)

function notify(text: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') {
    toast.error(text)
  } else {
    toast.success(text)
  }
}

onMounted(async () => {
  await fetchCityReworks()
})

async function fetchCityReworks() {
  isLoading.value = true
  try {
    const res = await api.groundManager.gmGetReworks()
    const raw = (res as any)?.data ?? res
    reworks.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    notify('Failed to load city reworks: ' + err.message, 'error')
  } finally {
    isLoading.value = false
  }
}

async function approveRework(reworkId: string) {
  try {
    await api.groundManager.gmApproveRework(reworkId)
    notify(`Dispute #${reworkId} APPROVED! Dispatched for resolution.`)
    await fetchCityReworks()
  } catch (err: any) {
    notify('Approval failed: ' + err.message, 'error')
  }
}

async function cancelRework(reworkId: string) {
  const reason = prompt('State rejection rationale:')
  if (!reason) return
  try {
    await api.groundManager.gmCancelRework(reworkId, reason)
    notify(`Dispute #${reworkId} REJECTED with notes.`)
    await fetchCityReworks()
  } catch (err: any) {
    notify('Cancellation failed: ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
          <Briefcase class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900">City Ground Manager Dashboard</h2>
          <p class="text-xs text-slate-500">Service quality inspection, rework mediation, and field verifications</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink
          to="/admin/users"
          class="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <UserCheck class="w-3.5 h-3.5" />
          Partner Approvals
        </RouterLink>
        <button
          @click="fetchCityReworks"
          class="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          Refresh Disputes
        </button>
      </div>
    </div>

    <!-- Dispute cases -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">Assigned City Disputes ({{ reworks.length }})</h3>
      </div>

      <div v-if="reworks.length === 0" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
        No active complaints or rework disputes in your jurisdiction.
      </div>

      <div
        v-for="r in reworks"
        :key="r.reworkId"
        class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
      >
        <div class="flex items-center justify-between border-b pb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-900">Case #{{ r.reworkId }}</span>
            <span class="text-xs text-slate-500">Order #{{ r.orderId }}</span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 uppercase">
            {{ r.status }}
          </span>
        </div>

        <div class="space-y-1 text-xs">
          <p><span class="font-bold text-slate-700">Customer Claim:</span> {{ r.reason }}</p>
          <p v-if="r.clarification"><span class="font-bold text-slate-700">Partner Explanation:</span> {{ r.clarification }}</p>
        </div>

        <div class="flex gap-2 justify-end pt-2 border-t">
          <button
            @click="approveRework(r.reworkId)"
            class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1"
          >
            <Check class="w-3.5 h-3.5" />
            Approve Free Fix
          </button>
          <button
            @click="cancelRework(r.reworkId)"
            class="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center gap-1"
          >
            <X class="w-3.5 h-3.5" />
            Reject Claim
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

