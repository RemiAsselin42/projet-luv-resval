// Déclarations TypeScript pour les imports spéciaux gérés par Vite (l'outil de build).
// Permet d'importer des fichiers GLB (modèles 3D), OBJ/MTL et des workers audio
// directement dans le code TypeScript en récupérant leur URL finale.

/// <reference types="vite/client" />

declare module '*.obj?url' {
  const src: string;
  export default src;
}

declare module '*.mtl?url' {
  const src: string;
  export default src;
}

declare module '*.glb?url' {
  const src: string;
  export default src;
}

declare module '*.gltf?url' {
  const src: string;
  export default src;
}

declare module '*?worker&url' {
  const src: string;
  export default src;
}
