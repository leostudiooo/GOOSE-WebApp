export const API_BASE_URL = 'https://tyxsjpt.seu.edu.cn'

export const API_PATHS = {
  CHECK_TENANT: '/api/miniapp/anno/checkTenant',
  CHECK_TOKEN: '/api/miniapp/student/checkToken',
  SAVE_START_RECORD: '/api/exercise/exerciseRecord/saveStartRecord',
  SAVE_RECORD: '/api/exercise/exerciseRecord/saveRecord',
  UPLOAD_START_IMAGE: '/api/miniapp/exercise/uploadRecordImage',
  UPLOAD_FINISH_IMAGE: '/api/miniapp/exercise/uploadRecordImage2',
  LIST_ROUTE: '/api/miniapp/exercise/listRule',
} as const

export const EARTH_RADIUS_KM = 6378.13649

export const CALORIE_PER_KM = 62

export const RECORD_STATUS_FINISHED = 2

export const IMAGE_MIME_TYPE = 'image/jpeg'
export const IMAGE_FILENAME = '1.jpg'

export const TOKEN_PARTS_COUNT = 3
export const TOKEN_USERID_FIELD = 'userid'

export const REQUEST_MIN_DELAY_SEC = 1.5
export const REQUEST_MAX_DELAY_SEC = 3.5

export const HEADER_TOKEN_PREFIX = 'Bearer '
export const HEADER_XWEB_XHR = '1'
export const HEADER_CONTENT_TYPE_JSON = 'application/json;charset=UTF-8'
export const HEADER_ACCEPT = '*/*'
export const HEADER_SEC_FETCH_SITE = 'cross-site'
export const HEADER_SEC_FETCH_MODE = 'cors'
export const HEADER_SEC_FETCH_DEST = 'empty'
export const HEADER_ACCEPT_ENCODING = 'gzip, deflate, br'
export const HEADER_ACCEPT_LANGUAGE = 'zh-CN,zh;q=0.9'
