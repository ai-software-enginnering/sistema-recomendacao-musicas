import { workerEvents } from '../events/constants.js';

export class WorkerController {
  #worker;
  #events;
  #terminated = false;

  static init({ worker, events }) {
    const controller = new WorkerController();
    controller.#worker = worker;
    controller.#events = events;

    controller.#worker.onmessage = (e) => {
      if (!e?.data) return;

      const { type, ...data } = e.data;

      switch (type) {
        case workerEvents.trainingLog:
          controller.#events.emit('trainingLog', data);
          break;

        case workerEvents.trainingComplete:
          controller.#events.emit('trainingComplete', data);
          break;

        case workerEvents.progressUpdate:
          controller.#events.emit('progressUpdate', data);
          break;

        case workerEvents.recommend:
          controller.#events.emit('recommend', data);
          break;

        case workerEvents.trainingError:
          controller.#events.emit('trainingError', data);
          break;

        case workerEvents.recommendError:
          controller.#events.emit('recommendError', data);
          break;

        default:
          console.warn(`[WorkerController] Tipo de mensagem desconhecido: ${type}`);
      }
    };

    controller.#worker.onerror = (error) => {
      console.error('[WorkerController] Erro crítico no Web Worker:', error);

      const message = error?.message || 'Erro inesperado no worker';

      controller.#events.emit('trainingError', { message });
      controller.#events.emit('recommendError', { message });
    };

    return {
      trainModel: (data = {}) => {
        if (controller.#terminated || !controller.#worker) {
          throw new Error('Worker não está disponível para treinamento.');
        }

        controller.#worker.postMessage({
          type: workerEvents.trainModel,
          ...data
        });
      },

      rerank: (data = {}) => {
        if (controller.#terminated || !controller.#worker) {
          throw new Error('Worker não está disponível para recomendação.');
        }

        controller.#worker.postMessage({
          type: workerEvents.recommend,
          ...data
        });
      },

      terminate: () => {
        if (controller.#terminated || !controller.#worker) return;

        controller.#worker.terminate();
        controller.#worker = null;
        controller.#terminated = true;
      }
    };
  }
}