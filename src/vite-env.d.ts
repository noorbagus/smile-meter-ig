/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAMERA_KIT_API_TOKEN: string
  readonly VITE_CAMERA_KIT_LENS_ID: string
  readonly VITE_CAMERA_KIT_LENS_GROUP_ID: string
  readonly VITE_DEBUG_CAMERA_KIT: string
  readonly VITE_DEBUG_LOGS: string
  readonly VITE_MODE: string
  // Vite built-in env variables
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}