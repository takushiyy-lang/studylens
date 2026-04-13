'use client'
import { useEffect, useRef, useCallback } from 'react'

export interface PickerFile {
  id: string
  name: string
  mimeType: string
}

declare global {
  interface Window {
    gapi: {
      load: (lib: string, cb: () => void) => void
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
  }
}

export function useGooglePicker(
  accessToken: string,
  onSelect: (files: PickerFile[]) => void
) {
  const pickerReady = useRef(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (document.getElementById('gapi-script')) {
      if (window.gapi) window.gapi.load('picker', () => { pickerReady.current = true })
      return
    }
    const script = document.createElement('script')
    script.id = 'gapi-script'
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => window.gapi.load('picker', () => { pickerReady.current = true })
    document.head.appendChild(script)
  }, [])

  const openPicker = useCallback(() => {
    if (!pickerReady.current || !accessToken) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_API_KEY is not set')
      return
    }

    const view = new window.google.picker.DocsView()
      .setMimeTypes([
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ].join(','))
      .setIncludeFolders(false)

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: { action: string; docs?: Array<{ id: string; name: string; mimeType: string }> }) => {
        if (data.action === window.google.picker.Action.PICKED && data.docs) {
          onSelectRef.current(data.docs.map(doc => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
          })))
        }
      })
      .build()
    picker.setVisible(true)
  }, [accessToken])

  return { openPicker }
}
