const INVALID_PATH_CHARACTERS = '<>:"/\\|?*';

export function sanitizePathSegment(value: string, replacement = '_') {
  return [...value]
    .map((character) => (isInvalidPathCharacter(character) ? replacement : character))
    .join('')
    .trim();
}

function isInvalidPathCharacter(character: string) {
  return INVALID_PATH_CHARACTERS.includes(character) || character.charCodeAt(0) < 32;
}
