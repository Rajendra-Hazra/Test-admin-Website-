# AGENTS.md — OMIBAY Frontend (`client/`)

Guidelines, architectural conventions, and directory layout for AI coding agents working within `client/`.

---

## 1. Overview & Technology Stack

The `client` directory houses the frontend Single Page Application (SPA) for the **OMIBAY** service marketplace. It connects to the backend Spring Boot REST services and provides role-tailored dashboards and management views.

| Layer / Concern | Technology | Details / Versions |
|---|---|---|
| **Framework** | Vue 3 | `^3.5.40` (Composition API, `<script setup lang="ts">` exclusively) |
| **Build Tool & Dev Server** | Vite 8 | `^8.1.5`, Port `3000`, proxies `/api` to `http://localhost:8080` |
| **Type System** | TypeScript | `~6.0.0`, strict type checking with `vue-tsc --build` |
| **Styling** | Tailwind CSS v4 | `^4.3.3` with `@tailwindcss/vite` & custom design tokens in `main.css` |
| **State Management** | Pinia | `^4.0.2` (Setup store pattern, `pinia-plugin-persistedstate`) |
| **Router** | Vue Router | `^5.2.0` (HTML5 history mode, auth guard redirection) |
| **Icons** | Lucide Icons | `lucide-vue-next` (`^1.0.0`) |
| **Toasts & Notifications** | Vue Sonner | `vue-sonner` (`^2.0.9`) with `@/utils/toast.ts` helper |
| **Charts** | Highcharts | `highcharts` (`^13.0.2`), `highcharts-vue` (`^2.0.2`) |
| **Auth & Identity** | Firebase Auth | Google OAuth + Phone OTP + JWT Bearer token |
| **Payment Gateway** | Cashfree JS SDK | `@cashfreepayments/cashfree-js` |

---

## 2. Directory Structure

```
client/
├── public/                     # Static public assets (favicon, etc.)
│   └── favicon.ico
├── src/
│   ├── api/                    # Centralized HTTP & REST integration layer
│   │   ├── client.ts           # Custom HttpClient (fetch wrapper, Bearer tokens, refresh rotation)
│   │   └── index.ts            # Typed endpoint methods grouped by domain context (api.*)
│   ├── assets/                 # Global styles, fonts, and static vectors
│   │   ├── base.css            # Base color palette and CSS variables
│   │   ├── main.css            # Tailwind CSS v4 entry + @theme tokens (fluid typography, colors)
│   │   └── logo.svg
│   ├── components/
│   │   ├── common/             # Generic, reusable atomic & molecular UI components
│   │   │   ├── Popup.vue       # Dialog / modal container (backdrop, size, keyboard esc)
│   │   │   ├── Select.vue      # Searchable single/multi select dropdown
│   │   │   ├── Table.vue       # Feature-packed data table (sorting, pagination, search slots)
│   │   │   ├── Toggle.vue      # Switch toggle component
│   │   │   └── Tooltip.vue     # Hover tooltip component
│   │   ├── roles/              # Role-specific dashboard views rendered dynamically in HomeView
│   │   │   ├── AdminView.vue         # Admin: withdrawals, coupons, prizes, reworks, settings
│   │   │   ├── CustomerView.vue      # Customer: catalog, cart, orders, wallet, rewards, addresses
│   │   │   ├── GroundManagerView.vue # Ground Manager: field reports, dispute rework cases
│   │   │   ├── OrganizationView.vue  # Corporate: bulk service requests, GST invoices, quotations
│   │   │   └── PartnerView.vue       # Partner: incoming orders, arrival verification, earnings
│   │   ├── AppHeader.vue       # Top header bar (branding, profile dropdown, logout, role badge)
│   │   └── SideNav.vue         # Collapsible sidebar with role-filtered navigation items
│   ├── composables/            # Shared reactive composition functions
│   │   └── useSidebar.ts       # Sidebar collapse state synchronized with localStorage
│   ├── config/                 # External service configurations
│   │   └── FirebaseConfig.ts   # Firebase client web app initialization
│   ├── router/
│   │   └── index.ts            # Vue router routes, route meta, and global beforeEach auth guard
│   ├── services/               # Specialized third-party service clients
│   │   └── firebaseAuth.ts     # Firebase Phone OTP, Recaptcha verifier, Google sign-in
│   ├── stores/                 # Pinia global state stores (Setup syntax)
│   │   ├── app.ts              # Temporary global app state & UI flags
│   │   ├── auth.ts             # Active user session, access/refresh tokens, role getters
│   │   └── counter.ts          # Starter / demo store
│   ├── types/                  # TypeScript interface and type definitions
│   │   ├── api.ts              # All backend DTOs, request payloads, response schemas, and enums
│   │   └── cashfree-js.d.ts    # Ambient declaration for Cashfree SDK
│   ├── utils/                  # Helper utilities
│   │   └── toast.ts            # Standardized notification helper wrapping vue-sonner
│   ├── views/                  # Primary routed pages
│   │   ├── admin/              # Dedicated administrative catalog & management views
│   │   │   ├── AvailabilityCheckerView.vue
│   │   │   ├── CategoryView.vue
│   │   │   ├── CityView.vue
│   │   │   ├── CouponView.vue
│   │   │   ├── GroundManagerAdminView.vue
│   │   │   ├── OrdersView.vue
│   │   │   ├── PartnerMediaView.vue
│   │   │   ├── ProblemPricingView.vue
│   │   │   ├── ServiceProblemView.vue
│   │   │   ├── SubCategoryView.vue
│   │   │   └── UsersView.vue
│   │   ├── partner/            # Dedicated partner views
│   │   │   └── PartnerOrdersView.vue
│   │   ├── AboutView.vue
│   │   ├── Home.vue
│   │   ├── HomeView.vue        # Dynamic role dashboard container (renders components/roles/*)
│   │   └── Login.vue           # Authentication page (Phone OTP, Google Auth, Admin portal)
│   ├── App.vue                 # Root application shell (Toaster, AppHeader, SideNav, RouterView)
│   ├── env.d.ts                # Vite client type definitions
│   └── main.ts                 # Application entrypoint (Pinia, Vue Router, base styling)
├── .env.development           # Local development environment variables (Vite proxy config)
├── .env.production            # Production environment variables
├── index.html                  # HTML template entrypoint
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript base config
├── tsconfig.app.json           # TypeScript app config
├── tsconfig.node.json          # TypeScript node/tooling config
├── vercel.json                 # Vercel SPA routing rewrite rules
└── vite.config.ts              # Vite configuration (plugins, alias @ -> src, dev proxy)
```

