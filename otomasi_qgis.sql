-- =====================================================================
-- OTOMASI DATABASE: edit di QGIS, klik Save Edits, kolom turunan terisi sendiri
-- Dijalankan SEKALI (aman diulang). Jalankan lewat setup_otomasi.bat,
-- atau tempel di DB Manager QGIS / pgAdmin.
--
-- Setelah ini, di QGIS Anda cukup menggambar atau mengubah objek:
--   * house_inlet        : isi hi_code (HIP / HI / SR). Status, kategori, in_scope,
--                          koordinat (x, y, lon, lat), zona, dan RW terisi otomatis.
--   * inspection_chamber : koordinat, zona, dan RW terisi otomatis.
--   * collecting_pipe    : panjang, koordinat awal-akhir, node terdekat, snapped,
--   * persil_pipe          zona, dan RW terisi otomatis.
--   * lateral_pipe       : pipe_id dibuat dari from_mh>to_mh, panjang as-to-as dan
--                          zona terisi bila kosong, tahap kerja divalidasi.
--   * manhole            : tahap kerja divalidasi, zona terisi bila kosong.
--   * ID baru house inlet, IC, collecting, dan persil dibuat otomatis.
-- =====================================================================

SET search_path = sewer, public;

-- 1. Urutan nomor untuk ID otomatis
CREATE SEQUENCE IF NOT EXISTS sewer.seq_hi;
CREATE SEQUENCE IF NOT EXISTS sewer.seq_ic;
CREATE SEQUENCE IF NOT EXISTS sewer.seq_cp;
CREATE SEQUENCE IF NOT EXISTS sewer.seq_pp;
CREATE SEQUENCE IF NOT EXISTS sewer.seq_lp;

SELECT setval('sewer.seq_hi', COALESCE((SELECT max(substr(hi_id, 4)::int)  FROM sewer.house_inlet        WHERE hi_id ~ '^HI-[0-9]+$'), 0) + 1, false);
SELECT setval('sewer.seq_ic', COALESCE((SELECT max(substr(ic_id, 4)::int)  FROM sewer.inspection_chamber WHERE ic_id ~ '^IC-[0-9]+$'), 0) + 1, false);
SELECT setval('sewer.seq_cp', COALESCE((SELECT max(substr(cp_id, 5)::int)  FROM sewer.collecting_pipe    WHERE cp_id ~ '^CP-N[0-9]+$'), 0) + 1, false);
SELECT setval('sewer.seq_pp', COALESCE((SELECT max(substr(pp_id, 5)::int)  FROM sewer.persil_pipe        WHERE pp_id ~ '^PP-N[0-9]+$'), 0) + 1, false);

ALTER TABLE sewer.house_inlet        ALTER COLUMN hi_id   SET DEFAULT ('HI-'   || lpad(nextval('sewer.seq_hi')::text, 5, '0'));
ALTER TABLE sewer.inspection_chamber ALTER COLUMN ic_id   SET DEFAULT ('IC-'   || lpad(nextval('sewer.seq_ic')::text, 4, '0'));
ALTER TABLE sewer.collecting_pipe    ALTER COLUMN cp_id   SET DEFAULT ('CP-N'  || lpad(nextval('sewer.seq_cp')::text, 4, '0'));
ALTER TABLE sewer.persil_pipe        ALTER COLUMN pp_id   SET DEFAULT ('PP-N'  || lpad(nextval('sewer.seq_pp')::text, 4, '0'));
-- pipa lateral: ID sementara, diganti trigger menjadi from_mh>to_mh
ALTER TABLE sewer.lateral_pipe       ALTER COLUMN pipe_id SET DEFAULT ('NEW-'  || nextval('sewer.seq_lp')::text);

-- 2. Daftar node jaringan (untuk mencari sambungan ujung garis)
CREATE OR REPLACE VIEW sewer.v_net_nodes AS
SELECT 'IC'::text AS node_type, ic_id AS node_id, geom FROM sewer.inspection_chamber
UNION ALL SELECT 'MH', manhole_id, geom FROM sewer.manhole
UNION ALL SELECT 'LP', pipe_id, geom FROM sewer.lateral_pipe;

-- Untuk pipa persil, house inlet ikut dihitung sebagai node
CREATE OR REPLACE VIEW sewer.v_net_nodes_p AS
SELECT node_type, node_id, geom FROM sewer.v_net_nodes
UNION ALL SELECT 'HI', hi_id, geom FROM sewer.house_inlet;

