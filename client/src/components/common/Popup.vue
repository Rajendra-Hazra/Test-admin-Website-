<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

interface Props {
  modelValue: boolean;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  size: "md",
  closeOnBackdrop: true,
  closeOnEsc: true,
  showClose: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

function close() {
  emit("update:modelValue", false);
  emit("close");
}

function onBackdrop() {
  if (props.closeOnBackdrop) close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.closeOnEsc) close();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.addEventListener("keydown", onKeydown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        @click.self="onBackdrop"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
          class="min-w-0 bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-h-[90vh] flex flex-col overflow-hidden"
          :class="sizeClass[size]"
        >
          <div
            v-if="title || showClose || $slots.header"
            class="px-4 py-4 sm:px-6 border-b border-[#E5E7EB] bg-white flex justify-between items-center shrink-0"
          >
            <slot name="header">
              <h2 class="text-lg font-bold text-[#202124]">{{ title }}</h2>
            </slot>
            <button
              v-if="showClose"
              type="button"
              aria-label="Close"
              class="text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] p-1 rounded-md transition-colors cursor-pointer"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="min-w-0 p-4 sm:p-6 overflow-y-auto bg-white text-[#202124]">
            <slot :close="close" />
          </div>

          <div v-if="$slots.footer" class="px-4 py-4 sm:px-6 border-t border-[#E5E7EB] bg-white flex flex-wrap justify-end gap-3 shrink-0">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
