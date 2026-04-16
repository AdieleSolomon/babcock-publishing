const runtimeApiBase =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
  localStorage.getItem("API_BASE_URL_OVERRIDE");

const API_BASE_URL = (runtimeApiBase ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "/api")
).replace(/\/+$/, "");

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  loadPublishedBooksCatalog();
});

async function loadPublishedBooksCatalog() {
  const statusElement = document.getElementById("publishedBooksStatus");
  const gridElement = document.getElementById("publishedBooksGrid");

  if (!statusElement || !gridElement) return;

  setCatalogStatus("Loading published books...", "loading");

  try {
    const response = await fetch(`${API_BASE_URL}/books/published`, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load published books");
    }

    const books = Array.isArray(data.books) ? data.books : [];
    updateCatalogSummary(books);

    if (books.length === 0) {
      gridElement.innerHTML = `
        <article class="press-card press-publication-empty">
          <i class="fas fa-book"></i>
          <h3>No published books yet</h3>
          <p>Check back soon for the latest BU Press titles.</p>
        </article>
      `;
      setCatalogStatus(
        "No published books are available in the live catalog yet.",
        "success",
      );
      return;
    }

    gridElement.innerHTML = books.map(renderBookCard).join("");
    setCatalogStatus(
      `${books.length} published book${books.length === 1 ? "" : "s"} loaded from the live catalog.`,
      "success",
    );
  } catch (error) {
    console.error("Publications catalog error:", error);
    updateCatalogSummary([]);
    gridElement.innerHTML = `
      <article class="press-card press-publication-empty">
        <i class="fas fa-triangle-exclamation"></i>
        <h3>Unable to load the published catalog</h3>
        <p>Please refresh the page or try again shortly.</p>
      </article>
    `;
    setCatalogStatus(error.message || "Failed to load published books.", "error");
  }
}

function updateCatalogSummary(books) {
  const countElement = document.getElementById("publishedBooksCount");
  const latestYearElement = document.getElementById("publishedBooksLatestYear");
  const categoryCountElement = document.getElementById(
    "publishedBooksCategoryCount",
  );

  if (countElement) {
    countElement.textContent = String(books.length);
  }

  if (latestYearElement) {
    latestYearElement.textContent = getLatestPublicationYear(books);
  }

  if (categoryCountElement) {
    categoryCountElement.textContent = String(countDistinctCategories(books));
  }
}

function renderBookCard(book) {
  const title = escapeHtml(book.title || "Untitled publication");
  const category = escapeHtml(book.category || "Academic");
  const authorHeading = escapeHtml(formatAuthorHeading(book));
  const authorAffiliation = escapeHtml(getAuthorAffiliation(book));
  const authorSnapshot = escapeHtml(getAuthorSnapshot(book));
  const description = escapeHtml(
    truncateText(
      book.description || book.abstract || "Published by Babcock University Press.",
      160,
    ),
  );
  const publicationYear = escapeHtml(getPublicationYear(book));
  const price = escapeHtml(formatPrice(book));
  const coverImage = book.cover_image
    ? `<img src="${escapeHtml(resolveAssetUrl(book.cover_image))}" alt="Cover of ${title}" loading="lazy" />`
    : '<i class="fas fa-book"></i>';

  return `
    <article class="publication-card">
      <div class="publication-image">
        ${coverImage}
      </div>
      <div class="publication-content">
        <span class="publication-category">${category}</span>
        <h3 class="publication-title">${title}</h3>
        <div class="publication-author-block">
          <p class="publication-author"><i class="fas fa-user"></i> ${authorHeading}</p>
          ${
            authorAffiliation
              ? `<p class="publication-author-details"><i class="fas fa-building-columns"></i> ${authorAffiliation}</p>`
              : ""
          }
          ${
            authorSnapshot
              ? `<p class="publication-author-bio">${authorSnapshot}</p>`
              : ""
          }
        </div>
        <p class="publication-description">${description}</p>
        <div class="publication-meta">
          <span><i class="far fa-calendar"></i> ${publicationYear}</span>
          <div class="publication-price">${price}</div>
        </div>
      </div>
    </article>
  `;
}

function formatAuthorHeading(book) {
  const authorName = String(book.author_name || "Babcock Author").trim();
  const qualifications = String(book.author_qualifications || "").trim();

  return qualifications ? `${authorName}, ${qualifications}` : authorName;
}

function getAuthorAffiliation(book) {
  return [book.author_faculty, book.author_department]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" • ");
}

function getAuthorSnapshot(book) {
  const biography = String(book.author_biography || "").trim();
  if (biography) {
    return truncateText(biography, 120);
  }

  const expertise = String(book.author_areas_of_expertise || "")
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");

  return expertise;
}

function setCatalogStatus(message, state) {
  const statusElement = document.getElementById("publishedBooksStatus");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function getLatestPublicationYear(books) {
  const years = books
    .map((book) => Number.parseInt(getPublicationYear(book), 10))
    .filter((year) => Number.isFinite(year));

  if (years.length === 0) return "--";

  return String(Math.max(...years));
}

function countDistinctCategories(books) {
  return new Set(
    books
      .map((book) => (book.category || "").trim().toLowerCase())
      .filter(Boolean),
  ).size;
}

function getPublicationYear(book) {
  const rawDate = book.publication_date || book.created_at;
  if (!rawDate) return "Recent";

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return "Recent";

  return String(parsedDate.getFullYear());
}

function formatPrice(book) {
  if (book.is_open_access) {
    return "Open Access";
  }

  const numericPrice = Number(book.price);
  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    return priceFormatter.format(numericPrice);
  }

  return "Available";
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function resolveAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiOrigin = getApiOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${apiOrigin}${normalizedPath}`;
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL, window.location.origin).origin;
  } catch (error) {
    return window.location.origin;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
