// Fotografiile randate ale produselor (tools/art), după id-ul din catalog
const photos = import.meta.glob<string>('../assets/products/*.webp', { eager: true, import: 'default' })

export const productPhoto = (id: string): string | undefined => photos[`../assets/products/${id}.webp`]
