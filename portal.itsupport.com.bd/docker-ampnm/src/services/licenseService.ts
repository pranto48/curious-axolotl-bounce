import { v4 as uuidv4 } from 'uuid';
import { showError } from '@/utils/toast';

interface AppConfig {
  LICENSE_API_URL: string;
  APP_LICENSE_KEY: string;
}

interface LicenseVerificationResponse {
  success: boolean;
  message: string;
  max_devices?: number;
  actual_status?: string;
}

export const getAppConfig = async (): Promise<AppConfig> => {
  const response = await fetch('/api.php?action=get_app_config');
  if (!response.ok) {
    throw new Error('Failed to fetch app configuration.');
  }
  return response.json();
};

export const getInstallationId = (): string => {
  let installationId = localStorage.getItem('ampnm_installation_id');
  if (!installationId) {
    installationId = uuidv4();
    localStorage.setItem('ampnm_installation_id', installationId);
  }
  return installationId;
};

export const verifyLicense = async (
  config: AppConfig,
  currentDeviceCount: number
): Promise<{ isLicensed: boolean; maxDevices: number; status: string }> => {
  if (!config.LICENSE_API_URL || !config.APP_LICENSE_KEY) {
    showError('License API URL or Key is not configured in the application environment.');
    return { isLicensed: false, maxDevices: 0, status: 'unconfigured' };
  }

  const installationId = getInstallationId();

  try {
    const response = await fetch(config.LICENSE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_license_key: config.APP_LICENSE_KEY,
        user_id: '1', // Placeholder: In a multi-user AMPNM, this would be the logged-in user's ID
        current_device_count: currentDeviceCount,
        installation_id: installationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: LicenseVerificationResponse = await response.json();

    if (data.success) {
      return { isLicensed: true, maxDevices: data.max_devices || 0, status: 'active' };
    } else {
      showError(`License check failed: ${data.message}`);
      return { isLicensed: false, maxDevices: data.max_devices || 0, status: data.actual_status || 'invalid' };
    }
  } catch (error: any) {
    console.error('License verification failed:', error);
    showError(`Failed to verify license with portal: ${error.message}. Please check your network and license configuration.`);
    return { isLicensed: false, maxDevices: 0, status: 'network_error' };
  }
};