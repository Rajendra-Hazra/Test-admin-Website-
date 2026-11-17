<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { toast } from 'vue-sonner'
import { api } from '@/api'
import type {
  City,
  ServiceCategory,
  ServiceProblem,
  ServiceAddon,
  Cart,
  Order,
  Wallet,
  WalletTransaction,
  Coupon,
  ScratchCard,
  UserLocation,
  UserAddress,
  NotificationItem,
} from '@/types/api'
import {
  Search,
  MapPin,
  ShoppingCart,
  Package,
  Wallet as WalletIcon,
  Gift,
  Star,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-vue-next'

// Active Customer Subtab
type SubTab = 'catalog' | 'cart' | 'orders' | 'wallet' | 'rewards' | 'locations' | 'notifications'
const activeTab = ref<SubTab>('catalog')

// ── State ─────────────────────────────────────────────────────────────
const isLoading = ref(false)

function notify(text: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') {
    toast.error(text)
  } else {
    toast.success(text)
  }
}

// 1. Catalog & Location
const cities = ref<City[]>([])
const selectedCityId = ref<string>('')
const categories = ref<ServiceCategory[]>([])
const selectedCategoryId = ref<string>('')
const subcategories = ref<ServiceCategory[]>([])
const selectedSubcategoryId = ref<string>('')
const problems = ref<ServiceProblem[]>([])
const selectedProblem = ref<ServiceProblem | null>(null)
const problemAddons = ref<ServiceAddon[]>([])
const selectedAddonIds = ref<string[]>([])
const searchAddressQuery = ref('')
const searchAddressResults = ref<any[]>([])

// 2. Cart
const cart = ref<Cart | null>(null)
const cartAddressId = ref('')
const cartSlot = ref('Tomorrow, 10:00 AM - 12:00 PM')
const cartNotes = ref('')
const couponCode = ref('')
const couponDiscount = ref<number | null>(null)

// 3. Orders
const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)
const arrivalOtpModal = ref<{ open: boolean; otp: string }>({ open: false, otp: '' })
const reworkModal = ref<{ open: boolean; orderId: string; reason: string }>({ open: false, orderId: '', reason: '' })
const reviewModal = ref<{ open: boolean; orderId: string; rating: number; comment: string }>({
  open: false,
  orderId: '',
  rating: 5,
  comment: '',
})

// 4. Wallet & Rewards
const wallet = ref<Wallet | null>(null)
const transactions = ref<WalletTransaction[]>([])
const rechargeAmount = ref(500)
const myCoupons = ref<Coupon[]>([])
const welcomeCouponCode = ref('WELCOME50')
const scratchCards = ref<ScratchCard[]>([])
const scratchingCardId = ref<string | null>(null)

// 5. Locations & Addresses
const userLocations = ref<UserLocation[]>([])
const userAddresses = ref<UserAddress[]>([])
const newLocationForm = ref({ address: '', landmark: '', latitude: 22.5726, longitude: 88.3639 })

// 6. Notifications
const notifications = ref<NotificationItem[]>([])
const unreadCount = ref(0)

// ── Lifecycle & Data Loading ───────────────────────────────────────────
onMounted(async () => {
  await loadInitialData()
})

async function loadInitialData() {
  isLoading.value = true
  try {
    // Load cities & notifications
    const [citiesRes, notifRes, unreadRes] = await Promise.allSettled([
      api.cities.getActive(),
      api.notifications.getMyNotifications(),
      api.notifications.getUnreadCount(),
    ])

    if (citiesRes.status === 'fulfilled') {
      const list = (citiesRes.value as any)?.data ?? citiesRes.value
      cities.value = Array.isArray(list) ? list : []
      const firstCity = cities.value[0]
      if (firstCity) {
        selectedCityId.value = firstCity.uniqueId
        await loadCategoriesForCity(firstCity.uniqueId)
      }
    }

    if (notifRes.status === 'fulfilled') {
      const raw = notifRes.value?.data ?? notifRes.value
      notifications.value = Array.isArray(raw) ? raw : []
    }
    if (unreadRes.status === 'fulfilled') {
      unreadCount.value = unreadRes.value?.data?.count ?? 0
    }

    // Try loading cart & wallet
    fetchCart()
    fetchWallet()
  } catch (err: any) {
    console.error('Init error:', err)
  } finally {
    isLoading.value = false
  }
}

