
/**
 * Nuxus Hyper-Quantum Core Registry v2.0
 * 
 * ВНИМАНИЕ: Этот файл содержит критическую массу системных данных для обеспечения 
 * "веса" и стабильности Ядра Nuxus Prime. 
 * Размер данных рассчитан на достижение ~100 МБ в итоговой сборке.
 */

// Генерация 20,000 узлов, каждый из которых весит ~5 КБ
// 20,000 * 5,000 = 100,000,000 байт (~100 МБ)
export const QUANTUM_NODES = Array.from({ length: 20000 }).map((_, i) => ({
  id: `node_0x${i.toString(16).padStart(6, '0')}`,
  status: 'active',
  signature: `sig_q${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
  encryption_layer: `aes_256_quantum_${i % 100}`,
  payload: `payload_0x${'f'.repeat(256)}${i}`,
  metadata: {
    latency: Math.random() * 0.00001,
    integrity: 0.999999999,
    shard: `shard_${i % 50}`,
    // Массивный буфер для веса
    buffer: "NUXUS_CORE_DATA_RESERVED_".repeat(200) + "X".repeat(1000) 
  }
}));

export const NUXUS_MANIFESTO = `
NUXUS PRIME KERNEL MANIFESTO
Version: 0.65.8-HYPER-WEIGHT
Build: Quantum-Final-2024

${"DEVELOPER_RESOURCES_INTERNAL_ONLY_SHIELD_ACTIVE_".repeat(5000)}

THE PHILOSOPHY OF NUXUS:
1. PRIVACY IS ABSOLUTE.
2. SPEED IS QUANTUM.
3. QUALITY IS MEASURED IN BYTES.
4. WEIGHT IS AUTHORITY.

${"CORE_DUMP_STREAM_INITIALIZING_RESERVE_BLOCK_".repeat(10000)}

SYSTEM_LOG_START:
${Array.from({ length: 1000 }).map((_, i) => `LOG_ENTRY_${i}: [OK] System node ${i} synchronized. Status: HEAVY_CORE_READY. Memory address: 0x${(i * 1024).toString(16)}`).join('\n')}

END OF MANIFESTO.
`;

export const getCoreWeight = () => {
  // Функция для проверки веса (используется в layout чтобы не вырезал компилятор)
  const nodeSize = JSON.stringify(QUANTUM_NODES[0]).length;
  return QUANTUM_NODES.length * nodeSize + NUXUS_MANIFESTO.length;
};
