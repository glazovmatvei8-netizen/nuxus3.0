
/**
 * Nuxus Hyper-Quantum Core Registry v3.1
 * 
 * ВНИМАНИЕ: Данные изолированы для APK.
 * Файл не должен импортироваться в клиентскую часть веб-приложения напрямую.
 */

const DATA_CHUNK = "NUXUS_PRIME_KERNEL_RESERVED_";
const LARGE_BUFFER = DATA_CHUNK.repeat(1000); 

// Массив вынесен в функцию, чтобы не грузиться в память сразу при импорте файла
export const getQuantumNodes = () => {
  return Array.from({ length: 1500 }).map((_, i) => ({
    id: i,
    payload: LARGE_BUFFER,
    status: "STABLE"
  }));
};

export const getCoreWeight = () => 105000000;
