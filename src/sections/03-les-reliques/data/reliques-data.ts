export interface ReliqueData {
  id: string;
  name: string;
  subtitle: string;
  glowColor: string;
  description: string;
  /** SVG inline content (paths only, no outer <svg> tag) */
  svgPaths: string;
}

export const RELIQUES: readonly ReliqueData[] = [
  {
    id: 'death-star',
    name: "L'Étoile de la Mort",
    subtitle: 'Station de combat orbitale',
    glowColor: '#a0c4ff',
    svgPaths: `
      <circle cx="60" cy="60" r="52" fill="none"/>
      <path d="M8 60 Q34 54 60 60 Q86 66 112 60"/>
      <circle cx="76" cy="60" r="14" fill="none"/>
      <path d="M60 8 L60 44"/>
      <path d="M88 20 L102 8"/>
      <path d="M32 20 L18 8"/>
      <path d="M105 38 L112 28"/>
      <path d="M15 38 L8 28"/>
      <path d="M76 46 L76 46 Q82 48 84 54"/>
      <path d="M38 32 Q44 28 52 30"/>
      <path d="M68 30 Q76 26 84 30"/>
    `,
    description: '<p>Forgée dans les abysses de l\'acier stellaire, cette sphère de destruction fut l\'œuvre d\'une volonté sans merci. Capable d\'annihiler un astre en un seul battement de son cœur de cristal.</p><p>Les scribes l\'appellent <em>Mors Siderum</em> — la mort des étoiles. Quiconque la contemple trop longtemps perd le goût de la lumière.</p>',
  },
  {
    id: 'rose',
    name: 'La Rose Éternelle',
    subtitle: 'Fleur hors du temps',
    glowColor: '#ffb3c6',
    svgPaths: `
      <path d="M60 85 L60 45"/>
      <path d="M60 65 Q50 72 44 80 Q52 82 60 75 Q68 82 76 80 Q70 72 60 65"/>
      <path d="M60 55 Q48 58 42 50 Q50 42 60 48 Q70 42 78 50 Q72 58 60 55"/>
      <path d="M60 48 Q56 38 52 30 Q60 32 64 42 Q72 32 68 22 Q76 26 74 38 Q82 28 86 20 Q88 32 80 40"/>
      <path d="M60 48 Q52 36 44 28 Q36 32 38 44 Q30 36 32 24 Q24 30 28 42"/>
      <path d="M60 85 Q54 90 50 98"/>
      <path d="M60 85 Q66 90 70 98"/>
      <path d="M50 75 Q44 78 40 85"/>
      <path d="M70 75 Q76 78 80 85"/>
    `,
    description: '<p>Cueillie au crépuscule d\'un monde disparu, cette rose défie le temps et la pourriture. Ses pétales gardent en eux la chaleur d\'un soleil éteint depuis des siècles.</p><p>On dit que celui qui la respire entend, dans un souffle ténu, le nom de ce qu\'il a le plus aimé.</p>',
  },
  {
    id: 'zelda',
    name: 'La Cartouche R4',
    subtitle: 'Artefact des mondes pixelisés',
    glowColor: '#ffe066',
    svgPaths: `
      <rect x="22" y="15" width="76" height="90" rx="4" ry="4" fill="none"/>
      <rect x="30" y="25" width="60" height="38" rx="2" ry="2" fill="none"/>
      <line x1="36" y1="35" x2="84" y2="35"/>
      <line x1="36" y1="43" x2="84" y2="43"/>
      <line x1="36" y1="51" x2="70" y2="51"/>
      <path d="M36 58 L44 58"/>
      <circle cx="78" cy="55" r="6" fill="none"/>
      <line x1="22" y1="75" x2="98" y2="75"/>
      <rect x="40" y="82" width="40" height="8" rx="1" ry="1" fill="none"/>
      <path d="M35 100 L35 105 Q35 108 38 108 L82 108 Q85 108 85 105 L85 100"/>
    `,
    description: '<p>Cette minuscule tablette renferme des univers entiers : châteaux de pixel, héros oubliés, triforces brisées. Un monde dans la paume de la main.</p><p>Les anciens la nomment <em>Porta Mundorum</em>. Insérez-la dans l\'oracle et laissez-vous happer par ce qui demeure.</p>',
  },
  {
    id: 'minotaur',
    name: 'Le Minotaure',
    subtitle: 'Gardien du labyrinthe intérieur',
    glowColor: '#d4a0ff',
    svgPaths: `
      <path d="M30 30 Q20 15 15 5 Q22 12 28 20"/>
      <path d="M90 30 Q100 15 105 5 Q98 12 92 20"/>
      <path d="M28 20 Q22 28 20 38 Q22 50 28 56 Q38 30 60 28 Q82 30 92 56 Q98 50 100 38 Q98 28 92 20"/>
      <path d="M38 56 Q42 72 40 85 Q50 90 60 90 Q70 90 80 85 Q78 72 82 56"/>
      <path d="M40 85 Q32 90 28 100 Q36 102 44 98"/>
      <path d="M80 85 Q88 90 92 100 Q84 102 76 98"/>
      <ellipse cx="44" cy="46" rx="6" ry="8" fill="none"/>
      <ellipse cx="76" cy="46" rx="6" ry="8" fill="none"/>
      <path d="M48 42 Q60 38 72 42"/>
      <path d="M50 72 Q60 76 70 72"/>
      <path d="M54 62 Q58 66 60 66 Q62 66 66 62"/>
      <circle cx="44" cy="44" r="2"/>
      <circle cx="76" cy="44" r="2"/>
    `,
    description: '<p>Mi-homme, mi-taureau, toujours exilé au centre du labyrinthe qu\'il n\'a pas choisi. Sa fureur n\'est pas cruauté — c\'est la douleur d\'une existence sans nom propre.</p><p>Dans certains grimoires, on lit qu\'il chante la nuit. Une complainte sourde que seuls les murs de pierre se rappellent.</p>',
  },
];