// ── Catalog Functions ──────────────────────────────────────────────────
async function loadCategoriesForCity(cityId: string) {
  try {
    const res = await api.catalogCustomer.getCityCategories(cityId)
    const raw = (res as any)?.data ?? res
    categories.value = Array.isArray(raw) ? raw : []
    const firstCat = categories.value[0]
    if (firstCat) {
      selectedCategoryId.value = firstCat.uniqueId
      await loadSubcategories(firstCat.uniqueId)
    } else {
      subcategories.value = []
      problems.value = []
    }
  } catch (err: any) {
    notify('Failed to load categories for city: ' + err.message, 'error')
  }
}

async function loadSubcategories(catId: string) {
  try {
    const res = await api.catalogCustomer.getSubcategories(catId)
    const raw = (res as any)?.data ?? res
    subcategories.value = Array.isArray(raw) ? raw : []
    const firstSub = subcategories.value[0]
    if (firstSub) {
      selectedSubcategoryId.value = firstSub.uniqueId
      await loadProblems(firstSub.uniqueId)
    } else {
      problems.value = []
    }
  } catch (err: any) {
    notify('Failed to load subcategories: ' + err.message, 'error')
  }
}

async function loadProblems(subId: string) {
  try {
    const res = await api.catalogCustomer.getProblems(subId)
    const raw = (res as any)?.data ?? res
    problems.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    notify('Failed to load service problems: ' + err.message, 'error')
  }
}

async function selectProblem(p: ServiceProblem) {
  selectedProblem.value = p
  selectedAddonIds.value = []
  try {
    const res = await api.addons.getByProblemId(p.uniqueId)
    const raw = (res as any)?.data ?? res
    problemAddons.value = Array.isArray(raw) ? raw : []
  } catch {
    problemAddons.value = []
  }
}

async function searchPlaces() {
  if (!searchAddressQuery.value.trim()) return
  try {
    const res = await api.locations.searchPlaces(searchAddressQuery.value)
    searchAddressResults.value = res?.predictions ?? res?.data ?? []
  } catch (err: any) {
    notify('Location search failed: ' + err.message, 'error')
  }
}

async function detectNearestCity() {
  if (!navigator.geolocation) {
    notify('Geolocation not supported by browser', 'error')
    return
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const res = await api.catalogCustomer.getNearestCity(pos.coords.latitude, pos.coords.longitude)
      const city = res?.data ?? res
      if (city?.uniqueId) {
        selectedCityId.value = city.uniqueId
        notify(`Nearest operational city detected: ${city.name}`)
        await loadCategoriesForCity(city.uniqueId)
      }
    } catch (err: any) {
      notify('Could not find operational city near your location: ' + err.message, 'error')
    }
  })
}

// ── Cart Functions ─────────────────────────────────────────────────────
async function fetchCart() {
  try {
    const res = await api.cart.get()
    cart.value = (res as any)?.data ?? res
  } catch {
    cart.value = null
  }
}

async function addToCart(problem: ServiceProblem) {
  try {
    const payload = {
      serviceProblemId: problem.uniqueId,
      quantity: 1,
      addonIds: selectedAddonIds.value,
    }
    const res = await api.cart.manageItems(payload)
    cart.value = (res as any)?.data ?? res
    notify(`Added "${problem.name}" to cart!`)
  } catch (err: any) {
    notify('Failed to add to cart: ' + (err?.message || 'Error'), 'error')
  }
}

async function removeCartItem(itemId: string) {
  try {
    const res = await api.cart.removeItem(itemId)
    cart.value = (res as any)?.data ?? res
    notify('Item removed from cart')
  } catch (err: any) {
    notify('Failed to remove item: ' + err.message, 'error')
  }
}

async function applyCoupon() {
  if (!couponCode.value.trim()) return
  try {
    const res = await api.coupons.validate({
      code: couponCode.value.trim(),
      cartValue: cart.value?.totalAmount ?? 100,
    })
    const data = res?.data ?? res
    couponDiscount.value = data?.discountAmount ?? 50
    notify(`Coupon ${couponCode.value} applied successfully! Discount: ₹${couponDiscount.value}`)
  } catch (err: any) {
    couponDiscount.value = null
    notify('Invalid coupon code: ' + (err?.message || 'Not eligible'), 'error')
  }
}

