# WebGIS Monitoring Pipa Sewerage - Banjardowo dan Genuksari

Dashboard statis (Leaflet) yang membaca dua file di folder `data/`:

- `data/v_lateral_pipe.geojson`
- `data/v_manhole.geojson`

## Cara memperbarui data
1. Di QGIS, klik kanan layer `v_lateral_pipe` > Export > Save Features As.
   Format GeoJSON, CRS EPSG:4326, nama file `v_lateral_pipe.geojson`.
2. Ulangi untuk `v_manhole` dengan nama `v_manhole.geojson`.
3. Di GitHub: buka folder `data` > Add file > Upload files > seret kedua file
   (nama harus sama persis agar menimpa file lama) > Commit changes.
4. Tunggu 1-2 menit, lalu muat ulang halaman dashboard (Ctrl+F5).

## Catatan
- Manhole paket sebelah ditandai kolom `is_reference` di database (atau daftar `REF` di index.html).
- Kolom yang dipakai dashboard: pipe_id, pipe_type, method, material, diameter_mm, zone,
  location_name, length_m, slope_pct, stage_label, progress_pct (pipa); manhole_id, mh_type, zone,
  location_name, diameter_mm, depth_m, shaft, stage_label, progress_pct, plan_date, actual_date (manhole).
- Halaman GitHub Pages bersifat publik: siapa pun yang punya alamatnya bisa melihat peta dan datanya.