---

## 3. Strict Development Rules for AI Agents

Any AI agent modifying or adding code in `client/` **MUST** follow these rules:

### 1. Component Architecture & Script Setup
- **Strictly `<script setup lang="ts">`**: Never use Options API (`export default { data() ... }`) or legacy Vue patterns.
- **Section Ordering**:
  1. `<script setup lang="ts">`
  2. `<template>`
  3. `<style>` (avoid when possible; use Tailwind CSS utility classes instead).
- **Component Naming**: PascalCase for component filenames and imports (`CategoryView.vue`, `AppHeader.vue`).
- **Props & Emits Declaration**: Use TypeScript pure type-based declarations:
  ```ts
  interface Props {
    title: string
    isOpen?: boolean
  }
  const props = withDefaults(defineProps<Props>(), {
    isOpen: false,
  })

  const emit = defineEmits<{
    (e: 'close'): void
    (e: 'submit', id: string): void
  }>()
  ```

### 2. Styling & Layout Conventions
- **Tailwind CSS v4 Only**: Do NOT write raw inline styles (`style="..."`) or separate scoped CSS classes when Tailwind utilities can achieve the design.
- **Theme Tokens**: Respect the fluid typography and color tokens defined in `src/assets/main.css` (e.g. `text-para-base`, `text-sub-h6`, `bg-surface-1`, etc.).
- **Dynamic Layout Margin**: The root layout in `App.vue` shifts content dynamically based on sidebar state:
  ```html
  <main :class="[!isLoggedIn ? 'ml-0' : isCollapsed ? 'ml-16' : 'ml-52']">
  ```
  Components must fit responsively within this layout structure.

### 3. API & Data Access Layer
- **Centralized API Calls**: NEVER use raw `fetch()` or `axios` directly inside components or views.
- **Always Use `@/api`**: All backend requests must be routed through `api` exported from `src/api/index.ts`.
- **Add New Endpoints Correctly**:
  1. Define the TypeScript interfaces in `src/types/api.ts`.
  2. Add the method under the corresponding bounded domain in `src/api/index.ts` using `http.get`, `http.post`, `http.put`, `http.delete`, or `http.patch`.
  3. Call `api.<domain>.<method>()` in the component.
- **Authentication & Headers**: `HttpClient` (`src/api/client.ts`) automatically attaches the Bearer token from `localStorage` and handles token refreshes. Never manually add `Authorization` headers.

