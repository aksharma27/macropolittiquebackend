// backend/routes/contactRoutes.js
import express from 'express';
import { sendContactMessage } from '../controller/contactController.js';

const Contactrouter = express.Router();

Contactrouter.post('/', sendContactMessage);

export default Contactrouter;