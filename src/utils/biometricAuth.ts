/**
 * Biometric Authentication Manager (WebAuthn + Platform Fingerprint / Touch ID)
 *
 * Implements hardware-backed biometric authentication (fingerprint, Touch ID, Face ID, Windows Hello)
 * using the W3C Web Authentication API (WebAuthn PublicKeyCredential) with graceful fallbacks
 * and zero-exception resilience for sandboxed/cross-origin iframe environments.
 */

import { User } from '../types';

export interface BiometricProfile {
  userId: string;
  userName: string;
  credentialId?: string;
  enrolledAt: string;
  deviceType: 'platform_fingerprint' | 'touch_id' | 'windows_hello' | 'webauthn_passkey' | 'simulated';
}

const STORAGE_KEY = 'rofani_enrolled_biometrics';

// Safe helper to read enrolled biometrics from localStorage
export function getEnrolledBiometrics(): Record<string, BiometricProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Save enrolled biometrics to localStorage
export function saveEnrolledBiometrics(data: Record<string, BiometricProfile>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[BiometricAuth] Failed to persist biometric profile to storage:', err);
  }
}

// Check if a specific user has enrolled biometrics
export function isUserBiometricEnrolled(userId: string): boolean {
  const all = getEnrolledBiometrics();
  return Boolean(all[userId]);
}

// Enroll a user for biometric fingerprint authentication
export function enrollUserBiometric(user: User, deviceType: BiometricProfile['deviceType'] = 'platform_fingerprint'): BiometricProfile {
  const all = getEnrolledBiometrics();
  const profile: BiometricProfile = {
    userId: user.id,
    userName: user.name,
    enrolledAt: new Date().toISOString(),
    deviceType,
  };
  all[user.id] = profile;
  saveEnrolledBiometrics(all);
  return profile;
}

// Remove biometric enrollment for a user
export function unenrollUserBiometric(userId: string): void {
  const all = getEnrolledBiometrics();
  delete all[userId];
  saveEnrolledBiometrics(all);
}

/**
 * Check if the current browser environment supports native WebAuthn platform biometrics
 */
export async function checkNativeBiometricSupport(): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
  reason?: string;
}> {
  if (typeof window === 'undefined') {
    return { supported: false, platformAuthenticator: false, reason: 'Window not defined (SSR)' };
  }

  if (!window.PublicKeyCredential) {
    return { supported: false, platformAuthenticator: false, reason: 'WebAuthn is not supported by this browser' };
  }

  try {
    const hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      supported: true,
      platformAuthenticator: hasPlatform,
    };
  } catch (err: any) {
    return {
      supported: true,
      platformAuthenticator: false,
      reason: err?.message || 'Error checking platform authenticator',
    };
  }
}

/**
 * Attempt to register a real hardware biometric credential via WebAuthn
 */
export async function registerNativeBiometricCredential(user: User): Promise<{
  success: boolean;
  credentialId?: string;
  error?: string;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    // Graceful fallback to software/simulated enrollment
    enrollUserBiometric(user, 'simulated');
    return { success: true, credentialId: `sim-${user.id}` };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new Uint8Array(user.id.split('').map((c) => c.charCodeAt(0)));

    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'ROFANI POS Terminal',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userIdBytes,
        name: user.email || user.name.toLowerCase().replace(/\s+/g, '.'),
        displayName: user.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        requireResidentKey: false,
      },
      timeout: 30000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: createOptions,
    })) as PublicKeyCredential | null;

    if (credential) {
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const profile = enrollUserBiometric(user, 'platform_fingerprint');
      profile.credentialId = credId;
      const all = getEnrolledBiometrics();
      all[user.id] = profile;
      saveEnrolledBiometrics(all);

      return { success: true, credentialId: credId };
    } else {
      // Fallback
      enrollUserBiometric(user, 'simulated');
      return { success: true, credentialId: `sim-${user.id}` };
    }
  } catch (err: any) {
    console.warn('[BiometricAuth] Native WebAuthn registration skipped or failed:', err);
    // If the browser blocked WebAuthn (e.g. cross-origin iframe or permission denied),
    // we still enroll the user in application-level biometric mode so they can use the fingerprint scanner
    enrollUserBiometric(user, 'simulated');
    return { success: true, credentialId: `fallback-${user.id}` };
  }
}

/**
 * Authenticate with biometric fingerprint
 * Attempts native WebAuthn first. If unavailable, returns fallback trigger so UI can present the interactive fingerprint scanner.
 */
export async function authenticateNativeBiometric(targetUser?: User | null): Promise<{
  success: boolean;
  authenticatedUserId?: string;
  error?: string;
  usedNativeWebAuthn: boolean;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn not supported', usedNativeWebAuthn: false };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || 'localhost',
      userVerification: 'preferred',
      timeout: 30000,
    };

    // If target user has a specific credential, include allowCredentials
    if (targetUser) {
      const enrolled = getEnrolledBiometrics()[targetUser.id];
      if (enrolled?.credentialId && !enrolled.credentialId.startsWith('sim-') && !enrolled.credentialId.startsWith('fallback-')) {
        try {
          const rawId = Uint8Array.from(atob(enrolled.credentialId), (c) => c.charCodeAt(0));
          getOptions.allowCredentials = [
            {
              id: rawId,
              type: 'public-key',
              transports: ['internal'],
            },
          ];
        } catch {
          // Ignore parse errors and let the platform pick
        }
      }
    }

    const assertion = (await navigator.credentials.get({
      publicKey: getOptions,
    })) as PublicKeyCredential | null;

    if (assertion) {
      return {
        success: true,
        authenticatedUserId: targetUser?.id,
        usedNativeWebAuthn: true,
      };
    }

    return { success: false, error: 'No credential returned', usedNativeWebAuthn: true };
  } catch (err: any) {
    // e.g. NotAllowedError (user cancelled), SecurityError, etc.
    return {
      success: false,
      error: err?.message || 'Biometric authentication cancelled or not available',
      usedNativeWebAuthn: false,
    };
  }
}
