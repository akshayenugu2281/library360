import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, BookmarkCheck, CheckCircle2, Compass, GraduationCap, LibraryBig, Search, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { useState } from "react";

const roles = [
  { icon: GraduationCap, name: "Student", tag: "READ & BORROW", description: "Borrow, reserve, and renew from your own shelf. Reading lists, due dates, and fines — always in view." },
  { icon: BookOpen, name: "Faculty", tag: "RESEARCH & TEACH", description: "Higher limits, longer loans, and first priority on returned copies. Research without the wait." },
  { icon: LibraryBig, name: "Librarian", tag: "RUN THE DESK", description: "Issue and check in books, verify new members, send reminders, and keep every queue moving." },
  { icon: ShieldCheck, name: "Admin", tag: "STEWARD IT ALL", description: "Accounts, lending policies, analytics, and the AI assistant — every change auditable." },
];

const collections = [
  { number: "01", icon: Compass, title: "Explore with purpose", description: "Search by title, author, ISBN, or subject and move from discovery to details without friction." },
  { number: "02", icon: BookmarkCheck, title: "Keep your next read close", description: "Save titles to a personal reading list and place a hold when a copy is unavailable." },
  { number: "03", icon: ShieldCheck, title: "Library operations, in sync", description: "Role-aware workspaces bring circulation, membership, reservations, and fine tracking together." },
];

export function LandingPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = query.trim();
    navigate(cleaned ? `/catalog?q=${encodeURIComponent(cleaned)}` : "/catalog");
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark"><BookOpen size={23} strokeWidth={2.2} /></span>
          <span className="brand-wordmark">Library<span>360</span><small>SMART LIBRARY PLATFORM</small></span>
        </Link>
        <div className="landing-nav-links"><a href="#features">Platform</a><a href="#workflow">How it works</a></div>
        <div className="landing-nav-actions"><Link className="text-link" to="/login">Sign in</Link><Link className="button button-primary" to="/signup">Create account <ArrowRight size={16} /></Link></div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR LIBRARY, REIMAGINED</div>
          <h1>Find your next<br /><em>great idea.</em></h1>
          <p className="hero-description">A calmer, smarter way to discover books and manage everything that happens around them. One beautiful workspace for readers and library teams.</p>
          <form className="hero-search" onSubmit={search} role="search">
            <Search size={21} aria-hidden="true" />
            <input aria-label="Search books" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try a title, author, or ISBN" />
            <button type="submit" aria-label="Search books"><ArrowRight size={19} /></button>
          </form>
          <div className="hero-assurance"><CheckCircle2 size={16} /> Personal reading list <span /> <CheckCircle2 size={16} /> Real-time account-backed workflows</div>
          <div className="hero-cta-row"><Link to="/signup" className="button button-primary button-large">Start exploring <ArrowRight size={17} /></Link><Link to="/login" className="button button-secondary button-large">I already have an account</Link></div>
        </div>

        <div className="hero-art" aria-label="Illustration of a digital library workspace">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="book-stack-card card-back"><span className="book-spine spine-green" /><div><small>RECOMMENDED</small><strong>Ideas that<br />change things.</strong><i>Explore beyond the obvious.</i></div></div>
          <div className="book-stack-card card-main"><div className="book-cover-art"><span className="cover-label">FIELD NOTES / 2026</span><div className="cover-sun" /><div className="cover-lines"><span /><span /><span /></div><small>THE ART OF<br />LEARNING</small></div><div className="art-book-info"><span className="availability-dot" /> DISCOVER SOMETHING NEW<strong>Your next chapter awaits.</strong><div className="art-pills"><span>Curated</span><span>Personal</span><span>Connected</span></div></div></div>
          <div className="floating-note note-top"><Sparkles size={16} /><div><strong>Curiosity, organized</strong><small>A space for every next read</small></div></div>
          <div className="floating-note note-bottom"><div className="note-icon"><BookmarkCheck size={17} /></div><div><strong>Save it for later</strong><small>Your list, always within reach</small></div><ArrowRight size={15} /></div>
          <div className="art-stamp"><LibraryBig size={17} /><span>Read<br />more.</span></div>
        </div>
      </section>

      <section className="trust-strip"><div><span className="trust-number">01</span><p><strong>Discover</strong><small>Search a connected catalog</small></p></div><span className="trust-divider"/><div><span className="trust-number">02</span><p><strong>Organize</strong><small>Save books worth returning to</small></p></div><span className="trust-divider"/><div><span className="trust-number">03</span><p><strong>Stay on track</strong><small>Keep holds and loans in view</small></p></div><div className="trust-side-note"><Zap size={16} /> Designed for everyday library life</div></section>

      <section className="feature-section" id="features">
        <div className="section-intro"><div className="eyebrow">LESS FRICTION. MORE DISCOVERY.</div><h2>Everything you need.<br /><em>Nothing in the way.</em></h2><p>From a reader's first search to a librarian's final check-in, each workflow is designed to feel clear and deliberate.</p></div>
        <div className="feature-grid">{collections.map(({ number, icon: Icon, title, description }) => <article className="feature-card" key={number}><div className="feature-icon"><Icon size={22} /></div><span className="feature-number">{number}</span><h3>{title}</h3><p>{description}</p><Link to="/signup" aria-label={`Get started: ${title}`}>Explore feature <ArrowRight size={15} /></Link></article>)}</div>
      </section>

      <section className="roles-section" aria-label="Who Library360 serves">
        <div className="roles-intro"><div className="eyebrow">MADE FOR EVERY READER</div><h2>One library, <em>four front doors.</em></h2><p>Each role opens a workspace shaped around it — students and faculty borrow, librarians run the desk, admins steward the institution.</p></div>
        <div className="roles-grid">{roles.map(({ icon: Icon, name, tag, description }) => <article className="role-card" key={name}><span className="role-card-icon"><Icon size={22} /></span><span>{tag}</span><strong>{name}</strong><p>{description}</p></article>)}</div>
      </section>

      <section className="workflow-banner" id="workflow"><div className="workflow-icon"><Users size={24} /></div><div><div className="eyebrow">BUILT FOR READERS AND TEAMS</div><h2>One library. Different perspectives.</h2><p>Readers see their own loans, holds, and fines. Authorized staff get operational tools for catalog, members, and circulation.</p></div><Link to="/signup" className="button button-light">Get started <ArrowRight size={16} /></Link></section>

      <footer className="landing-footer"><Link to="/" className="brand-lockup"><span className="brand-mark"><BookOpen size={19} /></span><span className="brand-wordmark">Library<span>360</span></span></Link><span>Designed to make room for better reading.</span><div><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></div></footer>
    </main>
  );
}
