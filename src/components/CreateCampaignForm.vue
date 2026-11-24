<script setup lang="ts">
import type { CampaignForm, OfferCatalogItem } from '../composables/useCampaigns'
import type { KeitaroDomain, KeitaroGroup, KeitaroTrafficSource } from '../api/keitaro'
import OfferCombobox from './OfferCombobox.vue'

const props = defineProps<{
  form: CampaignForm
  getOffer: (id: number) => OfferCatalogItem | undefined
  offerCatalog: OfferCatalogItem[]
  domainCatalog: KeitaroDomain[]
  groupCatalog: KeitaroGroup[]
  sourceCatalog: KeitaroTrafficSource[]
  isSaving: boolean
}>()

const emit = defineEmits<{
  submit: []
  'update:form': [form: CampaignForm]
}>()

type CampaignFormField = keyof CampaignForm

function updateField(field: CampaignFormField, value: string): void {
  emit('update:form', { ...props.form, [field]: value })
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value
}
</script>

<template>
  <section class="rounded-[15px] border border-[#e1e8f0] bg-white p-7 shadow-[0_7px_24px_rgba(36,59,86,.045)] max-[700px]:p-5">
    <div>
      <span class="text-[10px] font-bold uppercase tracking-[.14em] text-[#8090a4]">Campaign builder</span>
      <h2 class="mt-1 font-display text-[17px] font-bold tracking-[-.025em] text-ink">Создать кампанию</h2>
      <p class="mt-1.5 text-xs text-[#8290a3]">Данные проходят через FastAPI и отправляются в Keitaro после создания.</p>
    </div>

    <form class="mt-7 grid gap-4" @submit.prevent="emit('submit')">
      <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
        Название кампании
        <input :value="form.name" type="text" placeholder="test_ivanov_campaign1" class="rounded-lg border border-[#dfe7ee] bg-[#fbfcfe] px-3 py-3 text-xs font-normal text-[#354b63] outline-none transition focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @input="updateField('name', inputValue($event))" />
      </label>

      <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
          GEO потока
          <input :value="form.geo" type="text" placeholder="MX, AR, CL" class="rounded-lg border border-[#dfe7ee] bg-[#fbfcfe] px-3 py-3 text-xs font-normal uppercase text-[#354b63] outline-none transition focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @input="updateField('geo', inputValue($event))" />
          <small class="font-normal text-[#8997a7]">Можно указать несколько стран через запятую</small>
        </label>
        <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
          Первый оффер
          <OfferCombobox
            :model-value="form.offer"
            :options="offerCatalog"
            placeholder="Поиск оффера"
            @update:model-value="updateField('offer', $event)"
          />
        </label>
      </div>

      <div class="flex items-center gap-3 pt-2 text-[10px] uppercase tracking-[.11em] text-[#8c9aaa] after:h-px after:flex-1 after:bg-[#e7edf3]">Настройки Keitaro</div>

      <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
          Домен
          <select :value="form.domain" class="rounded-lg border border-[#dfe7ee] bg-[#fbfcfe] px-3 py-3 text-xs font-normal text-[#354b63] outline-none transition focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @change="updateField('domain', selectValue($event))">
            <option value="">Выбрать домен</option>
            <option v-for="domain in domainCatalog" :key="domain.id" :value="domain.name">{{ domain.name }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
          Группа
          <select :value="form.group" class="rounded-lg border border-[#dfe7ee] bg-[#fbfcfe] px-3 py-3 text-xs font-normal text-[#354b63] outline-none transition focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @change="updateField('group', selectValue($event))">
            <option value="">Выбрать группу</option>
            <option v-for="group in groupCatalog" :key="group.id" :value="group.name">{{ group.name }}</option>
          </select>
        </label>
      </div>

      <label class="grid gap-1.5 text-[11px] font-bold text-[#5f7186]">
        Источник
        <select :value="form.source" class="rounded-lg border border-[#dfe7ee] bg-[#fbfcfe] px-3 py-3 text-xs font-normal text-[#354b63] outline-none transition focus:border-[#80ccb9] focus:ring-2 focus:ring-[#80ccb9]/20" @change="updateField('source', selectValue($event))">
          <option value="">Выбрать источник</option>
          <option v-for="source in sourceCatalog" :key="source.id" :value="source.name">{{ source.name }}</option>
        </select>
      </label>

      <div class="rounded-[10px] border border-[#dfeee9] bg-[#f7fcfa] p-4">
        <div class="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#6e8790]">
          <span>Что будет создано</span>
          <span class="inline-flex items-center gap-1.5 rounded border border-[#cfe5e0] bg-[#effaf7] px-2 py-1 text-[9px] text-[#428d78]"><span class="h-1.5 w-1.5 rounded-full bg-[#58c7a6]" />preview</span>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <b class="text-[10px] text-[#71bda7]">01</b>
          <span><strong class="block text-[11px] text-[#31485c]">{{ form.geo || 'GEO' }} → Google</strong><small class="mt-0.5 block text-[10px] font-normal text-[#8a9ba5]">Первый regular-поток с фильтром по GEO</small></span>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <b class="text-[10px] text-[#71bda7]">02</b>
          <span><strong class="block text-[11px] text-[#31485c]">{{ form.offer ? getOffer(Number(form.offer))?.name : 'Выбранный оффер' }}</strong><small class="mt-0.5 block text-[10px] font-normal text-[#8a9ba5]">Второй default-поток с редиректом на оффер</small></span>
        </div>
      </div>

      <button type="submit" :disabled="isSaving" class="mt-1 inline-flex w-fit items-center gap-2 rounded-[9px] border border-[#8bd7c1] bg-mint px-4 py-3 text-xs font-bold text-[#173145] shadow-[0_4px_10px_rgba(87,188,159,.18)] transition hover:-translate-y-px hover:bg-[#a0e4d2] disabled:cursor-wait disabled:opacity-60">
        {{ isSaving ? 'Сохраняем…' : 'Создать в Keitaro' }} <span class="text-base leading-none">→</span>
      </button>
    </form>
  </section>
</template>