### 4. Role-Based Navigation & Dashboards
The application dynamically switches views and permissions for 5 primary roles:
- `CUSTOMER`
- `PARTNER`
- `ORGANISATION`
- `ADMIN`
- `GROUND_MANAGER`

- **Role Dashboard (`HomeView.vue`)**: Renders role-specific components from `src/components/roles/` based on `authStore.user?.role`.
- **Navigation (`SideNav.vue`)**: When adding new navigation items, specify:
  - `hiddenForRoles`: array of roles that cannot see the link.
  - `visibleForRoles`: array of roles exclusively allowed to see the link.
- **Route Protection**: When adding a route in `src/router/index.ts`, include `meta: { requiresAuth: true }` unless it is explicitly public.

### 5. Reusable Common Components
Before building new UI primitives, always check and reuse existing components in `src/components/common/`:
- **`Table.vue`**: High-performance data table supporting custom headers (`Header[]`), sort, pagination, and scoped column slots (`#cell(action)`, `#cell(image)`, etc.).
- **`Popup.vue`**: Accessible modal dialog with backdrop blur, size variants (`sm`, `md`, `lg`, `xl`), and esc-to-close.
- **`Toggle.vue`**: Standard boolean toggle switch for status/active flags.
- **`Select.vue`**: Searchable dropdown select for single and multiple selections.
- **`Tooltip.vue`**: Popover tooltip for table headers and icons.

### 6. Notifications & User Feedback
- Use `showToast(message, 'success' | 'error' | 'warning' | 'info')` from `@/utils/toast.ts` or `toast` from `vue-sonner`.
- Avoid browser `alert()` or `window.confirm()` in production code. Use `Popup.vue` or `showToast`.

### 7. State Management (Pinia)
- Store files live in `src/stores/`.
- Use the **Setup Store** syntax (`defineStore('name', () => { ... })`).
- Keep persistent state aligned with `localStorage` (like `useAuthStore` in `src/stores/auth.ts`).

---

## 4. Standard Component Pattern (Reference Template)

When creating a new management or catalog view (e.g., in `src/views/admin/` or `src/views/partner/`), follow this standard pattern:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import type { YourDataType } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import { Plus, Pen } from 'lucide-vue-next'

// ── State ─────────────────────────────────────────────────────────────
const items = ref<YourDataType[]>([])
const isLoading = ref(false)
const error = ref('')
const isModalOpen = ref(false)
const isSubmitting = ref(false)

const headers: Header[] = [
  { key: 'name', title: 'Name', align: 'left', sortable: true },
  { key: 'isActive', title: 'Status', align: 'center', sortable: true },
  { key: 'action', title: 'Action', align: 'center' },
]

// ── Data Fetching ─────────────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  error.value = ''
  try {
    const resp = await api.yourDomain.getAll()
    const raw = (resp as any)?.data ?? resp
    items.value = Array.isArray(raw) ? raw : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to fetch items'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Actions -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Feature Title</h1>
        <p class="text-sm text-gray-500">Manage feature data and configuration.</p>
      </div>
      <button
        type="button"
        @click="isModalOpen = true"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        <Plus class="size-4" />
        <span>Add New</span>
      </button>
    </div>

    <!-- Data Table -->
    <Table
      :items="items"
      :headers="headers"
      :loading="isLoading"
      paginate
      :itemsPerPage="10"
    >
      <template #cell(isActive)="{ item }">
        <span
          class="px-2 py-1 text-xs rounded-full"
          :class="item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
        >
          {{ item.isActive ? 'Active' : 'Inactive' }}
        </span>
      </template>

      <template #cell(action)="{ item }">
        <button class="p-1 hover:bg-gray-100 rounded text-gray-600" title="Edit">
          <Pen class="size-4" />
        </button>
      </template>
    </Table>

    <!-- Modal Form -->
    <Popup v-model="isModalOpen" title="Add Item" size="md">
      <!-- Form content here -->
    </Popup>
  </div>
</template>
```

---

## 5. Development & Verification Commands

Always run these commands to verify client-side changes:

```bash
# Type check client files (Strict check via vue-tsc):
npm --prefix client run type-check

# Run dev server on port 3000:
npm --prefix client run dev

# Full client production build:
npm --prefix client run build
```

> [!IMPORTANT]
> Always run `npm --prefix client run type-check` after making code changes to guarantee zero TypeScript or template compilation errors.

