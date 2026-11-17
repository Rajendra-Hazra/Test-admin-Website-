import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
    },
    // Admin routes (require auth)
    {
      path: '/admin/category',
      name: 'category',
      component: () => import('../views/admin/CategoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/subcategory',
      name: 'subcategory',
      component: () => import('../views/admin/SubCategoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/service-problem',
      name: 'service-problem',
      component: () => import('../views/admin/ServiceProblemView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/city',
      name: 'city',
      component: () => import('../views/admin/CityView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/problem-pricing',
      name: 'problem-pricing',
      component: () => import('../views/admin/ProblemPricingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/availability',
      name: 'availability',
      component: () => import('../views/admin/AvailabilityCheckerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/coupon',
      name: 'coupon',
      component: () => import('../views/admin/CouponView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/ground-managers',
      name: 'ground-managers',
      component: () => import('../views/admin/GroundManagerAdminView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/orders',
      name: 'orders',
      component: () => import('../views/admin/OrdersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'users',
      component: () => import('../views/admin/UsersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/referral',
      name: 'referral',
      alias: ['/admin/referrals', '/admin/referral-management'],
      component: () => import('../views/admin/ReferralView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/notifications',
      name: 'notifications',
      alias: ['/admin/push-notifications', '/admin/push-notification-management'],
      component: () => import('../views/admin/NotificationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/banners',
      name: 'banners',
      alias: ['/admin/hero-banners', '/admin/banner-management'],
      component: () => import('../views/admin/BannerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/ad-placements',
      name: 'admin-ad-placements',
      alias: ['/admin/advertising', '/admin/ad-placement'],
      component: () => import('../views/admin/AdPlacementView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/reworks',
      name: 'admin-reworks',
      alias: ['/admin/rework', '/admin/rework-requests', '/admin/rework-management'],
      component: () => import('../views/admin/ReworkView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/subscriptions',
      name: 'admin-subscriptions',
      alias: ['/admin/subscription', '/admin/subscription-management', '/admin/memberships'],
      component: () => import('../views/admin/SubscriptionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/videos',
      name: 'admin-videos',
      alias: ['/admin/video-management', '/admin/customer-videos', '/admin/training-videos'],
      component: () => import('../views/admin/VideoView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/finance',
      name: 'admin-finance',
      alias: [
        '/admin/wallets',
        '/admin/wallet-management',
        '/admin/revenue',
        '/admin/financial-overview',
        '/admin/withdrawals-management',
      ],
      component: () => import('../views/admin/FinanceView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/partner-financial-settings',
      name: 'admin-partner-financial-settings',
      alias: [
        '/admin/partner-finance-settings',
        '/admin/commission-settings',
        '/admin/cancellation-settings',
        '/admin/partner-incentives',
      ],
      component: () => import('../views/admin/PartnerFinancialSettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/app-icons',
      name: 'admin-app-icons',
      alias: [
        '/admin/app-icon-management',
        '/admin/customer-app-icons',
        '/admin/partner-app-icons',
        '/admin/app-icon-history',
      ],
      component: () => import('../views/admin/AppIconManagementView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/partner/training',
      name: 'partner-training',
      alias: ['/partner/learning', '/partner/videos'],
      component: () => import('../views/partner/PartnerTrainingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/partner-media',
      name: 'partner-media',
      alias: '/admin/partner-verification',
      component: () => import('../views/admin/PartnerMediaView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/partner/documents',
      redirect: '/admin/partner-media',
    },
    {
      path: '/partner/orders',
      name: 'partner-orders',
      component: () => import('../views/partner/PartnerOrdersView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Route guard — redirect to /login if not authenticated
router.beforeEach((to) => {
  const authStore = useAuthStore()
  // If user is not logged in, block access to all pages and redirect to login
  if (to.name !== 'login' && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
  // If user is already logged in and visits login page, redirect to home
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
