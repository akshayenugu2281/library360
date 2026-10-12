const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "/api/v1").trim().replace(/\/$/, "");
const API_BASE = rawApiBase.endsWith("/api/v1") ? rawApiBase : `${rawApiBase}/api/v1`;


export interface SignupFieldRule {
  accountType: "STUDENT" | "FACULTY";
  fieldKey: string;
  label: string;
  enabled: boolean;
  required: boolean;
  sortOrder: number;
}

export interface RegistrationInput {
  firstName: string; lastName: string; email: string; password: string;
  accountType: "STUDENT" | "FACULTY";
  phoneNumber?: string; dateOfBirth?: string; admissionNumber?: string; rollNumber?: string;
  branch?: string; academicYear?: string; className?: string; section?: string;
  facultyId?: string; employeeNumber?: string; department?: string; designation?: string;
}
export interface RegistrationResult { message: string; accountType: "STUDENT" | "FACULTY"; approvalStatus: "PENDING"; email: string; }

export interface PageData<T> {
  content: T[];
  page?: number;
  size?: number;
  totalElements: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

export interface Book {
  id: number;
  isbn13: string;
  title: string;
  subtitle?: string;
  edition?: string;
  publishYear?: number;
  language: string;
  pages?: number;
  description?: string;
  coverUrl?: string;
  availableCopies?: number;
  totalCopies?: number;
  issuedCopies?: number;
  onHoldCopies?: number;
  waitlistCount?: number;
  category?: { id: number; name: string; slug: string };
  publisher?: { id: number; name: string; website?: string };
  authors?: Array<{ id: number; fullName: string; bio?: string }>;
}

export interface BookCopy {
  id: number;
  accessionNumber: string;
  barcode: string;
  shelf?: string;
  condition?: string;
  status: string;
  notes?: string;
}

export interface Member {
  id: number;
  userId?: number;
  email?: string;
  fullName?: string;
  memberCode: string;
  memberType: "STUDENT" | "FACULTY";
  department?: string;
  phone?: string;
  address?: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validUntil: string;
}

export interface Loan {
  id: number;
  copyId?: number;
  copyBarcode?: string;
  bookId?: number;
  bookTitle?: string;
  bookIsbn?: string;
  memberId: number;
  memberCode?: string;
  memberName?: string;
  issuedAt: string;
  dueAt: string;
  returnedAt?: string;
  renewCount: number;
  status: "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST";
}

export interface Reservation {
  id: number;
  bookId: number;
  bookTitle?: string;
  bookIsbn?: string;
  memberId: number;
  memberCode?: string;
  memberName?: string;
  status: "QUEUED" | "READY" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  queuedAt: string;
  readyAt?: string;
  expiresAt?: string;
  assignedBarcode?: string;
  assignedAccession?: string;
  queuePosition?: number;
  queueLength?: number;
  estimatedAvailableAt?: string;
}

export interface Fine {
  id: number;
  loanId?: number;
  memberId: number;
  memberName?: string;
  memberCode?: string;
  reason: "OVERDUE" | "DAMAGE" | "LOST_ITEM";
  amount: number;
  paidAmount: number;
  status: "OPEN" | "PARTIAL" | "PAID" | "WAIVED";
  createdAt: string;
}

export interface ReturnResult {
  loan: Loan;
  fine: Fine | null;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  authorities: string[];
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function storedRoles(): string[] {
  try {
    const saved = localStorage.getItem("l360_user");
    const parsed = saved ? JSON.parse(saved) as { roles?: unknown } : null;
    return Array.isArray(parsed?.roles) ? parsed.roles.filter((role): role is string => typeof role === "string") : [];
  } catch {
    return [];
  }
}

function isStaff(): boolean {
  const roles = storedRoles();
  return roles.includes("ADMIN") || roles.includes("LIBRARIAN");
}

// A dashboard fires multiple requests concurrently. Share one refresh request so
// refresh-token rotation cannot accidentally invalidate the session via races.
let refreshInFlight: Promise<AuthResult | null> | null = null;

function isPublicAuthEndpoint(path: string): boolean {
  return ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/signup-fields", "/auth/forgot-password"].some(
    (endpoint) => path === endpoint || path.startsWith(`${endpoint}?`),
  );
}

function refreshAccessToken(): Promise<AuthResult | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) return null;
        const refreshed = await response.json() as AuthResult;
        if (!refreshed?.accessToken) return null;
        localStorage.setItem("l360_token", refreshed.accessToken);
        window.dispatchEvent(new CustomEvent("l360:token-refreshed", { detail: refreshed }));
        return refreshed;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) {
    if (!response.ok) throw new ApiError(`Request failed with status ${response.status}.`, response.status);
    return undefined as T;
  }

  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.detail === "string"
      ? body.detail
      : typeof body.message === "string"
        ? body.message
        : typeof body.title === "string"
          ? body.title
          : `Request failed with status ${response.status}.`;
    throw new ApiError(
      message,
      response.status,
      typeof body.code === "string" ? body.code : undefined,
      body.errors && typeof body.errors === "object" ? body.errors as Record<string, string> : undefined,
    );
  }
  return body as T;
}

async function performFetch(path: string, options: RequestInit = {}, retryAfterRefresh = true): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken = localStorage.getItem("l360_token");
  if (accessToken && !isPublicAuthEndpoint(path)) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Cannot reach the Library360 API. Check that the backend is running and the API URL is configured.", 0);
  }

  if (response.status === 401 && retryAfterRefresh && !isPublicAuthEndpoint(path)) {
    const latestToken = localStorage.getItem("l360_token");
    // A parallel request may already have rotated the refresh token before this 401 arrives.
    if (accessToken && latestToken && latestToken !== accessToken) {
      return performFetch(path, options, false);
    }
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return performFetch(path, options, false);
    }
    localStorage.removeItem("l360_token");
    window.dispatchEvent(new Event("l360:session-expired"));
  }

  return response;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return parseResponse<T>(await performFetch(path, options));
}

