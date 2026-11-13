# WebGIS Monitoring Pipa Sewerage CWIS 06 - Banjardowo dan Genuksari

Dashboard peta untuk memantau progres pekerjaan pipa lateral dan manhole sewerage Paket CWIS 06.
Dibangun dengan Leaflet, berjalan sepenuhnya di browser, dan dihosting gratis di GitHub Pages.
Datanya berasal dari database PostGIS yang diedit lewat QGIS, lalu diekspor menjadi file GeoJSON di folder `data/`.

Alamat dashboard: https://fiqri24rahmann.github.io/Dashboard-CWIS-06/
Repo: https://github.com/fiqri24rahmann/Dashboard-CWIS-06

Dokumen ini dibagi dua bagian:

- **Bagian A** untuk semua orang yang hanya ingin melihat dashboard.
- **Bagian B** untuk tim yang memperbarui data, termasuk cara menghubungkan komputer masing-masing.

---

# Bagian A. Menggunakan dashboard

Buka alamat dashboard di browser (Chrome, Edge, Firefox, atau Safari, di komputer maupun HP). Tidak perlu login atau instalasi apa pun.

## Fitur utama

| Fitur | Cara pakai |
|---|---|
| Cari | Ketik ID manhole atau pipa (misalnya `MHJ_06_0752`), nama jalan, atau material di kotak pencarian. Tekan `/` untuk langsung ke kotak cari. |
| Tampilan peta | Tombol **Metode** mewarnai pipa berdasarkan metode (Jacking atau Open Trench). Tombol **Progres** mewarnai berdasarkan persen progres. |
| Layer peta | Nyalakan atau matikan pipa lateral, manhole, pipa collecting, pipa persil, inspection chamber, house inlet, zona, dan batas RW. |
| Peta dasar | Pilih OpenStreetMap, CARTO terang, citra satelit Esri, **Ortofoto CWIS-06**, atau tanpa peta dasar. |
| Filter | Saring berdasarkan zona, kelas pipa (Primary, Secondary, Tertiary), dan status (belum mulai, berjalan, selesai). Tombol **Reset** mengembalikan semuanya. |
| Progres per zona | Klik satu zona untuk memfilter dan memperbesar peta ke zona itu. |
| Popup | Klik pipa atau manhole untuk melihat lokasi, elevasi, kedalaman, dan status progres. |
| GPS | Tombol lokasi di kanan atas peta menampilkan posisi Anda (butuh izin lokasi dari browser). |
| Tema | Tombol **Tema** mengganti mode terang atau gelap. |

## Tips

- **House inlet** (SR, HI, HIP) baru muncul setelah peta diperbesar sampai zoom 18, supaya peta tidak padat.
- Pipa yang lebih tebal menandakan kelas pipa yang lebih besar.
- Lingkaran putus-putus pada manhole menandakan manhole dari paket sebelah (referensi).
- Di HP, panel kontrol ada di bagian bawah. Tarik gagangnya ke atas untuk membuka panel, dan pakai tombol **Legenda** untuk melihat keterangan warna.
- Jika data tampak lama setelah ada pembaruan, muat ulang dengan **Ctrl+F5** (di HP: tutup tab lalu buka lagi).

## Catatan privasi

Halaman GitHub Pages bersifat publik, termasuk titik House Inlet. Pertimbangkan hal ini sebelum membagikan alamatnya.

---

# Bagian B. Memperbarui data (untuk tim pengelola)

## Cara kerja secara singkat

```
QGIS (edit layer di PostGIS)
   -> Save Edits
   -> update_dashboard.bat (ekspor ke data/*.geojson, lalu git push)
   -> GitHub Pages (dashboard terbarui dalam 1-2 menit)
```

Dashboard tidak membaca database secara langsung. Ia hanya membaca file GeoJSON yang diekspor oleh `update_dashboard.bat`.

## B1. Menghubungkan komputer Anda (sekali saja)

### Yang perlu dipasang

| Aplikasi | Kegunaan | Catatan |
|---|---|---|
| Git for Windows | Sinkron dengan GitHub | Unduh di git-scm.com |
| QGIS | Edit data dan menyediakan `ogr2ogr` untuk ekspor | Harus terpasang di `C:\Program Files\QGIS ...` |
| PostgreSQL (klien `psql`) | Menghitung ulang kolom otomatis sebelum ekspor | Harus terpasang di `C:\Program Files\PostgreSQL\<versi>`. Jika database ada di server lain, cukup pasang komponen Command Line Tools. |
| Akun GitHub | Akses ke repo | Minta pemilik repo menambahkan Anda sebagai collaborator dengan hak tulis (Settings > Collaborators). |

### Langkah 1: Ambil repo ke komputer Anda

Buka Command Prompt, lalu jalankan:

