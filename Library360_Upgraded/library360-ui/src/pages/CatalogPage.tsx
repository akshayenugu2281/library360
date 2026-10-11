import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Book, type BookCopy } from "../api/client";
import { useLiveRefresh } from "../lib/live";
import { useAuth } from "../context/AuthContext";
import { getSavedBooks, toggleSavedBook } from "../lib/savedBooks";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Search,
  BookmarkCheck,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  LayoutGrid,
  ListFilter,
  RotateCw,
  Scroll,
  Trash2,
  Bookmark,
  BookmarkCheck as SavedIcon
} from "lucide-react";

export function CatalogPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<number[]>(() => getSavedBooks(user?.id).map((book) => book.id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [copyBarcode, setCopyBarcode] = useState("");
  const [copyShelf, setCopyShelf] = useState("");
  const [addingCopy, setAddingCopy] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [copyStatusNote, setCopyStatusNote] = useState("");

  const isStaff = user?.roles.includes("ADMIN") || user?.roles.includes("LIBRARIAN");

  /** Truthful per-title availability from persisted copy rows — never hand-edited. */
  function availabilityOf(book: Book): { text: string; tone: string } {
    const total = book.totalCopies ?? 0;
    const available = book.availableCopies ?? 0;
    const waitlist = book.waitlistCount ?? 0;
    if (total === 0) return { text: "No copies catalogued", tone: "text-slate-500" };
    const base = `${available} of ${total} available`;
    if (available > 0) return { text: waitlist > 0 ? `${base} · ${waitlist} waiting` : base, tone: "text-emerald-700" };
    if ((book.onHoldCopies ?? 0) > 0 && waitlist === 0) return { text: "Held for pickup", tone: "text-amber-700" };
    return { text: waitlist > 0 ? `All issued · ${waitlist} in queue` : "All copies issued", tone: "text-red-700" };
  }

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", isbn13: "", description: "", initialCopyBarcode: "", initialCopyShelf: "" });
  const [addingBook, setAddingBook] = useState(false);

  useEffect(() => {
    const refreshSaved = () => setSavedIds(getSavedBooks(user?.id).map((book) => book.id));
    window.addEventListener("l360:saved-books-changed", refreshSaved);
    window.addEventListener("storage", refreshSaved);
    return () => { window.removeEventListener("l360:saved-books-changed", refreshSaved); window.removeEventListener("storage", refreshSaved); };
  }, [user?.id]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchBooks();
  }, [search, selectedCategory]);

  async function fetchBooks(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      setLoadError(null);
      const res = await api.getBooks(search || undefined, selectedCategory);
      setBooks(res.content);
    } catch (e) {
      if (!quiet) setBooks([]);
      if (!quiet) setLoadError(e instanceof Error ? e.message : "Unable to load the catalogue.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  // Stay live without manual refresh: poll + refetch on window focus.
  useLiveRefresh(() => { void fetchBooks(true); }, 30000);

  function handleToggleSaved(book: Book) {
    const saved = toggleSavedBook(book, user?.id);
    setSavedIds(getSavedBooks(user?.id).map((entry) => entry.id));
    setReserveSuccess(saved ? `“${book.title}” added to your reading list.` : `“${book.title}” removed from your reading list.`);
    setTimeout(() => setReserveSuccess(null), 3000);
  }

  async function handleReserve(book: Book) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/catalog?q=${encodeURIComponent(book.title)}`)}`);
      return;
    }
    if (user.roles.includes("ADMIN") || user.roles.includes("LIBRARIAN")) {
      setReserveSuccess(null);
      setReserveError("Staff accounts borrow at the desk — open Circulation to issue this title to a member.");
      setTimeout(() => setReserveError(null), 5000);
      return;
    }
    setReserveSuccess(null);
    setReserveError(null);
    try {
      await api.createReservation(book.id);
      setReserveSuccess(`Hold placed for "${book.title}". Check My Holds for status and pickup expiry.`);
      setTimeout(() => setReserveSuccess(null), 5000);
      setSelectedBook(null);
      // Counts and queue state changed server-side — refresh so cards never look static.
      await fetchBooks();
    } catch (err: any) {
      setReserveError(err.message || "Failed to create reservation. You may already hold an active reserve.");
      setTimeout(() => setReserveError(null), 5000);
    }
  }

  async function handleAddCopy(e: React.FormEvent, book: Book) {
    e.preventDefault();
    if (!copyBarcode.trim()) {
      setReserveError("Enter a barcode for the new physical copy.");
      return;
    }
    setAddingCopy(true);
    setReserveError(null);
    try {
      const updated = await api.addCopy(book.id, { barcode: copyBarcode, shelf: copyShelf });
      setSelectedBook(updated);
      setCopyBarcode("");
      setCopyShelf("");
      setReserveSuccess(`Copy ${copyBarcode.trim().toUpperCase()} added to "${book.title}".`);
      await loadCopies(book.id);
      await fetchBooks();
    } catch (err) {
      setReserveError(err instanceof Error ? err.message : "Unable to add the copy.");
    } finally {
      setAddingCopy(false);
    }
  }

  async function loadCopies(bookId: number) {
    setCopiesLoading(true);
    try {
      setCopies(await api.getBookCopies(bookId));
    } catch {
      setCopies([]);
    } finally {
      setCopiesLoading(false);
    }
  }

  function openDetails(book: Book) {
    setSelectedBook(book);
    setCopies([]);
    if (isStaff) void loadCopies(book.id);
  }

  async function handleCopyStatus(copy: BookCopy, status: string) {
    const note = copyStatusNote.trim();
    if (["LOST", "DAMAGED", "MAINTENANCE", "WITHDRAWN"].includes(status) && !window.confirm(`Mark copy ${copy.accessionNumber} as ${status}?`)) return;
    try {
      await api.setCopyStatus(copy.barcode, status, note || undefined);
      setCopyStatusNote("");
      if (selectedBook) {
        await loadCopies(selectedBook.id);
        await fetchBooks();
        const refreshed = await api.getBook(selectedBook.id);
        setSelectedBook(refreshed);
      }
    } catch (err) {
      setReserveError(err instanceof Error ? err.message : "Unable to update the copy.");
      setTimeout(() => setReserveError(null), 5000);
    }
  }

  async function handleDeleteBook(id: number) {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await api.deleteBook(id);
      setSelectedBook(null);
      setReserveSuccess("Book successfully deleted.");
      setTimeout(() => setReserveSuccess(null), 3000);
      fetchBooks();
    } catch (err: any) {
      setReserveError(err.message || "Failed to delete book.");
      setTimeout(() => setReserveError(null), 3000);
    }
  }

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newBook.title.trim() || !/^\d{13}$/.test(newBook.isbn13.trim()) || !newBook.initialCopyBarcode.trim()) {
      setReserveError("Enter a title, a valid 13-digit ISBN, and an initial copy barcode.");
      return;
    }
    setAddingBook(true);
    try {
      await api.addBook(newBook);
      setIsAddModalOpen(false);
      setNewBook({ title: "", isbn13: "", description: "", initialCopyBarcode: "", initialCopyShelf: "" });
      fetchBooks(); // Refresh catalog
    } catch (err: unknown) {
      setReserveError(err instanceof Error ? err.message : "Unable to add the book. Please try again.");
    } finally {
      setAddingBook(false);
    }
  }

  const categories = [
    { id: undefined, name: "All Titles" },
    { id: 12, name: "Computer Science" },
    { id: 13, name: "Physics" },
    { id: 1, name: "Fiction" },
    { id: 2, name: "Non-Fiction" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catalog & Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and search the library's complete collection of books.
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Live availability</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <Link to="/saved" className="button button-secondary catalog-reading-list-link"><BookmarkCheck size={16}/> Reading list <span>{savedIds.length}</span></Link>
        <button type="button" onClick={() => void fetchBooks()} className="button button-secondary" aria-label="Refresh catalog availability"><RotateCw size={15}/> Sync</button>
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-full border border-[#e5e7eb] shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-[#0b57d0] text-white shadow-sm"
                : "text-[#444746] hover:text-[#1f2937] hover:bg-[#f0f4f9]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-[#0b57d0] text-white shadow-sm"
                : "text-[#444746] hover:text-[#1f2937] hover:bg-[#f0f4f9]"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
        </div>
        {(user?.roles.includes("ADMIN") || user?.roles.includes("LIBRARIAN")) && (
          <Button onClick={() => setIsAddModalOpen(true)} className="ml-2 rounded-full shadow-sm">
            + Add Book
          </Button>
        )}
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={() => void fetchBooks()} className="font-semibold underline">Retry</button>
        </div>
      )}
      {reserveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{reserveSuccess}</span>
          </div>
          <button onClick={() => setReserveSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {reserveError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-medium">
            <X className="h-5 w-5 text-red-600" />
            <span>{reserveError}</span>
          </div>
          <button onClick={() => setReserveError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-white/50 backdrop-blur-md p-5 rounded-3xl border border-[#e5e7eb] shadow-sm space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#444746]" />
          <Input
            type="search"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-full bg-white border-transparent focus:bg-white focus:border-[#0b57d0] focus:ring-2 focus:ring-[#c2e7ff] shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.name}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  isSelected
                    ? "bg-[#c2e7ff] text-[#001d35] border-transparent"
                    : "bg-white text-[#444746] border-[#e5e7eb] hover:bg-[#f0f4f9] hover:text-[#1f2937]"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-slate-200 p-12 text-center bg-white shadow-sm">
          <Scroll className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-900">No books found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="group rounded-3xl border border-[#e5e7eb] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-48 w-full bg-[#f8fafd] overflow-hidden">
                <button type="button" className={`book-save-button ${savedIds.includes(book.id) ? "is-saved" : ""}`} onClick={() => handleToggleSaved(book)} aria-label={savedIds.includes(book.id) ? `Remove ${book.title} from reading list` : `Save ${book.title} to reading list`} title={savedIds.includes(book.id) ? "Remove from reading list" : "Save to reading list"}>{savedIds.includes(book.id) ? <SavedIcon size={17}/> : <Bookmark size={17}/>}</button>
                <img
                  src={book.coverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"}
                  alt={book.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-[10px] font-bold text-[#1f2937] tracking-wider shadow-sm">
                  {book.category?.name || "General"}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-[#1f2937] line-clamp-1" title={book.title}>
                  {book.title}
                </h3>
                <p className="text-sm text-[#444746] mt-1 line-clamp-1">
                  {book.authors?.map((a) => a.fullName).join(", ") || "Unknown Author"}
                </p>
                <p className="text-xs text-[#74777f] mt-3 line-clamp-2 flex-1">
                  {book.description}
                </p>

                <div className="flex items-center gap-4 text-[10px] text-[#444746] mt-4 mb-3 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {book.publishYear || "Year n/a"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> {book.pages ? `${book.pages}p` : "Pages n/a"}
                  </span>
                </div>

                <p className={`text-sm font-semibold mb-6 ${availabilityOf(book).tone}`}>
                  {availabilityOf(book).text}
                </p>

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetails(book)}
                    className="flex-1 rounded-full text-xs font-bold"
                  >
                    Details
                  </Button>
                  {(book.availableCopies ?? 0) > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => openDetails(book)}
                      className="flex-1 rounded-full text-xs font-bold bg-[#0b57d0]"
                      title="On the shelf — see details"
                    >
                      Available now
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleReserve(book)}
                      className="flex-1 rounded-full text-xs font-bold bg-[#0b57d0]"
                    >
                      Reserve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-[#e5e7eb] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#f8fafd] text-[#444746] text-xs uppercase tracking-wider font-bold border-b border-[#e5e7eb]">
                <tr>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Author</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">ISBN</th>
                  <th className="py-4 px-6">Availability</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="max-w-[200px] truncate">{book.title}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="max-w-[150px] truncate">{book.authors?.map((a) => a.fullName).join(", ")}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] uppercase tracking-wider font-semibold">
                        {book.category?.name || "General"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                      {book.isbn13}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-semibold ${availabilityOf(book).tone}`}>{availabilityOf(book).text}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={`icon-button table-save-button ${savedIds.includes(book.id) ? "is-saved" : ""}`} onClick={() => handleToggleSaved(book)} aria-label={savedIds.includes(book.id) ? "Remove from reading list" : "Save to reading list"}>{savedIds.includes(book.id) ? <SavedIcon size={16}/> : <Bookmark size={16}/>}</button>
                        <Button size="sm" variant="ghost" onClick={() => openDetails(book)} className="h-8">
                          Details
                        </Button>
                        {(book.availableCopies ?? 0) > 0 ? (
                          <Button size="sm" onClick={() => openDetails(book)} className="h-8" title="On the shelf — see details">
                            Available now
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleReserve(book)} className="h-8">
                            Reserve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col sm:flex-row gap-6 mt-2">
              <img
                src={selectedBook.coverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"}
                alt={selectedBook.title}
                className="w-32 h-48 object-cover rounded-lg shadow-sm border border-slate-200 shrink-0"
              />
              <div className="flex-1 space-y-3">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                  {selectedBook.category?.name || "General"}
                </span>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedBook.title}</h2>
                {selectedBook.subtitle && (
                  <p className="text-sm text-slate-500">{selectedBook.subtitle}</p>
                )}
                
                <div className="text-sm text-slate-600 space-y-1.5 pt-2">
                  <p>Author: <span className="font-medium text-slate-900">{selectedBook.authors?.map((a) => a.fullName).join(", ")}</span></p>
                  <p>Publisher: <span className="font-medium text-slate-900">{selectedBook.publisher?.name || "Not specified"}</span></p>
                  <p>ISBN-13: <span className="font-mono text-slate-900">{selectedBook.isbn13}</span></p>
                  <p>Availability: <span className={`font-semibold ${availabilityOf(selectedBook).tone}`}>{availabilityOf(selectedBook).text}</span></p>
                  <p className="text-slate-500">Total copies: {selectedBook.totalCopies ?? 0} · Issued: {selectedBook.issuedCopies ?? 0} · Held for pickup: {selectedBook.onHoldCopies ?? 0} · Waiting: {selectedBook.waitlistCount ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg">
                {selectedBook.description}
              </p>
            </div>

            {(user?.roles.includes("ADMIN") || user?.roles.includes("LIBRARIAN")) && (
              <form onSubmit={(e) => handleAddCopy(e, selectedBook)} className="mt-6 border-t border-slate-100 pt-5 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add Physical Copy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
                    <Input required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,39}" value={copyBarcode} onChange={(e) => setCopyBarcode(e.target.value)} placeholder="e.g. BK-2026-002" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf (Optional)</label>
                    <Input maxLength={40} value={copyShelf} onChange={(e) => setCopyShelf(e.target.value)} placeholder="e.g. CS-A1-03" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={addingCopy}>{addingCopy ? "Adding Copy…" : "Add Physical Copy"}</Button>
                </div>
              </form>
            )}

            {isStaff && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Physical copies ({copies.length})</h4>
                <p className="text-xs text-slate-500 mb-3">Every copy has a unique accession number. Retired copies never count as available.</p>
                {copiesLoading ? <p className="text-sm text-slate-500">Loading copies…</p> : copies.length === 0 ? <p className="text-sm text-slate-500">No copies recorded.</p> : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr><th className="py-2 px-3">Accession</th><th className="py-2 px-3">Barcode</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Shelf</th><th className="py-2 px-3">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {copies.map((copy) => (
                          <tr key={copy.id}>
                            <td className="py-2 px-3 font-mono font-semibold">{copy.accessionNumber}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{copy.barcode}</td>
                            <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold">{copy.status}</span></td>
                            <td className="py-2 px-3 text-slate-500">{copy.shelf || "—"}</td>
                            <td className="py-2 px-3">
                              <select aria-label={`Change status for ${copy.accessionNumber}`} value={copy.status} onChange={(e) => void handleCopyStatus(copy, e.target.value)} className="text-sm border border-slate-300 rounded-md px-2 py-1">
                                {["AVAILABLE", "LOST", "DAMAGED", "MAINTENANCE", "WITHDRAWN"].includes(copy.status)
                                  ? ["AVAILABLE", "LOST", "DAMAGED", "MAINTENANCE", "WITHDRAWN"].map((s) => <option key={s} value={s}>{s}</option>)
                                  : [<option key={copy.status} value={copy.status}>{copy.status} (in use)</option>, <option key="note" value={copy.status} disabled>Return or release first</option>]}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason note for the next status change (optional)</label>
                  <Input maxLength={300} value={copyStatusNote} onChange={(e) => setCopyStatusNote(e.target.value)} placeholder="e.g. Water damage, pages 40–60" />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              {(user?.roles.includes("ADMIN") || user?.roles.includes("LIBRARIAN")) && (
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteBook(selectedBook.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              )}
              <div className="flex-1"></div>
              <Button variant="outline" onClick={() => handleToggleSaved(selectedBook)}><BookmarkCheck className="h-4 w-4 mr-2"/>{savedIds.includes(selectedBook.id) ? "Saved" : "Save book"}</Button>
              <Button variant="outline" onClick={() => setSelectedBook(null)}>
                Close
              </Button>
              {(selectedBook.availableCopies ?? 0) > 0 ? (
                <Button variant="outline" onClick={() => setSelectedBook(null)}>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  On the shelf — visit the desk
                </Button>
              ) : (
                <Button onClick={() => handleReserve(selectedBook)}>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Place Hold
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Book</h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <Input required value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} placeholder="e.g. Clean Code" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN-13</label>
                <Input required value={newBook.isbn13} onChange={e => setNewBook({...newBook, isbn13: e.target.value})} placeholder="9780132350884" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Copy Barcode</label>
                <Input required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,39}" value={newBook.initialCopyBarcode} onChange={e => setNewBook({...newBook, initialCopyBarcode: e.target.value})} placeholder="e.g. BK-2026-001" />
                <p className="mt-1 text-xs text-slate-500">Create the first physical copy with the title so it can be checked out.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location (Optional)</label>
                <Input maxLength={40} value={newBook.initialCopyShelf} onChange={e => setNewBook({...newBook, initialCopyShelf: e.target.value})} placeholder="e.g. CS-A1-03" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full h-24 px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-900 resize-none" 
                  value={newBook.description} 
                  onChange={e => setNewBook({...newBook, description: e.target.value})}
                  placeholder="Book summary..." 
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addingBook}>
                  {addingBook ? "Adding..." : "Add Book"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
