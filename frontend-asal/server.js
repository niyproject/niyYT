// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Serve file statis (HTML, CSS, JS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server udah jalan bung! Buka http://localhost:${PORT}`);
});
