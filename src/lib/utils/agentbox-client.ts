import axios from 'axios';
import { AGENTBOX_API_URL, AGENTBOX_API_VERSION } from '../constants';
import env from '@/config/env';

const agentboxClient = axios.create({
  baseURL: AGENTBOX_API_URL,
  params: {
    version: AGENTBOX_API_VERSION,
  },
  headers: {
    'X-API-Key': env.AGENTBOX_API_KEY,
    'X-Client-ID': env.AGENTBOX_CLIENT_ID,
  },
});

export default agentboxClient;
