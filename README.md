# WebGIS Monitoring Pipa Sewerage CWIS 06 - Banjardowo dan Genuksari

Dashboard statis (Leaflet) yang membaca file GeoJSON di folder `data/`.

Wajib: `v_lateral_pipe.geojson`, `v_manhole.geojson`.
Opsional (layer akan otomatis muncul bila filenya ada): `house_inlet`, `inspection_chamber`,
`collecting_pipe`, `persil_pipe`, `zona`, `batas_rw` (semuanya `.geojson`, EPSG:4326).

## Memperbarui data
Cara tercepat di Windows: jalankan `update_dashboard.bat` (ekspor dari PostGIS lalu push ke GitHub).
Cara manual: ekspor layer dari QGIS ke GeoJSON (EPSG:4326, nama file sama persis), lalu di GitHub
buka folder `data` > Add file > Upload files > Commit. Tunggu 1-2 menit, muat ulang dengan Ctrl+F5.

## Catatan
- Halaman GitHub Pages bersifat publik, termasuk titik House Inlet. Pertimbangkan hal ini sebelum membagikan alamatnya.
- Manhole paket sebelah ditandai kolom `is_reference` atau daftar `REF` di index.html.
- Tombol GPS memerlukan izin lokasi dan alamat https (GitHub Pages sudah https).

## Perubahan tampilan (Okt 2026)
- Panel "Layer peta" dan "Peta dasar" berupa bagian yang bisa dilipat (default tertutup).
- Saat pertama dibuka hanya Pipa lateral, Manhole, dan Zona yang tampil.
- House inlet (SR, HI, HIP) tampil otomatis mulai zoom `HI_MINZ` (default 18, ubah di awal `<script>` index.html).
- Zoom tidak dibatasi (maks 28). Tile OSM/Esri diperbesar otomatis di atas zoom 19.
- Urutan tumpuk dari bawah: Poligon (zona, RW), Polyline (persil, collecting), Line (pipa lateral), Point (house inlet, inspection chamber, manhole). Manhole selalu paling atas dan area kliknya diperlebar.
- Peta dasar (panel "Peta dasar"): OpenStreetMap, CARTO terang, citra satelit Esri, atau tanpa peta dasar.

## Struktur file
- `index.html` kerangka halaman
- `css/style.css` seluruh tampilan (warna, huruf, tata letak, mode gelap)
- `js/app.js` logika peta, filter, dan popup
- `data/*.geojson` hasil ekspor database
