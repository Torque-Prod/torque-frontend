import { Capacitor } from '@capacitor/core';

const MOBILE_API_ORIGIN = 'http://192.168.68.87:8080';

export const API_BASE_URL = Capacitor.isNativePlatform() ? MOBILE_API_ORIGIN : '';
