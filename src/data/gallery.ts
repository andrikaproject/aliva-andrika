import type { ImageMetadata } from 'astro';

import dsc00024 from '../../assets/pict/Pre-wedd-Gredding/DSC00024.webp';
import dsc00177 from '../../assets/pict/Pre-wedd-Gredding/DSC00177_11zon.webp';
import dsc00189 from '../../assets/pict/Pre-wedd-Gredding/DSC00189_11zon.webp';
import dsc00255 from '../../assets/pict/Pre-wedd-Gredding/DSC00255_11zon.webp';
import dsc00424 from '../../assets/pict/Pre-wedd-Gredding/DSC00424_11zon.webp';
import dsc00436 from '../../assets/pict/Pre-wedd-Gredding/DSC00436_9_11zon.webp';
import dsc00439 from '../../assets/pict/Pre-wedd-Gredding/DSC00439_8_11zon.webp';
import dsc00457 from '../../assets/pict/Pre-wedd-Gredding/DSC00457_7_11zon.webp';
import dsc00463 from '../../assets/pict/Pre-wedd-Gredding/DSC00463_6_11zon.webp';
import dsc00469 from '../../assets/pict/Pre-wedd-Gredding/DSC00469_5_11zon.webp';
import dsc00479 from '../../assets/pict/Pre-wedd-Gredding/DSC00479_4_11zon.webp';
import dsc00500 from '../../assets/pict/Pre-wedd-Gredding/DSC00500_3_11zon.webp';
import dsc00512 from '../../assets/pict/Pre-wedd-Gredding/DSC00512_2_11zon.webp';

export interface GalleryPhoto {
  src: ImageMetadata;
  /** What a guest who cannot see the photo would want told to them. */
  alt: { id: string; en: string };
}

/**
 * The engagement set, in the order the band presents it: arrival, the vows
 * spoken aloud, the portraits at the flower wall, then the garden.
 *
 * Photos are imported rather than referenced from `public/`, so the build
 * emits sized variants instead of shipping the 4000 px originals.
 */
export const galleryPhotos: GalleryPhoto[] = [
  {
    src: dsc00024,
    alt: {
      id: 'Andrika berjalan menuju rumah membawa hantaran, diikuti rombongan keluarga.',
      en: 'Andrika walking up to the house with the gift trays, family following behind.',
    },
  },
  {
    src: dsc00177,
    alt: {
      id: 'Aliva berbicara di depan mikrofon, terlihat di antara dua tamu yang duduk membelakangi kamera.',
      en: 'Aliva speaking into a microphone, framed between two guests seated in the foreground.',
    },
  },
  {
    src: dsc00189,
    alt: {
      id: 'Aliva memegang mikrofon di depan rangkaian bunga acara lamaran.',
      en: 'Aliva holding the microphone in front of the ceremony flower arrangement.',
    },
  },
  {
    src: dsc00255,
    alt: {
      id: 'Aliva memeluk buket bunganya, duduk bersama keluarga di halaman.',
      en: 'Aliva holding her bouquet, seated with family in the garden.',
    },
  },
  {
    src: dsc00424,
    alt: {
      id: 'Andrika dan Aliva berdiri berdampingan di depan latar bunga bermonogram AA.',
      en: 'Andrika and Aliva standing side by side in front of the AA flower backdrop.',
    },
  },
  {
    src: dsc00436,
    alt: {
      id: 'Andrika berdiri di belakang Aliva yang duduk memegang buket, di depan latar bunga.',
      en: 'Andrika standing behind Aliva, who is seated with her bouquet at the flower backdrop.',
    },
  },
  {
    src: dsc00439,
    alt: {
      id: 'Aliva berdiri di belakang Andrika yang duduk di kursi kayu, di depan latar bunga.',
      en: 'Aliva standing behind Andrika, who is seated on a wooden chair at the flower backdrop.',
    },
  },
  {
    src: dsc00457,
    alt: {
      id: 'Andrika dan Aliva berdiri di tangga depan rumah, Aliva membawa buketnya.',
      en: 'Andrika and Aliva on the front steps of the house, Aliva carrying her bouquet.',
    },
  },
  {
    src: dsc00463,
    alt: {
      id: 'Andrika dan Aliva berdiri di taman, di bawah tanaman gantung dan dinding putih.',
      en: 'Andrika and Aliva in the garden, beneath hanging plants against a white wall.',
    },
  },
  {
    src: dsc00469,
    alt: {
      id: 'Potret dekat Aliva dengan buketnya, Andrika berdiri di belakangnya.',
      en: 'A close portrait of Aliva with her bouquet, Andrika standing behind her.',
    },
  },
  {
    src: dsc00479,
    alt: {
      id: 'Andrika mengangkat tangan sambil tertawa bersama Aliva di taman.',
      en: 'Andrika raising a hand mid-laugh beside Aliva in the garden.',
    },
  },
  {
    src: dsc00500,
    alt: {
      id: 'Andrika tertawa lebar di samping Aliva, dengan pepohonan taman di belakang mereka.',
      en: 'Andrika laughing beside Aliva, garden trees behind them.',
    },
  },
  {
    src: dsc00512,
    alt: {
      id: 'Aliva tersenyum sambil memperlihatkan cincin di jarinya, di depan latar bunga.',
      en: 'Aliva smiling as she shows the ring on her finger, in front of the flower backdrop.',
    },
  },
];