-- 3. House inlet
CREATE OR REPLACE FUNCTION sewer.trg_hi() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
    c := upper(trim(NEW.hi_code));
    IF c IS NULL OR c NOT IN ('HIP', 'HI', 'SR') THEN
        RAISE EXCEPTION 'Kode house inlet harus HIP, HI, atau SR (diisi: %)', NEW.hi_code;
    END IF;
    NEW.hi_code         := c;
    NEW.geom            := ST_Force2D(NEW.geom);
    NEW.hi_status       := CASE WHEN c = 'HIP' THEN 'potensi' ELSE 'terkonfirmasi' END;
    NEW.hi_kategori     := CASE c WHEN 'SR' THEN 'SR, disetujui dengan pipa dalam rumah'
                                  WHEN 'HI' THEN 'HI, disetujui tanpa pipa dalam rumah'
                                  ELSE 'Potensi, belum disurvey' END;
    NEW.has_inside_pipe := (c = 'SR');
    NEW.in_scope        := c IN ('HI', 'SR');
    NEW.x   := round(ST_X(NEW.geom)::numeric, 3);
    NEW.y   := round(ST_Y(NEW.geom)::numeric, 3);
    NEW.lon := round(ST_X(ST_Transform(NEW.geom, 4326))::numeric, 7);
    NEW.lat := round(ST_Y(ST_Transform(NEW.geom, 4326))::numeric, 7);
    NEW.coord_ok := true;
    NEW.zone_no  := sewer.zone_of(NEW.geom);
    NEW.rw_label := sewer.rw_of(NEW.geom);
    IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hi_derive ON sewer.house_inlet;
CREATE TRIGGER trg_hi_derive BEFORE INSERT OR UPDATE ON sewer.house_inlet
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_hi();

-- 4. Inspection chamber
CREATE OR REPLACE FUNCTION sewer.trg_ic() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.ic_type := COALESCE(NULLIF(trim(NEW.ic_type), ''), 'IC');
    NEW.geom := ST_Force2D(NEW.geom);
    NEW.x   := round(ST_X(NEW.geom)::numeric, 3);
    NEW.y   := round(ST_Y(NEW.geom)::numeric, 3);
    NEW.lon := round(ST_X(ST_Transform(NEW.geom, 4326))::numeric, 7);
    NEW.lat := round(ST_Y(ST_Transform(NEW.geom, 4326))::numeric, 7);
    NEW.coord_ok := true;
    NEW.zone_no  := sewer.zone_of(NEW.geom);
    NEW.rw_label := sewer.rw_of(NEW.geom);
    IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ic_derive ON sewer.inspection_chamber;
CREATE TRIGGER trg_ic_derive BEFORE INSERT OR UPDATE ON sewer.inspection_chamber
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_ic();

-- 5. Pipa collecting dan pipa persil (kolom turunan sama)
CREATE OR REPLACE FUNCTION sewer.trg_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    g geometry; s geometry; e geometry; m geometry;
    a record; b record;
BEGIN
    g := ST_LineMerge(ST_Force2D(NEW.geom));
    IF GeometryType(g) <> 'LINESTRING' THEN
        RAISE EXCEPTION 'Garis harus satu rangkaian yang tersambung (bukan beberapa potongan terpisah)';
    END IF;
    NEW.geom := g;
    s := ST_StartPoint(g);
    e := ST_EndPoint(g);
    m := ST_LineInterpolatePoint(g, 0.5);
    NEW.length_m  := round(ST_Length(g)::numeric, 3);
    NEW.n_vertex  := ST_NPoints(g);
    NEW.start_x   := round(ST_X(s)::numeric, 3);
    NEW.start_y   := round(ST_Y(s)::numeric, 3);
    NEW.end_x     := round(ST_X(e)::numeric, 3);
    NEW.end_y     := round(ST_Y(e)::numeric, 3);
    NEW.start_lon := round(ST_X(ST_Transform(s, 4326))::numeric, 7);
    NEW.start_lat := round(ST_Y(ST_Transform(s, 4326))::numeric, 7);
    NEW.end_lon   := round(ST_X(ST_Transform(e, 4326))::numeric, 7);
    NEW.end_lat   := round(ST_Y(ST_Transform(e, 4326))::numeric, 7);
    IF TG_TABLE_NAME = 'persil_pipe' THEN
        SELECT n.node_type, n.node_id, ST_Distance(n.geom, s) AS d INTO a
          FROM sewer.v_net_nodes_p n WHERE ST_DWithin(n.geom, s, 5) ORDER BY d, CASE n.node_type WHEN 'HI' THEN 0 WHEN 'IC' THEN 1 WHEN 'MH' THEN 2 ELSE 3 END LIMIT 1;
        SELECT n.node_type, n.node_id, ST_Distance(n.geom, e) AS d INTO b
          FROM sewer.v_net_nodes_p n WHERE ST_DWithin(n.geom, e, 5) ORDER BY d, CASE n.node_type WHEN 'HI' THEN 0 WHEN 'IC' THEN 1 WHEN 'MH' THEN 2 ELSE 3 END LIMIT 1;
    ELSE
        SELECT n.node_type, n.node_id, ST_Distance(n.geom, s) AS d INTO a
          FROM sewer.v_net_nodes n WHERE ST_DWithin(n.geom, s, 5) ORDER BY d, CASE n.node_type WHEN 'HI' THEN 0 WHEN 'IC' THEN 1 WHEN 'MH' THEN 2 ELSE 3 END LIMIT 1;
        SELECT n.node_type, n.node_id, ST_Distance(n.geom, e) AS d INTO b
          FROM sewer.v_net_nodes n WHERE ST_DWithin(n.geom, e, 5) ORDER BY d, CASE n.node_type WHEN 'HI' THEN 0 WHEN 'IC' THEN 1 WHEN 'MH' THEN 2 ELSE 3 END LIMIT 1;
    END IF;
    NEW.from_type := a.node_type;  NEW.from_id := a.node_id;  NEW.from_gap_m := round(a.d::numeric, 3);
    NEW.to_type   := b.node_type;  NEW.to_id   := b.node_id;  NEW.to_gap_m   := round(b.d::numeric, 3);
    NEW.snapped   := COALESCE(a.d <= 0.5, false) AND COALESCE(b.d <= 0.5, false);
    NEW.zone_no   := sewer.zone_of(m);
    NEW.rw_label  := sewer.rw_of(m);
    IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_cp_derive ON sewer.collecting_pipe;
