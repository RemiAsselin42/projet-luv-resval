import * as THREE from 'three';
import { publicUrl } from './publicUrl';
import { GRUNT_VIDEO_URL } from '../constants/grunt';

export interface GruntVideoTexture {
  video: HTMLVideoElement;
  videoTexture: THREE.VideoTexture;
  /** Libère la VideoTexture et vide l'élément video (pause + src = ''). */
  dispose: () => void;
}

/**
 * Crée l'élément <video> et la VideoTexture Three.js pour la vidéo Grünt.
 *
 * Source unique de vérité partagée entre mpcCrtSync.ts et eclipse.ts :
 * les deux sections affichent la même vidéo sur le CRT à des moments différents.
 *
 * La vidéo est muette (muted), en boucle (loop) et en lecture inline (playsInline).
 * Le preload est réglé à 'auto' pour un démarrage immédiat dès le play().
 */
export const createGruntVideoTexture = (): GruntVideoTexture => {
  const video = document.createElement('video');
  video.src = publicUrl(GRUNT_VIDEO_URL);
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.colorSpace = THREE.SRGBColorSpace;

  const dispose = () => {
    video.pause();
    video.src = '';
    video.load();
    videoTexture.dispose();
  };

  return { video, videoTexture, dispose };
};