async function checkoutOrder() {
  if (!cart.value || !cart.value.items || cart.value.items.length === 0) {
    notify('Cart is empty. Add services before placing order.', 'error')
    return
  }
  try {
    isLoading.value = true
    await api.cart.updateUserData({
      addressId: cartAddressId.value || 'default-addr-1',
      slot: cartSlot.value,
      notes: cartNotes.value,
    })

    const res = await api.orders.create({
      couponCode: couponCode.value || undefined,
    })
    const orderData = res?.data ?? res
    notify(`Order #${orderData?.orderId ?? 'SUCCESS'} booked successfully!`)
    await fetchCart()
    activeTab.value = 'orders'
    await fetchOrders()
  } catch (err: any) {
    notify('Order checkout failed: ' + (err?.message || 'Error'), 'error')
  } finally {
    isLoading.value = false
  }
}

// ── Orders Functions ───────────────────────────────────────────────────
async function fetchOrders() {
  try {
    const res = await api.orders.getMyOrders()
    const raw = res?.data ?? res
    orders.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    notify('Failed to load orders: ' + err.message, 'error')
  }
}

async function generateArrivalOtp(orderId: string) {
  try {
    const res = await api.orders.generateArrivalOtp(orderId)
    const otp = res?.data?.otp ?? (res as any)?.otp ?? '4829'
    arrivalOtpModal.value = { open: true, otp }
  } catch (err: any) {
    notify('Failed to generate arrival OTP: ' + err.message, 'error')
  }
}

async function cancelOrder(orderId: string) {
  if (!confirm('Are you sure you want to cancel this order?')) return
  try {
    await api.orders.cancel(orderId, 'Customer cancellation request')
    notify('Order cancelled successfully')
    await fetchOrders()
  } catch (err: any) {
    notify('Failed to cancel order: ' + err.message, 'error')
  }
}

async function submitReworkClaim() {
  try {
    await api.orders.requestRework(reworkModal.value.orderId, {
      reason: reworkModal.value.reason,
    })
    notify('Rework claim submitted for inspection')
    reworkModal.value.open = false
    await fetchOrders()
  } catch (err: any) {
    notify('Failed to submit rework: ' + err.message, 'error')
  }
}

async function submitOrderReview() {
  try {
    await api.reviews.reviewOrder(reviewModal.value.orderId, {
      rating: reviewModal.value.rating,
      comment: reviewModal.value.comment,
    })
    notify('Review submitted successfully! Thank you for your feedback.')
    reviewModal.value.open = false
  } catch (err: any) {
    notify('Failed to submit review: ' + err.message, 'error')
  }
}

// ── Wallet & Rewards Functions ─────────────────────────────────────────
async function fetchWallet() {
  try {
    const [wRes, txRes, cpRes, scRes] = await Promise.allSettled([
      api.wallet.get(),
      api.wallet.getTransactions(0, 15),
      api.coupons.getMyCoupons(),
      api.scratchCards.getMyCards(),
    ])
    if (wRes.status === 'fulfilled') {
      wallet.value = (wRes.value as any)?.data ?? wRes.value
    }
    if (txRes.status === 'fulfilled') {
      const raw = (txRes.value as any)?.data ?? txRes.value
      transactions.value = Array.isArray(raw) ? raw : []
    }
    if (cpRes.status === 'fulfilled') {
      const raw = (cpRes.value as any)?.data ?? cpRes.value
      myCoupons.value = Array.isArray(raw) ? raw : []
    }
    if (scRes.status === 'fulfilled') {
      const raw = (scRes.value as any)?.data ?? scRes.value
      scratchCards.value = Array.isArray(raw) ? raw : []
    }
  } catch (err: any) {
    console.error('Wallet error:', err)
  }
}

async function rechargeWallet() {
  try {
    isLoading.value = true
    const res = await api.wallet.recharge(Number(rechargeAmount.value))
    const data = res?.data ?? res
    // Complete verification simulation
    await api.wallet.verifyRecharge({
      orderId: data?.orderId || 'recharge-sim-01',
      paymentId: 'pay-sim-' + Date.now(),
    })
    notify(`Wallet topped up by ₹${rechargeAmount.value} successfully!`)
    await fetchWallet()
  } catch (err: any) {
    notify('Wallet recharge failed: ' + (err?.message || 'Error'), 'error')
  } finally {
    isLoading.value = false
  }
}

async function claimWelcomeCoupon() {
  try {
    await api.coupons.claimWelcome(welcomeCouponCode.value)
    notify(`Coupon ${welcomeCouponCode.value} claimed into your account!`)
    await fetchWallet()
  } catch (err: any) {
    notify('Failed to claim coupon: ' + err.message, 'error')
  }
}

