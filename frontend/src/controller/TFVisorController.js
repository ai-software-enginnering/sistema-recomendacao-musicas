export class TFVisorController {
  #tfVisorView;
  #events;

  static init({ tfVisorView, events }) {
    const controller = new TFVisorController();
    controller.#tfVisorView = tfVisorView;
    controller.#events = events;

    controller.#events.onTrainingLog(log => {
      controller.#tfVisorView.handleTrainingLog(log);
    });

    controller.#events.onTrainingComplete(() => {
      console.log('[TFVisorController] Treinamento concluído');
    });

    return controller;
  }
}