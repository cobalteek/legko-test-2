import { computed, ref } from 'vue'
import {
  createKeitaroClient,
  type KeitaroCampaign,
  type KeitaroCampaignRequest,
  type KeitaroDomain,
  type KeitaroGroup,
  type KeitaroStream,
  type KeitaroTrafficSource,
} from '../api/keitaro'

export type CampaignStatus = 'active' | 'paused'
export type StreamStatus = 'active' | 'paused' | 'removed'
export type BaseStreamStatus = 'active' | 'paused' | 'none'
export type StreamType = 'forced' | 'regular' | 'default'
export type OfferState = 'active' | 'added' | 'removed' | 'restored'
export type BaseOfferState = 'active' | 'none' | 'removed'

export interface OfferCatalogItem {
  id: number
  name: string
  vertical: string
  geo: string
  archived?: boolean
}

export interface CampaignOffer {
  id: number
  state: OfferState
  pending: boolean
  pinned: boolean
  share: number
  baseShare: number
  savedPercentage: number | null
  baseState: BaseOfferState
  basePinned: boolean
  basePercentage: number | null
}

export interface Campaign {
  id: number
  alias?: string
  name: string
  geo: string
  status: CampaignStatus
  domain: string
  group: string
  source: string
  createdAt: string
  streams: CampaignStream[]
}

export interface CampaignStream {
  id: number
  name: string
  type: StreamType
  status: StreamStatus
  position: number
  geo: string[]
  fallbackUrl: string
  pending: boolean
  isNew: boolean
  baseName: string
  baseType: StreamType
  baseStatus: BaseStreamStatus
  baseGeo: string[]
  baseFallbackUrl: string
  offers: CampaignOffer[]
}

export interface CampaignForm {
  name: string
  geo: string
  offer: string
  domain: string
  group: string
  source: string
}

export interface OfferRow extends OfferCatalogItem {
  state: OfferState
  pending: boolean
  pinned: boolean
  share: number
  savedPercentage: number | null
  percentage: number
}

function calculateIntegerShares(rows: Pick<OfferRow, 'pinned' | 'savedPercentage'>[]): number[] {
  if (rows.length === 0) return []
  if (rows.length === 1) return [100]

  const pinnedTotal = rows
    .filter((row) => row.pinned)
    .reduce((total, row) => total + Math.round(row.savedPercentage ?? 0), 0)
  const unpinnedIndexes = rows
    .map((row, index) => (row.pinned ? -1 : index))
    .filter((index) => index >= 0)
  const shares = rows.map((row) => (row.pinned ? Math.round(row.savedPercentage ?? 0) : 0))

  if (unpinnedIndexes.length === 0) return shares

  const remaining = Math.max(0, 100 - pinnedTotal)
  const baseShare = Math.floor(remaining / unpinnedIndexes.length)
  let remainder = remaining - baseShare * unpinnedIndexes.length

  unpinnedIndexes.forEach((index) => {
    shares[index] = baseShare
    if (remainder > 0) {
      shares[index] += 1
      remainder -= 1
    }
  })

  return shares
}

function normalizeGeoList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value?.split(/[\s,;]+/) ?? []
  return [...new Set(values.map((item) => item.trim().toUpperCase()).filter(Boolean))]
}

function formatCreatedAt(value?: string): string {
  if (!value) return 'В Keitaro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || `campaign-${Date.now()}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка API'
}

function findByName<T extends { name: string }>(items: T[], value: string): T | undefined {
  const normalized = value.trim().toLowerCase()
  return items.find((item) => item.name.trim().toLowerCase() === normalized)
}

function makeCampaignOffer(id: number, values: Partial<CampaignOffer> = {}): CampaignOffer {
  return {
    id,
    state: values.state ?? 'active',
    pending: values.pending ?? false,
    pinned: values.pinned ?? false,
    share: values.share ?? 0,
    baseShare: values.baseShare ?? values.share ?? 0,
    savedPercentage: values.savedPercentage ?? null,
    baseState: values.baseState ?? 'active',
    basePinned: values.basePinned ?? false,
    basePercentage: values.basePercentage ?? null,
  }
}

