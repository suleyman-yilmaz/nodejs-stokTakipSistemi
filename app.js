const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// Veritabanı bağlantısı
const db = new sqlite3.Database(path.join(__dirname, 'data', 'database.db'));

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anaSayfa.html'));
});
app.get('/anaSayfa', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anaSayfa.html'));
});

//Anlık Stok sayfası
app.get('/anlikStok', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'anlikStok.html'));
});

// Ürün girişi sayfası
app.get('/urunGirisi', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'urunGirisi.html'));
});

// Çıkışı yapılan ürünler sayfası
app.get('/cikisiYapilanUrunler', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cikisiYapilanUrunler.html'));
});

// Satış ekranı sayfası
app.get('/satisEkrani', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'satisEkrani.html'));
});

// Ürün bilgi giriş sayfası
app.get('/urunBilgiGiris', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'urunBilgiGiris.html'));
});


// anlık stok listele
app.get('/api/anlik', (req, res) => {
    db.all('SELECT * FROM vw_anlik ORDER BY barkodno', (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Ürünleri bilgi listele
app.get('/api/urunler', (req, res) => {
    db.all('SELECT * FROM urun ORDER BY barkodno', (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Ürün bilgi ekle
app.post('/api/urunler', (req, res) => {
    const { barkodno, urunAdi, birimi } = req.body;

    // Gelen verileri kontrol et
    console.log('Gelen veri:', { barkodno, urunAdi, birimi });

    if (!barkodno || !urunAdi || !birimi) {
        return res.status(400).json({ error: 'Eksik veri' });
    }

    db.run('INSERT INTO urun (barkodno, urunAdi, birimi) VALUES (?, ?, ?)', [barkodno, urunAdi, birimi], function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json({ id: this.lastID });
    });
});

// ürün bilgi silme işlemi
app.delete('/api/urunler/:barkodno', (req, res) => {
    const barkodno = req.params.barkodno;
    db.run('DELETE FROM urun WHERE barkodno = ?', barkodno, function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }
        res.json({ message: 'Ürün başarıyla silindi' });
    });
});

// ürün bilgi güncelleme işlemleri
app.put('/api/urunler/:barkodno', (req, res) => {
    const { barkodno } = req.params;
    const { urunAdi, birimi } = req.body;
    const sql = 'UPDATE urun SET urunAdi = ?, birimi = ? WHERE barkodno = ?';
    db.run(sql, [urunAdi, birimi, barkodno], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});


// Ürün girisi listele
app.get('/api/urunler/giren', (req, res) => {
    db.all('SELECT * FROM vw_urunGirisi ORDER BY barkodno', (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// ürün girişi ekle
app.post('/api/urunler/giren', (req, res) => {
    const { gBarkodNo, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma } = req.body;

    // Gelen verileri kontrol et
    console.log('Gelen veri:', { gBarkodNo, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma });

    if (!gBarkodNo || !girenMiktar || !alisFiyati || !toplamTutar || !girisTarihi || !firma) {
        return res.status(400).json({ error: 'Eksik veri' });
    }

    db.run('INSERT INTO girenUrun (gBarkodNo, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma) VALUES (?, ?, ?, ?, ?, ?)', [gBarkodNo, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma], function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json({ id: this.lastID });
    });
});

// ürün girişi silme işlemi
app.delete('/api/urunler/giren/:girenID', (req, res) => {
    const girenID = req.params.girenID;
    db.run('DELETE FROM girenUrun WHERE girenID = ?', girenID, function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }
        res.json({ message: 'Ürün başarıyla silindi' });
    });
});


// ürün girişi düzenleme işlemleri
app.put('/api/urunler/giren/:girenID', (req, res) => {
    const { girenID } = req.params;
    const { barkodno, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma } = req.body;
    const sql = 'UPDATE girenUrun SET gBarkodNo = ?, girenMiktar = ?, alisFiyati = ?, toplamTutar = ?, girisTarihi = ?, firma = ? WHERE girenID = ?';
    db.run(sql, [barkodno, girenMiktar, alisFiyati, toplamTutar, girisTarihi, firma, girenID], function (err) {
        if (err) {
            console.log('Hata:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});



app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});