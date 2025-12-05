
// Helper function to determine language from file type
export function getLanguageFromFileType(fileType) {
    const typeMap = {
        'html': 'html',
        'css': 'css',
        'js': 'javascript',
        'json': 'json',
        'md': 'markdown',
        'py': 'python',
        'jsx': 'javascript',
        'tsx': 'javascript',
        'ts': 'typescript',
        'txt': 'plaintext'
    };
    return typeMap[fileType.toLowerCase()] || 'plaintext';
}

// Helper function to extract directories from file paths
export function getDirectoriesFromFiles(files) {
    const directories = new Set();
    files.forEach(file => {
        const pathParts = file.path.split('/');
        for (let i = 1; i < pathParts.length; i++) {
            const dirPath = pathParts.slice(0, i).join('/');
            if (dirPath) {
                directories.add(dirPath);
            }
        }
    });
    return Array.from(directories);
}
