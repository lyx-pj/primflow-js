import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import type { NodeRendererContext } from '@lyx-pj/primflow-canvas'
import { localize } from '../i18n'
import { storeFile, type AssetRef } from '../services/assets'
import { assetPreviewUrl } from './asset-preview'

const IMAGE_ACCEPT = 'image/png,image/jpeg'

/** Keep pointer handling inside the card instead of starting a canvas drag. */
function stopPointer(evt: MouseEvent) {
  evt.stopPropagation()
}

function ImagePreview({ asset }: { asset: AssetRef }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    void assetPreviewUrl(asset)
      .then((nextUrl) => {
        if (!cancelled) setUrl(nextUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [asset])

  if (failed || !url) return null
  return (
    <img
      className="image-file-preview"
      alt={localize('Image preview', '图片预览')}
      src={url}
      // Images are draggable by default. The native drag would replace the
      // canvas node drag, so the preview opts out of it.
      draggable={false}
    />
  )
}

function ImagePicker({
  disabled,
  asset,
  onSelectAsset,
}: {
  disabled: boolean
  asset: AssetRef | undefined
  onSelectAsset: (asset: AssetRef) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | undefined>(undefined)

  async function onFileChange(evt: ChangeEvent<HTMLInputElement>) {
    const input = evt.currentTarget
    const file = input.files?.[0]
    // Clear the value so picking the same file again still fires `change`.
    input.value = ''
    if (!file || disabled) return
    try {
      setErrorTitle(undefined)
      onSelectAsset(await storeFile(file))
    } catch (error) {
      setErrorTitle(String(error))
    }
  }

  return (
    <div className="image-file-actions">
      <button
        type="button"
        className="image-file-button"
        disabled={disabled}
        title={errorTitle}
        onMouseDown={stopPointer}
        onClick={(evt) => {
          evt.stopPropagation()
          inputRef.current?.click()
        }}
      >
        {asset ? localize('Replace image', '更换图片') : localize('Choose image', '选择图片')}
      </button>
      <input
        ref={inputRef}
        className="image-file-input"
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={onFileChange}
      />
    </div>
  )
}

export function CustomCardView({ node }: NodeRendererContext) {
  const title = node?.title || node?.definition?.name || localize('Custom Card', '自定义卡片')
  const caption = String(node?.inputValues?.label ?? '')
  return (
    <div className="demo-card">
      <div className="demo-card-header">
        <span className="demo-card-dot"></span>
        <span className="demo-card-title">{title}</span>
      </div>
      <div className="demo-card-body">
        <p className="demo-card-caption">{caption || localize('No label', '未设置标题')}</p>
        <span className="demo-card-hint">{localize('Custom renderer', '自定义渲染')}</span>
      </div>
    </div>
  )
}

export function ImageFileView({
  title,
  asset,
  disabled,
  onSelectAsset,
}: {
  title: string
  asset: AssetRef | undefined
  disabled: boolean
  onSelectAsset: (asset: AssetRef) => void
}) {
  return (
    <div className="image-file-card">
      <div className="image-file-header">
        <svg
          className="image-file-icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m21 15-4.5-4.5L7 20" />
        </svg>
        <span className="image-file-title">{title}</span>
      </div>
      <ImagePicker disabled={disabled} asset={asset} onSelectAsset={onSelectAsset} />
      <div className="image-file-body">
        {asset ? (
          <ImagePreview asset={asset} />
        ) : (
          <div className="image-file-placeholder">
            <svg
              className="image-file-placeholder-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="m21 15-4.5-4.5L7 20" />
            </svg>
            <span>{localize('No image selected', '尚未选择图片')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
