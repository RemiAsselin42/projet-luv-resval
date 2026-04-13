// Données statiques des 4 personnages de la section Reliques.
// Chaque personnage a un identifiant, un label affiché, une URL de modèle 3D et des stats.

import anakinUrl from '../../3d-models/anakin_skywalker.glb?url';
import batmanUrl from '../../3d-models/batman.glb?url';
import minotaurUrl from '../../3d-models/minotaur.glb?url';
import linkUrl from '../../3d-models/link.glb?url';
import { publicUrl } from '../../utils/publicUrl';

export type ReliquesCharacterId =
  | 'anakin'
  | 'batman'
  | 'minotaur'
  | 'link';

export interface ReliquesCharacterData {
  id: ReliquesCharacterId;
  label: string;
  modelUrl: string;
  /** URL du SVG affiché dans la cellule du sélecteur 2×2. */
  iconUrl: string;
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
  /**
   * Nom de l'animation idle à jouer (doit correspondre à un AnimationClip du GLB). Optionnel.
   * Les noms proviennent des métadonnées des fichiers GLB exportés depuis Blender/Mixamo :
   * - `'IDLE001'`     → batman.glb     (animation exportée depuis Adobe Mixamo, piste "IDLE001")
   * - `'Warrior_Idle'` → minotaur.glb  (animation exportée depuis Mixamo, piste "Warrior_Idle")
   * Pour inspecter les noms disponibles dans un GLB : `gltf.animations.map(c => c.name)`.
   */
  idleAnimationName?: string;
}

export const RELIQUES_CHARACTERS: ReliquesCharacterData[] = [
  {
    id: 'anakin',
    label: 'ANAKIN',
    modelUrl: anakinUrl,
    iconUrl: publicUrl('image/anakin.svg'),
    targetDimension: 1.8,
    stats: { egoTrip: 90, spleen: 75, legacy: 65, charisma: 85 },
    lyrics: "Le soir comme Anakin quand j'ai la rage n*gro c'est violent",
    tickerKeyword: 'Anakin',
  },
  {
    id: 'batman',
    label: 'BATMAN',
    modelUrl: batmanUrl,
    iconUrl: publicUrl('image/batman.svg'),
    targetDimension: 1.8,
    stats: { egoTrip: 80, spleen: 85, legacy: 90, charisma: 80 },
    lyrics: 'Coup de pied a Statham, racks dans un jean tout noir comme Batman',
    tickerKeyword: 'Batman',
    idleAnimationName: 'IDLE001',
  },
  {
    id: 'minotaur',
    label: 'MINOTAUR',
    modelUrl: minotaurUrl,
    iconUrl: publicUrl('image/minotaur.svg'),
    targetDimension: 1.8,
    stats: { egoTrip: 95, spleen: 60, legacy: 85, charisma: 70 },
    lyrics:
      "Toi, tu crois qu'la mort c'est rien, tu crois qu'c'est tout noir, pas d'sortie, trois têtes de chien au bout du couloir",
    tickerKeyword: 'trois têtes de chien',
    idleAnimationName: 'Warrior_Idle',
  },
  {
    id: 'link',
    label: 'LINK',
    modelUrl: linkUrl,
    iconUrl: publicUrl('image/link.svg'),
    targetDimension: 1.8,
    stats: { egoTrip: 65, spleen: 80, legacy: 70, charisma: 95 },
    lyrics:
      "Comme Link, j'me trouve dans une grotte avec la te-por qu'il faut qu'j'ouvre avec la bonne torche",
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
