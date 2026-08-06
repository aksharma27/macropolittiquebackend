import Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

// Configure API key authorization
const apiKey = Brevo.ApiClient.instance.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Create an instance of the transactional emails API
const apiInstance = new Brevo.TransactionalEmailsApi();

export default apiInstance;