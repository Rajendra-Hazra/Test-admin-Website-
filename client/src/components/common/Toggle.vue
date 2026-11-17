<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
    class="relative inline-flex h-6 w-11 shrink-0
           cursor-pointer rounded-full border-2
           border-transparent transition-colors duration-200
           focus:outline-none focus:ring-2
           focus:ring-[#800020] focus:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50"
    :class="modelValue
      ? 'bg-[#800020]'
      : 'bg-[#E5E7EB]'"
  >
    <span
      class="pointer-events-none inline-block h-5 w-5
             rounded-full bg-white shadow-xs
             ring-0 transition-transform duration-200"
      :class="modelValue
        ? 'translate-x-5'
        : 'translate-x-0'"
    />
  </button>
</template>
