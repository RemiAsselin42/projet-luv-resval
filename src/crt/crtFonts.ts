// Précharge les polices personnalisées du CRT avant tout dessin sur canvas.
// Les polices Silvermist (titre) et Futura (menu, labels) doivent être disponibles
// avant d'afficher le texte, sinon le navigateur utiliserait une police de secours
// et le rendu serait incorrect.
const preloadFonts = async (): Promise<void> => {
  const silvermistItalicUrl = new URL('../assets/fonts/Silvermist-Italic.otf', import.meta.url).href;
  const silvermistRegularUrl = new URL('../assets/fonts/Silvermist-Regular.otf', import.meta.url).href;
  const futuraCondensedExtraBoldUrl = new URL('../assets/fonts/Futura-CondensedExtraBold.otf', import.meta.url).href;
  const futuraMediumUrl = new URL('../assets/fonts/Futura-Medium.otf', import.meta.url).href;

  const fontsToLoad = [
    new FontFace('Silvermist-Italic', `url(${silvermistItalicUrl})`, {
      weight: 'normal',
      style: 'italic',
    }),
    new FontFace('Silvermist-Regular', `url(${silvermistRegularUrl})`, {
      weight: 'normal',
      style: 'normal',
    }),
    new FontFace('Futura-CondensedExtraBold', `url(${futuraCondensedExtraBoldUrl})`, {
      weight: '800',
      style: 'normal',
    }),
    new FontFace('Futura-Medium', `url(${futuraMediumUrl})`, {
      weight: '500',
      style: 'normal',
    }),
  ];

  const loadedFonts = await Promise.all(fontsToLoad.map((font) => font.load()));
  loadedFonts.forEach((font) => document.fonts.add(font));
};

let isFontsPreloaded = false;
let fontPreloadPromise: Promise<void> | null = null;

export const ensureFontsLoaded = async (): Promise<void> => {
  if (isFontsPreloaded) return;

  if (!fontPreloadPromise) {
    fontPreloadPromise = preloadFonts()
      .then(() => {
        isFontsPreloaded = true;
      })
      .catch((error) => {
        // Allow retry on the next call if preload fails.
        fontPreloadPromise = null;
        throw error;
      });
  }

  await fontPreloadPromise;
};
