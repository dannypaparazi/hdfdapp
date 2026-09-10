import { useState, useEffect } from 'react'
import { getBannerFromServer, updateBanner, removeBanner, compressImage } from '../utils/storage'
import styles from './BannerManager.module.css'

export default function BannerManager({ canWrite = true }) {
  const [banner, setBanner] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    getBannerFromServer().then(photo => {
      setBanner(photo)
      setPreview(photo)
      setLoading(false)
    })
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      // Banners are wide hero images, not thumbnails -- keep more width than
      // the default item-photo compression so it doesn't look blurry
      // stretched across a full-width header.
      const compressed = await compressImage(event.target.result, 1200, 0.7)
      setPreview(compressed)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!preview || preview === banner) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await updateBanner(preview)
      setBanner(preview)
      setMessage({ type: 'success', text: 'Banner updated' })
    } catch (error) {
      console.error(error)
      const isTooLarge = error?.message?.includes('longer than')
      setMessage({
        type: 'error',
        text: isTooLarge ? 'Failed to save banner: photo is too large. Try a smaller image.' : 'Failed to save banner',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the banner from the user app?')) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await removeBanner()
      setBanner(null)
      setPreview(null)
      setMessage({ type: 'success', text: 'Banner removed' })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Failed to remove banner' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2>User App Banner</h2>
      <p className={styles.hint}>
        Shown at the top of the customer ordering app. Use a landscape photo, at least 1200×400px — it's automatically cropped to fit both phone and tablet screens.
      </p>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
      )}

      {loading ? (
        <p className={styles.hint}>Loading banner…</p>
      ) : (
        <>
          <div className={styles.previewWrap}>
            {preview ? (
              <img src={preview} alt="Banner preview" className={styles.preview} />
            ) : (
              <div className={styles.previewEmpty}>No banner set</div>
            )}
          </div>

          {canWrite && (
            <div className={styles.actions}>
              <label className={styles.uploadBtn}>
                {banner ? 'Change Banner' : 'Upload Banner'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
              </label>
              {preview && preview !== banner && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Banner'}
                </button>
              )}
              {banner && (
                <button className={`${styles.btn} ${styles.btnDelete}`} onClick={handleRemove} disabled={saving}>
                  Remove
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