async function scratchRewardCard(cardId: string) {
  scratchingCardId.value = cardId
  try {
    const res = await api.scratchCards.scratch(cardId)
    const card = (res as any)?.data ?? res
    notify(`🎉 You won ₹${card?.rewardAmount ?? 50} Cashback credited to your wallet!`)
    await fetchWallet()
  } catch (err: any) {
    notify('Failed to scratch card: ' + err.message, 'error')
  } finally {
    scratchingCardId.value = null
  }
}

// ── Locations & Addresses ──────────────────────────────────────────────
async function fetchLocations() {
  try {
    const [locRes, addrRes] = await Promise.allSettled([
      api.locations.getAll(),
      api.users.getAddresses(),
    ])
    if (locRes.status === 'fulfilled') {
      const raw = (locRes.value as any)?.data ?? locRes.value
      userLocations.value = Array.isArray(raw) ? raw : []
    }
    if (addrRes.status === 'fulfilled') {
      const raw = (addrRes.value as any)?.data ?? addrRes.value
      userAddresses.value = Array.isArray(raw) ? raw : []
    }
  } catch (err: any) {
    notify('Failed to fetch addresses: ' + err.message, 'error')
  }
}

async function saveLocation() {
  if (!newLocationForm.value.address) return
  try {
    await api.locations.create({
      address: newLocationForm.value.address,
      latitude: newLocationForm.value.latitude,
      longitude: newLocationForm.value.longitude,
      tag: newLocationForm.value.landmark || 'Home',
    })
    notify('New location saved successfully!')
    newLocationForm.value.address = ''
    newLocationForm.value.landmark = ''
    await fetchLocations()
  } catch (err: any) {
    notify('Failed to save location: ' + err.message, 'error')
  }
}

async function markPrimaryLocation(id: string) {
  try {
    await api.locations.markPrimary(id)
    notify('Primary location updated')
    await fetchLocations()
  } catch (err: any) {
    notify('Failed to mark primary: ' + err.message, 'error')
  }
}

async function deleteLocation(id: string) {
  try {
    await api.locations.delete(id)
    notify('Location deleted')
    await fetchLocations()
  } catch (err: any) {
    notify('Failed to delete location: ' + err.message, 'error')
  }
}

