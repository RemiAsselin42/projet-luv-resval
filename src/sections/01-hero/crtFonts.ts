// Ensures fonts are loaded before drawing on canvas to prevent fallback rendering.
const preloadFonts = async (): Promise<void> => {
  const silvermistItalicUrl = new URL('../../assets/fonts/Silvermist-Italic.otf', import.meta.url).href;
  const silvermistRegularUrl = new URL('../../assets/fonts/Silvermist-Regular.otf', import.meta.url).href;
  const futuraCondensedExtraBoldUrl = new URL('../../assets/fonts/Futura-CondensedExtraBold.otf', import.meta.url).href;
  const futuraMediumUrl = new URL('../../assets/fonts/Futura-Medium.otf', import.meta.url).href;

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

let fontsPreloaded = false;
let fontPreloadPromise: Promise<void> | null = null;

export const ensureFontsLoaded = async (): Promise<void> => {
  if (fontsPreloaded) return;

  if (!fontPreloadPromise) {
    fontPreloadPromise = preloadFonts()
      .then(() => {
        fontsPreloaded = true;
      })
      .catch((error) => {
        // Allow retry on the next call if preload fails.
        fontPreloadPromise = null;
        throw error;
      });
  }

  await fontPreloadPromise;
};
