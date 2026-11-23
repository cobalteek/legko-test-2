<script setup lang="ts">
import type { Campaign, CampaignStream, StreamType } from '../composables/useCampaigns'

const props = defineProps<{
  activeOfferCount: number
  campaign: Campaign
  isSaving: boolean
  selectedStreamId: number | null
  selectedStream?: CampaignStream
}>()

const emit = defineEmits<{
  'toggle-status': [campaign: Campaign]
  'select-stream': [id: number]
  'add-stream': []
  'remove-stream': [id: number]
  'update-stream': [id: number, patch: Partial<Pick<CampaignStream, 'name' | 'type' | 'status' | 'geo' | 'fallbackUrl'>>]
}>()

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function selectType(event: Event): void {
  if (props.selectedStream) {
    emit('update-stream', props.selectedStream.id, { type: (event.target as HTMLSelectElement).value as StreamType })
  }
}

function updateGeo(event: Event): void {
  if (props.selectedStream) {
    emit('update-stream', props.selectedStream.id, { geo: inputValue(event).split(/[\s,;]+/) })
  }
}
</script>

<template>
  <section class="rounded-[15px] border border-[#e1e8f0] bg-white p-6 shadow-[0_7px_24px_rgba(36,59,86,.045)] max-[700px]:p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-[.14em] text-[#8090a4]">Campaign details</span>
        <h2 class="mt-1 font-display text-[17px] font-bold tracking-[-.025em] text-ink">{{ campaign.name }}</h2>
      </div>
      <button type="button" class="group flex items-center gap-2 rounded-[9px] border px-3 py-2 text-left transition hover:-translate-y-px focus-visible:outline-[#65cbaa]" :class="campaign.status === 'active' ? 'border-[#9bd7c6] bg-[#f0fbf7] text-[#347c68]' : 'border-[#e6c980] bg-[#fff9e8] text-[#966d21]'" :title="campaign.status === 'active' ? 'Поставить кампанию на паузу' : 'Запустить кампанию'" :disabled="isSaving" @click="emit('toggle-status', campaign)">
        <span class="h-2 w-2 rounded-full" :class="campaign.status === 'active' ? 'bg-[#58c7a6]' : 'bg-[#d9a947]'" />
        <span><strong class="block text-[10px] font-bold">{{ campaign.status === 'active' ? 'Активна' : 'На паузе' }}</strong><small class="mt-0.5 block text-[9px] opacity-75">{{ campaign.status === 'active' ? 'Поставить на паузу' : 'Запустить' }}</small></span>
        <span class="text-xs opacity-60 transition group-hover:translate-x-0.5">↔</span>
      </button>
    </div>

    <div class="my-6 grid grid-cols-3 border-y border-[#edf1f5] py-4">
      <div class="border-r border-[#edf1f5] pr-4"><span class="block text-[9px] font-bold uppercase tracking-[.11em] text-[#8997a7]">GEO кампании</span><strong class="mt-1 block truncate font-display text-[17px] text-[#253950]">{{ campaign.geo }}</strong></div>
      <div class="border-r border-[#edf1f5] px-4"><span class="block text-[9px] font-bold uppercase tracking-[.11em] text-[#8997a7]">Офферы</span><strong class="mt-1 block font-display text-[17px] text-[#253950]">{{ activeOfferCount }}</strong></div>
      <div class="pl-4"><span class="block text-[9px] font-bold uppercase tracking-[.11em] text-[#8997a7]">Потоки</span><strong class="mt-1 block font-display text-[17px] text-[#253950]">{{ campaign.streams.length }}</strong></div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div><h3 class="text-xs font-bold text-[#30435a]">Потоки кампании</h3><p class="mt-1 text-[10px] text-[#8997a7]">Keitaro проверяет подходящий поток по порядку</p></div>
      <button type="button" class="inline-flex items-center gap-1 rounded-lg border border-[#bcd9e7] bg-[#f0f8fc] px-2.5 py-2 text-[10px] font-bold text-[#4f7891] transition hover:border-[#8ebbd1] hover:bg-[#e5f2f8]" :disabled="isSaving" @click="emit('add-stream')"><span class="text-sm leading-none">+</span> Добавить поток</button>
    </div>

    <div class="mt-3 grid gap-2">
      <button v-for="stream in campaign.streams" :key="stream.id" type="button" class="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border p-3 text-left transition" :class="[stream.id === selectedStreamId ? 'border-[#9dd7c6] bg-[#f4fcf9] shadow-[0_0_0_2px_rgba(101,203,170,.12)]' : 'border-[#e7edf2] bg-[#fbfcfe] hover:border-[#bfd4df] hover:bg-white', stream.status === 'removed' ? 'opacity-60' : '']" @click="emit('select-stream', stream.id)">
        <span class="text-[10px] font-bold text-[#93a0ad]">{{ String(stream.position).padStart(2, '0') }}</span>
        <span class="min-w-0"><strong class="block truncate text-[11px] text-[#30435a]">{{ stream.name }}</strong><small class="mt-1 block truncate text-[10px] text-[#8997a7]">{{ stream.geo.length ? stream.geo.join(', ') : 'Все GEO / default' }} · {{ stream.offers.filter((offer) => offer.state !== 'removed').length }} оффер{{ stream.offers.filter((offer) => offer.state !== 'removed').length === 1 ? '' : 'а' }}</small></span>
        <span class="rounded px-1.5 py-1 text-[8px] font-bold tracking-wider" :class="stream.type === 'default' ? 'bg-[#fff5dc] text-[#9a7622]' : stream.type === 'forced' ? 'bg-[#fce9ed] text-[#a56873]' : 'bg-[#f1edfb] text-[#8776b3]'">{{ stream.type === 'default' ? 'DEFAULT' : stream.type === 'forced' ? 'FORCED' : 'REGULAR' }}</span>
      </button>
    </div>

    <div v-if="selectedStream" class="mt-4 rounded-[10px] border border-[#e2ebf1] bg-[#fbfcfe] p-4">
      <div class="flex items-center justify-between gap-3"><div><span class="text-[9px] font-bold uppercase tracking-[.12em] text-[#8997a7]">Настройки выбранного потока</span><span v-if="selectedStream.pending" class="ml-2 rounded bg-[#fff3c4] px-1.5 py-1 text-[8px] font-bold text-[#967326]">Черновик</span></div><button v-if="campaign.streams.length > 1" type="button" class="text-[10px] font-bold text-[#ad6d73] underline decoration-[#e9c4c8] underline-offset-2 hover:text-[#8f545b]" :disabled="isSaving" @click="emit('remove-stream', selectedStream.id)">Удалить поток</button></div>
      <div class="mt-3 grid gap-3">
        <label class="grid gap-1 text-[10px] font-bold text-[#5f7186]">Название<input :value="selectedStream.name" type="text" class="rounded-lg border border-[#dfe7ee] bg-white px-3 py-2.5 text-[11px] font-normal text-[#354b63] outline-none focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @input="emit('update-stream', selectedStream.id, { name: inputValue($event) })" /></label>
        <div class="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
          <label class="grid gap-1 text-[10px] font-bold text-[#5f7186]">Тип потока<select :value="selectedStream.type" class="rounded-lg border border-[#dfe7ee] bg-white px-3 py-2.5 text-[11px] font-normal text-[#354b63] outline-none focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @change="selectType"><option value="regular">Regular — по фильтрам</option><option value="forced">Forced — приоритетный</option><option value="default">Default — fallback</option></select></label>
          <label class="grid gap-1 text-[10px] font-bold text-[#5f7186]">GEO потока<input :value="selectedStream.geo.join(', ')" :disabled="selectedStream.type === 'default'" type="text" placeholder="MX, AR, CL" class="rounded-lg border border-[#dfe7ee] bg-white px-3 py-2.5 text-[11px] font-normal uppercase text-[#354b63] outline-none disabled:cursor-not-allowed disabled:bg-[#f0f3f6] focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @change="updateGeo" /></label>
        </div>
        <label v-if="selectedStream.type === 'default'" class="grid gap-1 text-[10px] font-bold text-[#5f7186]">Fallback URL<input :value="selectedStream.fallbackUrl" type="url" placeholder="https://example.com" class="rounded-lg border border-[#dfe7ee] bg-white px-3 py-2.5 text-[11px] font-normal text-[#354b63] outline-none focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @input="emit('update-stream', selectedStream.id, { fallbackUrl: inputValue($event) })" /></label>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-3 gap-3 border-t border-[#edf1f5] pt-5 max-[700px]:grid-cols-1 max-[700px]:gap-3"><div><span class="block text-[9px] text-[#8997a7]">Домен</span><strong class="mt-1 block truncate text-[11px] text-[#30435a]">{{ campaign.domain }}</strong></div><div><span class="block text-[9px] text-[#8997a7]">Группа</span><strong class="mt-1 block truncate text-[11px] text-[#30435a]">{{ campaign.group }}</strong></div><div><span class="block text-[9px] text-[#8997a7]">Источник</span><strong class="mt-1 block truncate text-[11px] text-[#30435a]">{{ campaign.source }}</strong></div></div>
  </section>
</template>
