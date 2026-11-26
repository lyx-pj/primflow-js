import { assetStore, type AssetRef } from '../services/assets'

const previewUrls = new Map<string, Promise<string>>()

/**
 * Resolve a stored asset to an object URL.
 *
 * Stored assets are immutable, so the URL is created once per asset and shared
 * by the node renderer and the node panel across re-renders.
 */
export function assetPreviewUrl(asset: AssetRef): Promise<string> {
  const key = `${asset.mediaType}:${asset.assetId}`
  const cached = previewUrls.get(key)
  if (cached) return cached
  const pending = assetStore
    .read(asset)
    .then((bytes) => URL.createObjectURL(new Blob([bytes], { type: asset.mediaType })))
  previewUrls.set(key, pending)
  void pending.catch(() => {
    previewUrls.delete(key)
  })
  return pending
}
