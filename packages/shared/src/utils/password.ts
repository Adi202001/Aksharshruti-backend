// Password hashing utilities
// Note: In Cloudflare Workers, we use Web Crypto API

export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt-like approach with PBKDF2
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  // Combine salt and hash
  const combined = new Uint8Array(salt.length + hash.byteLength);
  combined.set(salt, 0);
  combined.set(new Uint8Array(hash), salt.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(hashedPassword), (c) => c.charCodeAt(0));

    // Extract salt and hash
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Hash the provided password with the same salt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );

    const newHash = new Uint8Array(hash);

    // Compare hashes
    if (storedHash.length !== newHash.length) return false;

    for (let i = 0; i < storedHash.length; i++) {
      if (storedHash[i] !== newHash[i]) return false;
    }

    return true;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
