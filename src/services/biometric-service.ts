
import { NativeBiometric } from 'capacitor-native-biometric';

/**
 * Nuxus Biometric Service v4.0
 * Использует аппаратный чип Secure Enclave через NativeBiometric плагин.
 */
export async function checkBiometric(): Promise<boolean> {
  // Если мы не в Capacitor (Web/PWA), пропускаем аппаратную проверку
  if (typeof window === 'undefined' || !(window as any).Capacitor) {
    return true;
  }

  try {
    // 1. Проверяем доступность аппаратной биометрии
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) {
      console.warn("Nuxus Bio: Hardware not available or not configured.");
      return true; // Пропускаем, если железо не поддерживает Face ID
    }
    
    // 2. Вызываем системное окно Face ID
    await NativeBiometric.verifyIdentity({
      reason: 'Разблокировать Ядро Nuxus',
      title: 'Идентификация узла',
      subtitle: 'Подтвердите личность для доступа к Ядру',
      description: 'Используйте Face ID или Touch ID',
    });
    
    return true;
  } catch (error: any) {
    console.warn("Nuxus Bio Reject:", error);
    return false; // При ошибке (отмена или сбой) оставляем заблокированным
  }
}
