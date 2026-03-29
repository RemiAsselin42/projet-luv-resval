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
