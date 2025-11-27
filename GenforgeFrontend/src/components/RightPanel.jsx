import { useState, useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { useProject } from '../contexts/ProjectContext'

const RightPanel = ({ currentProject, width }) => {
  const { updateFile } = useProject()
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showFileSidebar, setShowFileSidebar] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editorContent, setEditorContent] = useState('// Your code will appear here...')
  const [currentFiles, setCurrentFiles] = useState({})
  const [previewHtmlContent, setPreviewHtmlContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [selectedHtmlFile, setSelectedHtmlFile] = useState(null)
  const editorRef = useRef(null)

  useEffect(() => {
    if (currentProject && currentProject.files && currentProject.files.length > 0) {
      const files = {}
      currentProject.files.forEach(file => {
        // Use path as key, ensure file has all required properties
        const fileKey = file.path || `${file.name || 'file'}`
        files[fileKey] = {
          name: file.name || file.filename || 'untitled',
          path: file.path || fileKey,
          content: file.content || '',
          type: file.type || file.fileType || 'txt',
          language: file.language || 'plaintext',
          extension: file.extension || `.${file.type || file.fileType || 'txt'}`
        }
      })
      setCurrentFiles(files)
      
      // Set first file as selected
      const firstFile = currentProject.files[0]
      if (firstFile) {
        const formattedFile = {
          name: firstFile.name || firstFile.filename || 'untitled',
          path: firstFile.path || `${firstFile.name || 'file'}`,
          content: firstFile.content || '',
          type: firstFile.type || firstFile.fileType || 'txt',
          language: firstFile.language || 'plaintext',
          extension: firstFile.extension || `.${firstFile.type || firstFile.fileType || 'txt'}`
        }
        setSelectedFile(formattedFile)
        setEditorContent(formattedFile.content || '')
        setShowFileSidebar(true)
      }
    } else {
      // Reset when no project or no files
      setCurrentFiles({})
      setSelectedFile(null)
      setEditorContent('// Your code will appear here...')
      setShowFileSidebar(false)
    }
  }, [currentProject])

  const handleEditorChange = (value) => {
    setEditorContent(value)
    // Auto-sync changes to backend with debouncing
    if (selectedFile && value !== selectedFile.content) {
      // Update local file cache immediately
      setCurrentFiles(prev => ({
        ...prev,
        [selectedFile.path]: {
          ...prev[selectedFile.path],
          content: value
        }
      }))
      
      // Debounce sync to backend (sync after 1 second of no changes)
      if (window.syncTimeout) {
        clearTimeout(window.syncTimeout)
      }
      
      window.syncTimeout = setTimeout(async () => {
        if (currentProject && currentProject._id && selectedFile) {
          try {
            const response = await updateFile(
              currentProject._id,
              selectedFile.path,
              value
            )
            if (response.success) {
              console.log('✅ Changes synced to backend')
            } else {
              console.error('❌ Failed to sync changes:', response.error)
            }
          } catch (error) {
            console.error('❌ Error syncing changes:', error)
          }
        }
      }, 1000) // 1 second debounce
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    setEditorContent(file.content || '')
    // Update preview if in preview mode and it's an HTML file
    if (isPreviewMode && file.name.toLowerCase().endsWith('.html')) {
      setPreviewHtmlContent(file.content || '')
      setPreviewError(null)
    }
  }

  const getHtmlFiles = () => {
    return Object.values(currentFiles).filter(file => 
      file.name.toLowerCase().endsWith('.html') || 
      file.name.toLowerCase().endsWith('.htm')
    )
  }

  const togglePreview = () => {
    const newPreviewMode = !isPreviewMode
    setIsPreviewMode(newPreviewMode)
    
    // When switching to preview mode, check for HTML files
    if (newPreviewMode) {
      const htmlFiles = getHtmlFiles()
      
      if (htmlFiles.length === 0) {
        setPreviewError('No HTML files found in this project. Please generate an HTML file first.')
        return
      }
      
      // If multiple HTML files, show selector
      if (htmlFiles.length > 1) {
        setShowFileSelector(true)
        // Auto-select first file or currently selected HTML file
        const currentHtmlFile = htmlFiles.find(f => f.path === selectedFile?.path) || htmlFiles[0]
        setSelectedHtmlFile(currentHtmlFile)
        loadHtmlFileForPreview(currentHtmlFile)
      } else {
        // Single HTML file
        setShowFileSelector(false)
        const htmlFile = htmlFiles[0]
        setSelectedHtmlFile(htmlFile)
        loadHtmlFileForPreview(htmlFile)
      }
    }
  }

  const loadHtmlFileForPreview = (file) => {
    if (!file) return
    
    setPreviewLoading(true)
    setPreviewError(null)
    
    // Use editor content if this is the currently selected file, otherwise use file content
    const htmlContent = (file.path === selectedFile?.path ? editorContent : null) || file.content || ''
    setPreviewHtmlContent(htmlContent)
    setPreviewLoading(false)
  }

  const handleHtmlFileSelect = (e) => {
    const filePath = e.target.value
    if (!filePath) return
    
    const htmlFiles = getHtmlFiles()
    const selectedFile = htmlFiles.find(f => f.path === filePath)
    if (selectedFile) {
      setSelectedHtmlFile(selectedFile)
      loadHtmlFileForPreview(selectedFile)
    }
  }

  const refreshPreview = () => {
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.html')) {
      setPreviewLoading(true)
      setPreviewError(null)
      const htmlContent = editorContent || selectedFile.content || ''
      setPreviewHtmlContent(htmlContent)
      setPreviewLoading(false)
    }
  }

  const openPreviewInNewTab = () => {
    if (previewHtmlContent) {
      const fullHtml = createFullHtmlDocument(previewHtmlContent)
      const blob = new Blob([fullHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  const createFullHtmlDocument = (htmlContent) => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Preview</title>
    <style>
        /* Reset and base styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`
  }

  const toggleFileSidebar = () => {
    setShowFileSidebar(!showFileSidebar)
  }

  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'md': 'markdown',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml'
    }
    return languageMap[extension] || 'plaintext'
  }

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    const iconMap = {
      'js': 'fab fa-js-square',
      'jsx': 'fab fa-react',
      'ts': 'fab fa-js-square',
      'tsx': 'fab fa-react',
      'html': 'fab fa-html5',
      'css': 'fab fa-css3-alt',
      'scss': 'fab fa-sass',
      'json': 'fas fa-code',
      'py': 'fab fa-python',
      'java': 'fab fa-java',
      'md': 'fab fa-markdown',
      'sql': 'fas fa-database',
      'xml': 'fas fa-file-code',
      'yaml': 'fas fa-file-alt',
      'yml': 'fas fa-file-alt'
    }
    return iconMap[extension] || 'fas fa-file'
  }

  // Update preview when editor content changes (for HTML files)
  useEffect(() => {
    if (isPreviewMode && selectedFile && selectedFile.name.toLowerCase().endsWith('.html')) {
      // Only update if the selected HTML file matches the currently edited file
      if (selectedHtmlFile && selectedHtmlFile.path === selectedFile.path) {
        setPreviewHtmlContent(editorContent)
      }
    }
  }, [editorContent, isPreviewMode, selectedFile, selectedHtmlFile])

  const renderPreview = () => {
    const htmlFiles = getHtmlFiles()
    
    if (htmlFiles.length === 0) {
      return (
        <div className="preview-error">
          <h3>
            <i className="fas fa-exclamation-triangle"></i>
            No HTML files found
          </h3>
          <p>No HTML files found in this project. Please generate an HTML file first.</p>
        </div>
      )
    }

    if (previewLoading) {
      return (
        <div className="preview-content">
          <div className="preview-loading">
            <i className="fas fa-spinner fa-spin"></i> Loading preview...
          </div>
        </div>
      )
    }

    if (previewError) {
      return (
        <div className="preview-content">
          <div className="preview-error">
            <h3>
              <i className="fas fa-exclamation-triangle"></i>
              Preview Error
            </h3>
            <p>{previewError}</p>
          </div>
        </div>
      )
    }

    const fullHtml = createFullHtmlDocument(previewHtmlContent || editorContent)

    return (
      <div className="preview-content">
        {/* File Selector for Multiple HTML Files */}
        {showFileSelector && htmlFiles.length > 1 && (
          <div className="file-selector" id="fileSelector">
            <select 
              id="htmlFileSelect" 
              onChange={handleHtmlFileSelect}
              value={selectedHtmlFile?.path || ''}
            >
              <option value="">Select HTML file to preview...</option>
              {htmlFiles.map(file => (
                <option key={file.path} value={file.path}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <iframe
          className="preview-iframe"
          srcDoc={fullHtml}
          title="Preview"
        />
      </div>
    )
  }

  return (
    <div 
      className="right-panel" 
      id="rightPanel"
      style={{ width: `${width}%` }}
    >
      <div className="options-bar">
        <div className="options-left">
          <div 
            className={`files-option-button ${showFileSidebar ? 'active' : ''}`}
            onClick={toggleFileSidebar}
          >
            <i className="fas fa-code fa-lg"></i>
          </div>
          <div 
            className={`view-toggle-button ${isPreviewMode ? 'active' : ''}`}
            onClick={togglePreview}
          >
            <i className="fas fa-eye fa-lg"></i>
          </div>
        </div>
        <div className="options-title">
          {isPreviewMode ? 'Preview' : 'Code Editor'}
        </div>
      </div>
      
      {/* File Sidebar */}
      <div 
        id="fileSidebar" 
        className={`file-sidebar ${showFileSidebar ? 'file-sidebar-visible' : 'file-sidebar-hidden'}`}
      >
        <div className="file-sidebar-header">
          <h3>Files</h3>
          <button 
            className="file-sidebar-close-btn" 
            onClick={() => setShowFileSidebar(false)}
            title="Close Sidebar"
          >
            &times;
          </button>
        </div>
        <div className="file-list" id="fileList">
          {Object.values(currentFiles).map((file) => (
            <div 
              key={file.path}
              className={`file-item ${selectedFile?.path === file.path ? 'active' : ''}`}
              onClick={() => handleFileSelect(file)}
            >
              <i className={getFileIcon(file.name)}></i>
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div 
        id="monacoEditorContainer" 
        className={`monaco-editor-container ${showFileSidebar ? 'editor-with-sidebar' : ''}`}
        style={{ display: isPreviewMode ? 'none' : 'block' }}
      >
        <Editor
          height="100%"
          language={selectedFile ? getLanguageFromFileName(selectedFile.name) : 'plaintext'}
          value={editorContent}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            cursorStyle: 'line',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible'
            }
          }}
          onMount={(editor) => {
            editorRef.current = editor
          }}
        />
      </div>
      
      {/* Preview Container */}
      <div 
        id="previewContainer" 
        className="preview-container"
        style={{ display: isPreviewMode ? 'block' : 'none' }}
      >
        <div className="preview-header">
          <div className="preview-title">
            <i className="fas fa-eye"></i>
            App Preview
          </div>
          <div className="preview-controls">
            <button className="preview-button secondary" onClick={refreshPreview}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
            <button className="preview-button secondary" onClick={openPreviewInNewTab}>
              <i className="fas fa-external-link-alt"></i>
              Open in New Tab
            </button>
            <button className="preview-button secondary" onClick={togglePreview}>
              <i className="fas fa-code"></i>
              Editor
            </button>
          </div>
        </div>
        
        {renderPreview()}
      </div>
    </div>
  )
}

export default RightPanel
