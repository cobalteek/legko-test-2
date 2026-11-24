<script setup lang="ts">
import type { OfferCatalogItem, OfferRow } from '../composables/useCampaigns'
import OfferCombobox from './OfferCombobox.vue'

defineProps<{
  activeOffers: OfferRow[]
  availableOffers: OfferCatalogItem[]
  formatPercentage: (value: number) => string
  hasActiveOffersInCampaign: boolean
  hasPendingChanges: boolean
  hasInvalidPercentageTotal: boolean
  isSaving: boolean
  showSingleOfferWarning: boolean
  offerToAdd: string | number
  pendingChangeCount: number
  selectedOffers: OfferRow[]
  totalPercentage: number
}>()

const emit = defineEmits<{
  'add-offer': [id: string | number]
  'bring-back': [id: number]
  discard: []
  'remove-offer': [id: number]
  save: []
  'set-percentage': [id: number, value: number]
  'toggle-pin': [id: number]
  'update:offerToAdd': [value: string]
  'confirm-single-offer': []
  'cancel-single-offer': []
}>()

function updateOfferPercentage(event: Event, id: number): void {
  const input = event.target as HTMLInputElement
  if (input.value === '') return
  emit('set-percentage', id, input.valueAsNumber)
}
</script>

<template>
  <section class="rounded-[15px] border border-[#e1e8f0] bg-white p-6 shadow-[0_7px_24px_rgba(36,59,86,.045)] max-[700px]:p-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="font-display text-[17px] font-bold tracking-[-.025em] text-ink">Офферы</h2>
        <p class="mt-1.5 text-xs text-[#8290a3]">Изменения сначала сохраняются как черновик</p>
      </div>
      <span
        class="rounded-md border px-2 py-1 text-[10px] font-bold"
        :class="hasInvalidPercentageTotal ? 'border-[#efc5c8] bg-[#fff2f2] text-[#ae6c70]' : 'border-[#cfe8df] bg-[#effaf7] text-[#428d78]'"
      >
        {{ formatPercentage(totalPercentage) }}% всего
      </span>
    </div>

    <div v-if="activeOffers.length === 0 && !hasActiveOffersInCampaign && hasPendingChanges" class="mt-4 rounded-[9px] border border-[#efc5c8] bg-[#fff4f4] p-3 text-[10px] leading-relaxed text-[#a5686e]">
      После сохранения кампания автоматически встанет на паузу: активных офферов не останется, поэтому трафик не будет уходить в общий fallback-редирект.
    </div>
    <div v-else-if="hasInvalidPercentageTotal" class="mt-4 rounded-[9px] border border-[#efc5c8] bg-[#fff4f4] p-3 text-[10px] leading-relaxed text-[#a5686e]">
      Исправь закреплённые проценты: их сумма не должна превышать 100%. Если все офферы закреплены, сумма должна быть ровно 100%.
    </div>

    <div v-if="hasPendingChanges" class="mt-5 flex items-center justify-between gap-3 rounded-[9px] border border-[#efd58e] bg-[#fff9df] p-3 max-[700px]:flex-col max-[700px]:items-stretch">
      <div>
        <strong class="block text-[11px] text-[#7e6221]">{{ pendingChangeCount }} несохраненных {{ pendingChangeCount === 1 ? 'изменение' : 'изменения' }}</strong>
        <span class="mt-1 block text-[10px] text-[#9f8750]">Жёлтые строки пока не отправлены в Keitaro</span>
      </div>
      <div class="flex items-center gap-2 max-[700px]:w-full">
        <button type="button" :disabled="isSaving" class="flex-1 rounded-[7px] border border-[#e5c873] px-2.5 py-2 text-[10px] font-bold text-[#896d28] transition hover:bg-[#fff3c4] disabled:cursor-wait disabled:opacity-60" @click="$emit('discard')">Отменить</button>
        <button type="button" :disabled="isSaving || hasInvalidPercentageTotal" class="flex-1 rounded-[7px] border border-[#d6b448] bg-[#f4cf62] px-2.5 py-2 text-[10px] font-bold text-[#674e18] transition hover:bg-[#ebc04a] disabled:cursor-not-allowed disabled:opacity-60" @click="$emit('save')">{{ isSaving ? 'Отправка…' : 'Сохранить и отправить' }}</button>
      </div>
    </div>

    <div class="mt-5 flex gap-2 max-[700px]:flex-col">
      <OfferCombobox
        :model-value="offerToAdd"
        :options="availableOffers"
        placeholder="Поиск оффера для добавления"
        :disabled="availableOffers.length === 0"
        @update:model-value="emit('update:offerToAdd', $event)"
      />
      <button
        type="button"
        class="rounded-lg border border-[#c9dce9] bg-[#e9f1f7] px-3 text-[11px] font-bold text-[#4e708d] transition hover:border-[#9bbdd1] hover:bg-[#dce9f2] disabled:cursor-not-allowed disabled:opacity-50 max-[700px]:py-2.5"
        :disabled="!offerToAdd"
        @click="$emit('add-offer', offerToAdd)"
      >
        Добавить в черновик
      </button>
    </div>

    <div class="mt-3 grid gap-1.5">
      <div
        v-for="offer in selectedOffers"
        :key="offer.id"
        class="flex items-center gap-2.5 border-t border-[#eef2f6] px-1 py-2.5 transition first:border-t-0 max-[700px]:flex-wrap"
        :class="offer.pending ? 'rounded-lg border-[#eed58b] bg-[#fff9df] px-2' : ''"
      >
        <div class="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-lg bg-[#f0ecfb] text-[11px] font-bold text-[#8778ae]" :class="offer.state === 'removed' ? 'bg-[#f8e9e9] text-[#9b7c83]' : ''">
          {{ offer.vertical.slice(0, 1) }}
        </div>
        <div class="min-w-0 flex-1">
          <strong class="block truncate text-[11px] text-[#30435a]">{{ offer.name }}</strong>
          <span class="mt-0.5 block text-[10px] text-[#8b99a9]">#{{ offer.id }} · {{ offer.geo }} · {{ offer.vertical }}</span>
        </div>
        <span
          class="shrink-0 rounded px-1.5 py-1 text-[8px] font-bold"
          :class="{
            'bg-[#eaf8f3] text-[#568c7e]': offer.state === 'active',
            'bg-[#f8e8ab] text-[#967326]': offer.state === 'added' || offer.state === 'restored',
            'bg-[#f9e4e5] text-[#ae6c70]': offer.state === 'removed',
          }"
        >
          {{ offer.state === 'removed' ? 'Удалён' : offer.state === 'added' ? 'Добавлен' : offer.state === 'restored' ? 'Восстановлен' : 'Сохранён' }}
        </span>
        <label v-if="offer.pinned && offer.state !== 'removed'" class="flex shrink-0 items-center gap-0.5 rounded-md border border-[#e7cf7a] bg-[#fffaf0] px-1.5 py-1" :title="`Закреплённый процент оффера ${offer.name}`">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            :value="formatPercentage(offer.savedPercentage ?? offer.percentage)"
            :disabled="isSaving"
            :aria-label="`Процент оффера ${offer.name}`"
            class="w-8 bg-transparent text-right text-[11px] font-bold text-[#86691d] outline-none disabled:cursor-wait disabled:opacity-60"
            @change="updateOfferPercentage($event, offer.id)"
          >
          <span class="text-[10px] font-bold text-[#86691d]">%</span>
        </label>
        <strong v-else class="w-9 shrink-0 text-right text-[11px] text-[#6e7e90]">{{ offer.state === 'removed' ? '—' : `${formatPercentage(offer.percentage)}%` }}</strong>
        <button
          v-if="offer.state !== 'removed'"
          type="button"
          class="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#d8e0e8] bg-[#f4f7fa] text-[#8795a4] transition hover:border-[#adbbc8] hover:bg-[#e9eef3] focus-visible:outline-[#8795a4]"
          :class="offer.pinned ? 'border-[#d8b847] bg-[#fff5ca] text-[#9b781a] shadow-[0_0_0_2px_rgba(243,205,91,.18)]' : ''"
          :title="offer.pinned ? 'Открепить процент' : 'Закрепить текущий процент'"
          :aria-label="offer.pinned ? 'Открепить процент' : 'Закрепить текущий процент'"
          @click="$emit('toggle-pin', offer.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5.25 2.25h5.5M6 2.25v3.1L3.75 7.6v1.15h8.5V7.6L10 5.35v-3.1M8 8.75v4.5M5.5 13.25h5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-if="offer.state === 'removed'"
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#d6bb61] bg-[#fffdf2] px-2 py-1.5 text-[9px] font-bold text-[#83651c] transition hover:bg-[#fff4c5]"
          @click="$emit('bring-back', offer.id)"
        >
          ↶ Bring Back
        </button>
        <button
          v-else
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#eed0d3] bg-[#fff5f5] px-2 py-1.5 text-[9px] font-bold text-[#ad6d73] transition hover:bg-[#fff0f1]"
          @click="$emit('remove-offer', offer.id)"
        >
          × Удалить
        </button>
      </div>
    </div>

    <div v-if="showSingleOfferWarning" class="fixed inset-0 z-50 grid place-items-center bg-[#152238]/35 px-5" role="presentation">
      <div class="w-full max-w-[430px] rounded-[15px] border border-[#e7d18a] bg-white p-6 shadow-[0_18px_60px_rgba(21,34,56,.2)]" role="dialog" aria-modal="true" aria-labelledby="single-offer-warning-title">
        <div class="flex items-start gap-3">
          <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff4c5] text-lg text-[#a17b1e]">!</div>
          <div>
            <h3 id="single-offer-warning-title" class="font-display text-sm font-bold text-[#293d55]">Останется один оффер</h3>
            <p class="mt-2 text-xs leading-relaxed text-[#718196]">Он автоматически получит 100% трафика, даже если сейчас закреплён. Подтвердить сохранение?</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2 max-[500px]:flex-col-reverse">
          <button type="button" class="rounded-[8px] border border-[#d6dee7] bg-[#f4f7fa] px-3 py-2.5 text-[11px] font-bold text-[#61758b] transition hover:border-[#aebdca] hover:bg-[#e9eef3]" @click="$emit('cancel-single-offer')">Нет, вернуть оффер</button>
          <button type="button" class="rounded-[8px] border border-[#d6b448] bg-[#f4cf62] px-3 py-2.5 text-[11px] font-bold text-[#674e18] transition hover:bg-[#ebc04a]" @click="$emit('confirm-single-offer')">Да, сохранить 100%</button>
        </div>
      </div>
    </div>
  </section>
</template>
