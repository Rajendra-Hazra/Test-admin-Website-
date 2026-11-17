<!-- components/DataTable.vue -->
<template>
  <div class="w-full min-w-0 max-w-full bg-white rounded-xl mb-2" :class="props?.padding">

    <!-- Loading State -->
    <div v-if="loading" class="p-8 text-center bg-white">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#800020] border-t-transparent"></div>
      <p class="mt-2 text-sm text-[#6B7280]">Loading data...</p>
    </div>

    <!-- Table Content -->
    <div v-else class="flex flex-col h-full bg-white" :class="props.height ? 'border-t border-b border-[#E5E7EB]' : ''">
      <div
        class="min-w-0 max-w-full overflow-auto bg-white"
        :style="props.height ? { maxHeight: props.height } : {}"
      >
        <table class="min-w-full divide-y divide-[#E5E7EB] border border-collapse border-[#E5E7EB] rounded-xl bg-white" :style="{ tableLayout: props.tableLayout }">
          <thead class="bg-white text-sm sticky top-0 z-10 border-b border-[#E5E7EB]">
            <tr>
              <!-- Checkbox Column -->
              <th v-if="selectable" class="py-3 px-3 bg-white">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                  class="rounded border-[#E5E7EB] text-[#800020] focus:ring-[#800020]"
                />
              </th>

              <!-- Dynamic Headers -->
              <th
                v-for="header in computedHeaders"
                :key="header.key"
                :class="{
                  'text-left pl-4': header.align === 'left',
                  'text-center': header.align === 'center',
                  'text-right pr-4': header.align === 'right'
                }"
                class="py-3 px-3 bg-white text-[#202124] tracking-wider cursor-pointer hover:bg-[#F7F7F8] font-semibold transition-colors"
                :style="{ width: header.width }"
                @click="header.sortable !== false ? handleSortClick(header.key) : undefined"
              >
                <div
                  class="w-full flex group items-center"
                  :class="{
                    'justify-start': header.align === 'left',
                    'justify-center': header.align === 'center',
                    'justify-end': header.align === 'right'
                  }"
                >
                  <span class="relative">
                    <Tooltip v-if="header.tooltip" :text="header.tooltip">
                      {{ header.title }}
                    </Tooltip>
                    <span v-else>{{ header.title }}</span>
                  </span>

                  <div class="h-4 w-4 ml-1.5 flex flex-col items-center justify-center -space-y-1.5" v-if="header.sortable">
                    <ArrowUpNarrowWide
                      class="h-3 w-3 transition-colors duration-200"
                      :class="sortKey === header.key && sortDirection === 'asc' ? 'text-[#800020]' : 'text-slate-400'"
                    />
                    <ArrowDownWideNarrow
                      class="h-3 w-3 transition-colors duration-200"
                      :class="sortKey === header.key && sortDirection === 'desc' ? 'text-[#800020]' : 'text-slate-400'"
                    />
                  </div>
                </div>
              </th>
            </tr>
            <!-- Filter Row Slot -->
            <tr v-if="$slots.filters" class="bg-white border-b border-[#E5E7EB]">
              <th v-if="selectable" class="py-2 bg-white"></th>
              <slot name="filters" />
            </tr>
          </thead>

          <tbody class="bg-white divide-y divide-[#E5E7EB] text-xs">
            <!-- Row Slot Template -->
            <template v-if="$slots['row']">
              <slot
                v-for="(item, index) in paginatedItems"
                :key="getItemKey(item, index)"
                name="row"
                :item="item"
                :index="index"
                :selected="selectedItemKeys.includes(getItemKey(item, index))"
              />
            </template>

            <!-- Default Row -->
            <template v-else>
              <tr
                v-for="(item, index) in paginatedItems"
                :key="getItemKey(item, index)"
                :class="[
                  'hover:bg-[#F7F7F8] transition-colors duration-150 font-medium bg-white text-[#202124] border-b border-[#E5E7EB] last:border-0',
                  selectedItemKeys.includes(getItemKey(item, index)) ? 'bg-[#FAF0F2]' : ''
                ]"
              >
                <!-- Checkbox Cell -->
                <td v-if="selectable" class="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedItemKeys.includes(getItemKey(item, index))"
                    @change="toggleRowSelection(getItemKey(item, index))"
                    class="rounded border-[#E5E7EB] text-[#800020] focus:ring-[#800020]"
                  />
                </td>

                <!-- Data Cells -->
                <template v-for="header in computedHeaders" :key="header.key">
                  <td
                    class="py-3 px-3 text-sm text-[#202124]"
                    :class="{
                      'text-left pl-4': header.align === 'left',
                      'text-center': header.align === 'center',
                      'text-right pr-4': header.align === 'right'
                    }"
                    :style="{ width: header.width }"
                  >
                    {{ item[header.key] }}
                  </td>
                </template>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="paginate" class="flex flex-col min-[425px]:flex-row bg-white justify-between min-[425px]:justify-end items-center gap-4 p-3 text-sm text-[#6B7280] border-t border-[#E5E7EB] mt-2">
        <label class="flex items-center gap-2 text-xs text-[#6B7280]">
          Rows per page:
          <div class="relative inline-block">
            <button
              ref="triggerRef"
              type="button"
              @click="toggleDropdown"
              class="flex items-center gap-2 border border-[#E5E7EB] rounded-lg pl-3 pr-7 py-1.5 text-xs
                     bg-white text-[#202124] cursor-pointer
                     transition-colors duration-150
                     hover:bg-[#F7F7F8] hover:border-[#D1D5DB]
                     focus:outline-none focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
            >
              {{ selectedLabel }}
            </button>

            <ChevronDown
              class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#6B7280]
                     transition-transform duration-150"
              :class="{ 'rotate-180': isOpen }"
            />

            <Transition :name="dropDirection === 'up' ? 'dropdown-up' : 'dropdown-down'">
              <ul
                v-show="isOpen"
                ref="dropdownRef"
                :style="{ minWidth: `px` }"
                class="absolute z-45 py-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden
                       shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                :class="dropDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'"
              >
                <li
                  v-for="option in itemsPerPageOptionsWithAll"
                  :key="option.value"
                  @click="selectOption(option)"
                  class="flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer
                         transition-colors duration-100"
                  :class="option.value === itemsPerPageLocal
                    ? 'bg-[#FAF0F2] text-[#800020] font-semibold'
                    : 'text-[#202124] hover:bg-[#F7F7F8]'"
                >
                  <span>{{ option.label }}</span>
                </li>
              </ul>
            </Transition>
          </div>
        </label>

        <div class="flex items-center gap-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 border border-[#E5E7EB] bg-white text-[#202124] text-xs font-medium cursor-pointer rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-[#F7F7F8]"
          >
            Prev
          </button>
          <span class="whitespace-nowrap text-xs text-[#6B7280]">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 border border-[#E5E7EB] bg-white text-[#202124] text-xs font-medium cursor-pointer rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-[#F7F7F8]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown } from 'lucide-vue-next'
import { ref, computed, watch, type PropType, onMounted, nextTick, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Tooltip from './Tooltip.vue'
// import CheckBox from '../Builder/common/CheckBox.vue'

// Extend dayjs with custom format parsing
dayjs.extend(customParseFormat)

// Types (same as before)
export interface DataTableItem {
  [key: string]: any
  id?: string | number
}

export interface Header {
  key: string
  title: string
  sortable?: boolean
  tooltip?: string
  align?: 'left' | 'center' | 'right'
  width?: string
}

export interface ItemsPerPageOption {
  value: number
  label: string
}

// Props (same as before)
const props = defineProps({
  items: {
    type: Array as PropType<DataTableItem[]>,
    default: () => []
  },
  headers: {
    type: Array as PropType<Header[]>,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  },
  paginate: {
    type: Boolean,
    default: false
  },
  itemsPerPage: {
    type: Number,
    default: 25
  },
  itemKey: {
    type: String,
    default: 'id'
  },
  centerHeaders: {
    type: Boolean,
    default: true
  },
  centerCells: {
    type: Boolean,
    default: true
  },
  itemsPerPageOptions: {
    type: Array as PropType<number[]>,
    default: () => [25, 50, 100]
  },
  defaultSortKey: {
    type: String as PropType<string | null>,
    default: null
  },
  defaultSortDirection: {
    type: String as PropType<'asc' | 'desc' | null>,
    default: null
  },
  // New prop for custom date formats
  dateFormats: {
    type: Array as PropType<string[]>,
    default: () => [
      'DD-MM-YYYY',
      'D-M-YYYY',
      'YYYY-MM-DD',
      'YYYY-M-D',
      'DD/MM/YYYY',
      'D/M/YYYY',
      'YYYY/MM/DD',
      'YYYY/M/D',
      'MM-DD-YYYY',
      'M-D-YYYY',
      'MM/DD/YYYY',
      'M/D/YYYY'
    ]
  },
  height:{
    type: String ,
    default: null
  },
  padding:{
    type: String ,
    default: 'p-0'
  },
  tableLayout: {
    type: String as PropType<'auto' | 'fixed'>,
    default: 'auto'
  },
  selectedKeys: {
    type: Array as PropType<Array<string | number>>,
    default: () => []
  }
})

// Emits (same as before)
const emit = defineEmits<{
  'selection-change': [selectedItems: DataTableItem[]]
  'items-per-page-change': [value: number]
  'sort-change': [sortState: { key: string | null; direction: 'asc' | 'desc' | null }]
}>()

// State (same as before)
const sortKey = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc' | null>(null)
const selectedItemKeys = ref<Array<string | number>>([...props.selectedKeys])
const currentPage = ref<number>(1)
const itemsPerPageLocal = ref<number>(props.itemsPerPage)

// Type detection utilities
const detectValueType = (value: any): 'date' | 'number' | 'string' | 'boolean' | 'null' => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    // Check if it's a number string
    if (!isNaN(Number(value)) && value.trim() !== '') {
      // But avoid converting phone numbers, IDs etc.
      // Only convert if it looks like a real number (not alphanumeric)
      if (/^-?\d*\.?\d+$/.test(value.trim())) {
        return 'number'
      }
    }

    // Check if it's a date
    for (const format of props.dateFormats) {
      if (dayjs(value, format, true).isValid()) {
        return 'date'
      }
    }

    // Also try ISO format and common date strings
    const isoDate = dayjs(value).isValid()
    if (isoDate) {
      return 'date'
    }
  }

  return 'string'
}

const parseValueForSorting = (value: any, type: 'date' | 'number' | 'string' | 'boolean' | 'null'): any => {
  if (type === 'null') return null
  if (type === 'boolean') return value ? 1 : 0
  if (type === 'number') return Number(value)
  if (type === 'date') {
    // Try parsing with custom formats first
    for (const format of props.dateFormats) {
      const parsed = dayjs(value, format, true)
      if (parsed.isValid()) {
        return parsed.valueOf() // Return timestamp
      }
    }
    // Fallback to ISO parsing
    return dayjs(value).valueOf()
  }
  if (type === 'string') {
    // For case-insensitive sorting, convert to lowercase
    return String(value).toLowerCase().trim()
  }
  return value
}

// Smart comparator function
const smartCompare = (a: any, b: any, direction: 'asc' | 'desc'): number => {
  // Handle null/undefined values
  if (a == null && b == null) return 0
  if (a == null) return direction === 'asc' ? -1 : 1
  if (b == null) return direction === 'asc' ? 1 : -1

  // Detect types
  const typeA = detectValueType(a)
  const typeB = detectValueType(b)

  // If types are different, sort by type order: number < date < string < boolean
  if (typeA !== typeB) {
    const typeOrder = { number: 0, date: 1, string: 2, boolean: 3, null: 4 }
    return direction === 'asc'
      ? typeOrder[typeA] - typeOrder[typeB]
      : typeOrder[typeB] - typeOrder[typeA]
  }

  // Same type - parse values appropriately
  const parsedA = parseValueForSorting(a, typeA)
  const parsedB = parseValueForSorting(b, typeB)

  // Compare based on type
  if (typeA === 'date' || typeA === 'number') {
    if (parsedA < parsedB) return direction === 'asc' ? -1 : 1
    if (parsedA > parsedB) return direction === 'asc' ? 1 : -1
    return 0
  }

  // For strings (already lowercased in parseValueForSorting)
  if (typeA === 'string') {
    return direction === 'asc'
      ? parsedA.localeCompare(parsedB)
      : parsedB.localeCompare(parsedA)
  }

  // For booleans
  if (typeA === 'boolean') {
    if (parsedA === parsedB) return 0
    return direction === 'asc'
      ? parsedA - parsedB
      : parsedB - parsedA
  }

  // Fallback
  const strA = String(a).toLowerCase()
  const strB = String(b).toLowerCase()
  return direction === 'asc'
    ? strA.localeCompare(strB)
    : strB.localeCompare(strA)
}

// Computed (same as before, with updated filteredItems)
const computedHeaders = computed<Header[]>(() => {
  if (props.headers) return props.headers.map(header => ({
    ...header,
    align: header.align || (props.centerHeaders ? 'center' : 'left'),
    sortable: header.sortable !== false
  }))

  if (!props.items.length) return []

  const firstItem = props.items[0]
  if (!firstItem) return []

  return Object.keys(firstItem).map(key => ({
    key,
    title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    sortable: true,
    align: props.centerHeaders ? 'center' : 'left'
  }))
})

const filteredItems = computed<DataTableItem[]>(() => {
  const filtered = [...props.items]

  // Sorting - only sort if we have a sort key and direction
  if (sortKey.value && sortDirection.value) {
    filtered.sort((a, b) => {
      const aVal = a?.[sortKey.value!]
      const bVal = b?.[sortKey.value!]

      // Use smart comparator
      return smartCompare(aVal, bVal, sortDirection.value!)
    })
  }

  return filtered.filter((item): item is DataTableItem => item != null)
})

const itemsPerPageOptionsWithAll = computed<ItemsPerPageOption[]>(() => {
  const baseValues = [...new Set([25, 50, 100, props.itemsPerPage])];

  const options = baseValues
    .filter(v => v !== -1)
    .map(value => ({
      value,
      label: value.toString()
    }))
    .sort((a, b) => a.value - b.value);

  return [
    ...options,
    { value: -1, label: 'All' }
  ];
});

const totalPages = computed<number>(() => {
  if (itemsPerPageLocal.value === -1) return 1
  return Math.ceil(filteredItems.value.length / itemsPerPageLocal.value)
})

const paginatedItems = computed<DataTableItem[]>(() => {
  if (!props.paginate || itemsPerPageLocal.value === -1) return filteredItems.value

  const start = (currentPage.value - 1) * itemsPerPageLocal.value
  const end = start + itemsPerPageLocal.value
  return filteredItems.value.slice(start, end)
})

const allSelected = computed<boolean>(() => {
  if (!paginatedItems.value.length) return false
  return paginatedItems.value.every((item, index) => selectedItemKeys.value.includes(getItemKey(item, index)))
})

const someSelected = computed<boolean>(() => {
  if (!paginatedItems.value.length) return false
  const count = paginatedItems.value.filter((item, index) => selectedItemKeys.value.includes(getItemKey(item, index))).length
  return count > 0 && count < paginatedItems.value.length
})

// Methods (same as before)
const getItemKey = (item: DataTableItem, index: number): string | number => {
  if (item && props.itemKey in item && item[props.itemKey] != null) {
    return item[props.itemKey]
  }
  return index
}

const handleSortClick = (key: string): void => {
  if (sortKey.value !== key) {
    sortKey.value = key
    sortDirection.value = 'asc'
  } else {
    if (sortDirection.value === null) {
      sortDirection.value = 'asc'
    } else if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else if (sortDirection.value === 'desc') {
      sortKey.value = null
      sortDirection.value = null
    }
  }

  emit('sort-change', { key: sortKey.value, direction: sortDirection.value })
}

const toggleSelectAll = (): void => {
  // Indeterminate or none selected â†’ select all; all selected â†’ deselect all
  if (allSelected.value && !someSelected.value) {
    selectedItemKeys.value = []
  } else {
    selectedItemKeys.value = paginatedItems.value.map((item, index) => getItemKey(item, index))
  }
  emitSelectionChange()
}

const toggleRowSelection = (key: string | number): void => {
  const idx = selectedItemKeys.value.indexOf(key)
  if (idx > -1) {
    selectedItemKeys.value.splice(idx, 1)
  } else {
    selectedItemKeys.value.push(key)
  }
  emitSelectionChange()
}

const nextPage = (): void => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const prevPage = (): void => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const handleItemsPerPageChange = (): void => {
  currentPage.value = 1
  emit('items-per-page-change', itemsPerPageLocal.value)
}

const emitSelectionChange = (): void => {
  const selectedItems = props.items
    .filter((item) => {
       const key = getItemKey(item, 0); // index doesn't matter much here if key exists
       return selectedItemKeys.value.includes(key);
    })
    .filter((item): item is DataTableItem => item != null)

  emit('selection-change', selectedItems)
}

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const triggerWidth = ref(0)
const dropdownRef = ref<HTMLElement | null>(null)
const dropDirection = ref<'down' | 'up'>('down')

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => {
      triggerWidth.value = triggerRef.value?.offsetWidth ?? 0
      updateDropDirection()
    })
  }
})

