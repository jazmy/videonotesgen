const path = require('path');
const fs = require('fs').promises;

const sanitizeFilename = (filename) => {
  // Remove any path components
  filename = path.basename(filename);
  
  // Replace any non-alphanumeric characters (except dots and dashes) with underscores
  filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Ensure the filename is not too long
  if (filename.length > 255) {
    const ext = path.extname(filename);
    filename = filename.slice(0, 255 - ext.length) + ext;
  }
  
  return filename;
};

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

const moveFile = async (sourcePath, destinationPath) => {
  try {
    await ensureDirectoryExists(path.dirname(destinationPath));
    await fs.rename(sourcePath, destinationPath);
    return true;
  } catch (error) {
    console.error(`Error moving file from ${sourcePath} to ${destinationPath}:`, error);
    return false;
  }
};

module.exports = {
  sanitizeFilename,
  ensureDirectoryExists,
  deleteFile,
  moveFile
};
