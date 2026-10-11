import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, BookOpen, CalendarDays, Trash2 } from "lucide-react";
import type { Book } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getSavedBooks, removeSavedBook } from "../lib/savedBooks";

export function SavedBooksPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [notice, setNotice] = useState("");
  const refresh = useCallback(() => setBooks(getSavedBooks(user?.id)), [user?.id]);
  useEffect(() => {
    refresh();
    const update = () => refresh();
    window.addEventListener("l360:saved-books-changed", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("l360:saved-books-changed", update); window.removeEventListener("storage", update); };
  }, [refresh]);

  const handleRemove = (bookId: number) => {
    removeSavedBook(bookId, user?.id);
    setNotice("Book removed from your reading list.");
    window.setTimeout(() => setNotice(""), 3000);
  };

  return <div className="page-flow animate-in fade-in duration-300">
    <div className="page-heading-row"><div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>Saved books<span className="heading-count">{books.length}</span></h1><p>Keep the books that caught your eye in one easy-to-return-to place.</p></div><Link to="/catalog" className="button button-primary"><BookOpen size={17}/> Discover books <ArrowRight size={16}/></Link></div>
    {notice && <div className="inline-notice notice-success" role="status">{notice}</div>}
    {books.length === 0 ? <section className="empty-state-card"><div className="empty-state-icon"><Bookmark size={25}/></div><h2>Your reading list starts here</h2><p>Save titles from the catalog to build a shortlist for your next visit.</p><Link to="/catalog" className="button button-primary">Browse the catalog <ArrowRight size={16}/></Link></section> : <div className="saved-book-grid">{books.map((book) => <article className="saved-book-card" key={book.id}><div className="saved-book-cover"><img src={book.coverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=480&q=80"} alt={book.title} loading="lazy"/><span>{book.category?.name || "General"}</span></div><div className="saved-book-content"><h2>{book.title}</h2><p>{book.authors?.map((author) => author.fullName).join(", ") || "Author not listed"}</p><div className="saved-book-meta"><span><CalendarDays size={14}/>{book.publishYear || "Year n/a"}</span><span className={(book.availableCopies ?? 0) > 0 ? "stock-available" : "stock-unavailable"}><i/> {(book.availableCopies ?? 0) > 0 ? "Available" : "On loan"}</span></div><div className="saved-book-actions"><Link to={`/catalog?q=${encodeURIComponent(book.title)}`} className="button button-secondary">View in catalog</Link><button type="button" className="icon-button danger" onClick={() => handleRemove(book.id)} aria-label={`Remove ${book.title} from saved books`}><Trash2 size={16}/></button></div></div></article>)}</div>}
    <div className="feature-tip"><BookmarkCheck size={18}/><p><strong>{user ? "Saved on this device" : "Guest reading list"}</strong><span>{user ? "Your reading list is stored locally in this browser and associated with the active account on this device. It is not synced across devices yet." : "Your guest list is stored locally in this browser. Create an account to transfer these saved titles into your account on this device."}</span></p></div>
  </div>;
}
