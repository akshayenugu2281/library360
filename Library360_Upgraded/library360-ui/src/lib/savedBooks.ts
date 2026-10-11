import type { Book } from "../api/client";

function storageKey(userId?: number) {
  return `l360_saved_books_${userId ?? "guest"}`;
}

export function getSavedBooks(userId?: number): Book[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Book => Boolean(item && typeof item === "object" && typeof item.id === "number" && typeof item.title === "string"));
  } catch {
    return [];
  }
}

export function isBookSaved(bookId: number, userId?: number): boolean {
  return getSavedBooks(userId).some((book) => book.id === bookId);
}

export function toggleSavedBook(book: Book, userId?: number): boolean {
  const saved = getSavedBooks(userId);
  const alreadySaved = saved.some((entry) => entry.id === book.id);
  const next = alreadySaved ? saved.filter((entry) => entry.id !== book.id) : [book, ...saved.filter((entry) => entry.id !== book.id)];
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("l360:saved-books-changed", { detail: { userId, bookId: book.id, saved: !alreadySaved } }));
  return !alreadySaved;
}

export function removeSavedBook(bookId: number, userId?: number): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(getSavedBooks(userId).filter((book) => book.id !== bookId)));
  window.dispatchEvent(new CustomEvent("l360:saved-books-changed", { detail: { userId, bookId, saved: false } }));
}


/** Carry guest bookmarks into a new account at signup; data remains local to this browser. */
export function transferGuestSavedBooksToAccount(userId: number): void {
  const guest = getSavedBooks(undefined);
  if (guest.length === 0) return;
  const current = getSavedBooks(userId);
  const merged = [...guest, ...current.filter((book) => !guest.some((entry) => entry.id === book.id))];
  localStorage.setItem(storageKey(userId), JSON.stringify(merged));
  localStorage.removeItem(storageKey(undefined));
  window.dispatchEvent(new CustomEvent("l360:saved-books-changed", { detail: { userId, transferred: guest.length } }));
}
