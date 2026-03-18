import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { useProject } from "../contexts/ProjectContext";
import { apiService } from "../services/apiService";

const RightPanel = ({ currentProject, width }) => {
  const { updateFile } = useProject();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showFileSidebar, setShowFileSidebar] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState(
    "// Your code will appear here...",
  );
  const [currentFiles, setCurrentFiles] = useState({});
  const [previewHtmlContent, setPreviewHtmlContent] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [selectedHtmlFile, setSelectedHtmlFile] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const editorRef = useRef(null);
  const selectedFileRef = useRef(null);

  // Track if it's the initial load for the current project
  const lastProjectIdRef = useRef(null);

  useEffect(() => {
    if (
      currentProject &&
      currentProject.files &&
      currentProject.files.length > 0
    ) {
      const files = {};
      currentProject.files.forEach((file) => {
        // Use path as key, ensure file has all required properties
        const fileKey = file.path || `${file.name || "file"}`;
        files[fileKey] = {
          name: file.name || file.filename || "untitled",
          path: file.path || fileKey,
          content: file.content || "",
          type: file.type || file.fileType || "txt",
          language: file.language || "plaintext",
          extension:
            file.extension || `.${file.type || file.fileType || "txt"}`,
        };
      });
      setCurrentFiles(files);

      // Only set initial file and open sidebar if it's a NEW project being loaded
      // or if we don't have a selected file yet
      if (currentProject._id !== lastProjectIdRef.current || !selectedFile) {
        const firstFile = currentProject.files[0];
        if (firstFile) {
          const formattedFile = {
            name: firstFile.name || firstFile.filename || "untitled",
            path: firstFile.path || `${firstFile.name || "file"}`,
            content: firstFile.content || "",
            type: firstFile.type || firstFile.fileType || "txt",
            language: firstFile.language || "plaintext",
            extension:
              firstFile.extension ||
              `.${firstFile.type || firstFile.fileType || "txt"}`,
          };
          setSelectedFile(formattedFile);
          selectedFileRef.current = formattedFile;
          setEditorContent(formattedFile.content || "");
          setShowFileSidebar(true);
        }
        lastProjectIdRef.current = currentProject._id;
      } else {
        // If just updating content (e.g. after save or AI generation), update the selected file's content in editor
        if (selectedFile && files[selectedFile.path]) {
          const newFile = files[selectedFile.path];
          // If content is different, update editor and selected file
          if (newFile.content !== editorContent) {
            setEditorContent(newFile.content);
            setSelectedFile(newFile);
            selectedFileRef.current = newFile;
          }
        }
      }
    } else {
      // Reset when no project or no files
      setCurrentFiles({});
      setSelectedFile(null);
      selectedFileRef.current = null;
      setEditorContent("// Your code will appear here...");
      setShowFileSidebar(false);
      lastProjectIdRef.current = null;
    }
  }, [currentProject]);

  const handleEditorChange = (value) => {
    setEditorContent(value);
    // Update local file cache immediately using Ref to avoid stale closures
    const currentFile = selectedFileRef.current;
    if (currentFile) {
      setCurrentFiles((prev) => ({
        ...prev,
        [currentFile.path]: {
          ...prev[currentFile.path],
          content: value,
        },
      }));
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    selectedFileRef.current = file;
    setEditorContent(file.content || "");
    // Update preview if in preview mode and it's an HTML file
    if (isPreviewMode && file.name.toLowerCase().endsWith(".html")) {
      setPreviewHtmlContent(file.content || "");
      setPreviewError(null);
    }
  };

  const getHtmlFiles = () => {
    return Object.values(currentFiles).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".html") ||
        file.name.toLowerCase().endsWith(".htm"),
    );
  };

  const togglePreview = () => {
    const newPreviewMode = !isPreviewMode;
    setIsPreviewMode(newPreviewMode);

    // When switching to preview mode, check for HTML files
    if (newPreviewMode) {
      const htmlFiles = getHtmlFiles();

      if (htmlFiles.length === 0) {
        setPreviewError(
          "No HTML files found in this project. Please generate an HTML file first.",
        );
        return;
      }

      // If multiple HTML files, show selector
      if (htmlFiles.length > 1) {
        setShowFileSelector(true);
        // Auto-select first file or currently selected HTML file
        const currentHtmlFile =
          htmlFiles.find((f) => f.path === selectedFile?.path) || htmlFiles[0];
        setSelectedHtmlFile(currentHtmlFile);
        loadHtmlFileForPreview(currentHtmlFile);
      } else {
        // Single HTML file
        setShowFileSelector(false);
        const htmlFile = htmlFiles[0];
        setSelectedHtmlFile(htmlFile);
        loadHtmlFileForPreview(htmlFile);
      }
    }
  };

  const loadHtmlFileForPreview = (file) => {
    if (!file) return;

    setPreviewLoading(true);
    setPreviewError(null);

    // Use editor content if this is the currently selected file, otherwise use file content
    // Also update currentFiles to ensure we have the latest content
    const htmlContent =
      (file.path === selectedFile?.path ? editorContent : null) ||
      file.content ||
      "";

    // Update the file in currentFiles cache if using editor content
    if (file.path === selectedFile?.path && editorContent) {
      setCurrentFiles((prev) => ({
        ...prev,
        [file.path]: {
          ...prev[file.path],
          content: editorContent,
        },
      }));
    }

    setPreviewHtmlContent(htmlContent);
    setPreviewLoading(false);
  };

  const handleHtmlFileSelect = (e) => {
    const filePath = e.target.value;
    if (!filePath) return;

    const htmlFiles = getHtmlFiles();
    const selectedFile = htmlFiles.find((f) => f.path === filePath);
    if (selectedFile) {
      setSelectedHtmlFile(selectedFile);
      loadHtmlFileForPreview(selectedFile);
    }
  };

  const refreshPreview = () => {
    if (selectedHtmlFile) {
      setPreviewLoading(true);
      setPreviewError(null);

      // Use editor content if the selected HTML file is currently being edited
      const htmlContent =
        (selectedHtmlFile.path === selectedFile?.path ? editorContent : null) ||
        selectedHtmlFile.content ||
        "";

      // Update the file in currentFiles cache if using editor content
      if (selectedHtmlFile.path === selectedFile?.path && editorContent) {
        setCurrentFiles((prev) => ({
          ...prev,
          [selectedHtmlFile.path]: {
            ...prev[selectedHtmlFile.path],
            content: editorContent,
          },
        }));
      }

      setPreviewHtmlContent(htmlContent);
      setPreviewLoading(false);
    } else if (
      selectedFile &&
      selectedFile.name.toLowerCase().endsWith(".html")
    ) {
      setPreviewLoading(true);
      setPreviewError(null);
      const htmlContent = editorContent || selectedFile.content || "";
      setPreviewHtmlContent(htmlContent);
      setPreviewLoading(false);
    }
  };

  const openPreviewInNewTab = () => {
    if (previewHtmlContent) {
      const fullHtml = createFullHtmlDocument(previewHtmlContent);
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  // Get all CSS files from the project
  const getCssFiles = () => {
    return Object.values(currentFiles).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".css") ||
        file.name.toLowerCase().endsWith(".scss"),
    );
  };

  // Get all JS files from the project
  const getJsFiles = () => {
    return Object.values(currentFiles).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".js") ||
        file.name.toLowerCase().endsWith(".jsx") ||
        file.name.toLowerCase().endsWith(".mjs"),
    );
  };

  // Extract HTML body content (everything between <body> tags or just the content if no body tag)
  const extractHtmlBody = (htmlContent) => {
    if (!htmlContent) return "";

    // Check if content has <body> tag
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }

    // Check if content has <html> structure but no body
    const htmlMatch = htmlContent.match(/<html[^>]*>([\s\S]*)<\/html>/i);
    if (htmlMatch) {
      // Extract content between <head> and </head> if exists, and everything after
      const headMatch = htmlMatch[1].match(/<head[^>]*>([\s\S]*)<\/head>/i);
      if (headMatch) {
        return htmlMatch[1].replace(/<head[^>]*>[\s\S]*<\/head>/i, "").trim();
      }
      return htmlMatch[1].trim();
    }

    // If no structure, return as is (might be just body content)
    return htmlContent.trim();
  };

  // Extract title from HTML if present
  const extractTitle = (htmlContent) => {
    if (!htmlContent) return "App Preview";
    const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : "App Preview";
  };

  // Replace external file references in HTML with inline content
  const processHtmlReferences = (htmlContent) => {
    let processedHtml = htmlContent;

    // Replace <link rel="stylesheet"> tags with inline styles
    const cssFiles = getCssFiles();
    cssFiles.forEach((cssFile) => {
      const fileName = cssFile.name;
      const fileNameWithoutExt = fileName.replace(/\.(css|scss)$/i, "");

      // Match various patterns: href="style.css", href="./style.css", href="/style.css", etc.
      const patterns = [
        new RegExp(
          `<link[^>]*href=["']([^"']*${fileName.replace(/\./g, "\\.")})["'][^>]*>`,
          "gi",
        ),
        new RegExp(
          `<link[^>]*href=["']([^"']*${fileNameWithoutExt.replace(/\./g, "\\.")}\\.css)["'][^>]*>`,
          "gi",
        ),
      ];

      patterns.forEach((pattern) => {
        processedHtml = processedHtml.replace(pattern, (match) => {
          // Replace the link tag with inline style
          return `<style>/* ${fileName} */\n${cssFile.content}\n</style>`;
        });
      });
    });

    // Replace <script src=""> tags with inline scripts
    const jsFiles = getJsFiles();
    jsFiles.forEach((jsFile) => {
      const fileName = jsFile.name;
      const fileNameWithoutExt = fileName.replace(/\.(js|jsx|mjs)$/i, "");

      // Match various patterns: src="script.js", src="./script.js", src="/script.js", etc.
      const patterns = [
        new RegExp(
          `<script[^>]*src=["']([^"']*${fileName.replace(/\./g, "\\.")})["'][^>]*>\\s*</script>`,
          "gi",
        ),
        new RegExp(
          `<script[^>]*src=["']([^"']*${fileNameWithoutExt.replace(/\./g, "\\.")}\\.js)["'][^>]*>\\s*</script>`,
          "gi",
        ),
      ];

      patterns.forEach((pattern) => {
        processedHtml = processedHtml.replace(pattern, (match) => {
          // Replace the script tag with inline script
          return `<script>/* ${fileName} */\n${jsFile.content}\n</script>`;
        });
      });
    });

    return processedHtml;
  };

  const createFullHtmlDocument = (htmlContent) => {
    if (!htmlContent) return "";

    // Process HTML to replace external references
    let processedHtml = processHtmlReferences(htmlContent);

    // Extract body content
    const bodyContent = extractHtmlBody(processedHtml);
    const title = extractTitle(processedHtml);

    // Get all CSS and JS files
    const cssFiles = getCssFiles();
    const jsFiles = getJsFiles();

    // Build CSS content
    const cssContent = cssFiles
      .map((cssFile) => `/* ${cssFile.name} */\n${cssFile.content}`)
      .join("\n\n");

    // Build JS content
    const jsContent = jsFiles
      .map((jsFile) => `/* ${jsFile.name} */\n${jsFile.content}`)
      .join("\n\n");

    // Build the complete HTML document
    let fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        /* Reset and base styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; }
    </style>`;

    // Add CSS files if any
    if (cssContent) {
      fullHtml += `
    <style>
        ${cssContent}
    </style>`;
    }

    fullHtml += `
</head>
<body>
    ${bodyContent}`;

    // Add JS files if any
    if (jsContent) {
      fullHtml += `
    <script>
        ${jsContent}
    </script>`;
    }

    fullHtml += `
</body>
</html>`;

    return fullHtml;
  };

  const toggleFileSidebar = () => {
    setShowFileSidebar(!showFileSidebar);
  };

  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      php: "php",
      rb: "ruby",
      go: "go",
      rs: "rust",
      md: "markdown",
      sql: "sql",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
    };
    return languageMap[extension] || "plaintext";
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    const iconMap = {
      js: "fab fa-js-square",
      jsx: "fab fa-react",
      ts: "fab fa-js-square",
      tsx: "fab fa-react",
      html: "fab fa-html5",
      css: "fab fa-css3-alt",
      scss: "fab fa-sass",
      json: "fas fa-code",
      py: "fab fa-python",
      java: "fab fa-java",
      md: "fab fa-markdown",
      sql: "fas fa-database",
      xml: "fas fa-file-code",
      yaml: "fas fa-file-alt",
      yml: "fas fa-file-alt",
    };
    return iconMap[extension] || "fas fa-file";
  };

  // Update preview when editor content changes (for HTML files) or when files change
  useEffect(() => {
    if (isPreviewMode && selectedHtmlFile) {
      // Get current HTML content (use editor content if HTML file is selected, otherwise use cached content)
      const htmlContent =
        selectedFile && selectedHtmlFile.path === selectedFile.path
          ? editorContent
          : currentFiles[selectedHtmlFile.path]?.content ||
            selectedHtmlFile.content ||
            "";

      // Update preview - this will trigger createFullHtmlDocument which reads latest CSS/JS from currentFiles
      if (htmlContent) {
        setPreviewHtmlContent(htmlContent);
      }
    }
  }, [
    editorContent,
    isPreviewMode,
    selectedFile,
    selectedHtmlFile,
    currentFiles,
  ]);

  const renderPreview = () => {
    const htmlFiles = getHtmlFiles();

    if (htmlFiles.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500 h-full">
          <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
              <i className="fas fa-exclamation-triangle text-yellow-500"></i>
              No HTML files found
            </h3>
            <p className="text-sm">
              No HTML files found in this project. Please generate an HTML file
              first.
            </p>
          </div>
        </div>
      );
    }

    if (previewLoading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white h-full">
          <div className="text-gray-500 flex items-center gap-3">
            <i className="fas fa-spinner fa-spin text-blue-500 text-xl"></i>
            <span className="font-medium">Loading preview...</span>
          </div>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white h-full p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Preview Error
            </h3>
            <p className="text-red-600 text-sm whitespace-pre-wrap">
              {previewError}
            </p>
          </div>
        </div>
      );
    }

    const fullHtml = createFullHtmlDocument(
      previewHtmlContent || editorContent,
    );

    return (
      <div className="flex-1 relative bg-white">
        {/* File Selector for Multiple HTML Files */}
        {showFileSelector && htmlFiles.length > 1 && (
          <div
            className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm p-1 rounded shadow-sm border border-gray-200"
            id="fileSelector"
          >
            <select
              id="htmlFileSelect"
              onChange={handleHtmlFileSelect}
              value={selectedHtmlFile?.path || ""}
            >
              <option value="">Select HTML file to preview...</option>
              {htmlFiles.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <iframe
          className="w-full h-full border-none"
          srcDoc={fullHtml}
          title="Preview"
        />
      </div>
    );
  };

  const handleDownloadProject = async () => {
    if (!currentProject?._id || isDownloading) return;

    try {
      setIsDownloading(true);
      const response = await apiService.downloadProjectZip(currentProject._id);

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const projectName = (currentProject.name || "genforge-project")
        .replace(/[^a-z0-9_\-]+/gi, "-")
        .toLowerCase();

      link.href = url;
      link.download = `${projectName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Project download error:", error);
      alert(error.message || "Failed to download project");
    } finally {
      setIsDownloading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);

  const handleToggleEdit = async () => {
    if (isEditing) {
      // Save changes
      if (currentProject && currentProject._id && selectedFile) {
        try {
          const response = await updateFile(
            currentProject._id,
            selectedFile.path,
            editorContent,
          );
          if (response.success) {
            alert("Saved successfully!");
            setIsEditing(false);
          } else {
            alert("Failed to save: " + response.error);
          }
        } catch (error) {
          console.error("Error saving file:", error);
          alert("Error saving file");
        }
      }
    } else {
      // Enable edit mode
      setIsEditing(true);
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#1e1e1e] relative text-gray-300 w-full overflow-hidden"
      id="rightPanel"
    >
      <div className="flex items-center justify-between h-14 bg-[#252526] border-b border-[#333333] px-4 flex-shrink-0 z-10 w-full max-w-full">
        <div className="flex items-center gap-2">
          <button
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative z-30 ${showFileSidebar ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2d2d30] hover:text-white"}`}
            onClick={toggleFileSidebar}
            title="Toggle File Explorer"
          >
            <i className="fas fa-code fa-lg"></i>
          </button>
          <button
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${isPreviewMode ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2d2d30] hover:text-white"}`}
            onClick={togglePreview}
            title="Toggle Preview"
          >
            <i className="fas fa-eye fa-lg"></i>
          </button>
        </div>
        <div className="text-sm font-medium text-[#cccccc]">
          {isPreviewMode
            ? "Preview"
            : isEditing
              ? "Editing..."
              : "Code Editor (Read Only)"}
        </div>
        <div className="flex items-center gap-2">
          {!isPreviewMode && (
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${isEditing ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white"}`}
              onClick={handleToggleEdit}
            >
              <i className={`fas ${isEditing ? "fa-save" : "fa-pen"}`}></i>
              {isEditing ? "Save" : "Edit"}
            </button>
          )}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDownloadProject}
            disabled={!currentProject?._id || isDownloading}
            title={
              currentProject?._id
                ? "Download project as ZIP"
                : "No project selected"
            }
          >
            <i className="fas fa-arrow-down-to-line"></i>
            {isDownloading ? "Downloading..." : "Download"}
          </button>
        </div>
      </div>

      {/* File Sidebar */}
      <div
        id="fileSidebar"
        className={`absolute top-14 left-0 bottom-0 w-64 bg-[#252526] border-r border-[#333333] z-20 flex flex-col transition-transform duration-300 overflow-hidden ${showFileSidebar ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 h-10 border-b border-[#333333] flex-shrink-0">
          <h3 className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider m-0">
            Explorer
          </h3>
          <button
            type="button"
            className="text-[#cccccc] hover:text-white bg-transparent border-none text-lg cursor-pointer flex items-center justify-center p-1 rounded hover:bg-[#333333] z-30"
            onClick={(e) => {
              e.stopPropagation();
              setShowFileSidebar(false);
            }}
            title="Close Sidebar"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2" id="fileList">
          {Object.values(currentFiles).map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-2 px-6 py-1 cursor-pointer text-sm transition-colors ${selectedFile?.path === file.path ? "bg-[#37373d] text-white border-l-2 border-[#007acc] pl-[22px]" : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white border-l-2 border-transparent pl-6"}`}
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
        className={`flex-1 relative transition-all duration-300 ${showFileSidebar ? "ml-64" : "ml-0"}`}
        style={{ display: isPreviewMode ? "none" : "block" }}
      >
        <Editor
          key={selectedFile?.path || selectedFile?.name || "editor"}
          height="100%"
          path={selectedFile?.path || selectedFile?.name}
          language={
            selectedFile
              ? getLanguageFromFileName(selectedFile.name)
              : "plaintext"
          }
          value={editorContent}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: !isEditing,
            cursorStyle: "line",
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
            },
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>

      {/* Preview Container */}
      <div
        id="previewContainer"
        className="flex-1 bg-white flex flex-col transition-all duration-300"
        style={{ display: isPreviewMode ? "flex" : "none" }}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 text-gray-800">
          <div className="flex items-center gap-2 font-medium">
            <i className="fas fa-eye"></i>
            App Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={refreshPreview}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={openPreviewInNewTab}
            >
              <i className="fas fa-external-link-alt"></i>
              Open in New Tab
            </button>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={togglePreview}
            >
              <i className="fas fa-code"></i>
              Editor
            </button>
          </div>
        </div>

        {renderPreview()}
      </div>
    </div>
  );
};

export default RightPanel;