function updateDropDirection() {
  if (!triggerRef.value || !dropdownRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const dropdownHeight = dropdownRef.value.offsetHeight
  const spaceBelow = window.innerHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top

  // If not enough space below but enough space above, flip up
  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    dropDirection.value = 'up'
  } else {
    dropDirection.value = 'down'
  }
}
const selectedLabel = computed(() =>
  itemsPerPageOptionsWithAll.value.find(o => o.value === itemsPerPageLocal.value)?.label ?? ''
)

watch(isOpen, (val) => {
  if (val) nextTick(() => { triggerWidth.value = triggerRef.value?.offsetWidth ?? 0 })
})

function selectOption(option: { label: string; value: number | string }) {
  itemsPerPageLocal.value = option.value as number
  isOpen.value = false
  handleItemsPerPageChange() // fire same handler you already have
}

function toggleDropdown(e: MouseEvent) {
  e.stopPropagation() // prevent this click from bubbling to the document listener below
  isOpen.value = !isOpen.value
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    isOpen.value &&
    !triggerRef.value?.contains(target) &&
    !dropdownRef.value?.contains(target)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
onMounted(() => {
  if (props.defaultSortKey && props.defaultSortDirection) {
    sortKey.value = props.defaultSortKey
    sortDirection.value = props.defaultSortDirection
  }
})

// Watchers (same as before)
watch(() => props.items, () => {
  selectedItemKeys.value = []
  currentPage.value = 1
})

watch(() => props.selectedKeys, (newKeys) => {
  selectedItemKeys.value = [...newKeys]
}, { deep: true })

watch(() => props.paginate, () => {
  currentPage.value = 1
})

watch(() => props.itemsPerPage, (newValue) => {
  itemsPerPageLocal.value = newValue
})
</script>
<style scoped>


/* Here add scrollbars styles */
/* Thin minimal scrollbar */
::-webkit-scrollbar {
  width: 2px;
  height: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
  margin-block: 2px; /* small top/bottom spacing */
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.45);
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.7);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.45) transparent;
}

</style>