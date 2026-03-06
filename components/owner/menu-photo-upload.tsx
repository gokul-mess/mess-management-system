'use client'

import { useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { EnhancedAlert } from '@/components/ui/enhanced-alert'

interface MenuPhotoUploadProps {
  currentPhotoUrl?: string | null
  onUploadSuccess: (url: string | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export function MenuPhotoUpload({ currentPhotoUrl, onUploadSuccess }: MenuPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const extractFileName = (url: string): string | null => {
    try {
      const parts = url.split('/menu-photos/')
      return parts[1] || null
    } catch {
      return null
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Maximum file size is 5MB')
      return
    }

    setError(null)
    setSuccess(null)
    setUploading(true)

    let uploadedFileName: string | null = null
    let oldFileName: string | null = null

    try {
      const { data: settings, error: fetchError } = await supabase
        .from('mess_settings')
        .select('id, menu_photo_url')
        .eq('id', SETTINGS_ID)
        .single()

      if (fetchError) throw new Error('Settings not found. Please contact admin.')

      if (settings.menu_photo_url) {
        oldFileName = extractFileName(settings.menu_photo_url)
      }

      const fileExt = file.name.split('.').pop()
      uploadedFileName = `menu-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('menu-photos')
        .upload(uploadedFileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error('Upload failed. Check storage bucket exists.')

      const { data: { publicUrl } } = supabase.storage
        .from('menu-photos')
        .getPublicUrl(uploadedFileName)

      const { error: updateError } = await supabase
        .from('mess_settings')
        .update({ menu_photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', settings.id)

      if (updateError) {
        await supabase.storage.from('menu-photos').remove([uploadedFileName])
        throw new Error('Failed to save. Please try again.')
      }

      if (oldFileName) {
        await supabase.storage.from('menu-photos').remove([oldFileName])
      }

      setPreview(publicUrl)
      onUploadSuccess(publicUrl)
      setSuccess('Menu photo uploaded successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      if (uploadedFileName) {
        await supabase.storage.from('menu-photos').remove([uploadedFileName])
      }
      setError(error instanceof Error ? error.message : 'Failed to upload menu photo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!preview) return

    setError(null)
    setSuccess(null)
    setRemoving(true)

    try {
      const { data: settings, error: fetchError } = await supabase
        .from('mess_settings')
        .select('id, menu_photo_url')
        .eq('id', SETTINGS_ID)
        .single()

      if (fetchError) throw new Error('Settings not found')

      const { error: updateError } = await supabase
        .from('mess_settings')
        .update({ menu_photo_url: null, updated_at: new Date().toISOString() })
        .eq('id', settings.id)

      if (updateError) throw new Error('Failed to remove')

      if (settings.menu_photo_url) {
        const fileName = extractFileName(settings.menu_photo_url)
        if (fileName) {
          await supabase.storage.from('menu-photos').remove([fileName])
        }
      }

      setPreview(null)
      onUploadSuccess(null)
      setSuccess('Menu photo removed successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Remove error:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove menu photo')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <EnhancedAlert type="error" title="Error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <EnhancedAlert type="success" title="Success" message={success} autoDismiss autoDismissDelay={3000} />
      )}
      {preview ? (
        <div className="relative group space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Menu"
            className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg border-2 border-border"
            loading="lazy"
          />
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              💡 To upload a different menu (lunch or dinner), use &quot;Replace Photo&quot; or remove the current photo first.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Replace Photo
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              {!removing && 'Remove'}
            </Button>
          </div>
          <input
            id="menu-photo-input"
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      ) : (
        <>
          <label 
            htmlFor="menu-photo-input"
            className="flex flex-col items-center justify-center w-full h-48 sm:h-56 md:h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/50"
            aria-label="Upload menu photo"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3" />
              <p className="text-xs sm:text-sm text-muted-foreground">Click to upload menu photo (max 5MB)</p>
            </div>
          </label>
          <input
            id="menu-photo-input"
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Menu Photo
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
