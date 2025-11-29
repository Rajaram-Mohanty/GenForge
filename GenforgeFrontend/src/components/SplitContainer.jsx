import { useState, useEffect } from 'react'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'

const SplitContainer = ({ currentProject, onProjectCreate, tempMessages = [], isGenerating = false, isActive = false }) => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // Percentage
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      const container = document.getElementById('splitContainer')
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const handleTouchMove = (e) => {
      if (!isDragging) return
      
      const container = document.getElementById('splitContainer')
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const newLeftWidth = ((e.touches[0].clientX - rect.left) / rect.width) * 100
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      document.body.style.userSelect = ''
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  const handleDividerMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDividerTouchStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDividerDoubleClick = () => {
    // Reset to default 50/50 split
    setLeftPanelWidth(50)
  }

  return (
    <div className={`split-container ${isActive ? 'active' : ''}`} id="splitContainer">
      <LeftPanel 
        currentProject={currentProject}
        onProjectCreate={onProjectCreate}
        width={leftPanelWidth}
        tempMessages={tempMessages}
        isGenerating={isGenerating}
      />
      
      {/* Draggable Divider */}
      <div 
        className={`panel-divider ${isDragging ? 'dragging' : ''}`}
        id="panelDivider"
        onMouseDown={handleDividerMouseDown}
        onTouchStart={handleDividerTouchStart}
        onDoubleClick={handleDividerDoubleClick}
      >
        <div className="divider-handle">
          <div className="divider-line"></div>
          <div className="divider-grip">
            <i className="fas fa-grip-vertical"></i>
          </div>
        </div>
      </div>
      
      <RightPanel 
        currentProject={currentProject}
        width={100 - leftPanelWidth}
      />
    </div>
  )
}

export default SplitContainer
