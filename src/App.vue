<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import CampaignDetails from './components/CampaignDetails.vue'
import CampaignList from './components/CampaignList.vue'
import CreateCampaignForm from './components/CreateCampaignForm.vue'
import IntegrationNote from './components/IntegrationNote.vue'
import OfferEditor from './components/OfferEditor.vue'
import TopBar from './components/TopBar.vue'
import { useCampaigns, type CampaignForm } from './composables/useCampaigns'

type AppView = 'campaigns' | 'create'

const activeView = ref<AppView>('campaigns')
const createForm = ref<CampaignForm>({
  name: '',
  geo: '',
  offer: '',
  domain: 'kt-emulator.test',
  group: 'FORTESTS',
  source: 'FORTESTS',
})

const {
  activeOffers,
  availableOffers,
  addStream,
  campaigns,
  connectionLabel,
  createCampaign,
  discardOfferChanges,
  filteredCampaigns,
  formatPercentage,
  getCampaignOfferCount,
  getOffer,
  groupCatalog,
  domainCatalog,
  sourceCatalog,
  hasPendingChanges,
  hasInvalidPercentageTotal,
  isLoading,
  isSaving,
  reloadFromKeitaro,
  removeStream,
  showSingleOfferWarning,
  confirmSingleOfferSave,
  cancelSingleOfferSave,
  notice,
  offerCatalog,
  offerToAdd,
  pendingChangeCount,
  removeOffer,
  addOffer,
  bringBackOffer,
  saveOfferChanges,
  selectedStream,
  selectedStreamId,
  selectStream,
  setOfferPercentage,
  updateStream,
  search,
  selectedCampaign,
  selectedCampaignId,
  selectedOffers,
  selectCampaign,
  togglePin,
  toggleStatus,
  totalPercentage,
} = useCampaigns()

function resetCreateForm() {
  createForm.value = {
    name: '',
    geo: '',
    offer: '',
    domain: 'kt-emulator.test',
    group: 'FORTESTS',
    source: 'FORTESTS',
  }
}

function openCreate() {
  resetCreateForm()
  activeView.value = 'create'
}

function navigate(view: AppView): void {
  if (view === 'create') {
    openCreate()
    return
  }
  activeView.value = view
}

async function submitCreate(): Promise<void> {
  if (await createCampaign(createForm.value)) activeView.value = 'campaigns'
}
</script>

<template>
  <div class="flex min-h-screen bg-[#f4f7fb] text-ink">
    <AppSidebar :active-view="activeView" :connection-label="connectionLabel" @navigate="navigate" />

    <main class="mx-auto w-full max-w-[1480px] px-12 py-[38px] max-[1050px]:px-6 max-[700px]:px-3.5 max-[700px]:py-6">
      <TopBar
        :connection-label="connectionLabel"
        :is-create="activeView === 'create'"
        :is-loading="isLoading"
        :is-saving="isSaving"
        @reload="reloadFromKeitaro"
      />

      <div v-if="isLoading" class="rounded-[15px] border border-[#dce8f0] bg-white p-8 text-sm text-[#71849a] shadow-[0_7px_24px_rgba(36,59,86,.045)]">
        Подключаемся к Keitaro API…
      </div>

      <section v-else-if="activeView === 'campaigns'" class="grid items-start gap-6 min-[1051px]:grid-cols-[minmax(340px,.9fr)_minmax(480px,1.35fr)]">
        <CampaignList
          :campaigns="campaigns"
          :filtered-campaigns="filteredCampaigns"
          :get-campaign-offer-count="getCampaignOfferCount"
          :search="search"
          :selected-campaign-id="selectedCampaignId"
          @create="openCreate"
          @select="selectCampaign"
          @update:search="search = $event"
        />

        <div v-if="selectedCampaign" class="grid gap-5">
          <CampaignDetails
            :active-offer-count="getCampaignOfferCount(selectedCampaign)"
            :campaign="selectedCampaign"
            :is-saving="isSaving"
            :selected-stream-id="selectedStreamId"
            :selected-stream="selectedStream"
            @add-stream="addStream"
            @remove-stream="removeStream"
            @select-stream="selectStream"
            @toggle-status="toggleStatus"
            @update-stream="updateStream"
          />
          <OfferEditor
            :active-offers="activeOffers"
            :available-offers="availableOffers"
            :format-percentage="formatPercentage"
            :has-active-offers-in-campaign="getCampaignOfferCount(selectedCampaign) > 0"
            :has-pending-changes="hasPendingChanges"
            :has-invalid-percentage-total="hasInvalidPercentageTotal"
            :is-saving="isSaving"
            :offer-to-add="offerToAdd"
            :pending-change-count="pendingChangeCount"
            :selected-offers="selectedOffers"
            :show-single-offer-warning="showSingleOfferWarning"
            :total-percentage="totalPercentage"
            @add-offer="addOffer"
            @bring-back="bringBackOffer"
            @discard="discardOfferChanges"
            @remove-offer="removeOffer"
            @save="saveOfferChanges"
            @set-percentage="setOfferPercentage"
            @confirm-single-offer="confirmSingleOfferSave"
            @cancel-single-offer="cancelSingleOfferSave"
            @toggle-pin="togglePin"
            @update:offerToAdd="offerToAdd = $event"
          />
        </div>
      </section>

      <section v-else class="grid items-start gap-6 min-[1051px]:grid-cols-[minmax(480px,760px)_280px]">
        <CreateCampaignForm
          :form="createForm"
          :get-offer="getOffer"
          :offer-catalog="offerCatalog"
          :domain-catalog="domainCatalog"
          :group-catalog="groupCatalog"
          :source-catalog="sourceCatalog"
          :is-saving="isSaving"
          @submit="submitCreate"
          @update:form="createForm = $event"
        />
        <IntegrationNote />
      </section>

      <Transition name="toast">
        <div v-if="notice" class="fixed bottom-6 right-7 rounded-[9px] border border-[#cde8df] bg-[#f0fbf7] px-4 py-3 text-xs font-bold text-[#397c69] shadow-[0_9px_24px_rgba(41,86,72,.12)]">
          {{ notice }}
        </div>
      </Transition>
    </main>
  </div>
</template>
