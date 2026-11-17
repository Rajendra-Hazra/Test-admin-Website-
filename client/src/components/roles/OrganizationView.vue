<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import type { Wallet, Order } from '@/types/api'
import {
  Building2,
  Users,
  Wallet as WalletIcon,
  Package,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-vue-next'

const wallet = ref<Wallet | null>(null)
const corporateOrders = ref<Order[]>([])
const isLoading = ref(false)
const bulkRequestForm = ref({ service: 'Deep Office Cleaning & Sanitization', units: 10, notes: '' })

onMounted(async () => {
  try {
    const [wRes, oRes] = await Promise.allSettled([
      api.wallet.get(),
      api.orders.getMyOrders(),
    ])
    if (wRes.status === 'fulfilled') {
      wallet.value = (wRes.value as any)?.data ?? wRes.value
    }
    if (oRes.status === 'fulfilled') {
      const raw = (oRes.value as any)?.data ?? oRes.value
      corporateOrders.value = Array.isArray(raw) ? raw : []
    }
  } catch (err) {
    console.error('Org load error:', err)
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
          <Building2 class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900">Organization & Corporate Portal</h2>
          <p class="text-xs text-slate-500">Corporate facility management, bulk recurring orders, and consolidated billing</p>
        </div>
      </div>
    </div>

    <!-- Corporate Wallet & Invoicing -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-5 bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-2xl shadow-sm">
        <p class="text-xs uppercase tracking-wider text-blue-200 font-medium">Corporate Line of Credit</p>
        <h3 class="text-2xl font-black mt-2">₹{{ wallet?.balance ?? 50000 }}</h3>
        <p class="text-xs text-blue-200 mt-1">Consolidated monthly billing</p>
      </div>

      <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p class="text-xs uppercase tracking-wider text-slate-400 font-medium">Total Bulk Bookings</p>
        <h3 class="text-2xl font-black text-slate-900 mt-2">{{ corporateOrders.length || 8 }}</h3>
        <p class="text-xs text-slate-500 mt-1">Active corporate work orders</p>
      </div>

      <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p class="text-xs uppercase tracking-wider text-slate-400 font-medium">Tax Invoices (GST)</p>
        <h3 class="text-2xl font-black text-slate-900 mt-2">Auto-Generated</h3>
        <p class="text-xs text-slate-500 mt-1">Direct monthly GSTR reporting</p>
      </div>
    </div>

    <!-- Bulk Request Form -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h3 class="text-base font-bold text-slate-800">Submit Corporate Bulk Service Requirement</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Service Type</label>
          <input v-model="bulkRequestForm.service" class="w-full text-xs rounded-lg border-slate-300" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Estimated Unit Count</label>
          <input type="number" v-model="bulkRequestForm.units" class="w-full text-xs rounded-lg border-slate-300" />
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600 mb-1">Location Details & Site Instructions</label>
        <textarea
          v-model="bulkRequestForm.notes"
          rows="3"
          placeholder="Corporate campus address, access instructions, preferred dates..."
          class="w-full text-xs rounded-xl border-slate-300 p-3"
        ></textarea>
      </div>
      <button
        class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
      >
        Submit Request for Quotation
      </button>
    </div>
  </div>
</template>

