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
