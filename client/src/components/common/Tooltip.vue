<template>
  <div
    ref="wrapperElement"
    class="relative inline-flex"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @click="onClick"
  >
    <!-- Trigger -->
    <slot name="trigger">
      <div class="inline-flex cursor-pointer">
        <slot />
      </div>
    </slot>

    <!-- Tooltip -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isVisible"
          ref="tooltipElement"
          class="fixed z-[9999] rounded-md shadow-lg whitespace-normal break-words px-3 py-2 text-[13px]"
          :style="positionStyles"
          role="tooltip"
        >
          <!-- Arrow -->
          <!-- <div
            class="absolute w-2 h-2 rotate-45"
            :class="arrowClass"
            :style="arrowStyles"
          /> -->

          <!-- Content -->
          <slot name="content">
            <div v-if="html" v-html="html" />
            <span v-else>{{ text }}</span>
          </slot>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'


type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  text?: string
  html?: string
  position?: TooltipPosition
  delay?: number
  disabled?: boolean
  showOnClick?: boolean
  closeOnClickOutside?: boolean
  hideOnScroll?: boolean

  /* Colors */
  bgColor?: string
  textColor?: string
  arrowColor?: string

  /* Width */
  width?: string | number
  maxWidth?: string | number
}


const props = withDefaults(defineProps<TooltipProps>(), {
  text: '',
  html: '',
  position: 'top',
  delay: 0,
  disabled: false,
  showOnClick: false,
  closeOnClickOutside: false,
  hideOnScroll: true,


  bgColor: 'var(--color-surface-1-value)',
  textColor: 'var(--color-surface-10-value)',
  arrowColor: '',


  width: 'auto',
  maxWidth: '580px'
})

const emit = defineEmits<{
  (e: 'show'): void
  (e: 'hide'): void
}>()


const isVisible = ref(false)
const wrapperElement = ref<HTMLElement | null>(null)
const tooltipElement = ref<HTMLElement | null>(null)
let hoverTimeout: ReturnType<typeof setTimeout> | null = null
const positionStyles = ref<Record<string, any>>({})


function normalizeSize(value?: string | number) {
  return typeof value === 'number' ? `${value}px` : value
}


// const tooltipStyles = computed(() => {
//   if (!wrapperElement.value) return {}

//   const rect = wrapperElement.value.getBoundingClientRect()
//   const gap = 8

//   const base = {
//     backgroundColor: props.bgColor,
//     color: props.textColor,
//     width: normalizeSize(props.width),
//     maxWidth: normalizeSize(props.maxWidth)
//   }

//   switch (props.position) {
//     case 'top':
//       return { ...base, top: `${rect.top - gap}px`, left: `${rect.left + rect.width / 2}px`, transform: 'translate(-50%, -100%)' }
//     case 'bottom':
//       return { ...base, top: `${rect.bottom + gap}px`, left: `${rect.left + rect.width / 2}px`, transform: 'translateX(-50%)' }
//     case 'left':
//       return { ...base, top: `${rect.top + rect.height / 2}px`, left: `${rect.left - gap}px`, transform: 'translate(-100%, -50%)' }
//     case 'right':
//       return { ...base, top: `${rect.top + rect.height / 2}px`, left: `${rect.right + gap}px`, transform: 'translateY(-50%)' }
//     default:
//       return base
//   }
// })

// const arrowClass = computed(() => ({
//   top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
//   bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
//   left: 'right-[-4px] top-1/2 -translate-y-1/2',
//   right: 'left-[-4px] top-1/2 -translate-y-1/2'
// }[props.position]))

const currentPosition = ref<TooltipPosition>('top')

const arrowClass = computed(() => ({
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
  left: 'right-[-4px] top-1/2 -translate-y-1/2',
  right: 'left-[-4px] top-1/2 -translate-y-1/2'
}[currentPosition.value]))

const arrowStyles = computed(() => ({
  backgroundColor: props.arrowColor || props.bgColor
}))

function showTooltip() {
  if (props.disabled) return
  clearTimeout(hoverTimeout!)

  if (props.delay > 0) {
    hoverTimeout = setTimeout(() => {
      isVisible.value = true
      emit('show')
    }, props.delay)
  } else {
    isVisible.value = true
    emit('show')
  }
}

function hideTooltip() {
  clearTimeout(hoverTimeout!)
  if (props.showOnClick && !props.closeOnClickOutside) return
  isVisible.value = false
  emit('hide')
}

const onMouseEnter = () => !props.showOnClick && showTooltip()
const onMouseLeave = () => !props.showOnClick && hideTooltip()
const onFocusIn = showTooltip
const onFocusOut = hideTooltip

const onClick = () => {
  if (!props.showOnClick) return

  if (isVisible.value) {
    hideTooltip()
  } else {
    showTooltip()
  }
}

function onClickOutside(e: MouseEvent) {
  if (
    tooltipElement.value &&
    wrapperElement.value &&
    !tooltipElement.value.contains(e.target as Node) &&
    !wrapperElement.value.contains(e.target as Node)
  ) {
    hideTooltip()
  }
}

// function onScroll() {
//   if (props.hideOnScroll && isVisible.value) hideTooltip()
// }

function onScroll() {
  if (props.hideOnScroll) {
    hideTooltip()
  } else {
    updatePosition()
  }
}

function onResize() {
  if (isVisible.value) updatePosition()
}

function getBestPosition(rect: DOMRect, tooltipRect: DOMRect): TooltipPosition {
  const space = {
    top: rect.top,
    bottom: window.innerHeight - rect.bottom,
    left: rect.left,
    right: window.innerWidth - rect.right
  }

  const priority: TooltipPosition[] = [
    props.position, // preferred
    'top',
    'bottom',
    'right',
    'left'
  ].filter(Boolean) as TooltipPosition[]

  return priority.find(pos => space[pos] > tooltipRect.height + 12) || 'bottom'
}

function updatePosition() {
  if (!wrapperElement.value || !tooltipElement.value) return

  const rect = wrapperElement.value.getBoundingClientRect()
  const tooltipRect = tooltipElement.value.getBoundingClientRect()
  const gap = 8

  const best = getBestPosition(rect, tooltipRect)
  currentPosition.value = best

  let top = 0
  let left = 0

  switch (best) {
    case 'top':
      top = rect.top - tooltipRect.height - gap
      left = rect.left + rect.width / 2 - tooltipRect.width / 2
      break

    case 'bottom':
      top = rect.bottom + gap
      left = rect.left + rect.width / 2 - tooltipRect.width / 2
      break

    case 'left':
      top = rect.top + rect.height / 2 - tooltipRect.height / 2
      left = rect.left - tooltipRect.width - gap
      break

    case 'right':
      top = rect.top + rect.height / 2 - tooltipRect.height / 2
      left = rect.right + gap
      break
  }

  const padding = 8

  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding))
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding))

  positionStyles.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    backgroundColor: props.bgColor,
    color: props.textColor,
    width: normalizeSize(props.width),
    maxWidth: normalizeSize(props.maxWidth)
  }
}

watch(isVisible, (val) => {
  if (val) {
    nextTick(() => updatePosition())
  }
})


onMounted(() => {
  if (props.closeOnClickOutside) document.addEventListener('click', onClickOutside)
  if (props.hideOnScroll) window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  clearTimeout(hoverTimeout!)
})
</script>