function mergeRemoteOffers(
  remoteOffers: { offer_id: number; share: number; state?: string }[],
  cachedOffers: CampaignOffer[],
): CampaignOffer[] {
  const cachedById = new Map(cachedOffers.map((offer) => [offer.id, offer]))
  const remoteIds = new Set(remoteOffers.map((offer) => Number(offer.offer_id)))
  const activeOffers = remoteOffers.map((remoteOffer) => {
    const offerId = Number(remoteOffer.offer_id)
    const cached = cachedById.get(offerId)

    if (cached?.pending) return cached

    const isRemoved = remoteOffer.state === 'disabled' || remoteOffer.state === 'removed'
    const pinned = cached?.basePinned ?? false
    const savedPercentage = pinned ? cached?.basePercentage ?? remoteOffer.share : null

    return makeCampaignOffer(offerId, {
      state: isRemoved ? 'removed' : 'active',
      pinned,
      share: isRemoved ? 0 : Math.round(remoteOffer.share),
      baseShare: isRemoved ? 0 : Math.round(remoteOffer.share),
      savedPercentage,
      baseState: isRemoved ? 'removed' : 'active',
      basePinned: pinned,
      basePercentage: savedPercentage,
    })
  })

  const preservedOffers = cachedOffers.filter((offer) => !remoteIds.has(offer.id))
  return [...activeOffers, ...preservedOffers]
}

function getStreamGeo(stream: KeitaroStream): string[] {
  const countryFilter = (stream.filters ?? []).find((filter) => {
    if (!filter || typeof filter !== 'object') return false
    return 'name' in filter && filter.name === 'country'
  })

  if (!countryFilter || typeof countryFilter !== 'object' || !('payload' in countryFilter)) return []
  const payload = countryFilter.payload
  return Array.isArray(payload) ? normalizeGeoList(payload.map(String)) : []
}

function normalizeStreamType(value?: string): StreamType {
  return value === 'forced' || value === 'default' ? value : 'regular'
}

function isTemporaryStreamId(id: number): boolean {
  return id < 0 || id >= 1_000_000_000_000
}

