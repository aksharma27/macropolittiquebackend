// backend/routes/contactRoutes.js
import express from 'express';
import { sendContactEmail } from '../controller/contactController.js';

const Contactrouter = express.Router();

Contactrouter.post('/', sendContactEmail);

export default Contactrouter;