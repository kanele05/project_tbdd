import type { ImageSource } from 'expo-image';

/**
 * Course posters bundled with the app (portrait 2:3, ~40 KB each, Unsplash License - see
 * `assets/posters/CREDITS.md`). Used by the cinematic backgrounds (sign-in wall, form headers) so
 * they look the same offline and before the user is signed in. They are the same photos as the
 * seed catalogue.
 */
export const POSTERS: readonly ImageSource[] = [
  require('../../assets/posters/code-laptop.jpg'),
  require('../../assets/posters/data-dashboard.jpg'),
  require('../../assets/posters/clapperboard.jpg'),
  require('../../assets/posters/paint-brushes.jpg'),
  require('../../assets/posters/code-js.jpg'),
  require('../../assets/posters/tablet-wireframe.jpg'),
  require('../../assets/posters/cinema.jpg'),
  require('../../assets/posters/phone-apps.jpg'),
  require('../../assets/posters/analytics.jpg'),
  require('../../assets/posters/swatches.jpg'),
  require('../../assets/posters/code-python.jpg'),
  require('../../assets/posters/video-editing.jpg'),
  require('../../assets/posters/abstract-painting.jpg'),
  require('../../assets/posters/monitor-design.jpg'),
  require('../../assets/posters/team-whiteboard.jpg'),
  require('../../assets/posters/study-desk.jpg'),
];
