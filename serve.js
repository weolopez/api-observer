// Simple HTTP server for the Trystero API Observer
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    // Get file path
    const reqPath = req.url === '/' ? '/index.html' : req.url;
    
    // Determine the file path based on the request path
    let filePath;
    if (reqPath.startsWith('/src/')) {
      // Request for a file in the src directory (parent directory)
      filePath = join(__dirname, '..', reqPath);
    } else if (reqPath.startsWith('/dist/')) {
      // Request for a file in the dist directory (minified bundles)
      filePath = join(__dirname, '..', reqPath);
    } else {
      // Request for a file in the current (api-observer) directory
      filePath = join(__dirname, reqPath);
    }
    
    // Get file extension
    const ext = extname(filePath);
    
    // Set Content-Type header
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Read file
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.end(data);
  } catch (err) {
    console.error(`Error handling request: ${err.message}`);
    
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('File not found');
    } else {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Trystero API Observer is now available`);
});