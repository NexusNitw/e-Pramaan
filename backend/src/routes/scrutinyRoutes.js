import express from 'express';
import {
  orchestrateScrutiny,
  getAuditHistory,
  exportScrutinyReportPdf,
} from '../controllers/scrutinyController.js';

const router = express.Router();

router.post('/orchestrate/:id', orchestrateScrutiny);
router.get('/audit/:id', getAuditHistory);
router.get('/application/:id/export-pdf', exportScrutinyReportPdf);

export default router;

