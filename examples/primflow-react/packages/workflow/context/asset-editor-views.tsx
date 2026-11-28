import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import type { PanelEditorContext, PortEditorContext } from '@lyx-pj/primflow-canvas'
import { localize } from '../i18n'
import { storeFile, type AssetRef } from '../services/assets'
import { assetPreviewUrl } from './asset-preview'

/** Keep pointer handling inside the control instead of starting a canvas drag. */
function stopPointer(evt: MouseEvent) {
  evt.stopPropagation()
}

/** Compact file picker rendered next to an asset port on the canvas. */
export function AssetPortEditor({
  port,
  value,
  setValue,
  accept,
}: PortEditorContext & { accept: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)
  const asset = value as AssetRef | undefined

  async function onFileChange(evt: ChangeEvent<HTMLInputElement>) {
    const input = evt.currentTarget
    const file = input.files?.[0]
    // Clear the value so picking the same file again still fires `change`.
    input.value = ''
    if (!file) return
    try {
      setErrorTitle(null)
      setValue(await storeFile(file))
    } catch (error) {
      setErrorTitle(String(error))
    }
  }

  return (
    <div className="bpgraph-asset-port">
      <button
        type="button"
        className="bpgraph-asset-port-button"
        data-port-field={port.name}
        aria-label={localize('Choose file', '选择文件')}
        title={errorTitle ?? asset?.assetId ?? localize('Choose file', '选择文件')}
        onMouseDown={stopPointer}
        onClick={(evt) => {
          evt.stopPropagation()
          inputRef.current?.click()
        }}
      >
        {asset ? '📎' : '＋'}
      </button>
      <input
        ref={inputRef}
        className="bpgraph-asset-port-input"
        type="file"
        accept={accept}
        hidden
        onChange={onFileChange}
      />
    </div>
  )
}

/** Full file picker and image preview rendered inside the node panel. */
export function AssetPanelEditor({
  value,
  setValue,
  accept,
  isImage,
}: PanelEditorContext & { accept: string; isImage: boolean }) {
  const asset = value as AssetRef | undefined
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!isImage || !asset) {
      setPreviewUrl(null)
      return
    }
    let cancelled = false
    void assetPreviewUrl(asset)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url)
      })
      .catch((error) => {
        if (!cancelled) {
          setPreviewUrl(null)
          setStatus(String(error))
        }
      })
    return () => {
      cancelled = true
    }
  }, [isImage, asset])

  async function onFileChange(evt: ChangeEvent<HTMLInputElement>) {
    const input = evt.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      setStatus('')
      setValue(await storeFile(file))
    } catch (error) {
      setStatus(String(error))
    }
  }

  return (
    <div className="bpgraph-asset-panel">
      <label className="bpgraph-asset-panel-label">
        <span>{localize('Choose file', '选择文件')}</span>
        <input type="file" accept={accept} onChange={onFileChange} />
      </label>
      {asset ? <p className="bpgraph-asset-panel-name">{asset.assetId}</p> : null}
      {isImage && asset && previewUrl ? (
        <img
          className="bpgraph-asset-panel-preview"
          alt={localize('Image preview', '图片预览')}
          src={previewUrl}
        />
      ) : null}
      <p className="bpgraph-asset-panel-status" role="status">
        {status}
      </p>
    </div>
  )
}
