import { Router } from 'express';
import { ingestBinReading, listSensorBins } from '../controllers/sensorController.js';
import { validateBody } from '../middleware/validateRequest.js';
import { sensorIngestSchema } from '../validation/schemas.js';

const router = Router();

router.get('/bins', listSensorBins);
router.post('/bin-reading', validateBody(sensorIngestSchema), ingestBinReading);

export default router;