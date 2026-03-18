import { UserController } from './controller/UserController.js';
import { SongsController } from './controller/SongsController.js';
import { ModelTrainingController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';
import { WorkerController } from './controller/WorkerController.js';

import { UserService } from './service/UserService.js';
import { SongsService } from './service/SongsService.js';
import { ApiService } from './service/ApiService.js';

import { UserView } from './view/UserView.js';
import { SongsView } from './view/SongsView.js';
import { ModelView } from './view/ModelView.js';
import { TFVisorView } from './view/TFVisorView.js';
import { ParametersView } from './view/ParametersView.js';

import Events from './events/events.js';

const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const baseUrl = isLocalhost ? 'http://localhost:3001' : '';

const apiService = new ApiService({ baseUrl });
const userService = new UserService();
const songsService = new SongsService({ apiService });

const userView = new UserView();
const songsView = new SongsView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();
const parametersView = new ParametersView();

const rerankWorker = new Worker(
  new URL('./workers/rerankWorker.js', import.meta.url)
);

const workerApi = WorkerController.init({
  worker: rerankWorker,
  events: Events
});

TFVisorController.init({
  tfVisorView,
  events: Events
});

let userController;
let songsController;
let modelTrainingController;

function mapRecommendationToTrack(recommendation = {}) {
  const metadata = recommendation.metadata || {};

  return {
    id: recommendation.id || metadata.track_uri || metadata.id || '',
    track_uri: metadata.track_uri || recommendation.id || metadata.id || '',
    name: metadata.track_name || metadata.name || 'Sem nome',
    artists: metadata.artists || 'Artista desconhecido',
    album: metadata.album_name || metadata.album || '',
    genres: metadata.genres || '',
    popularity: Number(metadata.popularity ?? 0),
    danceability: Number(metadata.danceability ?? 0),
    energy: Number(metadata.energy ?? 0),
    loudness: Number(metadata.loudness ?? 0),
    speechiness: Number(metadata.speechiness ?? 0),
    acousticness: Number(metadata.acousticness ?? 0),
    instrumentalness: Number(metadata.instrumentalness ?? 0),
    liveness: Number(metadata.liveness ?? 0),
    valence: Number(metadata.valence ?? 0),
    tempo: Number(metadata.tempo ?? 0),
    normalized_loudness: Number(metadata.normalized_loudness ?? 0),
    normalized_tempo: Number(metadata.normalized_tempo ?? 0),
    normalized_popularity: Number(metadata.normalized_popularity ?? 0),
    relevanceScore: Number(recommendation.relevanceScore ?? 0),
    metadata
  };
}

async function bootstrap() {
  try {
    console.log('[App] Iniciando aplicação...');
    console.log(`[App] API base URL: ${baseUrl || '(mesma origem)'}`);

    await userService.getDefaultUsers();

    userController = UserController.init({
      userView,
      userService,
      events: Events
    });

    songsController = SongsController.init({
      songsView,
      userService,
      songsService,
      events: Events
    });

    modelTrainingController = ModelTrainingController.init({
      modelView,
      userService,
      apiService,
      workerApi,
      songsController,
      events: Events,
      parametersView
    });

    await userController.renderUsers();
    await songsController.renderTracksPage(0);

    console.log('[App] Inicialização concluída com sucesso.');
  } catch (error) {
    console.error('[App] Erro crítico na inicialização:', error);
    alert('Ocorreu um erro ao carregar a aplicação. Verifique a conexão com o servidor.');
  }
}

Events.onRecommend(({ recommendations = [] } = {}) => {
  const tracks = recommendations.map(mapRecommendationToTrack);

  songsView.render(tracks, false);
  songsView.toggleLoadMore(false);
  songsView.updateTrackCount(tracks.length);
});

window.addEventListener('beforeunload', () => {
  try {
    workerApi?.terminate?.();
  } catch (error) {
    console.error('[App] Erro ao encerrar worker:', error);
  }
});

bootstrap();