import dotenv from 'dotenv';
import { Sandbox } from '@vercel/sandbox';

/**
 * NUXUS SANDBOX RUNNER v1.0
 * Скрипт для запуска изолированных сред тестирования кода.
 */

dotenv.config({ path: '.env.local' });

async function run() {
  console.log('🚀 Инициализация Nuxus Sandbox...');

  const sandbox = await Sandbox.getOrCreate({
    name: "my-sandbox-907047",
    persistent: true,
    networkPolicy: 'deny-all',
  });

  console.log(`📡 Песочница активна: ${sandbox.id}`);

  await sandbox.update({ networkPolicy: 'deny-all' });

  try {
    console.log('📝 Запись тестового пакета...');
    await sandbox.writeFiles([
      {
        path: '/vercel/generated.mjs',
        content: "console.log('🛰️ Сигнал из песочницы Nuxus принят!')",
      },
    ]);

    console.log('⚙️ Выполнение команды...');
    const result = await sandbox.runCommand('node', [
      '/vercel/generated.mjs',
    ]);
    
    const output = await result.stdout();
    console.log('✅ Результат выполнения:', output);

    if (result.exitCode !== 0) {
      console.error('❌ Ошибка в песочнице:', await result.stderr());
    }
  } catch (error) {
    console.error('⚠️ Критический сбой Sandbox SDK:', error);
  } finally {
    console.log('🛑 Остановка песочницы...');
    await sandbox.stop();
    console.log('🏁 Процесс завершен.');
  }
}

run();
