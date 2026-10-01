import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function detectFrames() {
  const imgDir = path.resolve(__dirname, 'images');
  if (!fs.existsSync(imgDir)) return [];
  const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  files.sort((a, b) => {
    const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
    const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
    return numA - numB;
  });
  const framePaths = files.map(f => {
    const stat = fs.statSync(path.join(imgDir, f));
    return '/images/' + f + '?v=' + Math.round(stat.mtimeMs);
  });
  const content = '// Automatically generated from images/ directory\nexport const FRAME_PATHS = ' + JSON.stringify(framePaths, null, 2) + ';\n';
  const outPath = path.resolve(__dirname, 'src', 'data', 'frames.js');
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf-8') !== content) {
    fs.writeFileSync(outPath, content, 'utf-8');
  }
  return framePaths;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-media-assets',
      buildStart() {
        detectFrames();
      },
      configureServer(server) {
        detectFrames();
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url ? req.url.split('?')[0] : '';
          
          if (urlPath.startsWith('/images/')) {
            const filePath = path.resolve(__dirname, urlPath.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'no-cache, must-revalidate');
              return fs.createReadStream(filePath).pipe(res);
            }
          }

          if (urlPath.startsWith('/audio/')) {
            const filePath = path.resolve(__dirname, 'public', urlPath.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Accept-Ranges', 'bytes');
              return fs.createReadStream(filePath).pipe(res);
            }
          }

          next();
        });
      },
      closeBundle() {
        // Copy images
        const srcDir = path.resolve(__dirname, 'images');
        const destDir = path.resolve(__dirname, 'dist', 'images');
        if (fs.existsSync(srcDir)) {
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const files = fs.readdirSync(srcDir);
          for (const file of files) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
          }
        }

        // Copy audio
        const audioSrc = path.resolve(__dirname, 'public', 'audio');
        const audioDest = path.resolve(__dirname, 'dist', 'audio');
        if (fs.existsSync(audioSrc)) {
          if (!fs.existsSync(audioDest)) fs.mkdirSync(audioDest, { recursive: true });
          const files = fs.readdirSync(audioSrc);
          for (const file of files) {
            fs.copyFileSync(path.join(audioSrc, file), path.join(audioDest, file));
          }
        }
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/*.mp3', '**/images/**', '**/*.png']
    }
  }
});
