'use client'

interface WeeklyProgressBarProps {
  daysElapsed: number
}

export function WeeklyProgressBar({ daysElapsed }: WeeklyProgressBarProps) {
  // Calculate which week segments should be filled
  // Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4: days 22-30
  const weeks = [
    { start: 0, end: 7 },
    { start: 7, end: 14 },
    { start: 14, end: 21 },
    { start: 21, end: 30 },
  ]

  const getWeekFillPercentage = (weekStart: number, weekEnd: number) => {
    if (daysElapsed <= weekStart) return 0
    if (daysElapsed >= weekEnd) return 100
    
    const daysInWeek = weekEnd - weekStart
    const daysCompletedInWeek = daysElapsed - weekStart
    return (daysCompletedInWeek / daysInWeek) * 100
  }

  const getWeekColor = (weekIndex: number) => {
    const fillPercentage = getWeekFillPercentage(weeks[weekIndex].start, weeks[weekIndex].end)
    
    // Only color filled segments
    if (fillPercentage === 0) return 'bg-transparent'
    
    // Color based on which week we're in
    if (weekIndex === 0 || weekIndex === 1) return 'bg-green-500' // Weeks 1-2: green
    if (weekIndex === 2) return 'bg-yellow-500' // Week 3: yellow
    return 'bg-red-500' // Week 4: red
  }

  return (
    <div className="flex gap-1 w-full">
      {weeks.map((week, index) => {
        const fillPercentage = getWeekFillPercentage(week.start, week.end)
        const color = getWeekColor(index)
        
        return (
          <div
            key={index}
            className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}
