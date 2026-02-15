'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Filter, 
  Download, 
  User, 
  Mail, 
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Hash,
  Shield,
  Clock,
  Edit
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { validateRequired, validateNumberRange, parseError } from '@/lib/error-handler'
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
  const [fetchError, setFetchError] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  
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

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
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
  }

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
    } catch (error: any) {
      console.error('Permission update error:', error)
      setPermissionMessage({ type: 'error', text: error.message || 'Failed to update permission' })
    } finally {
      setPermissionLoading(false)
    }
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.unique_short_id.toString().includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && student.is_active) ||
                         (filterStatus === 'inactive' && !student.is_active)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Students</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Students</p>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {students.filter(s => s.is_active).length}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Inactive</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {students.filter(s => !s.is_active).length}
          </p>
        </div>
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
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Subscription</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.full_name || 'Student'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        #{student.unique_short_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
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
                        <span className="text-sm text-muted-foreground">
                          Until {new Date(student.subscription_end_date).toLocaleDateString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openStudentDetail(student)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                            setPermissionMessage(null)
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
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedStudent(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
