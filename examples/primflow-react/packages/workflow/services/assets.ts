const signatures = {
  'image/png': (bytes: Uint8Array) => [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte),
  'image/jpeg': (bytes: Uint8Array) => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
}
export type AssetMediaType = keyof typeof signatures
export type AssetRef<T extends AssetMediaType = AssetMediaType> = { assetId: string; mediaType: T }
type StoredAsset = { id: string; mediaType: AssetMediaType; bytes: ArrayBuffer }

async function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('primflow-assets', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'id' })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Store a file picked through a browser file input.
 *
 * The file's media type is validated against the stored bytes by `put`.
 */
export async function storeFile(file: File): Promise<AssetRef> {
  const bytes = await file.arrayBuffer()
  return assetStore.put(bytes, file.type as AssetMediaType)
}

export const assetStore = {
  async put<T extends AssetMediaType>(bytes: ArrayBuffer, mediaType: T): Promise<AssetRef<T>> {
    if (!Object.hasOwn(signatures, mediaType) || !signatures[mediaType](new Uint8Array(bytes))) {
      throw new Error('File format does not match the selected type.')
    }
    const assetId = crypto.randomUUID()
    const db = await openStore()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('assets', 'readwrite')
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.onerror = () => reject(transaction.error)
        transaction.objectStore('assets').put({ id: assetId, mediaType, bytes } satisfies StoredAsset)
      })
      return { assetId, mediaType }
    } finally {
      db.close()
    }
  },

  async read(reference: AssetRef): Promise<ArrayBuffer> {
    const db = await openStore()
    try {
      const asset = await new Promise<StoredAsset | undefined>((resolve, reject) => {
        const request = db.transaction('assets', 'readonly').objectStore('assets').get(reference.assetId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      if (!asset) throw new Error(`Asset "${reference.assetId}" is missing.`)
      if (asset.mediaType !== reference.mediaType) throw new Error(`Asset "${reference.assetId}" has a different media type.`)
      return asset.bytes
    } finally {
      db.close()
    }
  },
}
