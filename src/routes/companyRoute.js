// import { Router } from 'express';
// import {
//   createCompany,
//   getCompanies,
//   getCompanyById,company.controller.js
//   updateCompany,
//   deleteCompany,
//   restoreCompany
//   // getCompanyStats
// } from '../controller/companyController.js';

// // import { companyValidation, validate, validateQuery, validateParams } from '../middleware/validation.js';
// import { uploadLogo, handleMulterError } from '../config/multer.js';
// import { verifyJWT, checkCompanyExists } from '../middleware/auth.js';

// const router = Router();

// router.post('/create/company', verifyJWT, checkCompanyExists, uploadLogo, handleMulterError, createCompany);

// router.get('/get-all/companys', getCompanies);
// // router.get('/stats', getCompanyStats);
// router.get('/get/company/:id', getCompanyById );
// router.put('/update/company/:id', uploadLogo, handleMulterError, updateCompany);
// router.delete('/delete/company/:id', deleteCompany);
// router.patch('/restore/company/:id', restoreCompany);
// export default router;

import { Router } from 'express';
import { verifyJWT, checkCompanyExists } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  restoreCompany,
  uploadSignature as uploadSignatureController,
} from '../controller/companyController.js';
import { companyValidation } from '../validations/company.validation.js';
import {
  uploadLogo,
  uploadSignature,
  handleMulterError,
} from '../config/multer.js';

const router = Router();

router.get('/get-all/companies', verifyJWT, getCompanies);
router.get('/get/company/:id', verifyJWT, getCompanyById);
router.post(
  '/create/company',
  verifyJWT,
  checkCompanyExists,
  uploadLogo,
  handleMulterError,
  validate(companyValidation.create),
  createCompany
);
router.put(
  '/update/company/:id',
  verifyJWT,
  uploadLogo,
  handleMulterError,
  validate(companyValidation.update),
  updateCompany
);

router.put(
  '/upload-signature/:id',
  verifyJWT,
  uploadSignature,
  handleMulterError,
  uploadSignatureController
);

export default router;
