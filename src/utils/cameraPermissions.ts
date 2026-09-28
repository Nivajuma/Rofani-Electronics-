// Camera Auto-Authorization & Persistent Permissions Utility for Rofani POS

export type CameraPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

const AUTO_CAMERA_STORAGE_KEY = 'rofani_auto_camera_startup';

/**
 * Check if the user has enabled automatic camera pre-authorization on app launch
 */
export const isAutoCameraAllowedOnStartup = (): boolean => {
  try {
    const val = localStorage.getItem(AUTO_CAMERA_STORAGE_KEY);
    // Defaults to true so users get automatic camera readiness
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

/**
 * Save user preference for automatic camera authorization
 */
export const setAutoCameraAllowedOnStartup = (enabled: boolean): void => {
  try {
    localStorage.setItem(AUTO_CAMERA_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save auto camera preference:', e);
  }
};

/**
 * Check the current browser camera permission status without triggering a prompt
 */
export const getCameraPermissionStatus = async (): Promise<CameraPermissionState> => {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'unsupported';
  }
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'camera' as any });
    return permissionStatus.state as CameraPermissionState;
  } catch (e) {
    // Some browsers (like older Safari) throw when querying 'camera'
    return 'unsupported';
  }
};

/**
 * Request camera access to prompt the browser to save "Always Allow" permission for Rofani.
 * Once granted by the user, the browser stores this permission for the domain.
 */
export const requestPersistentCameraAccess = async (): Promise<{
  success: boolean;
  status: CameraPermissionState;
  errorMessage?: string;
}> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      success: false,
      status: 'unsupported',
      errorMessage: 'Camera API is not supported on this browser or device.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });

    // Immediately stop tracks so camera hardware light turns off
    stream.getTracks().forEach((track) => track.stop());

    return {
      success: true,
      status: 'granted',
    };
  } catch (err: any) {
    console.warn('Camera permission request error:', err);
    let status: CameraPermissionState = 'denied';
    let errorMessage = err.message || 'Camera permission was not granted.';

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      status = 'denied';
      errorMessage = 'Camera access was denied in browser settings.';
    } else if (err.name === 'NotFoundError') {
      errorMessage = 'No camera found on this device.';
    }

    return {
      success: false,
      status,
      errorMessage,
    };
  }
};

/**
 * Detect device environment helpers
 */
export const isIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const isStandalonePwa = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isInsideIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};
