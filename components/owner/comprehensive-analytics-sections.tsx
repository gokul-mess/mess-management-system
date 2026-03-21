'use client'

import { Users, TrendingUp, TrendingDown, Award, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'

interface StudentData {
  name: string
  id: number
  meals: number
  mealPlan: string
  attendanceRate?: number
}

interface LeaveData {
  studentName: string
  studentId: number
  leaveDays: number
}

interface ComprehensiveAnalyticsProps {
  topStudents: StudentData[]
  perfectAttendance: StudentData[]
  lowAttendance: StudentData[]
  mealPlanDistribution: { DL: number; L: number; D: number }
  leaveAnalysis: {
    totalLeaveDays: number
    studentsOnLeave: number
    topLeaveStudents: LeaveData[]
  }
  peakDay: { date: string; meals: number }
  lowDay: { date: string; meals: number }
  totalStudents: number
  activeStudents: number
  attendanceRate: number
}

export function ComprehensiveAnalyticsSections({
  topStudents,
  perfectAttendance,
  lowAttendance,
  mealPlanDistribution,
  leaveAnalysis,
  peakDay,
  lowDay,
  totalStudents,
  activeStudents,
  attendanceRate
}: ComprehensiveAnalyticsProps) {
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">

      {/* Student Participation Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Student Participation
            </h4>
            <p className="text-sm text-muted-foreground">Engagement metrics for the period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-1">Total Students</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-100 mb-1">Active Students</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeStudents}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-900 dark:text-red-100 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalStudents - activeStudents}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-900 dark:text-purple-100 mb-1">Participation</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendanceRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Top Students Section */}
      {topStudents.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Top 10 Students by Consumption
              </h4>
              <p className="text-sm text-muted-foreground">Highest meal consumption in the period</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Student Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">ID</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Plan</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Meals</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((student, index) => (
                  <tr key={student.id} className="border-b border-border hover:bg-accent transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-xl">🥇</span>}
                        {index === 1 && <span className="text-xl">🥈</span>}
                        {index === 2 && <span className="text-xl">🥉</span>}
                        <span className="font-bold">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-center font-mono text-sm">{student.id}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                        {student.mealPlan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-primary">{student.meals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Perfect Attendance Section */}
      {perfectAttendance.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2 text-green-900 dark:text-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Perfect Attendance Students
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {perfectAttendance.length} students with 100% attendance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfectAttendance.slice(0, 6).map((student) => (
              <div key={student.id} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-green-200 dark:border-green-800 hover:scale-105 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="text-lg">🏆</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.id} • {student.mealPlan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{student.meals}</p>
                    <p className="text-xs text-muted-foreground">meals</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Attendance Alert Section */}
      {lowAttendance.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2 text-red-900 dark:text-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Low Attendance Alert
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {lowAttendance.length} students with less than 50% attendance
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-200 dark:border-red-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Student Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">ID</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Plan</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Meals</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {lowAttendance.slice(0, 10).map((student) => (
                  <tr key={student.id} className="border-b border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    <td className="py-3 px-4 font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-center font-mono text-sm">{student.id}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-semibold">
                        {student.mealPlan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{student.meals}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                        {student.attendanceRate?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Meal Plan Distribution Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Meal Plan Distribution
            </h4>
            <p className="text-sm text-muted-foreground">Student subscription breakdown</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Lunch & Dinner</p>
                <p className="text-xs text-green-700 dark:text-green-300">Full meal plan</p>
              </div>
              <span className="text-2xl">🍽️</span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{mealPlanDistribution.DL}</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-2">
              {totalStudents > 0 ? ((mealPlanDistribution.DL / totalStudents) * 100).toFixed(1) : 0}% of students
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Lunch Only</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Single meal plan</p>
              </div>
              <span className="text-2xl">🍛</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{mealPlanDistribution.L}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              {totalStudents > 0 ? ((mealPlanDistribution.L / totalStudents) * 100).toFixed(1) : 0}% of students
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Dinner Only</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Single meal plan</p>
              </div>
              <span className="text-2xl">🍜</span>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{mealPlanDistribution.D}</p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
              {totalStudents > 0 ? ((mealPlanDistribution.D / totalStudents) * 100).toFixed(1) : 0}% of students
            </p>
          </div>
        </div>
      </div>

      {/* Leave Analysis Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-orange-600" />
              Leave Analysis
            </h4>
            <p className="text-sm text-muted-foreground">Approved leave statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-900 dark:text-orange-100 mb-1">Total Leave Days</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{leaveAnalysis.totalLeaveDays}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-1">Students on Leave</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leaveAnalysis.studentsOnLeave}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-900 dark:text-purple-100 mb-1">Avg Leave/Student</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {leaveAnalysis.studentsOnLeave > 0 ? (leaveAnalysis.totalLeaveDays / leaveAnalysis.studentsOnLeave).toFixed(1) : 0}
            </p>
          </div>
        </div>

        {leaveAnalysis.topLeaveStudents.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold mb-3">Students with Most Leave Days</h5>
            <div className="space-y-2">
              {leaveAnalysis.topLeaveStudents.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm">📅</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.studentName}</p>
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{student.leaveDays}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Operational Insights Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Operational Insights
            </h4>
            <p className="text-sm text-muted-foreground">Peak and low performance days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Peak Day</p>
                <p className="text-xs text-green-700 dark:text-green-300">Highest meal count</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">{peakDay.meals} meals</p>
            <p className="text-sm text-green-700 dark:text-green-300">{formatDate(peakDay.date)}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Lowest Day</p>
                <p className="text-xs text-red-700 dark:text-red-300">Minimum meal count</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">{lowDay.meals} meals</p>
            <p className="text-sm text-red-700 dark:text-red-300">{formatDate(lowDay.date)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
