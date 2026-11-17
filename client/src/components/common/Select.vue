<script setup lang="ts" generic="T extends string | number">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

interface Option {
  label: string;
  value: T;
  disabled?: boolean;
}

interface Props {
  modelValue: T | "" | null;
  options: Option[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
  size?: "md" | "sm";
  /** Replaces the default background/border colours of the trigger (e.g. status-coloured selects). */
  selectClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  placeholder: "Select...",
  required: false,
  disabled: false,
  error: "",
  id: undefined,
  size: "md",
  selectClass: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: T];
  change: [value: T];
}>();

const uid = useId();
const triggerId = computed(() => props.id ?? `select-${uid}`);
const listboxId = computed(() => `${triggerId.value}-listbox`);

const open = ref(false);
const activeIndex = ref(-1);
const triggerEl = ref<HTMLButtonElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const selectedOption = computed(() => props.options.find((o) => o.value === props.modelValue));

const triggerSizeClass = computed(() =>
  props.size === "sm" ? "text-xs font-semibold px-2 py-1 gap-1.5" : "px-3 py-2 gap-2 w-full",
);

const triggerColorClass = computed(
  () =>
    props.selectClass ?? [
      "bg-white",
      props.error ? "border-red-400" : open.value ? "border-[#800020] ring-1 ring-[#800020]" : "border-[#E5E7EB] hover:border-[#D1D5DB]",
    ],
);

function positionPanel() {
  const el = triggerEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const gap = 4;
  const maxHeight = 240;
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const spaceAbove = rect.top - 12;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const style: Record<string, string> = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(maxHeight, openUp ? spaceAbove : spaceBelow)}px`,
  };
  if (openUp) style.bottom = `${window.innerHeight - rect.top + gap}px`;
  else style.top = `${rect.bottom + gap}px`;
  panelStyle.value = style;
}

function firstEnabled(from: number, dir: 1 | -1): number {
  const n = props.options.length;
  for (let step = 0; step < n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    if (!props.options[i]?.disabled) return i;
  }
  return -1;
}

function openPanel() {
  if (props.disabled || open.value) return;
  open.value = true;
  const selected = props.options.findIndex((o) => o.value === props.modelValue);
  activeIndex.value = selected >= 0 ? selected : firstEnabled(0, 1);
  positionPanel();
  nextTick(scrollActiveIntoView);
}

function closePanel(refocus = false) {
  open.value = false;
  if (refocus) triggerEl.value?.focus();
}

function scrollActiveIntoView() {
  panelEl.value?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)?.scrollIntoView({ block: "nearest" });
}

function move(dir: 1 | -1) {
  if (!props.options.length) return;
  const start = activeIndex.value < 0 ? (dir === 1 ? 0 : -1) : activeIndex.value + dir;
  activeIndex.value = firstEnabled(start, dir);
  nextTick(scrollActiveIntoView);
}

function choose(o: Option) {
  if (o.disabled) return;
  emit("update:modelValue", o.value);
  emit("change", o.value);
  closePanel(true);
}

function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      open.value ? move(1) : openPanel();
      break;
    case "ArrowUp":
      e.preventDefault();
      open.value ? move(-1) : openPanel();
      break;
    case "Home":
      if (open.value) {
        e.preventDefault();
        activeIndex.value = firstEnabled(0, 1);
        nextTick(scrollActiveIntoView);
      }
      break;
    case "End":
      if (open.value) {
        e.preventDefault();
        activeIndex.value = firstEnabled(props.options.length - 1, -1);
        nextTick(scrollActiveIntoView);
      }
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      if (!open.value) openPanel();
      else if (props.options[activeIndex.value]) choose(props.options[activeIndex.value]!);
      break;
    case "Escape":
      if (open.value) {
        e.preventDefault();
        e.stopPropagation(); // don't also close a parent Popup
        closePanel(true);
      }
      break;
    case "Tab":
      closePanel();
      break;
  }
}

function onOutsidePointer(e: MouseEvent) {
  const target = e.target as Node;
  if (triggerEl.value?.contains(target) || panelEl.value?.contains(target)) return;
  closePanel();
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("mousedown", onOutsidePointer);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
  } else {
    document.removeEventListener("mousedown", onOutsidePointer);
    window.removeEventListener("resize", positionPanel);
    window.removeEventListener("scroll", positionPanel, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onOutsidePointer);
  window.removeEventListener("resize", positionPanel);
  window.removeEventListener("scroll", positionPanel, true);
});
</script>

<template>
  <div class="relative" :class="size === 'sm' ? 'inline-block' : ''">
    <label v-if="label" :for="triggerId" class="block text-sm font-medium text-[#202124] mb-1">
      {{ label }}<span v-if="required" class="text-rose-600"> *</span>
    </label>

    <button
      :id="triggerId"
      ref="triggerEl"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :disabled="disabled"
      class="inline-flex items-center justify-between border rounded-lg text-left transition-colors
             focus:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]
             disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-[#202124]"
      :class="[triggerSizeClass, triggerColorClass]"
      @click="open ? closePanel() : openPanel()"
      @keydown="onKeydown"
    >
      <span class="grid min-w-0 flex-1">
        <span class="col-start-1 row-start-1 truncate" :class="selectedOption ? '' : 'text-[#6B7280] font-normal'">
          {{ selectedOption ? selectedOption.label : placeholder }}
        </span>
        <!-- Compact triggers size themselves to the longest option so the panel can match their width exactly -->
        <template v-if="size === 'sm'">
          <span
            v-for="o in options"
            :key="o.value"
            aria-hidden="true"
            class="col-start-1 row-start-1 h-0 max-w-64 overflow-hidden whitespace-nowrap pr-4 invisible"
          >{{ o.label }}</span>
        </template>
      </span>
      <ChevronDown
        :size="size === 'sm' ? 14 : 16"
        class="shrink-0 text-[#6B7280] transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <!-- Keeps native form validation working for `required` -->
    <input
      v-if="required"
      tabindex="-1"
      aria-hidden="true"
      required
      :value="modelValue ?? ''"
      class="absolute bottom-0 left-1/2 h-px w-px opacity-0 pointer-events-none"
    />

    <p v-if="error" class="mt-1 text-xs text-rose-600">{{ error }}</p>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-75 ease-in"
        leave-to-class="opacity-0"
      >
        <ul
          v-if="open"
          :id="listboxId"
          ref="panelEl"
          role="listbox"
          tabindex="-1"
          :style="panelStyle"
          class="fixed z-60 overflow-y-auto py-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg"
        >
          <li v-if="!options.length" class="px-3 py-2 text-sm text-[#6B7280]">No options</li>
          <li
            v-for="(o, i) in options"
            :key="o.value"
            :data-index="i"
            role="option"
            :aria-selected="o.value === modelValue"
            :aria-disabled="o.disabled || undefined"
            class="mx-1 flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors"
            :class="[
              size === 'sm' ? 'text-xs' : 'text-sm',
              o.disabled ? 'text-slate-300 cursor-not-allowed' : 'cursor-pointer',
              !o.disabled && i === activeIndex ? 'bg-[#F7F7F8]' : '',
              o.value === modelValue ? 'text-[#800020] font-semibold bg-[#FAF0F2]' : 'text-[#202124] hover:bg-[#F7F7F8]',
            ]"
            @mouseenter="!o.disabled && (activeIndex = i)"
            @click="choose(o)"
          >
            <span class="min-w-0 wrap-break-word">{{ o.label }}</span>
            <Check v-if="o.value === modelValue" :size="14" class="shrink-0 text-[#800020]" />
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>
