'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, RotateCcw, SwitchCamera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Facing = 'user' | 'environment'

interface InAppCameraCaptureProps {
  open: boolean
  onClose: () => void
  onCapture: (blob: Blob) => void | Promise<void>
  initialFacingMode?: Facing
  title?: string
}

export function InAppCameraCapture({
  open,
  onClose,
  onCapture,
  initialFacingMode = 'environment',
  title = 'Take Photo',
}: InAppCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<Facing>(initialFacingMode)
  const [initializing, setInitializing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Start / stop the camera when the modal opens, when the facing mode changes,
  // and whenever we drop out of the captured-preview state.
  useEffect(() => {
    if (!open || capturedUrl) return

    let cancelled = false
    setInitializing(true)
    setCameraError(null)

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not supported on this device or browser.')
        }
        // Prefer an exact match so phones reliably pick the back camera; fall
        // back to a soft preference so laptops with only a front cam still work.
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facingMode } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          })
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          try {
            await video.play()
          } catch {
            // Autoplay failure is non-fatal; video will start on user tap.
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unable to access camera.'
          setCameraError(msg)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    start()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [open, facingMode, capturedUrl])

  // Clean up captured object URL on unmount / replacement.
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    }
  }, [capturedUrl])

  // Reset internal state whenever the modal fully closes.
  useEffect(() => {
    if (!open) {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
      setCapturedUrl(null)
      setCapturedBlob(null)
      setUploadError(null)
      setConfirming(false)
      setCameraError(null)
    }
  }, [open, capturedUrl])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // The front camera renders a mirrored preview; persist the captured frame
    // un-mirrored so it matches what the subject sees.
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedBlob(blob)
        setCapturedUrl(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.92
    )
  }

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
    setCapturedBlob(null)
    setUploadError(null)
  }

  const handleConfirm = async () => {
    if (!capturedBlob) return
    setConfirming(true)
    setUploadError(null)
    try {
      await onCapture(capturedBlob)
      onClose()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setConfirming(false)
    }
  }

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  if (!open) return null

  const isPreviewing = Boolean(capturedUrl)
  const isMirrored = facingMode === 'user' && !isPreviewing

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={confirming}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          aria-label="Close camera"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {cameraError ? (
          <div className="text-center space-y-3 text-white px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="font-semibold">Camera unavailable</p>
            <p className="text-sm text-white/80 max-w-sm">{cameraError}</p>
            <p className="text-xs text-white/60">
              Grant camera permission in your browser and make sure the site is served over HTTPS.
            </p>
          </div>
        ) : isPreviewing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedUrl!}
            alt="Captured"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`max-h-full max-w-full object-contain ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />
            {initializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {uploadError && (
        <div className="px-6 pb-2">
          <p className="text-center text-sm text-red-300">{uploadError}</p>
        </div>
      )}

      {/* Footer controls */}
      <div className="p-6 pb-8 flex items-center justify-center gap-4">
        {cameraError ? (
          <Button onClick={onClose} variant="outline" className="bg-white">
            Close
          </Button>
        ) : isPreviewing ? (
          <>
            <Button
              onClick={handleRetake}
              variant="outline"
              disabled={confirming}
              className="bg-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              {confirming ? 'Uploading...' : 'Confirm'}
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-6 w-full">
            <div className="w-12 h-12" /> {/* spacer to keep capture button centered */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={initializing}
              aria-label="Capture photo"
              className="w-20 h-20 bg-white rounded-full border-4 border-white/40 hover:border-white active:scale-95 transition-all flex items-center justify-center shadow-xl disabled:opacity-50"
            >
              <div className="w-14 h-14 bg-white rounded-full border-2 border-black/20" />
            </button>
            <button
              type="button"
              onClick={handleSwitchCamera}
              disabled={initializing}
              aria-label="Switch camera"
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
