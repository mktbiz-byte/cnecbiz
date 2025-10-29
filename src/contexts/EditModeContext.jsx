import React, { createContext, useContext, useState } from 'react'

const EditModeContext = createContext()

export function EditModeProvider({ children }) {
  const [editMode, setEditMode] = useState(false)

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error('useEditMode must be used within EditModeProvider')
  }
  return context
}

