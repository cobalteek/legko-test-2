<script setup lang="ts">
import type { Campaign } from '../composables/useCampaigns'

defineProps<{
  campaigns: Campaign[]
  filteredCampaigns: Campaign[]
  getCampaignOfferCount: (campaign: Campaign) => number
  search: string
  selectedCampaignId: number
}>()

const emit = defineEmits<{
  create: []
  select: [id: number]
  'update:search': [value: string]
}>()

function updateSearch(event: Event): void {
  emit('update:search', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="min-h-[634px] rounded-[15px] border border-[#e1e8f0] bg-white p-6 shadow-[0_7px_24px_rgba(36,59,86,.045)] max-[700px]:p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-[17px] font-bold tracking-[-.025em] text-ink">Все кампании</h2>
        <p class="mt-1.5 text-xs text-[#8290a3]">{{ campaigns.length }} кампании в рабочем пространстве</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-[9px] border border-[#8bd7c1] bg-mint px-4 py-2.5 text-xs font-bold text-[#173145] shadow-[0_4px_10px_rgba(87,188,159,.18)] transition hover:-translate-y-px hover:bg-[#a0e4d2]"
        @click="$emit('create')"
      >
        <span class="text-base leading-none">+</span>
        Создать
      </button>
    </div>

    <label class="mt-6 flex h-[42px] items-center gap-2 rounded-[9px] border border-[#e0e7ee] bg-[#fafcfe] px-3 text-[#8c9bad] focus-within:border-[#80ccb9] focus-within:ring-2 focus-within:ring-[#80ccb9]/20">
      <span>⌕</span>
      <input
        :value="search"
        type="search"
        placeholder="Поиск по названию, GEO или источнику"
        class="w-full border-0 bg-transparent text-xs text-[#203047] outline-none placeholder:text-[#9ca9b6]"
        @input="updateSearch"
      />
    </label>

    <div class="mt-3 grid gap-1.5">
      <button
        v-for="campaign in filteredCampaigns"
        :key="campaign.id"
        type="button"
        class="grid w-full grid-cols-[39px_1fr_auto] items-center gap-2.5 rounded-[11px] border border-[#e6edf3] bg-white px-2.5 py-3 text-left transition hover:border-[#9ed8c8] hover:bg-[#f3fbf9] focus-visible:outline-[#65cbaa] max-[700px]:grid-cols-[35px_1fr]"
        :class="selectedCampaignId === campaign.id ? 'border-[#9ed8c8] bg-[#f3fbf9] shadow-[inset_3px_0_#65cbaa]' : ''"
        @click="$emit('select', campaign.id)"
      >
        <div class="grid h-9 w-9 place-items-center rounded-[10px] bg-[#e7f0f6] text-[11px] font-bold text-[#4d7992]">{{ campaign.geo }}</div>
        <div class="min-w-0">
          <strong class="block truncate text-xs text-[#263950]">{{ campaign.name }}</strong>
          <span class="mt-1 block truncate text-[10px] text-[#8b99a9]">{{ campaign.source }} · {{ campaign.createdAt }}</span>
        </div>
        <div class="grid justify-items-end gap-1.5 max-[700px]:hidden">
          <span class="text-[9px] font-bold text-[#6e9a91]">Открыть →</span>
          <span
            class="rounded-[5px] px-2 py-1 text-[9px] font-bold"
            :class="campaign.status === 'active' ? 'bg-[#e6f8f1] text-[#3e987e]' : 'bg-[#fff5df] text-[#a17b43]'"
          >
            {{ campaign.status === 'active' ? 'Активна' : 'Пауза' }}
          </span>
          <span class="text-[10px] text-[#8996a5]">{{ getCampaignOfferCount(campaign) }} оффер{{ getCampaignOfferCount(campaign) === 1 ? '' : 'а' }}</span>
        </div>
      </button>

      <div v-if="filteredCampaigns.length === 0" class="px-2.5 py-12 text-center text-[13px] text-[#8b99a9]">Ничего не найдено</div>
    </div>
  </section>
</template>
