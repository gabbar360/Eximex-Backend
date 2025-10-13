import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileUtils {
  /**
   * Delete file from filesystem
   */
  static deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file URL for serving
   */
  static getFileUrl(filename, type = 'logos') {
    if (!filename) return null;
    return `/uploads/${type}/${filename}`;
  }

  /**
   * Get full file path
   */
  static getFilePath(filename, type = 'logos') {
    if (!filename) return null;
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(currentDir, `../../uploads/${type}/${filename}`);
  }

  /**
   * Extract filename from URL or path
   */
  static extractFilename(urlOrPath) {
    if (!urlOrPath) return null;
    return path.basename(urlOrPath);
  }
}
