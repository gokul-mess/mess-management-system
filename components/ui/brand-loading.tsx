import { Loader2, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

// Progress Loading

interface ProgressLoadingProps {
  progress?: number
  message?: string
  showPercentage?: boolean
}

export function ProgressLoading({
  progress = 0,
  message = 'Loading...',
  showPercentage = true
}: ProgressLoadingProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {showPercentage && (
          <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  )
}

// Typing Text

interface TypingTextProps {
  text: string
  speed?: number
  className?: string
}

export function TypingText({ text, speed = 50, className = '' }: TypingTextProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}

// Brand Loading

interface BrandLoadingProps {
  message?: string
  showProgress?: boolean
  progress?: number
}

export function BrandLoading({
  message = 'Loading Gokul Mess...',
  showProgress = false,
  progress = 0
}: BrandLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Animated Logo */}
      <div className="relative mb-8">
        <div className="absolute inset-0 w-24 h-24 border-4 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 w-20 h-20 border-4 border-primary/40 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-2xl shadow-primary/50 animate-pulse">
          <span className="text-4xl font-bold text-white animate-bounce" style={{ animationDuration: '2s' }}>G</span>
        </div>
        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
        <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Loading Message with Typing Effect */}
      <div className="text-center mb-4">
        <TypingText
          text={message}
          speed={50}
          className="text-lg font-semibold text-foreground"
        />
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-64">
          <ProgressLoading progress={progress} message="" showPercentage={false} />
        </div>
      )}

      {/* Loading Dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

// Contextual Loading

interface ContextualLoadingProps {
  context: 'fetching' | 'saving' | 'deleting' | 'uploading' | 'processing' | 'verifying'
  itemName?: string
}

export function ContextualLoading({ context, itemName = 'data' }: ContextualLoadingProps) {
  const messages = {
    fetching: `Fetching ${itemName}...`,
    saving: `Saving ${itemName}...`,
    deleting: `Deleting ${itemName}...`,
    uploading: `Uploading ${itemName}...`,
    processing: `Processing ${itemName}...`,
    verifying: `Verifying ${itemName}...`
  }

  const icons = {
    fetching: '📥',
    saving: '💾',
    deleting: '🗑️',
    uploading: '📤',
    processing: '⚙️',
    verifying: '✓'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="text-4xl mb-4 animate-bounce">
        {icons[context]}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{messages[context]}</p>
      </div>
      <p className="text-xs text-muted-foreground">Please wait...</p>
    </div>
  )
}
