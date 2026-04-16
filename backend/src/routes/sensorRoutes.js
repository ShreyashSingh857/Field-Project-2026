import { Router } from 'express';
import { ingestBinReading, listSensorBins } from '../controllers/sensorController.js';

const router = Router();

router.get('/bins', listSensorBins);
router.post('/bin-reading', ingestBinReading);

export default router;