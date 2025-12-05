import { useState } from 'react'
import { 
  File, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  FileText,
  FileCode,
  FileImage,
  FileCss,
  FileJs
} from 'lucide-react'

const FileExplorer = ({ files, directories, selectedFile, onFileSelect }) => {
  const [expandedDirs, setExpandedDirs] = useState(new Set())

  const toggleDirectory = (dirPath) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath)
      } else {
        newSet.add(dirPath)
      }
      return newSet
    })
  }

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html':
      case 'htm':
        return <FileCode size={16} className="file-icon html" />
      case 'css':
        return <FileCss size={16} className="file-icon css" />
      case 'js':
      case 'jsx':
        return <FileJs size={16} className="file-icon js" />
      case 'json':
        return <FileCode size={16} className="file-icon json" />
      case 'md':
        return <FileText size={16} className="file-icon md" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage size={16} className="file-icon image" />
      default:
        return <File size={16} className="file-icon default" />
    }
  }

  const getDirectoryIcon = (dirPath, isExpanded) => {
    return isExpanded ? 
      <FolderOpen size={16} className="folder-icon" /> : 
      <Folder size={16} className="folder-icon" />
  }

  const getDirectoryFiles = (dirPath) => {
    return files.filter(file => {
      const fileDir = file.path.substring(0, file.path.lastIndexOf('/'))
      return fileDir === dirPath
    })
  }

  const getDirectorySubdirs = (dirPath) => {
    return directories.filter(dir => {
      const parentDir = dir.substring(0, dir.lastIndexOf('/'))
      return parentDir === dirPath && dir !== dirPath
    })
  }

  const renderDirectory = (dirPath, level = 0) => {
    const isExpanded = expandedDirs.has(dirPath)
    const subdirs = getDirectorySubdirs(dirPath)
    const dirFiles = getDirectoryFiles(dirPath)
    const dirName = dirPath.split('/').pop() || dirPath

    return (
      <div key={dirPath} className="directory-item">
        <div 
          className="directory-header"
          style={{ paddingLeft: `${level * 20}px` }}
          onClick={() => toggleDirectory(dirPath)}
        >
          <div className="directory-toggle">
            {subdirs.length > 0 || dirFiles.length > 0 ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : null}
          </div>
          {getDirectoryIcon(dirPath, isExpanded)}
          <span className="directory-name">{dirName}</span>
        </div>
        
        {isExpanded && (
          <div className="directory-content">
            {subdirs.map(subdir => renderDirectory(subdir, level + 1))}
            {dirFiles.map(file => (
              <div
                key={file.path}
                className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                onClick={() => onFileSelect(file)}
                style={{ paddingLeft: `${(level + 1) * 20}px` }}
              >
                {getFileIcon(file.filename)}
                <span className="file-name">{file.filename}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const rootFiles = files.filter(file => !file.path.includes('/'))
  const rootDirs = directories.filter(dir => !dir.includes('/') || dir.split('/').length === 1)

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>Files</h3>
      </div>
      
      <div className="file-explorer-content">
        {rootFiles.map(file => (
          <div
            key={file.path}
            className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file.filename)}
            <span className="file-name">{file.filename}</span>
          </div>
        ))}
        
        {rootDirs.map(dir => renderDirectory(dir))}
        
        {files.length === 0 && directories.length === 0 && (
          <div className="empty-explorer">
            <p>No files in this project</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileExplorer
