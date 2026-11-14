const encoder = new TextEncoder();

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function joinBytes(...values: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(values.reduce((length, value) => length + value.length, 0));
  let offset = 0;
  for (const value of values) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}

export function isValidPushEndpoint(value: string): boolean {
  try {
    const endpoint = new URL(value);
    const hostname = endpoint.hostname.toLowerCase();
    return endpoint.protocol === 'https:' && (
      hostname === 'fcm.googleapis.com' ||
      hostname === 'push.apple.com' ||
      hostname.endsWith('.push.apple.com') ||
      hostname === 'push.services.mozilla.com' ||
      hostname.endsWith('.push.services.mozilla.com') ||
      hostname.endsWith('.notify.windows.com')
    );
  } catch {
    return false;
  }
}

async function deriveHkdf(
  inputKey: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', inputKey, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt,
    info,
  }, key, length * 8);
  return new Uint8Array(bits);
}

async function createVapidAuthorization(endpoint: URL, publicKey: string, privateKey: string, subject: string): Promise<string> {
  const publicBytes = decodeBase64(publicKey);
  const privateBytes = decodeBase64(privateKey);
  if (publicBytes.length !== 65 || privateBytes.length !== 32 || publicBytes[0] !== 4) {
    throw new Error('VAPID key configuration is invalid');
  }

  const signingKey = await crypto.subtle.importKey('jwk', {
    kty: 'EC',
    crv: 'P-256',
    x: encodeBase64Url(publicBytes.slice(1, 33)),
    y: encodeBase64Url(publicBytes.slice(33, 65)),
    d: encodeBase64Url(privateBytes),
    ext: true,
    key_ops: ['sign'],
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = encodeBase64Url(encoder.encode(JSON.stringify({
    aud: endpoint.origin,
    exp: now + 12 * 60 * 60,
    sub: subject,
  })));
  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    encoder.encode(unsignedToken)
  );
  return `vapid t=${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}, k=${publicKey}`;
}

async function encryptPayload(
  payload: Uint8Array,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  const clientPublicKeyBytes = decodeBase64(p256dh);
  const authSecret = decodeBase64(auth);
  if (clientPublicKeyBytes.length !== 65 || clientPublicKeyBytes[0] !== 4 || authSecret.length === 0) {
    throw new Error('Push subscription encryption keys are invalid');
  }

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const generatedKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  if (!('publicKey' in generatedKeyPair)) {
    throw new Error('Could not generate push encryption key pair');
  }
  const exportedPublicKey = await crypto.subtle.exportKey('raw', generatedKeyPair.publicKey);
  if (!(exportedPublicKey instanceof ArrayBuffer)) {
    throw new Error('Could not export push encryption public key');
  }
  const serverPublicKey = new Uint8Array(exportedPublicKey);
  const ecdhParams: SubtleCryptoDeriveKeyAlgorithm & { public: CryptoKey } = {
    name: 'ECDH',
    public: clientPublicKey,
  };
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    ecdhParams,
    generatedKeyPair.privateKey,
    256
  ));

  const inputKeyMaterial = await deriveHkdf(
    sharedSecret,
    authSecret,
    joinBytes(encoder.encode('WebPush: info\0'), clientPublicKeyBytes, serverPublicKey),
    32
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentEncryptionKey = await deriveHkdf(
    inputKeyMaterial,
    salt,
    encoder.encode('Content-Encoding: aes128gcm\0'),
    16
  );
  const nonce = await deriveHkdf(
    inputKeyMaterial,
    salt,
    encoder.encode('Content-Encoding: nonce\0'),
    12
  );

  const aesKey = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, ['encrypt']);
  const plaintext = joinBytes(payload, new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    plaintext
  ));
  const recordSize = new Uint8Array([0, 0, 16, 0]);
  return joinBytes(salt, recordSize, new Uint8Array([serverPublicKey.length]), serverPublicKey, ciphertext);
}

export async function sendWebPush(
  endpointValue: string,
  p256dh: string,
  auth: string,
  payload: unknown,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<Response> {
  const endpoint = new URL(endpointValue);
  if (!isValidPushEndpoint(endpointValue)) {
    throw new Error('Push subscription endpoint is not a supported push service');
  }

  const authorization = await createVapidAuthorization(
    endpoint,
    vapidPublicKey,
    vapidPrivateKey,
    subject
  );
  const body = await encryptPayload(encoder.encode(JSON.stringify(payload)), p256dh, auth);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });
}
