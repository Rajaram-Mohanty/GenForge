import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Save, Download, Eye } from 'lucide-react'

const CodeEditor = ({ file, onFileUpdate }) => {
  const [content, setContent] = useState('')
  const [isModified, setIsModified] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (file) {
      setContent(file.content || '')
      setIsModified(false)
    }
  }, [file])

  const handleEditorChange = (value) => {
    setContent(value || '')
    setIsModified(true)
  }

  const handleSave = () => {
    if (file && isModified) {
      onFileUpdate(file.path, content)
      setIsModified(false)
    }
  }

  const handleDownload = () => {
    if (file) {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const getLanguage = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html':
      case 'htm':
        return 'html'
      case 'css':
        return 'css'
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'json':
        return 'json'
      case 'md':
        return 'markdown'
      case 'py':
        return 'python'
      case 'ts':
      case 'tsx':
        return 'typescript'
      default:
        return 'plaintext'
    }
  }

  const isPreviewable = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    return ['html', 'htm', 'md'].includes(extension)
  }

  if (!file) {
    return (
      <div className="code-editor-empty">
        <div className="empty-state">
          <h3>No file selected</h3>
          <p>Select a file from the explorer to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="code-editor-container">
      <div className="editor-header">
        <div className="file-info">
          <span className="file-name">{file.filename}</span>
          {isModified && <span className="modified-indicator">●</span>}
        </div>
        
        <div className="editor-actions">
          {isPreviewable(file.filename) && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-outline btn-sm"
              title="Toggle preview"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="btn btn-outline btn-sm"
            title="Download file"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            disabled={!isModified}
            title="Save file"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
      
      <div className="editor-content">
        {showPreview && isPreviewable(file.filename) ? (
          <div className="preview-container">
            <div className="preview-header">
              <span>Preview</span>
            </div>
            <div 
              className="preview-content"
              dangerouslySetInnerHTML={{ 
                __html: file.filename.endsWith('.md') ? 
                  content.replace(/\n/g, '<br>') : 
                  content 
              }}
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(file.filename)}
            value={content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              cursorStyle: 'line',
              selectOnLineNumbers: true,
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

export default CodeEditor
