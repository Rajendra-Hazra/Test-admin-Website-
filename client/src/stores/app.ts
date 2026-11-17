import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type {
  City,
  ServiceType,
  ServiceCategory,
  ServiceProblem,
  Cart,
  UserProfile,
} from '@/types/api'

export const useAppStore = defineStore('app', () => {
  // --- Auth State ---
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<UserProfile | null>(null)

  // --- Location / City State ---
  const selectedCity = ref<City | null>(null)
  const activeCities = ref<City[]>([])

  // --- Catalog State ---
  const serviceTypes = ref<ServiceType[]>([])
  const serviceCategories = ref<ServiceCategory[]>([])
  const serviceProblems = ref<ServiceProblem[]>([])

  // --- Cart State ---
  const cart = ref<Cart | null>(null)

  // --- Actions: Auth ---
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('access_token', newToken)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    cart.value = null
    localStorage.removeItem('access_token')
  }

  async function fetchUserProfile() {
    if (!token.value) return
    const res = await api.users.getProfile()
    if (res.data) {
      user.value = res.data
    }
  }

  // --- Actions: Cities ---
  async function fetchActiveCities() {
    const list = await api.cities.getActive()
    activeCities.value = list
    if (list.length > 0 && !selectedCity.value) {
      selectedCity.value = list[0] ?? null
    }
  }

  function setSelectedCity(city: City) {
    selectedCity.value = city
  }

  // --- Actions: Catalog ---
  async function fetchServiceTypes() {
    serviceTypes.value = await api.services.getAllTypes()
  }

  async function fetchCategories(serviceTypeId: string) {
    serviceCategories.value = await api.services.getCategoriesByType(serviceTypeId)
  }

  async function fetchProblems(categoryId: string) {
    serviceProblems.value = await api.services.getProblemsByCategory(categoryId)
  }

  // --- Actions: Cart ---
  async function fetchCart(userId: string) {
    cart.value = await api.cart.get(userId)
  }

  async function clearCart(userId: string) {
    await api.cart.clear(userId)
    cart.value = null
  }

  return {
    // State
    token,
    user,
    selectedCity,
    activeCities,
    serviceTypes,
    serviceCategories,
    serviceProblems,
    cart,

    // Actions
    setToken,
    clearAuth,
    fetchUserProfile,
    fetchActiveCities,
    setSelectedCity,
    fetchServiceTypes,
    fetchCategories,
    fetchProblems,
    fetchCart,
    clearCart,
  }
})
