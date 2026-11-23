export interface KeitaroCampaign {
  id: number
  alias?: string
  name: string
  state?: 'active' | 'disabled' | 'deleted' | string
  group_id?: number
  traffic_source_id?: number
  domain_id?: number
  created_at?: string
}

export interface KeitaroOffer {
  id: number
  name: string
  group_id?: number
  country?: string[]
  state?: string
  affiliate_network?: string
}

export interface KeitaroOfferStream {
  id?: number
  stream_id?: number
  offer_id: number
  state?: 'active' | 'disabled' | string
  share: number
}

export interface KeitaroStream {
  id: number
  type?: string
  name: string
  campaign_id: number
  position?: number
  weight?: number
  state?: 'active' | 'disabled' | 'deleted' | string
  action_type?: string
  action_options?: Record<string, unknown>
  schema?: 'landings' | 'redirect' | 'action' | string
  filters?: unknown[]
  offers?: KeitaroOfferStream[]
}

export interface KeitaroGroup {
  id: number
  name: string
}

export interface KeitaroDomain {
  id: number
  name: string
}

export interface KeitaroTrafficSource {
  id: number
  name: string
}

export interface KeitaroCampaignRequest {
  alias: string
  name: string
  type?: 'position' | 'weight'
  state?: 'active' | 'disabled'
  group_id?: number
  traffic_source_id?: number
  domain_id?: number
}

export interface KeitaroStreamRequest {
  campaign_id: number
  type: 'forced' | 'regular' | 'default'
  name: string
  schema: 'landings' | 'redirect' | 'action'
  action_type: string
  action_options?: Record<string, unknown>
  state?: 'active' | 'disabled'
  filters?: unknown[]
  offers: KeitaroOfferStream[]
}

export interface KeitaroStreamUpdate extends Partial<KeitaroStreamRequest> {
  offers: KeitaroOfferStream[]
}

export interface KeitaroConfig {
  baseUrl: string
  apiKey: string
}

function normalizeBaseUrl(value: string): string {
  const withoutTrailingSlash = value.trim().replace(/\/+$/, '')

  if (withoutTrailingSlash.endsWith('/admin_api/v1')) return withoutTrailingSlash
  if (withoutTrailingSlash.endsWith('/admin')) {
    return `${withoutTrailingSlash.slice(0, -'/admin'.length)}/admin_api/v1`
  }

  return `${withoutTrailingSlash}/admin_api/v1`
}

export function getKeitaroConfig(): KeitaroConfig | null {
  const apiUrl = import.meta.env.VITE_KEITARO_API_URL?.trim()
  const apiKey = import.meta.env.VITE_KEITARO_API_KEY?.trim()

  if (!apiUrl || !apiKey) return null

  return {
    baseUrl: normalizeBaseUrl(apiUrl),
    apiKey,
  }
}

export class KeitaroApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'KeitaroApiError'
    this.status = status
  }
}

export class KeitaroClient {
  constructor(private readonly config: KeitaroConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    headers.set('Api-Key', this.config.apiKey)

    if (init.body) headers.set('Content-Type', 'application/json')

    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers,
    })
    const rawBody = await response.text()
    let body: unknown = null

    try {
      body = rawBody ? JSON.parse(rawBody) : null
    } catch {
      body = rawBody
    }

    if (!response.ok) {
      const detail =
        typeof body === 'object' && body !== null && 'message' in body
          ? String(body.message)
          : typeof body === 'string' && body
            ? body
            : response.statusText
      throw new KeitaroApiError(`Keitaro API ${response.status}: ${detail}`, response.status)
    }

    return body as T
  }

  getCampaigns(): Promise<KeitaroCampaign[]> {
    return this.request<KeitaroCampaign[]>('/campaigns?limit=1000')
  }

  getCampaignStreams(campaignId: number): Promise<KeitaroStream[]> {
    return this.request<KeitaroStream[]>(`/campaigns/${campaignId}/streams`)
  }

  getOffers(): Promise<KeitaroOffer[]> {
    return this.request<KeitaroOffer[]>('/offers')
  }

  getDeletedOffers(): Promise<KeitaroOffer[]> {
    return this.request<KeitaroOffer[]>('/offers/deleted')
  }

  getGroups(): Promise<KeitaroGroup[]> {
    return this.request<KeitaroGroup[]>('/groups')
  }

  getDomains(): Promise<KeitaroDomain[]> {
    return this.request<KeitaroDomain[]>('/domains')
  }

  getTrafficSources(): Promise<KeitaroTrafficSource[]> {
    return this.request<KeitaroTrafficSource[]>('/traffic_sources')
  }

  createCampaign(payload: KeitaroCampaignRequest): Promise<KeitaroCampaign> {
    return this.request<KeitaroCampaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  createStream(payload: KeitaroStreamRequest): Promise<KeitaroStream> {
    return this.request<KeitaroStream>('/streams', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  updateStream(streamId: number, payload: KeitaroStreamUpdate): Promise<KeitaroStream> {
    return this.request<KeitaroStream>(`/streams/${streamId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  restoreOffer(offerId: number): Promise<KeitaroOffer> {
    return this.request<KeitaroOffer>(`/offers/${offerId}/restore`, {
      method: 'POST',
    })
  }

  updateCampaignState(campaignId: number, state: 'active' | 'disabled'): Promise<KeitaroCampaign> {
    return this.request<KeitaroCampaign>(`/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify({ state }),
    })
  }
}

export function createKeitaroClient(): KeitaroClient | null {
  const config = getKeitaroConfig()
  return config ? new KeitaroClient(config) : null
}
