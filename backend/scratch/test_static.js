const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const miniappDistPath = path.join(__dirname, '../public/app');
const adminDistPath = path.join(__dirname, '../public/admin');

app.use('/admin', express.static(adminDistPath));
app.get('/admin*', (req, res) => res.sendFile(path.join(adminDistPath, 'index.html')));

app.use(express.static(miniappDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) return next();
  res.sendFile(path.join(miniappDistPath, 'index.html'));
});

const server = app.listen(3456, async () => {
  const root = await fetch('http://localhost:3456/').then(r => r.text());
  console.log('Root contains id="root":', root.includes('id="root"'));
  const admin = await fetch('http://localhost:3456/admin/login').then(r => r.text());
  console.log('Admin contains id="root":', admin.includes('id="root"'));
  server.close();
});
