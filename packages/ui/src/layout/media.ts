/**
 * Resolve a layer's `mediaId` to a displayable URL.
 *
 * Until the media library (M4) lands, the layout builder lets you paste a direct
 * image/video URL into a layer, so the default resolver passes through anything
 * that already looks like a URL. Apps can supply a real resolver (Appwrite
 * Storage lookup) instead.
 */
export type MediaResolver = (mediaId: string) => string | undefined;

export const passthroughMediaResolver: MediaResolver = (mediaId) =>
  /^(https?:)?\/\//.test(mediaId) || mediaId.startsWith("/") ? mediaId : undefined;
