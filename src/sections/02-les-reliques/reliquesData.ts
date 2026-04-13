// Données statiques des 4 personnages de la section Reliques.
// Chaque personnage a un identifiant, un label affiché, une URL de modèle 3D et des stats.

import anakinUrl from '../../3d-models/anakin_skywalker.glb?url';
import blackPantherUrl from '../../3d-models/black_panther.glb?url';
import minotaurUrl from '../../3d-models/minotaur.glb?url';
import linkUrl from '../../3d-models/link.glb?url';

export type ReliquesCharacterId =
  | 'anakin'
  | 'black-panther'
  | 'minotaur'
  | 'link';

export interface ReliquesCharacterData {
  id: ReliquesCharacterId;
  label: string;
  modelUrl: string;
  /** Dimension cible dans la mini-scène (unités monde). */
  targetDimension: number;
  stats: {
    egoTrip: number;
    spleen: number;
    legacy: number;
    charisma: number;
  };
  /** Paroles a cappella affichées sous le personnage 3D. */
  lyrics: string;
  /** Mot-clé mis en évidence dans le ticker (ex. nom du personnage tel qu'il apparaît dans les paroles). */
  tickerKeyword: string;
}

export const RELIQUES_CHARACTERS: ReliquesCharacterData[] = [
  {
    id: 'anakin',
    label: 'ANAKIN',
    modelUrl: anakinUrl,
    targetDimension: 1.8,
    stats: { egoTrip: 90, spleen: 75, legacy: 65, charisma: 85 },
    lyrics: '',
    tickerKeyword: 'Anakin',
  },
  {
    id: 'black-panther',
    label: 'BLACK PANTHER',
    modelUrl: blackPantherUrl,
    targetDimension: 1.8,
    stats: { egoTrip: 80, spleen: 85, legacy: 90, charisma: 80 },
    lyrics: '',
    tickerKeyword: 'Black Panther',
  },
  {
    id: 'minotaur',
    label: 'MINOTAUR',
    modelUrl: minotaurUrl,
    targetDimension: 1.8,
    stats: { egoTrip: 95, spleen: 60, legacy: 85, charisma: 70 },
    lyrics: '',
    tickerKeyword: 'Minotaur',
  },
  {
    id: 'link',
    label: 'LINK',
    modelUrl: linkUrl,
    targetDimension: 1.8,
    stats: { egoTrip: 65, spleen: 80, legacy: 70, charisma: 95 },
    lyrics: "Comme Link, j'me trouve dans une grotte avec la te-por qu'il faut qu'j'ouvre avec la bonne torche",  
    tickerKeyword: 'Link',
  },
];

export const STAT_LABELS: (keyof ReliquesCharacterData['stats'])[] = [
  'egoTrip',
  'spleen',
  'legacy',
  'charisma',
];

export const STAT_DISPLAY: Record<
  keyof ReliquesCharacterData['stats'],
  string
> = {
  egoTrip: 'EGO TRIP',
  spleen: 'SPLEEN',
  legacy: 'LEGACY',
  charisma: 'CHARISMA',
};
