import express from 'express';
import {
  createInstitution,
  getInstitutions,
  getInstitutionById,
} from '../controllers/institutionController.js';

const router = express.Router();

router.route('/')
  .get(getInstitutions)
  .post(createInstitution);

router.route('/:id')
  .get(getInstitutionById);

export default router;
