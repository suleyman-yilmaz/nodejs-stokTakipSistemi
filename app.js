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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anaSayfa.html'));
});
app.get('/anaSayfa', (req, res) => {
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
app.get('/cikisiYapilanUrunler', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cikisiYapilanUrunler.html'));
});

// Satış ekranı sayfası
app.get('/satisEkrani', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'satisEkrani.html'));
});

// Ürün bilgi giriş sayfası
app.get('/urunBilgiGiris', (req, res) => {
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


// sepet listele
app.get('/api/urunler/sepet', (req, res) => {
    db.all('SELECT * FROM vw_sepet ORDER BY barkodno', (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});


// sepete urun ekle
app.post('/api/urunler/sepet', (req, res) => {
    const { sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama } = req.body;

    // Gelen verileri kontrol et
    console.log('Gelen veri:', { sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama });

    if (!sBarkodNo || !satisAdet || !satisFiyati || !toplamTutar || !cikisTarihi || !aciklama) {
        return res.status(400).json({ error: 'Eksik veri' });
    }

    db.run('INSERT INTO sepet (sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama) VALUES (?, ?, ?, ?, ?, ?)', [sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama], function (err) {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json({ id: this.lastID });
    });
});

// sepet ürün silme işlemi
app.delete('/api/urunler/sepet/:sepetID', (req, res) => {
    const sepetID = req.params.sepetID;
    db.run('DELETE FROM sepet WHERE sepetID = ?', sepetID, function (err) {
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

// sepet ürün düzenleme işlemleri
app.put('/api/urunler/sepet/:sepetID', (req, res) => {
    const { sepetID } = req.params;
    const { barkodno, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama } = req.body;
    const sql = 'UPDATE sepet SET sBarkodNo = ?, satisAdet = ?, satisFiyati = ?, toplamTutar = ?, cikisTarihi = ?, aciklama = ? WHERE sepetID = ?';
    db.run(sql, [barkodno, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama, sepetID], function (err) {
        if (err) {
            console.log('Hata:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});


// sepet tüm ürünleri silme işlemi
app.delete('/api/products/sepet/satisiptal', (req, res) => {
    db.run('DELETE FROM sepet', function (err) {
        if (err) {
            console.error('Veritabani hatasi:', err.message);
            return res.status(500).json({ error: 'Veritabani hatasi' });
        }
        res.json({ message: 'Sepetteki tüm ürünler kaldirildi' });
    });
});


//sepetteki ürünlerin satisini yap
app.post('/api/productsclear/sepet/satis', (req, res) => {
    db.all('SELECT * FROM sepet', (err, rows) => {
        if (err) {
            console.error('Veritabanı hatası:', err.message);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Sepet boş' });
        }

        const insertQuery = 'INSERT INTO cikanUrun (cBarkodNo, cikanMiktar, satisFiyati, toplamTutar, cikisTarihi, aciklama) VALUES (?, ?, ?, ?, ?, ?)';
        const deleteQuery = 'DELETE FROM sepet';

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            rows.forEach(row => {
                const { sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama } = row;
                db.run(insertQuery, [sBarkodNo, satisAdet, satisFiyati, toplamTutar, cikisTarihi, aciklama], function (err) {
                    if (err) {
                        console.error('Veritabanı hatası:', err.message);
                        return res.status(500).json({ error: 'Veritabanı hatası' });
                    }
                });
            });
            db.run(deleteQuery, function (err) {
                if (err) {
                    console.error('Veritabanı hatası:', err.message);
                    return res.status(500).json({ error: 'Veritabanı hatası' });
                }
                db.run('COMMIT');
                res.json({ message: 'Ürünler başarıyla satıldı ve sepet boşaltıldı' });
            });
        });
    });
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


// excel dosyasına aktar
app.get('/api/excel/export', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'satis.xlsx');

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Excel dosyası bulunamadı.' });
        }

        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet('Sayfa1');

        const rows = [];
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            if (rowNumber === 1) return;

            const [ urunAdi, satisMiktar, birimi, satisFiyati, toplamTutar] = row.values;

            rows.push({
                urunAdi,
                satisMiktar,
                birimi,
                satisFiyati,
                toplamTutar
            });
        });

        res.json({ message: 'Veriler başarıyla aktarıldı.' });
    } catch (err) {
        console.error('Hata:', err);
        res.status(500).json({ error: 'İşlem sırasında hata oluştu.' });
    }
});



app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});