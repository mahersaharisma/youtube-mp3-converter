const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint untuk konversi
app.post('/api/convert', async (req, res) => {
  let downloadStream = null;
  
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    // Validasi URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'URL YouTube tidak valid' });
    }

    console.log('Processing:', url);

    // Get video info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title
      .replace(/[^\w\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    console.log('Title:', title);

    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Create download stream
    downloadStream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    // Handle stream errors
    downloadStream.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Gagal mengunduh audio dari video ini. Coba video lain.' 
        });
      }
    });

    // Pipe to response
    downloadStream.pipe(res);

    // Handle response finish
    res.on('finish', () => {
      console.log('Download completed');
    });

  } catch (error) {
    console.error('Convert error:', error.message);
    
    // Cleanup stream if exists
    if (downloadStream) {
      downloadStream.destroy();
    }
    
    let errorMsg = 'Terjadi kesalahan saat konversi.';
    
    if (error.message.includes('410')) {
      errorMsg = 'Video tidak dapat diakses. Coba video lain.';
    } else if (error.message.includes('private')) {
      errorMsg = 'Video bersifat private atau restricted.';
    } else if (error.message.includes('copyright')) {
      errorMsg = 'Video memiliki copyright restriction.';
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});