CREATE TRIGGER trg_cp_derive BEFORE INSERT OR UPDATE ON sewer.collecting_pipe
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_line();
DROP TRIGGER IF EXISTS trg_pp_derive ON sewer.persil_pipe;
CREATE TRIGGER trg_pp_derive BEFORE INSERT OR UPDATE ON sewer.persil_pipe
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_line();

-- 6. Pipa lateral: ID dari hulu>hilir, panjang dan zona bila kosong, validasi tahap
CREATE OR REPLACE FUNCTION sewer.trg_lp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND (NEW.pipe_id IS NULL OR NEW.pipe_id LIKE 'NEW-%') THEN
        NEW.pipe_id := NEW.from_mh || '>' || NEW.to_mh;
    END IF;
    NEW.geom := ST_LineMerge(ST_Force2D(NEW.geom));
    IF NEW.length_as_to_as_m IS NULL THEN
        NEW.length_as_to_as_m := round(ST_Length(NEW.geom)::numeric, 3);
    END IF;
    IF NEW.zone IS NULL THEN
        NEW.zone := sewer.zone_of(ST_LineInterpolatePoint(NEW.geom, 0.5));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM sewer.ref_stage
                    WHERE asset_type = 'lateral_pipe' AND method = NEW.method
                      AND stage_code = NEW.stage_code) THEN
        RAISE EXCEPTION 'Tahap % tidak sah untuk pipa % (metode %). Pilihan: %',
            NEW.stage_code, NEW.pipe_id, NEW.method,
            (SELECT string_agg(stage_code, ', ' ORDER BY stage_order)
               FROM sewer.ref_stage WHERE asset_type = 'lateral_pipe' AND method = NEW.method);
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lp_derive ON sewer.lateral_pipe;
CREATE TRIGGER trg_lp_derive BEFORE INSERT OR UPDATE ON sewer.lateral_pipe
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_lp();

-- 7. Manhole: validasi tahap, zona bila kosong
CREATE OR REPLACE FUNCTION sewer.trg_mh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.geom := ST_Force2D(NEW.geom);
    IF NEW.zone IS NULL THEN
        NEW.zone := sewer.zone_of(NEW.geom);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM sewer.ref_stage
                    WHERE asset_type = 'manhole' AND method = 'ALL'
                      AND stage_code = NEW.stage_code) THEN
        RAISE EXCEPTION 'Tahap % tidak sah untuk manhole %. Pilihan: %',
            NEW.stage_code, NEW.manhole_id,
            (SELECT string_agg(stage_code, ', ' ORDER BY stage_order)
               FROM sewer.ref_stage WHERE asset_type = 'manhole' AND method = 'ALL');
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mh_check ON sewer.manhole;
CREATE TRIGGER trg_mh_check BEFORE INSERT OR UPDATE ON sewer.manhole
    FOR EACH ROW EXECUTE FUNCTION sewer.trg_mh();

-- 8. Hitung ulang semua kolom turunan (dipanggil update_dashboard.bat sebelum ekspor).
--    Berguna bila poligon zona atau RW, atau titik node, berubah.
CREATE OR REPLACE PROCEDURE sewer.refresh_all() LANGUAGE plpgsql AS $$
BEGIN
    UPDATE sewer.house_inlet        SET hi_code = hi_code;
    UPDATE sewer.inspection_chamber SET ic_type = ic_type;
    UPDATE sewer.collecting_pipe    SET cp_id   = cp_id;
    UPDATE sewer.persil_pipe        SET pp_id   = pp_id;
END $$;
