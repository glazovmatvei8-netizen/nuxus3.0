
/**
 * NUXUS BIOMETRIC SERVICE V81.0 (Pulse Protocol)
 * ОПТИМИЗИРОВАНО: Полная поддержка Face ID/Touch ID на iOS и Fingerprint/Face Unlock на Android.
 */
export async function checkBiometric(): Promise<boolean> {
  // Проверка поддержки WebAuthn (стандарт для биометрии в браузерах и WebView)
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    console.warn("Nuxus Kernel: Biometrics not supported on this platform.");
    return true; // Пропускаем для старых устройств без биометрии
  }

  try {
    const isNative = !!(window as any).Capacitor;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // В нативном приложении (Capacitor) это вызывает нативный диалог системы
    // На Android: вызовет Fingerprint/Face Unlock диалог Google.
    // На iOS: вызовет Face ID / Touch ID.
    const result = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Nuxus Kernel" },
        user: { 
          id: crypto.getRandomValues(new Uint8Array(16)), 
          name: "nuxus_user", 
          displayName: "Nuxus Node" 
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { 
          authenticatorAttachment: "platform",
          userVerification: "required" 
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    return !!result;
  } catch (error: any) {
    console.warn("Nuxus Biometric Signal Rejected:", error.name);
    return false;
  }
}
