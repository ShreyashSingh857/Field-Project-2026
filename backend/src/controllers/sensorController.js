import { supabaseAdmin } from '../config/supabase.js';
import { sendWhatsAppSafely } from '../services/whatsappService.js';

const BIN_ALERT_THRESHOLD = 80;

function crossedThreshold(previousFill, nextFill, threshold) {
  const prev = Number(previousFill ?? 0);
  const next = Number(nextFill ?? 0);
  return prev < threshold && next >= threshold;
}

async function notifyWorkersForBinAlert(bin, nextFill) {
  if (!bin?.village_id) return;

  let query = supabaseAdmin
    .from('workers')
    .select('id,name,phone')
    .eq('is_active', true)
    .eq('village_id', bin.village_id)
    .not('phone', 'is', null)
    .limit(10);

  if (bin.assigned_panchayat_id) {
    query = query.eq('assigned_area', bin.assigned_panchayat_id);
  }

  const { data: workers, error } = await query;
  if (error) throw error;

  await Promise.all((workers || []).map((worker) => {
    if (!worker.phone) return Promise.resolve();
    return sendWhatsAppSafely({
      to: worker.phone,
      body: `Bin alert: ${bin.label || bin.id} has reached ${nextFill}% fill level. Please schedule pickup.`,
      tag: 'bin-fill-alert',
    });
  }));
}

function getSensorKey(req) {
  return String(req.headers['x-sensor-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || '').trim();
}

function getSensorSecret() {
  if (!process.env.SENSOR_API_KEY) throw new Error('SENSOR_API_KEY is not set');
  return process.env.SENSOR_API_KEY;
}

function clampFillLevel(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export async function ingestBinReading(req, res) {
  try {
    if (getSensorKey(req) !== getSensorSecret()) {
      return res.status(401).json({ error: 'Invalid sensor key' });
    }

    const { bin_id, sensor_device_id, fill_level, measured_distance_cm, battery_pct, signal_rssi, timestamp } = req.body || {};
    const normalizedFill = clampFillLevel(fill_level);
    if (normalizedFill == null && measured_distance_cm == null) {
      return res.status(400).json({ error: 'fill_level or measured_distance_cm is required' });
    }

    let query = supabaseAdmin.from('bins').select('id,label,fill_level,sensor_device_id,last_sensor_update,assigned_panchayat_id,village_id').limit(1);
    if (bin_id) query = query.eq('id', bin_id);
    else if (sensor_device_id) query = query.eq('sensor_device_id', sensor_device_id);
    else return res.status(400).json({ error: 'bin_id or sensor_device_id is required' });

    const { data: bin, error: binError } = await query.maybeSingle();
    if (binError) throw binError;
    if (!bin) return res.status(404).json({ error: 'Bin not found' });

    const nextFill = normalizedFill ?? Number(bin.fill_level ?? 0);
    const thresholdCrossed = crossedThreshold(bin.fill_level, nextFill, BIN_ALERT_THRESHOLD);
    const updatePayload = {
      fill_level: nextFill,
      last_sensor_update: timestamp || new Date().toISOString(),
      sensor_device_id: sensor_device_id || bin.sensor_device_id || null,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('bins')
      .update(updatePayload)
      .eq('id', bin.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    if (thresholdCrossed) {
      await notifyWorkersForBinAlert(bin, nextFill);
    }

    return res.json({
      ok: true,
      bin: updated,
      reading: {
        bin_id: bin.id,
        sensor_device_id: updatePayload.sensor_device_id,
        fill_level: nextFill,
        measured_distance_cm: measured_distance_cm != null ? Number(measured_distance_cm) : null,
        battery_pct: battery_pct != null ? Number(battery_pct) : null,
        signal_rssi: signal_rssi != null ? Number(signal_rssi) : null,
        timestamp: updatePayload.last_sensor_update,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to ingest reading' });
  }
}

export async function listSensorBins(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bins')
      .select('id,label,fill_level,fill_status,location_lat,location_lng,location_address,sensor_device_id,last_sensor_update,assigned_panchayat_id,village_id,is_active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ bins: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch sensor bins' });
  }
}