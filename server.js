const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Extract video ID dari URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Endpoint untuk konversi
app.post('/api/convert', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL YouTube tidak valid' });
    }

    console.log('Processing video ID:', videoId);

    // Gunakan API converter gratis
    const apiUrl = `https://www.yt-download.org/api/button/mp3/${videoId}`;
    
    const response = await fetch(apiUrl);
    const html = await response.text();
    
    // Extract download link dari response
    const downloadMatch = html.match(/href="([^"]+)"/);
    
    if (!downloadMatch) {
      return res.status(500).json({ 
        error: 'Tidak dapat mengkonversi video ini. Coba video lain.' 
      });
    }

    const downloadUrl = downloadMatch[1];
    
    // Return download URL ke frontend
    res.json({ 
      success: true,
      downloadUrl: downloadUrl,
      videoId: videoId
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan. Silakan coba lagi.' 
    });
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