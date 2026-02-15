'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X, Camera, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onClose: () => void
  onSuccess: (data: any) => void
}

export function QRScanner({ onClose, onSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const supabase = createClient()

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true) // Set scanning state first to render the element
      
      // Wait for DOM to be ready and element to be rendered
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Check if element exists
      const element = document.getElementById('qr-reader')
      if (!element) {
        throw new Error('QR reader element not found. Please try again.')
      }
      
      // Initialize QR Code scanner
      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      // Start scanning
      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 200, height: 200 }
        },
        async (decodedText) => {
          // QR Code detected
          console.log('QR Code detected:', decodedText)
          
          // Stop scanning
          await stopCamera()
          
          // Verify the meal
          await verifyMeal(decodedText)
        },
        () => {
          // Scanning error (can be ignored for continuous scanning)
        }
      )

    } catch (err: any) {
      setIsScanning(false)
      setError(err.message || 'Camera access denied. Please enable camera permissions.')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (err) {
        console.error('Error stopping camera:', err)
      }
    }
    setIsScanning(false)
  }

  const verifyMeal = async (qrData: string) => {
    try {
      // Parse QR data (expected format: user_id or JSON with user_id)
      let userId: string
      
      try {
        const parsed = JSON.parse(qrData)
        userId = parsed.user_id || parsed.id
      } catch {
        // If not JSON, treat as direct user_id
        userId = qrData
      }

      // Get current hour to determine meal type
      const hour = new Date().getHours()
      const mealType = hour < 16 ? 'LUNCH' : 'DINNER'

      // Check if already logged today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('meal_type', mealType)
        .single()

      if (existingLog) {
        setVerificationResult({
          success: false,
          message: `${mealType} already logged for this student today`
        })
        return
      }

      // Insert into daily_logs
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          user_id: userId,
          meal_type: mealType,
          status: 'CONSUMED',
          access_method: 'SELF_ID'
        })
        .select('*, users(full_name, unique_short_id, photo_url)')
        .single()

      if (error) throw error

      setVerificationResult({
        success: true,
        data
      })

      setTimeout(() => {
        onSuccess(data)
        onClose()
      }, 2000)
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed. Invalid QR code.'
      })
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">QR Code Scanner</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scan student's meal token
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            stopCamera()
            onClose()
          }}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {!verificationResult ? (
            <>
              <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden mb-3">
                {isScanning ? (
                  <>
                    {/* QR Reader Container */}
                    <div id="qr-reader" className="w-full h-full" />
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-4 border-primary rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                        
                        {/* Scanning Line Animation */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-primary animate-scan" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!isScanning ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1">
                    Stop Camera
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Position the QR code within the frame to scan automatically
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              {verificationResult.success ? (
                <>
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                    Verified Successfully!
                  </h4>
                  {verificationResult.data?.users && (
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20">
                        {verificationResult.data.users.photo_url ? (
                          <img
                            src={verificationResult.data.users.photo_url}
                            alt={verificationResult.data.users.full_name || 'Student'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {verificationResult.data.users.full_name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{verificationResult.data.users.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {verificationResult.data.users.unique_short_id}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Meal logged successfully
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  </div>
                  <h4 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                    Verification Failed
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {verificationResult.message}
                  </p>
                  <Button 
                    onClick={() => {
                      setVerificationResult(null)
                      startCamera()
                    }} 
                    size="sm"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(192px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