export function formatPercentage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function useCampaigns() {
  const keitaro = createKeitaroClient()
  const campaigns = ref<Campaign[]>([])
  const offerCatalog = ref<OfferCatalogItem[]>([])
  const groupCatalog = ref<KeitaroGroup[]>([])
  const domainCatalog = ref<KeitaroDomain[]>([])
  const sourceCatalog = ref<KeitaroTrafficSource[]>([])
  const selectedCampaignId = ref(1)
  const selectedStreamId = ref<number | null>(null)
  const search = ref('')
  const offerToAdd = ref('')
  const notice = ref('')
  const isLoading = ref(true)
  const isSaving = ref(false)
  const showSingleOfferWarning = ref(false)
  const lastRemovedOfferId = ref<number | null>(null)
  let noticeTimer: number | undefined

  const selectedCampaign = computed(() =>
    campaigns.value.find((campaign) => campaign.id === selectedCampaignId.value),
  )
  const selectedStream = computed(() =>
    selectedCampaign.value?.streams.find((stream) => stream.id === selectedStreamId.value) ??
      selectedCampaign.value?.streams[0],
  )

  function getInitialStreamId(campaign: Campaign | undefined): number | null {
    if (!campaign) return null

    return (
      campaign.streams.find((stream) => stream.offers.some((offer) => offer.state !== 'removed'))?.id ??
      campaign.streams.find((stream) => stream.type === 'default')?.id ??
      campaign.streams[0]?.id ??
      null
    )
  }

  const filteredCampaigns = computed(() => {
    const query = search.value.trim().toLowerCase()

    if (!query) return campaigns.value

    return campaigns.value.filter((campaign) =>
      [campaign.name, campaign.geo, campaign.source, campaign.group]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  })

  const selectedOffers = computed<OfferRow[]>(() => {
    const rows = (selectedStream.value?.offers ?? [])
      .map((item): OfferRow => {
        const offer = offerCatalog.value.find((candidate) => candidate.id === item.id) ?? {
          id: item.id,
          name: `Оффер #${item.id}`,
          vertical: 'Offer',
          geo: '—',
        }

        return {
          ...offer,
          state: item.state,
          pending: item.pending,
          pinned: item.pinned,
          share: item.share,
          savedPercentage: item.savedPercentage,
          percentage: item.share,
        }
      })

    const activeRows = rows.filter((row) => row.state !== 'removed')
    const hasOfferDraft = selectedStream.value?.offers.some((offer) => offer.pending) ?? false
    if (!hasOfferDraft) return rows

    if (activeRows.length === 1) {
      return rows.map((row) => ({
        ...row,
        percentage: row.state === 'removed' ? 0 : 100,
      }))
    }

    const shares = calculateIntegerShares(activeRows)
    const sharesById = new Map(activeRows.map((row, index) => [row.id, shares[index]]))

    return rows.map((row) => ({
      ...row,
      percentage: row.state === 'removed' ? 0 : sharesById.get(row.id) ?? 0,
    }))
  })

  const activeOffers = computed(() => selectedOffers.value.filter((offer) => offer.state !== 'removed'))
  const availableOffers = computed(() => {
    const selected = new Set((selectedStream.value?.offers ?? []).map((item) => item.id))
    return offerCatalog.value.filter((offer) => !selected.has(offer.id))
  })
  const hasPendingChanges = computed(
    () => Boolean(selectedCampaign.value?.streams.some((stream) => stream.pending)) || selectedOffers.value.some((offer) => offer.pending),
  )
  const pendingChangeCount = computed(
    () => selectedOffers.value.filter((offer) => offer.pending).length + (selectedCampaign.value?.streams.filter((stream) => stream.pending).length ?? 0),
  )
  const totalPercentage = computed(() => {
    const total = activeOffers.value.reduce((sum, offer) => sum + offer.percentage, 0)
    return Math.round(total * 10) / 10
  })
  const hasInvalidPercentageTotal = computed(() => {
    const activeRows = activeOffers.value
    if (activeRows.length <= 1) return false

    const pinnedTotal = activeRows
      .filter((offer) => offer.pinned)
      .reduce((total, offer) => total + (offer.savedPercentage ?? 0), 0)
    const hasUnpinnedOffers = activeRows.some((offer) => !offer.pinned)

    return pinnedTotal > 100 || (!hasUnpinnedOffers && pinnedTotal !== 100)
  })

  function showNotice(message: string): void {
    notice.value = message
    if (noticeTimer) window.clearTimeout(noticeTimer)
    noticeTimer = window.setTimeout(() => {
      notice.value = ''
    }, 3200)
  }

  function refreshPending(item: CampaignOffer): void {
    const stateMatches = item.state === item.baseState
    const pinMatches = item.pinned === item.basePinned
    const percentageMatches = item.pinned
      ? item.savedPercentage === item.basePercentage
      : item.basePinned === false

    item.pending = !(stateMatches && pinMatches && percentageMatches)
  }

  function getOffer(id: number): OfferCatalogItem | undefined {
    return offerCatalog.value.find((offer) => offer.id === id)
  }

  function getCampaignOfferCount(campaign: Campaign): number {
    return campaign.streams.reduce(
      (total, stream) => stream.status === 'removed'
        ? total
        : total + stream.offers.filter((item) => item.state !== 'removed').length,
      0,
    )
  }

  function selectCampaign(id: number): void {
    selectedCampaignId.value = id
    selectedStreamId.value = getInitialStreamId(campaigns.value.find((campaign) => campaign.id === id))
  }

  function selectStream(id: number): void {
    if (selectedCampaign.value?.streams.some((stream) => stream.id === id)) {
      selectedStreamId.value = id
    }
  }

  function addStream(): void {
    const campaign = selectedCampaign.value
    if (!campaign) return

    const nextPosition = campaign.streams.length + 1
    const id = -Date.now()
    const stream: CampaignStream = {
      id,
      name: `Поток ${nextPosition}`,
      type: 'regular',
      status: 'active',
      position: nextPosition,
      geo: [],
      fallbackUrl: '',
      pending: true,
      isNew: true,
      baseName: '',
      baseType: 'regular',
      baseStatus: 'none',
      baseGeo: [],
      baseFallbackUrl: '',
      offers: [],
    }
    campaign.streams.push(stream)
    selectedStreamId.value = id
    showNotice('Новый поток добавлен в черновик')
  }

  function updateStream(id: number, patch: Partial<Pick<CampaignStream, 'name' | 'type' | 'status' | 'geo' | 'fallbackUrl'>>): void {
    const stream = selectedCampaign.value?.streams.find((item) => item.id === id)
    if (!stream) return

    Object.assign(stream, patch)
    stream.geo = normalizeGeoList(stream.geo)
    stream.pending = true
    selectedCampaign.value!.geo = [...new Set(
      selectedCampaign.value!.streams
        .filter((item) => item.type !== 'default' && item.status !== 'removed')
        .flatMap((item) => item.geo),
    )].join(', ') || '—'
  }

  function removeStream(id: number): void {
    const campaign = selectedCampaign.value
    if (!campaign || campaign.streams.length <= 1) {
      showNotice('В кампании должен остаться хотя бы один поток')
      return
    }

    const stream = campaign.streams.find((item) => item.id === id)
    if (!stream) return

    stream.status = 'removed'
    stream.pending = true
    const nextStream = campaign.streams.find((item) => item.status !== 'removed')
    selectedStreamId.value = nextStream?.id ?? null
    showNotice('Поток помечен на удаление')
  }

  function mapRemoteCampaign(
    remote: KeitaroCampaign,
    streams: KeitaroStream[],
  ): Campaign {
    const mappedStreams = streams.map((stream, index): CampaignStream => {
      const geo = normalizeGeoList(stream.metadata?.geo ?? getStreamGeo(stream))
      const fallbackUrl =
        stream.metadata?.fallback_url ??
        stream.action_payload ??
        (typeof stream.action_options?.url === 'string' ? stream.action_options.url : '')

      return {
        id: stream.id,
        name: stream.name || `Поток ${index + 1}`,
        type: normalizeStreamType(stream.type),
        status: stream.state === 'disabled' ? 'paused' : 'active',
        position: stream.position ?? index + 1,
        geo,
        fallbackUrl,
        pending: false,
        isNew: false,
        baseName: stream.name,
        baseType: normalizeStreamType(stream.type),
        baseStatus: stream.state === 'disabled' ? 'paused' : 'active',
        baseGeo: geo,
        baseFallbackUrl: fallbackUrl,
        offers: mergeRemoteOffers(
          stream.offers ?? [],
          [],
        ),
      }
    })

    return {
      id: remote.id,
      alias: remote.alias,
      name: remote.name,
      geo: remote.metadata?.geo ?? (mappedStreams.flatMap((stream) => stream.geo).join(', ') || '—'),
      status: remote.state === 'active' ? 'active' : 'paused',
      domain: remote.metadata?.domain ?? '',
      group: remote.metadata?.group ?? '',
      source: remote.metadata?.source ?? '',
      createdAt: formatCreatedAt(remote.created_at),
      streams: mappedStreams,
    }
  }

  async function loadRemoteData(): Promise<boolean> {
    try {
      const [remoteCampaigns, remoteOffers, deletedOffers, groups, domains, trafficSources] = await Promise.all([
        keitaro.getCampaigns(),
        keitaro.getOffers(),
        keitaro.getDeletedOffers().catch(() => []),
        keitaro.getGroups(),
        keitaro.getDomains(),
        keitaro.getTrafficSources(),
      ])
      groupCatalog.value = groups
      domainCatalog.value = domains
      sourceCatalog.value = trafficSources
      const streams = await Promise.all(
        remoteCampaigns.map((campaign) => keitaro.getCampaignStreams(campaign.id)),
      )
      const groupById = new Map(groups.map((group) => [group.id, group]))
      const domainById = new Map(domains.map((domain) => [domain.id, domain]))
      const sourceById = new Map(trafficSources.map((source) => [source.id, source]))

      campaigns.value = remoteCampaigns.map((remoteCampaign, index) => {
        const mapped = mapRemoteCampaign(
          remoteCampaign,
          streams[index],
        )

        return {
          ...mapped,
          group: (groupById.get(remoteCampaign.group_id ?? -1)?.name ?? mapped.group) || '—',
          domain: (domainById.get(remoteCampaign.domain_id ?? -1)?.name ?? mapped.domain) || '—',
          source:
            (sourceById.get(remoteCampaign.traffic_source_id ?? -1)?.name ?? mapped.source) || '—',
        }
      })

      const remoteCatalog = remoteOffers.map((offer): OfferCatalogItem => ({
        id: offer.id,
        name: offer.name,
        vertical: offer.affiliate_network ?? 'Offer',
        geo: offer.country?.join(', ') || '—',
      }))
      const deletedCatalog = deletedOffers.map((offer): OfferCatalogItem => ({
        id: offer.id,
        name: offer.name,
        vertical: offer.affiliate_network ?? 'Offer',
        geo: offer.country?.join(', ') || '—',
        archived: true,
      }))
      offerCatalog.value = [...remoteCatalog, ...deletedCatalog]
      selectedCampaignId.value = campaigns.value[0]?.id ?? 1
      selectedStreamId.value = getInitialStreamId(campaigns.value[0])
      return true
    } catch (error) {
      campaigns.value = []
      selectedCampaignId.value = campaigns.value[0]?.id ?? 1
      selectedStreamId.value = campaigns.value[0]?.streams[0]?.id ?? null
      showNotice(`Не удалось загрузить Keitaro: ${getErrorMessage(error)}`)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function reloadFromKeitaro(): Promise<void> {
    if (isLoading.value || isSaving.value) return
    if (hasPendingChanges.value) {
      showNotice('Сначала сохрани или отмени черновик')
      return
    }

    isLoading.value = true
    if (await loadRemoteData()) showNotice('Данные загружены из Keitaro')
  }

  async function createCampaign(form: CampaignForm): Promise<boolean> {
    const name = form.name.trim()
    const geoList = normalizeGeoList(form.geo)
    const offerId = Number(form.offer)

    if (!name || geoList.length === 0 || !offerId) {
      showNotice('Заполни название, GEO и оффер')
      return false
    }

    isSaving.value = true
    try {
      const [groups, domains, trafficSources] = await Promise.all([
        keitaro.getGroups(),
        keitaro.getDomains(),
        keitaro.getTrafficSources(),
      ])
      groupCatalog.value = groups
      domainCatalog.value = domains
      sourceCatalog.value = trafficSources
      const group = findByName(groups, form.group)
      const domain = findByName(domains, form.domain)
      const source = findByName(trafficSources, form.source)
      const payload: KeitaroCampaignRequest = {
        alias: slugify(name),
        name,
        type: 'weight',
        state: 'active',
      }

      if (group) payload.group_id = group.id
      if (domain) payload.domain_id = domain.id
      if (source) payload.traffic_source_id = source.id

      const remoteCampaign = await keitaro.createCampaign(payload)
      const googleStream = await keitaro.createStream({
        campaign_id: remoteCampaign.id,
        type: 'regular',
        name: `${geoList.join(', ')} → Google`,
        schema: 'redirect',
        action_type: 'http',
        action_payload: 'https://google.com',
        filters: [{ name: 'country', mode: 'accept', payload: geoList }],
        offers: [],
      })
      const offerStream = await keitaro.createStream({
        campaign_id: remoteCampaign.id,
        type: 'default',
        name: 'Оффер кампании',
        schema: 'landings',
        action_type: 'http',
        filters: [],
        offers: [{ offer_id: offerId, share: 100, state: 'active' }],
      })
      const campaign = mapRemoteCampaign(remoteCampaign, [googleStream, offerStream])

      campaign.geo = geoList.join(', ')
      campaign.domain = form.domain
      campaign.group = form.group
      campaign.source = form.source
      await keitaro.updateCampaignMetadata(campaign.id, {
        geo: campaign.geo,
        domain: campaign.domain,
        group: campaign.group,
        source: campaign.source,
      })
      campaigns.value.unshift(campaign)
      selectedCampaignId.value = campaign.id
      selectedStreamId.value = getInitialStreamId(campaign)
      showNotice('Кампания создана и отправлена в Keitaro')
      return true
    } catch (error) {
      showNotice(`Не удалось создать кампанию: ${getErrorMessage(error)}`)
      return false
    } finally {
      isSaving.value = false
    }
  }

  function addOffer(id: string | number): void {
    const offerId = Number(id)
    if (!offerId || !selectedStream.value) return

    selectedStream.value.offers.push(
      makeCampaignOffer(offerId, {
        state: 'added',
        pending: true,
        baseState: 'none',
        share: 0,
        baseShare: 0,
      }),
    )
    offerToAdd.value = ''
    showNotice('Оффер добавлен в черновик')
  }

  function removeOffer(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item || !selectedStream.value) return

    item.state = 'removed'
    item.pinned = false
    item.share = 0
    item.savedPercentage = null
    lastRemovedOfferId.value = id
    refreshPending(item)
    showNotice('Оффер помечен на удаление')
  }

  function bringBackOffer(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item) return

    item.state = item.baseState === 'removed' ? 'restored' : item.baseState === 'none' ? 'added' : 'active'
    item.pinned = item.basePinned
    item.share = item.baseShare
    item.savedPercentage = item.basePercentage
    if (lastRemovedOfferId.value === id) lastRemovedOfferId.value = null
    refreshPending(item)
    showNotice(item.pending ? 'Оффер возвращён в черновик' : 'Удаление отменено')
  }

  function togglePin(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    const row = selectedOffers.value.find((offer) => offer.id === id)
    if (!item || !row || row.state === 'removed') return

    item.pinned = !item.pinned
    item.savedPercentage = item.pinned
      ? item.basePinned && item.basePercentage !== null
        ? item.basePercentage
        : row.percentage
      : null
    refreshPending(item)
    showNotice(
      item.pinned
        ? `Процент закреплён: ${formatPercentage(item.savedPercentage ?? 0)}%`
        : item.pending
          ? 'Процент откреплён в черновике'
          : 'Процент откреплён',
    )
  }

  function setOfferPercentage(id: number, value: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item || item.state === 'removed' || !Number.isFinite(value)) return

    item.pinned = true
    item.savedPercentage = Math.min(100, Math.max(0, Math.round(value)))
    refreshPending(item)
    showNotice(`Процент оффера изменён: ${item.savedPercentage}%`)
  }

  function buildIntegerShares(rows: OfferRow[]): number[] {
    return calculateIntegerShares(rows)
  }

  function commitOfferChanges(stream: CampaignStream): void {
    stream.offers.forEach((item) => {
      if (item.state === 'removed') {
        item.baseState = 'removed'
        item.basePinned = item.pinned
        item.share = 0
        item.baseShare = 0
        item.basePercentage = item.savedPercentage
        item.pending = false
        return
      }
      item.state = 'active'
      item.baseState = 'active'
      item.basePinned = item.pinned
      item.baseShare = item.share
      item.basePercentage = item.pinned ? item.savedPercentage : null
      item.pending = false
    })
  }

  function commitStreamChanges(stream: CampaignStream): void {
    stream.baseName = stream.name
    stream.baseType = stream.type
    stream.baseStatus = stream.status === 'removed' ? 'paused' : stream.status
    stream.baseGeo = [...stream.geo]
    stream.baseFallbackUrl = stream.fallbackUrl
    stream.pending = false
    stream.isNew = false
  }

  function restoreStreamDraft(stream: CampaignStream): void {
    stream.name = stream.baseName
    stream.type = stream.baseType
    stream.status = stream.baseStatus === 'none' ? 'removed' : stream.baseStatus
    stream.geo = [...stream.baseGeo]
    stream.fallbackUrl = stream.baseFallbackUrl
    stream.pending = false
  }

  function buildStreamRequest(
    stream: CampaignStream,
    campaignId: number,
    offers: { offer_id: number; share: number; state: 'active' }[],
  ) {
    return {
      campaign_id: campaignId,
      type: stream.type,
      name: stream.name,
      schema: stream.type === 'default' && offers.length > 0 ? 'landings' as const : 'redirect' as const,
      action_type: 'http',
      state: stream.status === 'paused' || stream.status === 'removed' ? 'disabled' as const : 'active' as const,
      filters: stream.geo.length
        ? [{ name: 'country', mode: 'accept', payload: stream.geo }]
        : [],
      action_payload: stream.fallbackUrl || undefined,
      offers,
    }
  }

  function shouldWarnAboutSingleOffer(): boolean {
    return (
      lastRemovedOfferId.value !== null &&
      activeOffers.value.length === 1 &&
      activeOffers.value[0].pinned
    )
  }

  async function saveOfferChanges(force = false): Promise<void> {
    const campaign = selectedCampaign.value
    const stream = selectedStream.value
    if (!campaign || !stream || !hasPendingChanges.value || isSaving.value) return
    if (hasInvalidPercentageTotal.value) {
      const pinnedOffers = activeOffers.value.filter((offer) => offer.pinned)
      const pinnedTotal = pinnedOffers.reduce((total, offer) => total + (offer.savedPercentage ?? 0), 0)
      showNotice(
        activeOffers.value.some((offer) => !offer.pinned)
          ? 'Сумма закреплённых процентов не должна превышать 100%'
          : `Для всех закреплённых офферов нужна сумма 100% (сейчас ${pinnedTotal}%)`,
      )
      return
    }
    if (!force && shouldWarnAboutSingleOffer()) {
      showSingleOfferWarning.value = true
      return
    }

    isSaving.value = true
    try {
      const removedStreams = campaign.streams.filter((item) => item.pending && item.status === 'removed')
      const isNewStream = stream.isNew || isTemporaryStreamId(stream.id)
      const activeRows = selectedOffers.value.filter((offer) => offer.state !== 'removed')
      const shares = buildIntegerShares(activeRows)
      const offerPayload = activeRows.map((offer, index) => ({
        offer_id: offer.id,
        share: shares[index],
        state: 'active' as const,
      }))

      activeRows.forEach((offer, index) => {
        const item = stream.offers.find((candidate) => candidate.id === offer.id)
        if (item) item.share = shares[index]
      })

      if (activeRows.length === 0 && stream.type !== 'default') {
        stream.status = 'paused'
      }

      for (const removedStream of removedStreams) {
        if (!removedStream.isNew && !isTemporaryStreamId(removedStream.id)) {
          await keitaro.deleteStream(removedStream.id, campaign.id)
        }
      }

      if (activeRows.length === 0) {
        if (!isNewStream) {
          await keitaro.updateStream(stream.id, buildStreamRequest(stream, campaign.id, []))
        }
      } else if (isNewStream) {
        const remoteStream = await keitaro.createStream({
          ...buildStreamRequest(stream, campaign.id, offerPayload),
        })
        const remoteStreamId = Number(remoteStream.id)
        if (!Number.isInteger(remoteStreamId) || remoteStreamId <= 0) {
          throw new Error('Keitaro не вернул ID созданного потока')
        }
        stream.id = remoteStreamId
        stream.isNew = false
      } else {
        await keitaro.updateStream(stream.id, buildStreamRequest(stream, campaign.id, offerPayload))
      }

      if (activeRows.length === 1 && activeOffers.value[0].pinned) {
        const soleOffer = stream.offers.find((offer) => offer.id === activeOffers.value[0].id)
        if (soleOffer) soleOffer.savedPercentage = 100
      }

      if (stream.status === 'removed') {
        stream.status = 'paused'
      }
      commitOfferChanges(stream)
      commitStreamChanges(stream)
      removedStreams.forEach(commitStreamChanges)
      campaign.streams = campaign.streams.filter((item) => item.status !== 'removed')
      if (getCampaignOfferCount(campaign) === 0) {
        if (campaign.status === 'active') {
          await keitaro.updateCampaignState(campaign.id, 'disabled')
        }
        campaign.status = 'paused'
      }
      showSingleOfferWarning.value = false
      lastRemovedOfferId.value = null
      showNotice(
        getCampaignOfferCount(campaign) === 0
          ? 'Офферы удалены, кампания поставлена на паузу в Keitaro'
          : 'Изменения отправлены в Keitaro',
      )
    } catch (error) {
      showNotice(`Не удалось сохранить изменения: ${getErrorMessage(error)}`)
    } finally {
      isSaving.value = false
    }
  }

  async function confirmSingleOfferSave(): Promise<void> {
    await saveOfferChanges(true)
  }

  function cancelSingleOfferSave(): void {
    showSingleOfferWarning.value = false
    if (lastRemovedOfferId.value !== null) bringBackOffer(lastRemovedOfferId.value)
  }

  function discardOfferChanges(): void {
    const stream = selectedStream.value
    if (!selectedCampaign.value || !stream || !hasPendingChanges.value) return

    stream.offers = stream.offers
      .filter((item) => item.baseState !== 'none')
      .map((item) => {
        item.state = item.baseState === 'removed' ? 'removed' : 'active'
        item.pinned = item.basePinned
        item.share = item.baseShare
        item.savedPercentage = item.basePercentage
        item.pending = false
        return item
      })
    if (stream.isNew) {
      selectedCampaign.value.streams = selectedCampaign.value.streams.filter((item) => item.id !== stream.id)
      selectedStreamId.value = selectedCampaign.value.streams[0]?.id ?? null
    } else {
      restoreStreamDraft(stream)
    }
    selectedCampaign.value.streams = selectedCampaign.value.streams.filter((item) => {
      if (item.status !== 'removed') return true
      if (item.isNew) return false
      restoreStreamDraft(item)
      return true
    })
    lastRemovedOfferId.value = null
    showSingleOfferWarning.value = false
    showNotice('Черновые изменения отменены')
  }

  async function toggleStatus(campaign: Campaign): Promise<void> {
    if (isSaving.value) return
    const nextStatus: CampaignStatus = campaign.status === 'active' ? 'paused' : 'active'

    if (nextStatus === 'active' && getCampaignOfferCount(campaign) === 0) {
      showNotice('Нельзя запустить кампанию без активных офферов')
      return
    }

    isSaving.value = true
    try {
      await keitaro.updateCampaignState(campaign.id, nextStatus === 'active' ? 'active' : 'disabled')
      campaign.status = nextStatus
      showNotice(
        nextStatus === 'active' ? 'Кампания запущена в Keitaro' : 'Кампания приостановлена в Keitaro',
      )
    } catch (error) {
      showNotice(`Не удалось изменить статус: ${getErrorMessage(error)}`)
    } finally {
      isSaving.value = false
    }
  }

  void loadRemoteData()

  return {
    activeOffers,
    availableOffers,
    addStream,
    campaigns,
    connectionLabel: 'FastAPI · Keitaro API',
    createCampaign,
    discardOfferChanges,
    filteredCampaigns,
    formatPercentage,
    groupCatalog,
    domainCatalog,
    sourceCatalog,
    getCampaignOfferCount,
    getOffer,
    hasPendingChanges,
    hasInvalidPercentageTotal,
    isLoading,
    isSaving,
    showSingleOfferWarning,
    confirmSingleOfferSave,
    cancelSingleOfferSave,
    notice,
    offerCatalog,
    offerToAdd,
    pendingChangeCount,
    removeOffer,
    removeStream,
    reloadFromKeitaro,
    addOffer,
    bringBackOffer,
    saveOfferChanges,
    setOfferPercentage,
    search,
    selectedCampaign,
    selectedCampaignId,
    selectedOffers,
    selectedStream,
    selectedStreamId,
    selectCampaign,
    selectStream,
    showNotice,
    updateStream,
    togglePin,
    toggleStatus,
    totalPercentage,
  }
}
