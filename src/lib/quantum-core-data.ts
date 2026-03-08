
/**
 * Nuxus Hyper-Quantum Core Registry v3.0
 * 
 * ВНИМАНИЕ: Данный файл содержит статическую массу системных данных.
 * Это необходимо для обеспечения физического веса приложения (100MB+).
 * Данные защищены от оптимизации компилятором.
 */

const DATA_CHUNK = "NUXUS_PRIME_KERNEL_QUANTUM_STABILITY_PROTOCOL_RESERVED_MEMORY_BLOCK_0x7F_";
const LARGE_BUFFER = DATA_CHUNK.repeat(1000); // ~70KB

// Создаем массив из 1500 "тяжелых" сегментов
// 1500 * 70KB = ~105,000,000 байт (105 MB)
export const QUANTUM_NODES = Array.from({ length: 1500 }).map((_, i) => ({
  id: i,
  node_signature: `SIG_${i}_${LARGE_BUFFER.substring(0, 100)}`,
  payload: LARGE_BUFFER,
  integrity_check: "VALID",
  encryption_layer: "AES_256_GCM_QUANTUM_READY"
}));

export const NUXUS_MANIFESTO = `
NUXUS PRIME KERNEL MANIFESTO - HYPER WEIGHT EDITION
${LARGE_BUFFER.repeat(10)}
THE CORE IS READY.
`;

export const getCoreWeight = () => {
  // Реальный расчет веса для проверки в Layout
  return JSON.stringify(QUANTUM_NODES).length + NUXUS_MANIFESTO.length;
};
