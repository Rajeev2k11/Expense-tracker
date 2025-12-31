import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Key, Shield, Fingerprint } from 'lucide-react';
import { selectMfaMethod, verifyMfaSetup } from '../../features/mfaSetup/mfaSetupSlice';
import type { AppDispatch, RootState } from '@/store';

const Passkey: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { challengeId, options, loading } = useSelector(
    (state: RootState) => state.mfaSetup
  );

  const isWebAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  useEffect(() => {
    if (!challengeId) {
      console.warn('No challengeId available');
    }
  }, [challengeId]);

  // Helper to convert base64url to Uint8Array
  const base64urlToUint8Array = (base64url: string): Uint8Array => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Helper to convert Uint8Array to base64url
  const uint8ArrayToBase64url = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const handleCreatePasskey = async () => {
    if (!challengeId) {
      setError('Challenge ID not found. Please complete the setup process first.');
      return;
    }

    if (!window.PublicKeyCredential) {
      setError('WebAuthn is not supported in this browser. Please use a modern browser.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const isPlatformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!isPlatformAuthenticatorAvailable) {
        setError(
          'No platform authenticator available. Please set up biometric authentication or use a security key.'
        );
        setIsCreating(false);
        return;
      }

      // Step 1: Fetch passkey options from server
      let passkeyOptions = options?.options;
      let currentChallengeId = challengeId;
      
      if (!passkeyOptions) {
        console.log('Fetching passkey options from server...');
        const result = await dispatch(selectMfaMethod({ 
          challengeId, 
          mfaMethod: 'PASSKEY' 
        })).unwrap();
        
        passkeyOptions = result.options;
        currentChallengeId = result.challengeId;
        
        console.log('Received passkey options and challengeId');
      }

      if (!passkeyOptions) {
        throw new Error('Failed to get passkey options from server');
      }

      if (!currentChallengeId) {
        throw new Error('Challenge ID not received from server');
      }

      console.log('Passkey options received:', passkeyOptions);

      // Step 2: Convert options for WebAuthn API
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        rp: passkeyOptions.rp,
        user: {
          id: base64urlToUint8Array(passkeyOptions.user.id),
          name: passkeyOptions.user.name,
          displayName: passkeyOptions.user.displayName,
        },
        challenge: base64urlToUint8Array(passkeyOptions.challenge),
        pubKeyCredParams: passkeyOptions.pubKeyCredParams,
        timeout: passkeyOptions.timeout,
        authenticatorSelection: passkeyOptions.authenticatorSelection,
        attestation: passkeyOptions.attestation,
      };

      // Handle excludeCredentials if present
      if (passkeyOptions.excludeCredentials && passkeyOptions.excludeCredentials.length > 0) {
        publicKeyOptions.excludeCredentials = passkeyOptions.excludeCredentials.map((cred: any) => ({
          id: base64urlToUint8Array(cred.id),
          type: cred.type,
          transports: cred.transports || [],
        }));
      }

      console.log('Creating WebAuthn credential...');
      
      // Step 3: Create the passkey
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create passkey');
      }

      console.log('Passkey created successfully');

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Step 4: Format credential for server (@simplewebauthn/server format)
      const credentialForServer = {
        id: credential.id,
        rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
        response: {
          clientDataJSON: uint8ArrayToBase64url(new Uint8Array(response.clientDataJSON)),
          attestationObject: uint8ArrayToBase64url(new Uint8Array(response.attestationObject)),
          transports: (response as any).getTransports?.() || [],
        },
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
        authenticatorAttachment: (credential as any).authenticatorAttachment || undefined,
      };

      console.log('Sending credential to server for verification...');

      // Step 5: Verify with server using the new API
      const result = await dispatch(verifyMfaSetup({
        challengeId: currentChallengeId,
        credential: credentialForServer,
      })).unwrap();

      console.log('Passkey verified successfully:', result);
      
      // Success - navigate to success page
      navigate('/mfa/success');

    } catch (err: any) {
      console.error('Error creating passkey:', err);
      
      // Handle Redux rejection errors
      if (err.message && typeof err.message === 'string') {
        setError(err.message);
      } else if (err instanceof Error) {
        // Browser WebAuthn errors
        if (err.name === 'NotAllowedError') {
          setError('Passkey creation was cancelled or not allowed.');
        } else if (err.name === 'NotSupportedError') {
          setError('Your device does not support passkeys.');
        } else if (err.name === 'InvalidStateError') {
          setError('A passkey already exists for this device.');
        } else if (err.name === 'AbortError') {
          setError('Passkey creation timed out. Please try again.');
        } else if (err.name === 'SecurityError') {
          setError('Security error. Please ensure you are on a secure connection (HTTPS).');
        } else {
          setError(err.message || 'Failed to create passkey. Please try again.');
        }
      } else {
        setError('Failed to create passkey. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-2xl">
                <Key className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Set Up Passkey Authentication
            </h1>
            <p className="text-gray-600">
              Secure your expense data with biometric authentication. Fast, secure, and passwordless.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Enhanced Security</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Passkeys use advanced cryptography to protect your financial data from unauthorized access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Fingerprint className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Quick Access</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Sign in instantly using your fingerprint, Face ID, or device PIN—no passwords needed.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreatePasskey}
            disabled={isCreating || loading || !challengeId || !isWebAuthnSupported}
            className={`w-full py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm ${
              isCreating || loading || !challengeId || !isWebAuthnSupported
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isCreating || loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loading ? 'Loading...' : 'Creating Passkey...'}
              </span>
            ) : (
              'Create Passkey'
            )}
          </button>

          {!isWebAuthnSupported && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 text-center">
                WebAuthn is not supported in your browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              How to set up Passkey
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
              <li>Click the "Create Passkey" button below</li>
              <li>Follow your device's prompt to create a passkey</li>
              <li>Use your fingerprint, face, or security key to authenticate</li>
              <li>Your passkey will be securely saved to your device</li>
            </ol>
            <p className="text-xs text-gray-600 mt-3">
              Your expense tracker account will be protected by your device's security features, 
              making it virtually impossible for others to access your financial information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Passkey;

