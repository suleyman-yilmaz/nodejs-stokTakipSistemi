const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const exceljs = require('exceljs');
const fs = require('fs');


const app = express();
const port = 3000;

// Veritabanı bağlantısı
const db = new sqlite3.Database(path.join(__dirname, 'data', 'database.db'));

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Ana sayfa
app.get(['/', '/anaSayfa'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anaSayfa.html'));
});

//Anlık Stok sayfası
app.get('/anlikStok', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anlikStok.html'));
});

// Ürün girişi sayfası
app.get('/urunGirisi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'urunGirisi.html'));
});

// Çıkışı yapılan ürünler sayfası
app.get('/urunCikisi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'urunCikisi.html'));
});

// Ürün bilgi giriş sayfası
app.get('/urunBilgiGiris', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'urunBilgiGiris.html'));
});

// ürün giris sorgulama işlemleri sayfası
app.get('/girisUrunSorgulama', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'girisiYapilanUrunleriSorgulama.html'));
});

// ürün çıkış sorgulama işlemleri sayfası
app.get('/urunCikisSorgulama', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'urunCikisSorgulama.html'));
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

// anlık stok sorgulama
app.get('/api/anlik/sorgu', (req, res) => {
    const { barcode, urunAdi, birimi } = req.query;

    if (barcode) {
        db.get('SELECT * FROM vw_anlik WHERE barkodno = ?', [barcode], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(row ? [row] : []);
        });
    } else if (urunAdi) {
        db.all('SELECT * FROM vw_anlik WHERE urunAdi LIKE ?', [`%${urunAdi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else if (birimi) {
        db.all('SELECT * FROM vw_anlik WHERE birimi LIKE ?', [`%${birimi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else {
        res.status(400).json({ error: 'En az bir sorgu parametresi sağlanmalıdır: barcode, urunAdi, birimi' });
    }
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

// ürün bilgi eklemeden önce barkod no sorgu işlemleri
app.get('/api/urunler/:barcode/check', (req, res) => {
    const barcode = req.params.barcode;
    db.get('SELECT COUNT(*) AS count FROM urun WHERE barkodno = ?', [barcode], (err, row) => {
        if (err) {
            console.error('Barkod kontrolü sırasında bir hata oluştu:', err);
            res.status(500).json({ error: 'Sunucu hatası' });
            return;
        }
        res.json({ exists: row.count > 0 });
    });
});

// Ürün bilgi ekle
app.post('/api/urunler', (req, res) => {
    const { barkodno, urunAdi, birimi } = req.body;

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


// ürün girişi sorgula
app.get('/api/urungirisi/sorgu', (req, res) => {
    const { barcode, urunAdi, birimi } = req.query;

    if (barcode) {
        db.all('SELECT * FROM vw_urunGirisi WHERE barkodno = ?', [barcode], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows)
        });
    } else if (urunAdi) {
        db.all('SELECT * FROM vw_urunGirisi WHERE urunAdi LIKE ?', [`%${urunAdi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else if (birimi) {
        db.all('SELECT * FROM vw_urunGirisi WHERE birimi LIKE ?', [`%${birimi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else {
        res.status(400).json({ error: 'En az bir sorgu parametresi sağlanmalıdır: barcode, urunAdi, birimi' });
    }
});


// Çıkışı yapılan ürünler listele
app.get('/api/urunler/cikan', (req, res) => {
    db.all('SELECT * FROM vw_urunCikisi ORDER BY barkodno', (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// ürün çıkışı ekle
app.post('/api/urunler/cikan', (req, res) => {
    const { cBarkodNo, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama } = req.body;

    if (!cBarkodNo || !cikanMiktar || !satisFiyati || !toplamTutar || !cikisTarihi || !aciklama) {
        return res.status(400).json({ error: 'Eksik veri' });
    }

    db.run('INSERT INTO cikanUrun (cBarkodNo, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama) VALUES (?, ?, ?, ?, ?, ?)', [cBarkodNo, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama], function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json({ id: this.lastID });
    });
});

// Çıkışı yapılan ürünler silme işlemi
app.delete('/api/urunler/cikan/:cUrunID', (req, res) => {
    const cUrunID = req.params.cUrunID;
    db.run('DELETE FROM cikanUrun WHERE cUrunID = ?', cUrunID, function (err) {
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


// ürün çıkışı düzenleme işlemleri
app.put('/api/urunler/cikan/:cUrunID', (req, res) => {
    const { cUrunID } = req.params;
    const { barkodno, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama } = req.body;
    const sql = 'UPDATE cikanUrun SET cBarkodNo = ?, cikanMiktar = ?, satisFiyati = ?, toplamTutar = ?, cikisTarihi = ?, aciklama = ? WHERE cUrunID = ?';
    db.run(sql, [barkodno, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama, cUrunID], function (err) {
        if (err) {
            console.log('Hata:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});


// çıkışı yapılan ürünleri sorgulama
app.get('/api/uruncikisi/sorgu', (req, res) => {
    const { barcode, urunAdi, birimi } = req.query;

    if (barcode) {
        db.all('SELECT * FROM vw_urunCikisi WHERE barkodno = ?', [barcode], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows)
        });
    } else if (urunAdi) {
        db.all('SELECT * FROM vw_urunCikisi WHERE urunAdi LIKE ?', [`%${urunAdi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else if (birimi) {
        db.all('SELECT * FROM vw_urunCikisi WHERE birimi LIKE ?', [`%${birimi}%`], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    } else {
        res.status(400).json({ error: 'En az bir sorgu parametresi sağlanmalıdır: barcode, urunAdi, birimi' });
    }
});

// 404 sayfası
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});