function pagePath(path: string, page = 0, size = 100): string {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return `${path}?${params.toString()}`;
}

export const api = {
  request,
  async login(email: string, password: string, accountType?: "ADMIN" | "LIBRARIAN" | "FACULTY" | "STUDENT"): Promise<AuthResult> {
    return request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, accountType }),
    });
  },
  async registerAccount(input: RegistrationInput): Promise<RegistrationResult> {
    // Public signup is restricted to Student/Faculty and returns a pending approval state.
    const payload = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    return request<RegistrationResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...payload, email: input.email.trim().toLowerCase(), dateOfBirth: input.dateOfBirth || null }),
    });
  },
  async logout(): Promise<void> {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("l360_token");
      localStorage.removeItem("l360_user");
    }
  },
  async getBooks(q?: string, categoryId?: number): Promise<PageData<Book>> {
    const params = new URLSearchParams({ page: "0", size: "100" });
    if (q?.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", String(categoryId));
    return request<PageData<Book>>(`/catalog/books?${params.toString()}`);
  },
  async addBook(data: Partial<Book> & { initialCopyBarcode?: string; initialCopyShelf?: string }): Promise<Book> {
    const payload = {
      isbn13: data.isbn13?.trim() || null,
      title: data.title?.trim(),
      subtitle: data.subtitle,
      edition: data.edition,
      publishYear: data.publishYear,
      language: data.language || "en",
      pages: data.pages,
      description: data.description,
      coverUrl: data.coverUrl,
      categoryId: data.category?.id,
      publisherId: data.publisher?.id,
      authorIds: data.authors?.map((author) => author.id),
      initialCopyBarcode: data.initialCopyBarcode?.trim(),
      initialCopyShelf: data.initialCopyShelf?.trim() || null,
    };
    return request<Book>("/catalog/books", { method: "POST", body: JSON.stringify(payload) });
  },
  async addCopy(bookId: number, input: { barcode: string; shelf?: string; notes?: string }): Promise<Book> {
    return request<Book>(`/catalog/books/${bookId}/copies`, {
      method: "POST",
      body: JSON.stringify({ barcode: input.barcode.trim(), shelf: input.shelf?.trim() || null, notes: input.notes?.trim() || null }),
    });
  },
  async getBook(id: number): Promise<Book> {
    return request<Book>(`/catalog/books/${id}`);
  },
  async getBookCopies(bookId: number): Promise<BookCopy[]> {
    return request<BookCopy[]>(`/catalog/books/${bookId}/copies`);
  },
  async setCopyStatus(barcode: string, status: string, note?: string): Promise<BookCopy> {
    return request<BookCopy>(`/catalog/copies/${encodeURIComponent(barcode)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note: note || null }),
    });
  },
  async deleteBook(id: number): Promise<void> {
    await request<void>(`/catalog/books/${id}`, { method: "DELETE" });
  },
  async getMembers(): Promise<PageData<Member>> {
    return request<PageData<Member>>(pagePath("/members"));
  },
  async registerMember(data: Partial<Member> & { password?: string; email: string; fullName: string; memberCode: string; memberType: "STUDENT" | "FACULTY" }): Promise<Member> {
    return request<Member>("/members", { method: "POST", body: JSON.stringify(data) });
  },
  async deleteMember(id: number): Promise<void> {
    await request<void>(`/members/${id}`, { method: "DELETE" });
  },
  async getLoans(): Promise<PageData<Loan>> {
    const path = isStaff() ? "/circulation/loans" : "/circulation/my-loans";
    return request<PageData<Loan>>(pagePath(path));
  },
  async issueBook(barcode: string, memberId: number): Promise<Loan> {
    return request<Loan>("/circulation/issue", {
      method: "POST",
      body: JSON.stringify({ barcode: barcode.trim(), memberId }),
    });
  },
  async returnBook(barcode: string): Promise<ReturnResult> {
    return request<ReturnResult>("/circulation/return", {
      method: "POST",
      body: JSON.stringify({ barcode: barcode.trim() }),
    });
  },
  async renewLoan(loanId: number): Promise<Loan> {
    return request<Loan>(`/circulation/renew/${loanId}`, { method: "POST" });
  },
  async getReservations(): Promise<PageData<Reservation>> {
    const path = isStaff() ? "/reservations" : "/reservations/my";
    return request<PageData<Reservation>>(pagePath(path));
  },
  async createReservation(bookId: number, memberId?: number): Promise<Reservation> {
    const body: { bookId: number; memberId?: number } = { bookId };
    if (isStaff() && memberId !== undefined) body.memberId = memberId;
    return request<Reservation>("/reservations", { method: "POST", body: JSON.stringify(body) });
  },
  async cancelReservation(id: number): Promise<void> {
    await request<void>(`/reservations/${id}`, { method: "DELETE" });
  },
  async getFines(): Promise<PageData<Fine>> {
    const path = isStaff() ? "/fines" : "/fines/my-fines";
    return request<PageData<Fine>>(pagePath(path));
  },
  async payFine(fineId: number, amount: number, method: string): Promise<Fine> {
    return request<Fine>(`/fines/${fineId}/pay`, {
      method: "POST",
      body: JSON.stringify({ amount, method }),
    });
  },
  async waiveFine(fineId: number, reason: string): Promise<Fine> {
    return request<Fine>(`/fines/${fineId}/waive`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};