```bat
cd C:\Users\NAMA_ANDA
git clone https://github.com/fiqri24rahmann/Dashboard-CWIS-06.git
```

Saat pertama kali push, jendela login GitHub akan muncul. Login satu kali, dan Windows akan mengingatnya. Jika diminta password, gunakan **Personal Access Token** (GitHub > Settings > Developer settings > Personal access tokens), bukan password akun.

Atur nama dan email Git sekali saja, karena dipakai untuk setiap commit:

```bat
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### Langkah 2: Sambungkan ke database

Database yang dipakai adalah PostgreSQL/PostGIS dengan database `db_cwis06`, schema `sewer`.

1. Minta pengelola database untuk alamat server (host), port, nama user, dan password.
2. Buka `update_dashboard.bat` dengan Notepad, lalu sesuaikan blok pengaturan di bagian atas:

   ```bat
   set DB_HOST=localhost        rem ganti dengan alamat server jika database ada di komputer lain
   set DB_PORT=5432
   set DB_NAME=db_cwis06
   set DB_USER=postgres         rem ganti dengan nama user Anda
   set SRC_SRID=32749           rem jangan diubah (UTM 49S)
   ```

3. Lakukan hal yang sama untuk `setup_otomasi.bat` jika Anda yang akan memasang otomasi.
4. Di QGIS, tambahkan koneksi PostGIS: **Layer > Add Layer > Add PostGIS Layers > New**, isi host, port, database, user, dan password yang sama.

Jika database ada di komputer lain, komputer itu harus bisa diakses dari jaringan Anda (satu jaringan atau lewat VPN), dan PostgreSQL harus mengizinkan koneksi dari komputer Anda (`listen_addresses` dan `pg_hba.conf`). Hubungi pengelola database untuk ini.

### Langkah 3: Password database

Skrip tidak menyimpan password di dalam file. Ada dua cara:

- **Otomatis (disarankan):** buat file `%APPDATA%\postgresql\pgpass.conf` berisi satu baris:
  ```
  localhost:5432:db_cwis06:postgres:PASSWORD_ANDA
  ```
  Sesuaikan host dan user. Skrip akan membacanya sendiri.
- **Manual:** jika file itu tidak ada, skrip akan menanyakan password setiap dijalankan (input tersembunyi).

### Langkah 4: Pasang otomasi database (sekali per database, bukan per komputer)

Hanya **satu orang** yang perlu menjalankan ini, yaitu pengelola database, dan hanya sekali. Letakkan `otomasi_qgis.sql` dan `setup_otomasi.bat` satu folder, lalu klik dua kali `setup_otomasi.bat`.

Otomasi memasang trigger dan prosedur yang mengisi kolom otomatis (zona, RW, koordinat, panjang, node) dan memvalidasi tahap pekerjaan. Jika Anda hanya mengedit data, lewati langkah ini.

## B2. Alur kerja harian

1. Di QGIS, edit layer di schema `sewer`. Layer yang diedit adalah tabel dasarnya (misalnya `manhole` dan `lateral_pipe`), sedangkan yang ditampilkan di dashboard adalah view `v_manhole` dan `v_lateral_pipe`.
2. Klik **Save Edits**. Tanpa ini perubahan tidak masuk ke database, jadi dashboard tidak berubah.
3. Klik dua kali `update_dashboard.bat` di folder repo.
4. Skrip melakukan berurutan: sinkron dengan GitHub, menghitung ulang kolom otomatis, mengekspor semua layer ke `data/*.geojson`, commit, lalu push.
5. Tunggu 1-2 menit, buka dashboard, lalu tekan **Ctrl+F5**.

Aturan agar tidak bentrok:

- Jangan menjalankan `update_dashboard.bat` bersamaan dengan orang lain. Skrip selalu mengambil pembaruan terbaru dulu, tetapi dua orang yang mengekspor di waktu yang sama bisa menimbulkan konflik.
- Jika skrip berhenti dengan tulisan konflik, jangan lanjutkan. Hubungi pengelola repo.
- Pastikan semua orang mengedit **database yang sama**. Kalau tiap orang punya salinan database sendiri, data di GitHub akan saling menimpa.

## B3. Mengubah progres lewat tabel manhole

Progres manhole bisa diubah langsung di layer `manhole` di QGIS, tanpa upload staging.

| Kolom di `manhole` | Fungsi |
|---|---|
| `stage_code` | Tahap pekerjaan. Hanya kode sah yang diterima (lihat tabel di bawah). |
| `progress_pct` | Persen progres 0-100. |
| `plan_date`, `actual_date` | Tanggal rencana dan tanggal aktual. |

Kode tahap yang sah untuk manhole dan pipa:

| `stage_code` | Label |
|---|---|
| `belum_mulai` | Belum Mulai |
| `galian_shaft` | Galian Shaft |
| `jacking` | Jacking |
| `pemasangan_manhole` | Pemasangan Manhole |
| `pekerjaan_selesai` | Pekerjaan Selesai |

Aturan progres yang tampil di dashboard:

- Jika `progress_pct` diisi (bukan 0 dan bukan kosong), angka itulah yang tampil.
- Jika `progress_pct` kosong atau 0, progres mengikuti bobot standar tahap (`cum_weight` di tabel `ref_stage`).
- Mengganti `stage_code` tidak otomatis mengubah `progress_pct` yang sudah diisi manual. Kosongkan atau perbarui angkanya juga.
- Mengisi `stage_code` dengan kode yang tidak terdaftar akan ditolak saat Save Edits, dengan pesan "Tahap ... tidak sah".

Agar mudah dipakai di QGIS, atur form layer `manhole` (Properties > Attributes Form): `stage_code` dengan widget **Value Relation** ke layer `ref_stage` (Key `stage_code`, Value `stage_label`, filter `"asset_type" = 'manhole' AND "method" = 'ALL'`), `progress_pct` dengan widget **Range** 0-100, dan tanggal dengan widget **Date/Time**.

Catatan untuk pipa: `pipe_id` terisi otomatis dengan pola `from_mh>to_mh` saat data baru dibuat. Saat mengubah `pipe_id` secara manual, pastikan tetap cocok dengan pasangan manholenya.

## B4. Ortofoto (peta dasar dari TIFF)

TIFF tidak bisa ditampilkan langsung oleh browser, dan GitHub menolak file di atas 100 MB. Jadi TIFF diubah dulu menjadi tile gambar kecil.

1. Di QGIS: **Processing Toolbox > Raster tools > Generate XYZ tiles (Directory)**.
2. Isi: extent dari layer TIFF, zoom minimum 12 dan maksimum 20, format **JPG**, dan folder keluaran `tiles\ortho` di dalam folder repo.
3. Struktur hasilnya harus `tiles/ortho/{z}/{x}/{y}.jpg`. Dashboard meminta tepat format dan jalur ini.
4. Push tile secara manual, jangan lewat `update_dashboard.bat`, karena jumlahnya ribuan file:
   ```bat
   cd C:\Users\NAMA_ANDA\Dashboard-CWIS-06
   git add tiles/ortho/12 tiles/ortho/13 tiles/ortho/14 tiles/ortho/15
   git commit -m "Tile ortho zoom 12-15"
   git push
   ```
   Ulangi untuk zoom 16-17 dan 18-20.
5. Di dashboard, pilih **Peta dasar > Ortofoto CWIS-06**. Ortofoto tampil di atas OpenStreetMap, jadi area di luar cakupan TIFF tetap berlatar peta.

File `.tif` dan `.tiff` diabaikan oleh git (lihat `.gitignore`) supaya TIFF asli tidak ikut terunggah. Jika ukuran folder tile melebihi sekitar 500 MB, kurangi zoom maksimum.

## B5. Mengunggah perubahan selain data

`update_dashboard.bat` hanya meng-commit `data/*.geojson`, `index.html`, dan `README.md`. Perubahan pada `js/`, `css/`, `tiles/`, atau file skrip tidak ikut terkirim. Untuk itu, kirim manual:

```bat
cd C:\Users\NAMA_ANDA\Dashboard-CWIS-06
git add -A
git commit -m "Pesan perubahan"
git pull --rebase --autostash
git push
```

Agar otomatis, ganti baris `git add data/*.geojson index.html README.md` di `update_dashboard.bat` dengan `git add -A`.

## Struktur folder

```
Dashboard-CWIS-06/
  index.html              kerangka halaman
  css/style.css           tampilan (warna, huruf, mode gelap)
  js/app.js               logika peta, filter, popup
  data/*.geojson          hasil ekspor database (jangan diedit tangan)
  tiles/ortho/            tile ortofoto (z/x/y.jpg)
  otomasi_qgis.sql        trigger dan prosedur otomasi database
  setup_otomasi.bat       pasang otomasi (sekali, oleh pengelola database)
  update_dashboard.bat    ekspor data dan push ke GitHub
  .gitignore              mengabaikan *.tif dan *.tiff
```

## Data

Wajib ada: `v_lateral_pipe.geojson` dan `v_manhole.geojson`.
Opsional (layer muncul otomatis bila filenya ada): `house_inlet`, `inspection_chamber`, `collecting_pipe`, `persil_pipe`, `zona`, `batas_rw`. Semuanya `.geojson` dengan sistem koordinat EPSG:4326.

Cara manual tanpa skrip: ekspor layer dari QGIS ke GeoJSON (EPSG:4326, nama file sama persis), lalu di GitHub buka folder `data` > Add file > Upload files > Commit changes.
