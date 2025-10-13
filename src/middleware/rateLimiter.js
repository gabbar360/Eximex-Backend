import rateLimit from 'express-rate-limit';
import { ApiResponse, statusCodes } from '../utils/ApiResponse.js';

// export const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
//   message: {
//     status: 'error',
//     message: statusCodes[429],
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5,
//   message: {
//     status: 'error',
//     message: statusCodes[429],
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// API rate limiter
// export const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // limit each IP to 50 requests per windowMs
//   message: {
//     status: 'error',
//     message: statusCodes[429],
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
