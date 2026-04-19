import { createClient } from '@/lib/supabase/client'

export const STUDENT_PHOTO_BUCKET = 'student-photos'

const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.85

export function getStudentPhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  const supabase = createClient()
  const { data } = supabase.storage.from(STUDENT_PHOTO_BUCKET).getPublicUrl(photoPath)
  return data.publicUrl
}

export async function uploadStudentPhoto(params: {
  userId: string
  file: Blob
}): Promise<{ path: string; publicUrl: string }> {
  const { userId, file } = params

  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Please select an image file.')
  }

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('users')
    .select('photo_path')
    .eq('id', userId)
    .maybeSingle()

  const processed = await resizeImage(file, MAX_DIMENSION, JPEG_QUALITY)
  const path = `${userId}-${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(STUDENT_PHOTO_BUCKET)
    .upload(path, processed, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) throw uploadError

  const { error: updateError } = await supabase
    .from('users')
    .update({ photo_path: path })
    .eq('id', userId)

  if (updateError) {
    await supabase.storage.from(STUDENT_PHOTO_BUCKET).remove([path])
    throw updateError
  }

  if (existing?.photo_path && existing.photo_path !== path) {
    await supabase.storage.from(STUDENT_PHOTO_BUCKET).remove([existing.photo_path])
  }

  const { data: urlData } = supabase.storage
    .from(STUDENT_PHOTO_BUCKET)
    .getPublicUrl(path)

  return { path, publicUrl: urlData.publicUrl }
}

export async function deleteStudentPhoto(userId: string): Promise<void> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('users')
    .select('photo_path')
    .eq('id', userId)
    .maybeSingle()

  if (!existing?.photo_path) return

  await supabase.storage.from(STUDENT_PHOTO_BUCKET).remove([existing.photo_path])

  const { error } = await supabase
    .from('users')
    .update({ photo_path: null })
    .eq('id', userId)

  if (error) throw error
}

async function resizeImage(file: Blob, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > height && width > maxDim) {
        height = Math.round(height * (maxDim / width))
        width = maxDim
      } else if (height >= width && height > maxDim) {
        width = Math.round(width * (maxDim / height))
        height = maxDim
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Image encoding failed'))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
