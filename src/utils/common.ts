/**
 * Get the version number from a migration filename
 * @param filename Migration filename
 * @returns Version number
 */
export function getVersionFromFilename(filename: string): string {
  const match = (/^(\d+)_/).exec(filename);

  if (match === null) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }

  return match[1];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