// ── Notifications ──────────────────────────────────────────────────────
async function markNotificationRead(id: string) {
  try {
    await api.notifications.markAsRead(id)
    const item = notifications.value.find((n) => n.id === id)
    if (item) item.isRead = true
    if (unreadCount.value > 0) unreadCount.value--
  } catch (err: any) {
    notify('Failed to mark read: ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
      <button
        @click="activeTab = 'catalog'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <Search class="w-4 h-4" />
        Services Catalog
      </button>

      <button
        @click="activeTab = 'cart'; fetchCart()"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative"
        :class="activeTab === 'cart' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <ShoppingCart class="w-4 h-4" />
        My Cart
        <span
          v-if="cart?.items?.length"
          class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-400 text-slate-900 font-bold"
        >
          {{ cart.items.length }}
        </span>
      </button>

      <button
        @click="activeTab = 'orders'; fetchOrders()"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <Package class="w-4 h-4" />
        Orders & Tracking
      </button>

      <button
        @click="activeTab = 'wallet'; fetchWallet()"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'wallet' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <WalletIcon class="w-4 h-4" />
        Wallet & Balances
      </button>

      <button
        @click="activeTab = 'rewards'; fetchWallet()"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'rewards' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <Gift class="w-4 h-4" />
        Coupons & Rewards
      </button>

      <button
        @click="activeTab = 'locations'; fetchLocations()"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'locations' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <MapPin class="w-4 h-4" />
        Saved Locations
      </button>

      <button
        @click="activeTab = 'notifications'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative"
        :class="activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
      >
        <Bell class="w-4 h-4" />
        Alerts
        <span
          v-if="unreadCount > 0"
          class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-red-500 text-white font-bold"
        >
          {{ unreadCount }}
        </span>
      </button>
    </div>

    <!-- ── TAB 1: CATALOG & DISCOVERY ─────────────────────────────────── -->
    <div v-if="activeTab === 'catalog'" class="space-y-6">
      <!-- City & Autocomplete Bar -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div class="flex items-center gap-3 w-full md:w-auto">
          <MapPin class="w-5 h-5 text-indigo-600 shrink-0" />
          <div class="flex-1">
            <label class="block text-xs font-semibold text-slate-500 uppercase">Operational City</label>
            <select
              v-model="selectedCityId"
              @change="loadCategoriesForCity(selectedCityId)"
              class="mt-1 block w-full md:w-56 rounded-lg border-slate-300 shadow-sm text-sm font-medium focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">
                {{ c.name }}
              </option>
            </select>
          </div>
          <button
            @click="detectNearestCity"
            class="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5 self-end"
          >
            <Sparkles class="w-3.5 h-3.5" />
            Auto-Detect
          </button>
        </div>

        <!-- Place Search Box -->
        <div class="w-full md:w-80 relative">
          <label class="block text-xs font-semibold text-slate-500 uppercase">Location Autocomplete</label>
          <div class="mt-1 flex gap-2">
            <input
              v-model="searchAddressQuery"
              @keyup.enter="searchPlaces"
              placeholder="Search area, landmark..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button
              @click="searchPlaces"
              class="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900"
            >
              Find
            </button>
          </div>
          <div
            v-if="searchAddressResults.length"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-20 max-h-48 overflow-y-auto"
          >
            <div
              v-for="place in searchAddressResults"
              :key="place.place_id || place.description"
              class="p-2.5 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-100 last:border-0"
              @click="searchAddressQuery = place.description; searchAddressResults = []"
            >
              <p class="font-medium text-slate-800">{{ place.structured_formatting?.main_text || place.description }}</p>
              <p class="text-slate-400">{{ place.structured_formatting?.secondary_text }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Categories & Subcategories -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Sidebar: Categories & Subcategories -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</h3>
          <div class="space-y-1">
            <button
              v-for="cat in categories"
              :key="cat.uniqueId"
              @click="selectedCategoryId = cat.uniqueId; loadSubcategories(cat.uniqueId)"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between"
              :class="selectedCategoryId === cat.uniqueId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'"
            >
              <span>{{ cat.name }}</span>
              <ArrowRight class="w-3.5 h-3.5 opacity-50" />
            </button>
          </div>

          <div v-if="subcategories.length" class="pt-4 border-t border-slate-100">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sub-Categories</h3>
            <div class="space-y-1">
              <button
                v-for="sub in subcategories"
                :key="sub.uniqueId"
                @click="selectedSubcategoryId = sub.uniqueId; loadProblems(sub.uniqueId)"
                class="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="selectedSubcategoryId === sub.uniqueId ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'"
              >
                {{ sub.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Problems & Service Offerings -->
        <div class="md:col-span-3 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-800">Available Services</h2>
            <span class="text-xs text-slate-500">{{ problems.length }} services found</span>
          </div>

          <div v-if="problems.length === 0" class="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p class="text-sm text-slate-500">No services available in this category for the selected city.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="p in problems"
              :key="p.uniqueId"
              class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div class="flex items-start justify-between gap-2">
                  <h4 class="text-base font-semibold text-slate-800">{{ p.name }}</h4>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                    ₹{{ (p as any).basePrice ?? 299 }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ p.description || 'Professional on-demand service backed by warranty.' }}</p>
              </div>

              <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  @click="selectProblem(p)"
                  class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Configure Addons +
                </button>
                <button
                  @click="addToCart(p)"
                  class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Plus class="w-3.5 h-3.5" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          <!-- Addons Modal / Drawer if a problem is selected -->
          <div
            v-if="selectedProblem"
            class="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 mt-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-indigo-900">Optional Addons for "{{ selectedProblem.name }}"</h4>
              <button @click="selectedProblem = null" class="text-xs text-indigo-600 hover:underline">Close</button>
            </div>
            <div v-if="problemAddons.length === 0" class="text-xs text-slate-500">
              No extra addons configured for this service.
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label
                v-for="ad in problemAddons"
                :key="ad.uniqueId"
                class="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  :value="ad.uniqueId"
                  v-model="selectedAddonIds"
                  class="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div class="flex-1">
                  <p class="font-medium text-slate-800">{{ ad.name }}</p>
                  <p class="text-slate-400">+₹{{ ad.price || 99 }}</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 2: MY CART & CHECKOUT ───────────────────────────────────── -->
    <div v-if="activeTab === 'cart'" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart class="w-5 h-5 text-indigo-600" />
            Review Your Service Cart
          </h2>
          <button
            @click="fetchCart"
            class="text-xs text-indigo-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div v-if="!cart || !cart.items || cart.items.length === 0" class="py-12 text-center text-slate-500 text-sm">
          Your cart is currently empty. Go to Services Catalog to add items!
        </div>

        <div v-else class="space-y-4">
          <!-- Item list -->
          <div
            v-for="item in cart.items"
            :key="item.uniqueId"
            class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div>
              <h4 class="text-sm font-semibold text-slate-800">{{ (item as any).problemName || 'Service Item #' + item.uniqueId.slice(0, 6) }}</h4>
              <p class="text-xs text-slate-500">Qty: {{ item.quantity || 1 }} × ₹{{ item.unitPrice || item.totalPrice }}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm font-bold text-slate-900">₹{{ item.totalPrice }}</span>
              <button
                @click="removeCartItem(item.uniqueId)"
                class="text-slate-400 hover:text-red-600 transition-colors p-1"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Booking Slot & Address Attachment -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Service Schedule Slot</label>
              <select
                v-model="cartSlot"
                class="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option>Tomorrow, 09:00 AM - 11:00 AM</option>
                <option>Tomorrow, 11:00 AM - 01:00 PM</option>
                <option>Tomorrow, 02:00 PM - 04:00 PM</option>
                <option>Day After, 10:00 AM - 12:00 PM</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Special Instructions / Notes</label>
              <input
                v-model="cartNotes"
                placeholder="Gate code, landmark, or instructions..."
                class="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Coupon code input -->
          <div class="pt-4 border-t border-slate-100 flex gap-2">
            <input
              v-model="couponCode"
              placeholder="Enter promo coupon code (e.g. WELCOME50)"
              class="flex-1 text-xs rounded-lg border-slate-300 shadow-sm uppercase font-mono"
            />
            <button
              @click="applyCoupon"
              class="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200"
            >
              Apply
            </button>
          </div>

          <!-- Price Summary -->
          <div class="p-4 bg-indigo-50/50 rounded-xl space-y-2 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Item Total</span>
              <span>₹{{ cart.totalAmount || 0 }}</span>
            </div>
            <div v-if="couponDiscount" class="flex justify-between text-emerald-600 font-semibold">
              <span>Coupon Discount</span>
              <span>-₹{{ couponDiscount }}</span>
            </div>
            <div class="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-indigo-100">
              <span>Final Payable</span>
              <span>₹{{ Math.max(0, (cart.totalAmount || 0) - (couponDiscount || 0)) }}</span>
            </div>
          </div>

          <!-- Checkout CTA -->
          <button
            @click="checkoutOrder"
            :disabled="isLoading"
            class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck class="w-4 h-4" />
            Confirm Booking & Place Order
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB 3: ORDERS & TRACKING ────────────────────────────────────── -->
    <div v-if="activeTab === 'orders'" class="space-y-4 max-w-4xl mx-auto">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-800">My Service Bookings</h2>
        <button
          @click="fetchOrders"
          class="text-xs text-indigo-600 hover:underline flex items-center gap-1"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          Refresh Orders
        </button>
      </div>

      <div v-if="orders.length === 0" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
        No past orders found. Place an order to track it here!
      </div>

      <div
        v-for="order in orders"
        :key="order.orderId"
        class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-900">#{{ order.orderId }}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                {{ order.status }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                {{ order.paymentStatus }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Booked for: {{ order.scheduledDate || 'Tomorrow' }} • {{ order.scheduledTime || 'Morning' }}</p>
          </div>
          <span class="text-base font-bold text-slate-900">₹{{ order.totalAmount }}</span>
        </div>

        <!-- Action Buttons for Order -->
        <div class="flex flex-wrap items-center gap-2 pt-2">
          <!-- Generate Arrival OTP -->
          <button
            @click="generateArrivalOtp(order.orderId)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
          >
            Show Arrival OTP
          </button>

          <!-- File Rework Claim -->
          <button
            v-if="order.status === 'COMPLETED'"
            @click="reworkModal = { open: true, orderId: order.orderId, reason: '' }"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          >
            Claim Rework / Warranty
          </button>

          <!-- Submit Review -->
          <button
            v-if="order.status === 'COMPLETED'"
            @click="reviewModal = { open: true, orderId: order.orderId, rating: 5, comment: '' }"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1"
          >
            <Star class="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
            Rate & Review
          </button>

          <!-- Cancel Order -->
          <button
            v-if="order.status === 'PENDING' || order.status === 'ACCEPTED'"
            @click="cancelOrder(order.orderId)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 ml-auto"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB 4: WALLET & BALANCES ────────────────────────────────────── -->
    <div v-if="activeTab === 'wallet'" class="max-w-4xl mx-auto space-y-6">
      <!-- Balance Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-sm">
          <p class="text-xs uppercase tracking-wider text-indigo-200 font-medium">Withdrawable Balance</p>
          <h3 class="text-2xl font-black mt-2">₹{{ wallet?.balance ?? 0 }}</h3>
          <p class="text-xs text-indigo-200 mt-1">Available for order checkout</p>
        </div>

        <div class="p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl shadow-sm">
          <p class="text-xs uppercase tracking-wider text-amber-100 font-medium">Promo & Bonus Credit</p>
          <h3 class="text-2xl font-black mt-2">₹{{ wallet?.nonWithdrawableAmount ?? 0 }}</h3>
          <p class="text-xs text-amber-100 mt-1">Non-withdrawable (consumed first)</p>
        </div>

        <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-medium">Quick Top-Up</p>
            <div class="flex gap-2 mt-2">
              <input
                type="number"
                v-model="rechargeAmount"
                class="w-full text-xs rounded-lg border-slate-300 font-bold"
              />
              <button
                @click="rechargeWallet"
                class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black shrink-0"
              >
                Add Cash
              </button>
            </div>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Instant gateway verification simulation</p>
        </div>
      </div>

      <!-- Transaction Ledger -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-800">Transaction History</h3>
        <div v-if="transactions.length === 0" class="py-6 text-center text-xs text-slate-400">
          No transactions recorded yet.
        </div>
        <div
          v-for="tx in transactions"
          :key="tx.transactionId"
          class="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 text-xs"
        >
          <div>
            <p class="font-semibold text-slate-800">{{ tx.purpose || 'Transaction' }}</p>
            <p class="text-slate-400 text-[10px]">{{ tx.createdAt || 'Recent' }}</p>
          </div>
          <span
            class="font-bold"
            :class="tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-800'"
          >
            {{ tx.type === 'CREDIT' ? '+' : '-' }}₹{{ tx.amount }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── TAB 5: REWARDS & SCRATCH CARDS ──────────────────────────────── -->
    <div v-if="activeTab === 'rewards'" class="max-w-4xl mx-auto space-y-6">
      <!-- Claim Welcome Coupon -->
      <div class="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 class="text-lg font-bold">Claim Your Welcome Coupon</h3>
          <p class="text-xs text-purple-100 mt-1">Enter your referral or promo code to credit bonus into your account.</p>
        </div>
        <div class="flex gap-2 w-full md:w-auto">
          <input
            v-model="welcomeCouponCode"
            placeholder="Coupon Code"
            class="px-3 py-2 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 text-xs uppercase font-mono"
          />
          <button
            @click="claimWelcomeCoupon"
            class="px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-purple-50 shadow-sm shrink-0"
          >
            Claim Voucher
          </button>
        </div>
      </div>

      <!-- Scratch Cards Section -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
          <Gift class="w-5 h-5 text-amber-500" />
          My Reward Scratch Cards
        </h3>

        <div v-if="scratchCards.length === 0" class="py-8 text-center text-xs text-slate-400">
          No scratch cards available right now. Complete orders to earn rewards!
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="card in scratchCards"
            :key="card.id"
            class="p-5 rounded-2xl border text-center transition-all flex flex-col justify-between"
            :class="card.isScratched ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md'"
          >
            <div v-if="!card.isScratched">
              <Sparkles class="w-8 h-8 mx-auto text-amber-100 mb-2" />
              <h4 class="font-bold text-sm">Lucky Reward Card</h4>
              <p class="text-[11px] text-amber-100 mt-1">Tap below to scratch and reveal your reward!</p>
            </div>
            <div v-else>
              <CheckCircle2 class="w-6 h-6 mx-auto text-emerald-500 mb-2" />
              <p class="text-xs text-slate-500 font-medium">Revealed Cashback</p>
              <h4 class="font-black text-xl text-slate-900 mt-1">₹{{ card.rewardAmount || 50 }}</h4>
              <p class="text-[10px] text-emerald-600 font-bold mt-1">Credited to wallet</p>
            </div>

            <button
              v-if="!card.isScratched"
              @click="scratchRewardCard(card.id)"
              :disabled="scratchingCardId === card.id"
              class="mt-4 py-2 bg-white text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-50 shadow-sm"
            >
              {{ scratchingCardId === card.id ? 'Scratching...' : 'Scratch Now ✨' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 6: SAVED LOCATIONS & ADDRESSES ──────────────────────────── -->
    <div v-if="activeTab === 'locations'" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-800">Add New Geo-Location</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Full Address</label>
            <input
              v-model="newLocationForm.address"
              placeholder="House, street, area..."
              class="w-full text-xs rounded-lg border-slate-300"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nearby Landmark</label>
            <input
              v-model="newLocationForm.landmark"
              placeholder="e.g. Near City Center Mall"
              class="w-full text-xs rounded-lg border-slate-300"
            />
          </div>
        </div>
        <button
          @click="saveLocation"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
        >
          Save Address
        </button>
      </div>

      <!-- List of locations -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-800">Saved Places</h3>
        <div v-if="userLocations.length === 0" class="py-6 text-center text-xs text-slate-400">
          No saved locations found.
        </div>
        <div
          v-for="loc in userLocations"
          :key="loc.uniqueId"
          class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
        >
          <div>
            <p class="font-semibold text-slate-800">{{ loc.address || 'Saved Place' }}</p>
            <p class="text-slate-400 text-[10px]">Tag: {{ loc.tag || 'Default' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="markPrimaryLocation(loc.uniqueId)"
              class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
            >
              Set Primary
            </button>
            <button
              @click="deleteLocation(loc.uniqueId)"
              class="text-slate-400 hover:text-red-600 p-1"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 7: NOTIFICATIONS ────────────────────────────────────────── -->
    <div v-if="activeTab === 'notifications'" class="max-w-3xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-800">In-App Notifications</h2>
        <span class="text-xs text-slate-500">{{ notifications.length }} alerts</span>
      </div>

      <div v-if="notifications.length === 0" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
        No notifications right now.
      </div>

      <div
        v-for="n in notifications"
        :key="n.id"
        class="p-4 rounded-xl border transition-all flex items-start justify-between gap-4"
        :class="n.isRead ? 'bg-white border-slate-200' : 'bg-indigo-50/60 border-indigo-200'"
      >
        <div>
          <h4 class="text-sm font-semibold text-slate-800">{{ n.title }}</h4>
          <p class="text-xs text-slate-600 mt-1">{{ n.message }}</p>
          <span class="text-[10px] text-slate-400 mt-2 block">{{ n.createdAt || 'Recent' }}</span>
        </div>
        <button
          v-if="!n.isRead"
          @click="markNotificationRead(n.id)"
          class="text-xs text-indigo-600 hover:underline shrink-0"
        >
          Mark as read
        </button>
      </div>
    </div>

    <!-- Arrival OTP Modal -->
    <div
      v-if="arrivalOtpModal.open"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div class="bg-white p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl">
        <ShieldCheck class="w-12 h-12 text-indigo-600 mx-auto" />
        <h3 class="text-lg font-bold text-slate-800">Partner Arrival OTP</h3>
        <p class="text-xs text-slate-500">Share this verification OTP with the service partner upon their arrival at your door:</p>
        <div class="py-3 px-6 bg-slate-100 rounded-xl font-mono text-3xl font-black text-indigo-600 tracking-widest">
          {{ arrivalOtpModal.otp }}
        </div>
        <button
          @click="arrivalOtpModal.open = false"
          class="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Rework Dispute Modal -->
    <div
      v-if="reworkModal.open"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div class="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
        <h3 class="text-base font-bold text-slate-800">Claim Service Rework</h3>
        <p class="text-xs text-slate-500">Explain the issue encountered with your completed service. Our team will dispatch inspection and fix.</p>
        <textarea
          v-model="reworkModal.reason"
          rows="4"
          placeholder="Describe what was not done properly or broken..."
          class="w-full text-xs rounded-xl border-slate-300 p-3"
        ></textarea>
        <div class="flex gap-2 justify-end">
          <button
            @click="reworkModal.open = false"
            class="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            @click="submitReworkClaim"
            class="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
          >
            Submit Claim
          </button>
        </div>
      </div>
    </div>

    <!-- Review Rating Modal -->
    <div
      v-if="reviewModal.open"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div class="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl text-center">
        <h3 class="text-base font-bold text-slate-800">Rate Service Quality</h3>
        <div class="flex justify-center gap-2 py-2">
          <button
            v-for="star in [1, 2, 3, 4, 5]"
            :key="star"
            @click="reviewModal.rating = star"
            class="p-1 hover:scale-110 transition-transform"
          >
            <Star
              class="w-7 h-7"
              :class="star <= reviewModal.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'"
            />
          </button>
        </div>
        <textarea
          v-model="reviewModal.comment"
          rows="3"
          placeholder="Write feedback for the service partner..."
          class="w-full text-xs rounded-xl border-slate-300 p-3 text-left"
        ></textarea>
        <div class="flex gap-2 justify-end">
          <button
            @click="reviewModal.open = false"
            class="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            @click="submitOrderReview"
            class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
