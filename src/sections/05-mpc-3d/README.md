# MPC 3D - Configuration HTML

Ce document definit la structure HTML minimale de la section MPC, en 2 etapes de livraison.

## Objectif

Construire une interface MPC en deux versions :

1. **Version 1 (fonctionnelle)** : tout fonctionne, sans exigence de style avance.
2. **Version 2 (design Figma)** : meme logique fonctionnelle, mais habillage visuel conforme a la maquette.

## Elements fonctionnels attendus

- 1 ecran principal avec affichage de waveform (acapella/loop active).
- 6 pads, chacun declenchant une loop differente.
- 1 potard de volume global.
- 3 controles de transport : `Stop`, `Play`, `Play from Start`.
- 1 action de telechargement de la loop creee.

## Version 1 - Base fonctionnelle (pas de design)

### Contraintes

- Priorite a l'accessibilite et au comportement (pas au rendu visuel).
- HTML semantique simple.
- Attributs `data-*` stables pour le branchement TypeScript.
- Tous les controles doivent etre utilisables au clavier.

### Structure HTML recommandee

```html
<section id="mpc" class="mpc" aria-labelledby="mpc-title">
	<h2 id="mpc-title">MPC</h2>

	<div class="mpc__screen" data-role="screen" aria-live="polite">
		<canvas data-role="waveform" aria-label="Waveform de la loop active"></canvas>
	</div>

	<div class="mpc__pads" role="group" aria-label="Pads loops">
		<button type="button" data-pad="1">Pad 1</button>
		<button type="button" data-pad="2">Pad 2</button>
		<button type="button" data-pad="3">Pad 3</button>
		<button type="button" data-pad="4">Pad 4</button>
		<button type="button" data-pad="5">Pad 5</button>
		<button type="button" data-pad="6">Pad 6</button>
	</div>

	<div class="mpc__transport" role="group" aria-label="Controle lecture">
		<button type="button" data-action="stop">Stop</button>
		<button type="button" data-action="play">Play</button>
		<button type="button" data-action="play-start">Play from Start</button>
	</div>

	<div class="mpc__volume">
		<label for="mpc-volume">Volume</label>
		<input
			id="mpc-volume"
			type="range"
			min="0"
			max="100"
			step="1"
			value="80"
			data-role="volume"
		/>
	</div>

	<div class="mpc__export">
		<button type="button" data-action="download-loop">Download loop</button>
	</div>
</section>
```

### Definition de done - V1

- Les 6 pads declenchent bien 6 loops differentes.
- `Play` lit la loop active.
- `Stop` arrete la lecture.
- `Play from Start` relance depuis le debut.
- Le potard modifie le volume global.
- Le bouton `Download loop` telecharge un fichier audio valide.

## Version 2 - Integration design Figma

### Objectif

Conserver exactement les comportements de la V1, puis appliquer la maquette Figma.

### Regles d'integration

- Ne pas casser les hooks JS/TS (`data-pad`, `data-action`, `data-role`).
- Mapper les styles via classes CSS (pas de logique dans le HTML).
- Respecter les espacements, typo, couleurs, et etats interactifs de la maquette.
- Integrer le bouton de telechargement dans le design MPC final (pas en dehors du module).

### Etapes conseillees

1. Verrouiller la V1 (tests manuels et/ou unitaires OK).
2. Ajouter la structure necessaire au layout Figma (wrappers, zones, labels visuels).
3. Appliquer les styles SCSS et animations.
4. Verifier que tous les controles restent accessibles clavier + lecteur d'ecran.

### Definition de done - V2

- Le rendu correspond a la maquette Figma validee.
- Aucun comportement fonctionnel V1 n'est perdu.
- Les controles restent accessibles et testables.
- Le telechargement est visuellement integre au design MPC.
