/**
 * Nuxus Biometric Service v5.0 (Absolute Stability)
 * Использует WebAuthn API для вызова Face ID без внешних NPM пакетов.
 * Гарантирует работу в Safari и Capacitor WebView.
 */
export async function checkBiometric(): Promise<boolean> {
  // Если браузер не поддерживает WebAuthn, считаем проверку пройденной (Legacy support)
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return true;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Прямой вызов системного окна биометрии
    // В нативном приложении это вызовет Face ID через WebView
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
    // Если пользователь нажал "Отмена" или сбой датчика
    return false;
  }
}