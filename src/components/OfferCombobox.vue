<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { OfferCatalogItem } from '../composables/useCampaigns'

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: OfferCatalogItem[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Выбрать оффер',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)

const selectedOption = computed(() => props.options.find((offer) => offer.id === Number(props.modelValue)))
const selectedLabel = computed(() => selectedOption.value ? `#${selectedOption.value.id} · ${selectedOption.value.name}` : '')

const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  if (!normalizedQuery) return props.options

  return props.options.filter((offer) =>
    [offer.id, offer.name, offer.geo, offer.vertical]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  )
})

function open(): void {
  if (props.disabled) return
  isOpen.value = true
  nextTick(() => input.value?.select())
}

function updateQuery(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  isOpen.value = true

  if (value !== selectedLabel.value) emit('update:modelValue', '')
}

function selectOption(offer: OfferCatalogItem): void {
  query.value = `#${offer.id} · ${offer.name}`
  isOpen.value = false
  emit('update:modelValue', String(offer.id))
}

function handleFocusOut(): void {
  window.setTimeout(() => {
    if (root.value?.contains(document.activeElement)) return

    query.value = selectedLabel.value
    isOpen.value = false
  }, 0)
}
</script>

<template>
  <div ref="root" class="relative min-w-0 flex-1" @focusout="handleFocusOut">
    <input
      ref="input"
      :value="query || selectedLabel"
      :placeholder="placeholder"
      :disabled="disabled"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? 'offer-combobox-list' : undefined"
      class="w-full rounded-lg border border-[#c9dce9] bg-[#fbfcfe] px-2.5 py-2.5 pr-8 text-[11px] text-[#354b63] outline-none transition placeholder:text-[#8290a3] focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20 disabled:cursor-not-allowed disabled:opacity-50"
      @focus="open"
      @input="updateQuery"
    >
    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8298a9]" aria-hidden="true">⌄</span>

    <div v-if="isOpen" id="offer-combobox-list" role="listbox" class="absolute left-0 right-0 top-[calc(100%+5px)] z-30 max-h-56 overflow-auto rounded-lg border border-[#d7e3eb] bg-white p-1 shadow-[0_12px_28px_rgba(36,59,86,.14)]">
      <button
        v-for="offer in filteredOptions"
        :key="offer.id"
        type="button"
        role="option"
        :aria-selected="Number(modelValue) === offer.id"
        class="block w-full rounded-md px-2.5 py-2 text-left text-[11px] text-[#354b63] transition hover:bg-[#eef8f5]"
        @mousedown.prevent="selectOption(offer)"
      >
        <strong class="block truncate font-semibold">#{{ offer.id }} · {{ offer.name }}</strong>
        <span class="mt-0.5 block truncate text-[10px] text-[#8b99a9]">{{ offer.geo }} · {{ offer.vertical }}</span>
      </button>
      <p v-if="filteredOptions.length === 0" class="px-2.5 py-2 text-[11px] text-[#8290a3]">Оффер не найден</p>
    </div>
  </div>
</template>
