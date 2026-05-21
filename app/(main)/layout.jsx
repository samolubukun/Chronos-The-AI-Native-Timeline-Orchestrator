import React from 'react'
import AppHeader from './_components/AppHeader'

function DashboardLayout({ children }) {
  return (
    <div className='h-screen flex flex-col bg-background overflow-hidden'>
      <AppHeader />
      <main className='flex-1 overflow-hidden relative'>
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout