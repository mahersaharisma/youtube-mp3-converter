const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cookies untuk bypass beberapa restriction
const agent = ytdl.createAgent(undefined, {
  localAddress: undefined
});

// Endpoint untuk konversi
app.post('/api/convert', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    // Validasi URL YouTube
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'URL YouTube tidak valid' });
    }

    console.log('Processing URL:', url);

    // Dapatkan info video dengan options yang lebih lengkap
    const info = await ytdl.getInfo(url, {
      agent: agent
    });
    
    const title = info.videoDetails.title.replace(/[^\w\s-]/gi, '').substring(0, 100);
    
    console.log('Video title:', title);

    // Set response headers untuk download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Stream audio langsung ke response dengan error handling
    const stream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
      agent: agent
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Gagal mengunduh audio. Coba video lain atau coba lagi nanti.' 
        });
      }
    });

    stream.pipe(res);

  } catch (error) {
    console.error('Error details:', error.message);
    
    let errorMessage = 'Terjadi kesalahan saat mengkonversi video.';
    
    if (error.message.includes('age')) {
      errorMessage = 'Video memiliki batasan usia. Tidak bisa dikonversi.';
    } else if (error.message.includes('private')) {
      errorMessage = 'Video bersifat private atau tidak tersedia.';
    } else if (error.message.includes('copyright')) {
      errorMessage = 'Video memiliki batasan hak cipta.';
    } else if (error.message.includes('available')) {
      errorMessage = 'Video tidak tersedia di wilayah ini.';
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server berjalan dengan baik' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});