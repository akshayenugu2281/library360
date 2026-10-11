import { useMemo, useState } from "react";
import { Book, FileText, MessageCircle, Mail, HelpCircle, Search, Info } from "lucide-react";

type FAQ = { question: string; answer: string; keywords: string };

const FAQS: FAQ[] = [
  {
    question: "How do I find a book?",
    answer: "Open Catalog and search by title, author, or ISBN. The available-copy count is based on records returned by the backend.",
    keywords: "catalog search title author isbn find book availability",
  },
  {
    question: "How do I sign up?",
    answer: "Use the Sign Up page and enter your name, email, and password. Public registration creates a Student account; faculty accounts are provisioned by authorized staff.",
    keywords: "signup register account student faculty member",
  },
  {
    question: "Why can’t I issue or return a book?",
    answer: "Issuing and returning items require a staff account with the correct permissions. Ask a librarian if your role is incorrect or your membership is not active.",
    keywords: "issue return book circulation staff role permission active membership",
  },
  {
    question: "How are overdue fines handled?",
    answer: "The system calculates overdue charges from loan due dates. A payment entry in this project is an administrative record; a payment gateway is not configured.",
    keywords: "fine overdue payment gateway money amount",
  },
  {
    question: "Why does the application show an API error?",
    answer: "Check that the backend and database are running and that the browser is using the correct deployment URL. API errors are shown rather than replaced with sample records.",
    keywords: "api error backend database server connection deployment",
  },
  {
    question: "Can I change my profile or password here?",
    answer: "The current backend does not expose profile-edit, avatar-upload, or password-change endpoints. Contact the system administrator for account maintenance.",
    keywords: "profile password avatar edit account security",
  },
];

export function HelpPage() {
  const [search, setSearch] = useState("");
  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return FAQS;
    return FAQS.filter((faq) => `${faq.question} ${faq.answer} ${faq.keywords}`.toLowerCase().includes(query));
  }, [search]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      <div className="text-center max-w-2xl mx-auto pt-8">
        <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">How can we help you?</h1>
        <p className="text-slate-500 mb-6">Search the local help guide for common workflows and current project limitations.</p>
        <div role="search" className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search help articles"
            placeholder="Search help and FAQs..."
            className="w-full h-12 pl-11 pr-4 rounded-full border border-slate-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-slate-100">
        <a href="#faqs" onClick={() => setSearch("")} className="block p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <Book className="h-6 w-6 text-indigo-600 mb-4" />
          <h2 className="font-bold text-slate-900 mb-2">User Guide</h2>
          <p className="text-sm text-slate-500">Review the workflows supported by the current application.</p>
        </a>
        <a href="#faqs" onClick={() => setSearch("")} className="block p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <FileText className="h-6 w-6 text-emerald-600 mb-4" />
          <h2 className="font-bold text-slate-900 mb-2">FAQs</h2>
          <p className="text-sm text-slate-500">Find practical answers for accounts, catalog, circulation, and fines.</p>
        </a>
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <MessageCircle className="h-6 w-6 text-amber-500 mb-4" />
          <h2 className="font-bold text-slate-900 mb-2">Community Forum</h2>
          <p className="text-sm text-slate-500">A forum integration has not been configured for this project.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Mail className="h-6 w-6 text-red-500 mb-4" />
          <h2 className="font-bold text-slate-900 mb-2">Contact Support</h2>
          <p className="text-sm text-slate-500">There is no ticketing backend configured. Contact your institution’s Library360 administrator.</p>
        </div>
      </div>

      <section id="faqs" className="space-y-4 scroll-mt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-500 mt-1">{filteredFaqs.length} {filteredFaqs.length === 1 ? "article" : "articles"} matching your search</p>
          </div>
        </div>
        {filteredFaqs.length > 0 ? (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <details key={faq.question} className="rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">{faq.question}</summary>
                <p className="text-sm leading-6 text-slate-600 mt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="font-medium text-slate-800">No help articles match “{search}”.</p>
            <button type="button" onClick={() => setSearch("")} className="text-sm text-indigo-700 underline mt-2">Clear search</button>
          </div>
        )}
      </section>

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-700 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-indigo-900 mb-1">Need help from an administrator?</h2>
          <p className="text-sm text-indigo-800">Share the exact error message, the page you were using, and the time it occurred. Do not share passwords, access tokens, or database credentials.</p>
        </div>
      </div>
    </div>
  );
}
