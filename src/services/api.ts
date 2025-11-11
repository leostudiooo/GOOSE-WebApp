import type { Headers, StartRecord, FinishRecord } from '@/types'
import {
  API_BASE_URL,
  API_PATHS,
  HEADER_TOKEN_PREFIX,
  HEADER_XWEB_XHR,
  HEADER_ACCEPT,
  HEADER_SEC_FETCH_SITE,
  HEADER_SEC_FETCH_MODE,
  HEADER_SEC_FETCH_DEST,
  HEADER_ACCEPT_ENCODING,
  HEADER_ACCEPT_LANGUAGE,
  HEADER_CONTENT_TYPE_JSON,
  IMAGE_FILENAME,
  REQUEST_MIN_DELAY_SEC,
  REQUEST_MAX_DELAY_SEC,
} from '@/types/constants'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomDelay(): Promise<void> {
  const delayMs =
    (REQUEST_MIN_DELAY_SEC + Math.random() * (REQUEST_MAX_DELAY_SEC - REQUEST_MIN_DELAY_SEC)) * 1000
  return delay(delayMs)
}

export class APIClient {
  private headers: Record<string, string>

  constructor(config: Headers, token: string) {
    this.headers = {
      token: `${HEADER_TOKEN_PREFIX}${token}`,
      miniappversion: config.miniappVersion,
      'User-Agent': config.userAgent,
      tenant: config.tenant,
      Referer: config.referer,
      xweb_xhr: HEADER_XWEB_XHR,
      Accept: HEADER_ACCEPT,
      'Sec-Fetch-Site': HEADER_SEC_FETCH_SITE,
      'Sec-Fetch-Mode': HEADER_SEC_FETCH_MODE,
      'Sec-Fetch-Dest': HEADER_SEC_FETCH_DEST,
      'Accept-Encoding': HEADER_ACCEPT_ENCODING,
      'Accept-Language': HEADER_ACCEPT_LANGUAGE,
    }
  }

  private async request(
    url: string,
    options: RequestInit = {},
  ): Promise<{ code: number; msg: string; data: string | boolean }> {
    await randomDelay()

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    })

    const json = await response.json()

    if (json.code !== 0) {
      throw new Error(`API Error (${json.code}): ${json.msg}`)
    }

    return json
  }

  async checkTenant(tenant: string): Promise<void> {
    const headers = { ...this.headers }
    delete headers.tenant
    delete headers.token
    headers['Content-Type'] = HEADER_CONTENT_TYPE_JSON

    await this.request(`${API_PATHS.CHECK_TENANT}?tenantCode=${tenant}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
  }

  async checkToken(): Promise<void> {
    await this.request(`${API_PATHS.CHECK_TOKEN}?para=undefined`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async uploadStartImage(imageFile: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', imageFile, IMAGE_FILENAME)

    const response = await this.request(API_PATHS.UPLOAD_START_IMAGE, {
      method: 'POST',
      body: formData,
    })

    return response.data as string
  }

  async uploadFinishImage(imageFile: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', imageFile, IMAGE_FILENAME)

    const response = await this.request(API_PATHS.UPLOAD_FINISH_IMAGE, {
      method: 'POST',
      body: formData,
    })

    return response.data as string
  }

  async uploadStartRecord(record: StartRecord): Promise<string> {
    const response = await this.request(API_PATHS.SAVE_START_RECORD, {
      method: 'POST',
      headers: {
        'Content-Type': HEADER_CONTENT_TYPE_JSON,
      },
      body: JSON.stringify(record),
    })

    return response.data as string
  }

  async uploadFinishRecord(record: FinishRecord): Promise<boolean> {
    const response = await this.request(API_PATHS.SAVE_RECORD, {
      method: 'POST',
      headers: {
        'Content-Type': HEADER_CONTENT_TYPE_JSON,
      },
      body: JSON.stringify(record),
    })

    return response.data as boolean
  }
}
