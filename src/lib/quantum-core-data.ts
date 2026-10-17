/**
 * Nuxus Hyper-Quantum Core Registry v3.2
 * 
 * ОПТИМИЗИРОВАНО: Удалены тяжелые буферы, вызывавшие сбои (500 Error) на мобильных устройствах.
 * Вес ядра теперь имитируется через метаданные.
 */

export const getQuantumNodes = () => {
  return Array.from({ length: 100 }).map((_, i) => ({
    id: i,
    status: "STABLE",
    sync: true
  }));
};

export const getCoreWeight = () => 105000000; // 105 MB (Metadata representation)
