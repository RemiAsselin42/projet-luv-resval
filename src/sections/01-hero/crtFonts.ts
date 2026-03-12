// Ensures fonts are loaded before drawing on canvas to prevent fallback rendering.
const preloadFonts = async (): Promise<void> => {
  const fontsToLoad = [
    new FontFace('Silvermist-Italic', 'url(/src/assets/fonts/Silvermist-Italic.otf)', {
      weight: 'normal',
      style: 'italic',
    }),
    new FontFace('Silvermist-Regular', 'url(/src/assets/fonts/Silvermist-Regular.otf)', {
      weight: 'normal',
      style: 'normal',
    }),
    new FontFace('Futura-CondensedExtraBold', 'url(/src/assets/fonts/Futura-CondensedExtraBold.otf)', {
      weight: '800',
      style: 'normal',
    }),
    new FontFace('Futura-Medium', 'url(/src/assets/fonts/Futura-Medium.otf)', {
      weight: '500',
      style: 'normal',
    }),
  ];

  const loadedFonts = await Promise.all(fontsToLoad.map((font) => font.load()));
  loadedFonts.forEach((font) => document.fonts.add(font));
  // eslint-disable-next-line no-console
  console.debug('CRT fonts preloaded successfully');
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
