'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Download, 
  User, 
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  X
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { validateRequired, validateNumberRange, parseError, ErrorResult } from '@/lib/error-handler'
import { ErrorMessage, SuccessMessage } from '@/components/ui/error-message'
import { LoadingState } from '@/components/ui/loading-state'

interface Student {
  id: string
  full_name: string
  unique_short_id: number
  photo_url?: string
  phone?: string
  address?: string
  meal_plan?: 'L' | 'D' | 'DL'
  is_active: boolean
  subscription_end_date?: string
  profile_edit_allowed?: boolean
  photo_update_allowed?: boolean
  editable_fields?: string[]
  permission_expires_at?: string
  created_at: string
}

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<ErrorResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  
  // Table enhancement states
  const [sortColumn, setSortColumn] = useState<'name' | 'id' | 'status' | 'joined' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  
  // Use async operation hooks for different operations
  const {
    loading: permissionLoading,
    error: permissionError,
    success: permissionSuccess,
    execute: executePermission,
    clearMessages: clearPermissionMessages
  } = useAsyncOperation('Save Permissions')
  
  const {
    loading: editLoading,
    error: editError,
    success: editSuccess,
    execute: executeEdit,
    clearMessages: clearEditMessages
  } = useAsyncOperation('Edit Student')
  
  // Permission form state
  const [permissionForm, setPermissionForm] = useState({
    profile_edit_allowed: false,
    photo_update_allowed: false,
    editable_fields: [] as string[],
    time_value: '24',
    time_unit: 'hours' as 'minutes' | 'hours'
  })
  
  // Student edit form state
  const [studentEditForm, setStudentEditForm] = useState({
    full_name: '',
    phone: '',
    address: ''
  })
  
  const supabase = createClient()

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'STUDENT')
        .order('unique_short_id', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setFetchError(parseError(err))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-button')) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openStudentDetail = (student: Student) => {
    setSelectedStudent(student)
    // Load current photo permission into form
    setPermissionForm({
      profile_edit_allowed: false,
      photo_update_allowed: student.photo_update_allowed || false,
      editable_fields: [],
      time_value: '24',
      time_unit: 'hours'
    })
    // Load student data into edit form
    setStudentEditForm({
      full_name: student.full_name || '',
      phone: student.phone || '',
      address: student.address || ''
    })
    clearPermissionMessages()
    clearEditMessages()
    setIsEditingStudent(false)
    setShowDetailModal(true)
  }

  const handleSaveStudentEdit = async () => {
    if (!selectedStudent) return
    
    clearEditMessages()
    
    // Validate required fields
    const validationError = validateRequired(studentEditForm, ['full_name'])
    if (validationError) {
      // Show error in edit section
      return
    }
    
    await executeEdit(async () => {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: studentEditForm.full_name,
          phone: studentEditForm.phone,
          address: studentEditForm.address
        })
        .eq('id', selectedStudent.id)

      if (error) throw error

      setIsEditingStudent(false)
      
      // Refresh students list
      await fetchStudents()
      
      // Update selected student
      const updatedStudent = students.find(s => s.id === selectedStudent.id)
      if (updatedStudent) {
        setSelectedStudent(updatedStudent)
        setStudentEditForm({
          full_name: updatedStudent.full_name || '',
          phone: updatedStudent.phone || '',
          address: updatedStudent.address || ''
        })
      }
    })
  }

  const handleSavePermissions = async () => {
    if (!selectedStudent) return
    
    clearPermissionMessages()
    
    // Validate time input
    const timeValue = parseInt(permissionForm.time_value)
    const validationError = validateNumberRange(
      timeValue,
      1,
      permissionForm.time_unit === 'minutes' ? 10080 : 168,
      `Duration (${permissionForm.time_unit})`
    )
    
    if (permissionForm.photo_update_allowed && validationError) {
      // Validation error will be shown by the hook
      return
    }
    
    await executePermission(async () => {
      // Calculate expiry time if photo permission is enabled
      let expiresAt = null
      if (permissionForm.photo_update_allowed) {
        const milliseconds = permissionForm.time_unit === 'minutes' 
          ? timeValue * 60 * 1000 
          : timeValue * 60 * 60 * 1000
        expiresAt = new Date(Date.now() + milliseconds).toISOString()
      }

      const { error } = await supabase
        .from('users')
        .update({
          photo_update_allowed: permissionForm.photo_update_allowed,
          permission_expires_at: expiresAt
        })
        .eq('id', selectedStudent.id)

      if (error) throw error
      
      // Refresh students list
      await fetchStudents()
      
      // Update selected student
      const updatedStudent = students.find(s => s.id === selectedStudent.id)
      if (updatedStudent) {
        setSelectedStudent(updatedStudent)
      }
    })
  }

  const handleExport = () => {
    try {
      if (filteredStudents.length === 0) {
        throw new Error('No students to export')
      }
      
      const csvContent = [
        ['ID', 'Name', 'Short ID', 'Status', 'Subscription End', 'Joined Date'].join(','),
        ...filteredStudents.map(s => [
          s.id,
          s.full_name,
          s.unique_short_id,
          s.is_active ? 'Active' : 'Inactive',
          s.subscription_end_date || 'N/A',
          new Date(s.created_at).toLocaleDateString('en-IN')
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert(parseError(error).message)
    }
  }

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setSelectedStudents(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const getSubscriptionProgress = (student: Student) => {
    if (!student.subscription_end_date) return 0
    const now = new Date().getTime()
    const end = new Date(student.subscription_end_date).getTime()
    const start = new Date(student.created_at).getTime()
    const total = end - start
    const elapsed = now - start
    return Math.max(0, Math.min(100, (elapsed / total) * 100))
  }

  const getDaysRemaining = (student: Student) => {
    if (!student.subscription_end_date) return null
    const now = new Date().getTime()
    const end = new Date(student.subscription_end_date).getTime()
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
    return days
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.unique_short_id.toString().includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && student.is_active) ||
                         (filterStatus === 'inactive' && !student.is_active)
    return matchesSearch && matchesFilter
  })

  // Sorting logic
  const handleSort = (column: 'name' | 'id' | 'status' | 'joined') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortColumn) return 0

    let comparison = 0
    switch (sortColumn) {
      case 'name':
        comparison = a.full_name.localeCompare(b.full_name)
        break
      case 'id':
        comparison = a.unique_short_id - b.unique_short_id
        break
      case 'status':
        comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1
        break
      case 'joined':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: 'name' | 'id' | 'status' | 'joined' }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="filter-button px-4 py-2.5 rounded-lg border border-input bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 flex items-center gap-2"
            >
              <span className="capitalize">{filterStatus === 'all' ? 'All Students' : filterStatus}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${showFilterDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFilterDropdown && (
              <div className="filter-dropdown absolute top-full mt-2 right-0 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-xl z-10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                {(['all', 'active', 'inactive'] as const).map((status, index) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status)
                      setShowFilterDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors capitalize flex items-center gap-2"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideIn 0.3s ease-out forwards'
                    }}
                  >
                    {filterStatus === status && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                    <span className={filterStatus === status ? 'font-semibold' : ''}>
                      {status === 'all' ? 'All Students' : status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="hover:scale-105 transition-transform duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchQuery && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Found <span className="font-semibold">{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedStudents.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected</p>
              <p className="text-sm text-muted-foreground">Bulk actions available</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set())}>
              Clear Selection
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: students.length, color: 'blue' },
          { label: 'Active', value: students.filter(s => s.is_active).length, color: 'green' },
          { label: 'Inactive', value: students.filter(s => !s.is_active).length, color: 'red' }
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.5s ease-out forwards',
              opacity: 0
            }}
          >
            <p className="text-sm text-muted-foreground mb-1 group-hover:text-primary transition-colors">{stat.label}</p>
            <p className={`text-2xl font-bold ${
              stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
              stat.color === 'red' ? 'text-red-600 dark:text-red-400' : ''
            } group-hover:scale-110 transition-transform inline-block`}>
              {stat.value}
            </p>
            <TrendingUp className={`w-4 h-4 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              stat.color === 'green' ? 'text-green-600' :
              stat.color === 'red' ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {fetchError ? (
          <div className="p-12">
            <ErrorMessage 
              error={fetchError} 
              onRetry={fetchStudents}
            />
          </div>
        ) : isLoading ? (
          <LoadingState message="Loading students..." />
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b-2 border-border">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all duration-300 hover:scale-110 checked:animate-bounce"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Student
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Subscription</th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('joined')}
                  >
                    <div className="flex items-center gap-2">
                      Joined
                      <SortIcon column="joined" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStudents.map((student, index) => {
                  const daysRemaining = getDaysRemaining(student)
                  const progress = getSubscriptionProgress(student)
                  
                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-all duration-300 group cursor-pointer relative ${
                        hoveredRow === student.id 
                          ? 'bg-primary/5 shadow-md z-10' 
                          : 'hover:bg-accent/30'
                      } ${selectedStudents.has(student.id) ? 'bg-primary/10' : ''}`}
                      onMouseEnter={() => setHoveredRow(student.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'slideInLeft 0.4s ease-out forwards',
                        opacity: 0
                      }}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all duration-300 hover:scale-125 checked:animate-bounce"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:scale-110">
                            {student.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={student.photo_url}
                                alt={student.full_name || 'Student'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded group-hover:bg-primary/20 transition-colors">
                          #{student.unique_short_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full animate-pulse-slow">
                            <CheckCircle className="w-3.5 h-3.5 animate-bounce-slow" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {student.subscription_end_date ? (
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground block">
                              Until {new Date(student.subscription_end_date).toLocaleDateString('en-IN')}
                            </span>
                            {daysRemaining !== null && (
                              <>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      daysRemaining > 7 ? 'bg-green-500' :
                                      daysRemaining > 3 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ 
                                      width: `${Math.max(0, 100 - progress)}%`,
                                      animation: 'progressGrow 1s ease-out'
                                    }}
                                  />
                                </div>
                                <span className={`text-xs ${
                                  daysRemaining > 7 ? 'text-green-600 dark:text-green-400' :
                                  daysRemaining > 3 ? 'text-yellow-600 dark:text-yellow-400' : 
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(student.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openStudentDetail(student)}
                          className="hover:scale-105 transition-transform duration-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Showing</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>of {sortedStudents.length} students</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg border transition-all duration-300 ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-110'
                                : 'border-input bg-background hover:bg-accent hover:scale-105'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="w-10 h-10 flex items-center justify-center">...</span>
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Students will appear here once registered'}
            </p>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-6xl w-full max-h-[90vh] shadow-2xl border border-border overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/20">
                  {selectedStudent.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedStudent.photo_url}
                      alt={selectedStudent.full_name || 'Student'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Student ID: #{selectedStudent.unique_short_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedStudent(null)
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Student Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      <h4 className="text-lg font-semibold">Student Information</h4>
                    </div>
                    {!isEditingStudent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingStudent(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingStudent(false)
                            setStudentEditForm({
                              full_name: selectedStudent.full_name || '',
                              phone: selectedStudent.phone || '',
                              address: selectedStudent.address || ''
                            })
                            clearPermissionMessages()
                            clearEditMessages()
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveStudentEdit}
                          disabled={editLoading}
                        >
                          {editLoading ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selectedStudent.is_active ? (
                        <span className="inline-flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full">
                          <CheckCircle className="w-4 h-4" />
                          Active Subscription
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {/* Manual Active Status Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Manual Override:</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudent.is_active}
                          onChange={async (e) => {
                            const newStatus = e.target.checked
                            try {
                              const { error } = await supabase
                                .from('users')
                                .update({ is_active: newStatus })
                                .eq('id', selectedStudent.id)
                              
                              if (error) throw error
                              
                              // Update local state
                              setSelectedStudent({ ...selectedStudent, is_active: newStatus })
                              await fetchStudents()
                            } catch (err) {
                              console.error('Error updating status:', err)
                              alert('Failed to update status')
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Student Information Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Full Name */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Full Name</p>
                      {isEditingStudent ? (
                        <input
                          type="text"
                          value={studentEditForm.full_name}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, full_name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{selectedStudent.full_name}</p>
                      )}
                    </div>

                    {/* Short ID (Non-editable) */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Short ID</p>
                      <p className="font-semibold font-mono">#{selectedStudent.unique_short_id}</p>
                    </div>

                    {/* Phone */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                      {isEditingStudent ? (
                        <input
                          type="tel"
                          value={studentEditForm.phone}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, phone: e.target.value })}
                          placeholder="Enter phone number"
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{selectedStudent.phone || 'Not set'}</p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                      {isEditingStudent ? (
                        <textarea
                          value={studentEditForm.address}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, address: e.target.value })}
                          placeholder="Enter address"
                          rows={2}
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold resize-none"
                        />
                      ) : (
                        <p className="font-semibold text-sm">{selectedStudent.address || 'Not set'}</p>
                      )}
                    </div>

                    {/* Subscription End (Non-editable) */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Subscription End</p>
                      <p className="font-semibold text-sm">
                        {selectedStudent.subscription_end_date 
                          ? new Date(selectedStudent.subscription_end_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Not set'}
                      </p>
                      {selectedStudent.subscription_end_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(selectedStudent.subscription_end_date) < new Date() 
                            ? '⚠️ Subscription expired' 
                            : '✓ Active subscription'}
                        </p>
                      )}
                    </div>

                    {/* Active Status Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        <strong>Note:</strong> Account status is automatically set to inactive when subscription expires. You can manually override this using the toggle above.
                      </p>
                    </div>

                    {/* Joined Date (Non-editable) */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Joined Date</p>
                      <p className="font-semibold text-sm">
                        {new Date(selectedStudent.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Photo Permission */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-semibold">Photo Permission</h4>
                  </div>

                  {permissionError && (
                    <ErrorMessage 
                      error={permissionError} 
                      onDismiss={clearPermissionMessages}
                      onRetry={handleSavePermissions}
                    />
                  )}
                  
                  {permissionSuccess && (
                    <SuccessMessage 
                      message="Photo permission updated successfully!" 
                      onDismiss={clearPermissionMessages}
                    />
                  )}
                  
                  {editError && (
                    <ErrorMessage 
                      error={editError} 
                      onDismiss={clearEditMessages}
                    />
                  )}
                  
                  {editSuccess && (
                    <SuccessMessage 
                      message="Student information updated successfully!" 
                      onDismiss={clearEditMessages}
                    />
                  )}

                  {/* Photo Update Permission */}
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Allow Photo Update</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissionForm.photo_update_allowed}
                          onChange={(e) => setPermissionForm({ ...permissionForm, photo_update_allowed: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {permissionForm.photo_update_allowed && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Duration
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max={permissionForm.time_unit === 'minutes' ? 10080 : 168}
                              value={permissionForm.time_value}
                              onChange={(e) => setPermissionForm({ ...permissionForm, time_value: e.target.value })}
                              placeholder={permissionForm.time_unit === 'minutes' ? '1-10080' : '1-168'}
                              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                            <select
                              value={permissionForm.time_unit}
                              onChange={(e) => setPermissionForm({ ...permissionForm, time_unit: e.target.value as 'minutes' | 'hours' })}
                              className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                            </select>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {permissionForm.time_unit === 'minutes' 
                              ? 'Enter minutes (1-10080). Max: 1 week' 
                              : 'Enter hours (1-168). Max: 1 week'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Permission Status */}
                  {selectedStudent?.photo_update_allowed && selectedStudent?.permission_expires_at && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        <strong>Active:</strong> Photo permission expires on{' '}
                        {new Date(selectedStudent.permission_expires_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Info Note */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Note:</strong> Students cannot edit their profile. They must request changes from you. Only photo updates can be temporarily enabled.
                    </p>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSavePermissions}
                    disabled={permissionLoading}
                    className="w-full"
                  >
                    {permissionLoading ? 'Saving...' : 'Save Photo Permission'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedStudent(null)
                  }}
                >
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  onClick={() => {
                    if (selectedStudent && confirm(`Are you sure you want to delete ${selectedStudent.full_name}? This action cannot be undone.`)) {
                      // TODO: Implement delete functionality
                      console.log('Delete student:', selectedStudent.id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Student
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
