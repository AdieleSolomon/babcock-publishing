const runtimeApiBase =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
  localStorage.getItem("API_BASE_URL_OVERRIDE");

const API_BASE_URL = (runtimeApiBase ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "/api")
).replace(/\/+$/, "");

document.addEventListener("DOMContentLoaded", () => {
  loadAuthorsDirectory();
});

async function loadAuthorsDirectory() {
  const statusElement = document.getElementById("authorsDirectoryStatus");
  const gridElement = document.getElementById("authorsDirectoryGrid");

  if (!statusElement || !gridElement) return;

  setDirectoryStatus("Loading registered authors and contributors...", "loading");

  try {
    const response = await fetch(`${API_BASE_URL}/authors/directory`, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load authors");
    }

    const authors = Array.isArray(data.authors) ? data.authors : [];
    updateDirectorySummary(authors);

    if (authors.length === 0) {
      gridElement.innerHTML = `
        <article class="press-card press-publication-empty">
          <i class="fas fa-users"></i>
          <h3>No registered authors yet</h3>
          <p>The public author directory will appear here as approved author profiles become available.</p>
        </article>
      `;
      setDirectoryStatus(
        "No registered authors are available in the public directory yet.",
        "success",
      );
      return;
    }

    gridElement.innerHTML = authors.map(renderAuthorCard).join("");
    setDirectoryStatus(
      `${authors.length} author profile${authors.length === 1 ? "" : "s"} loaded from the live directory.`,
      "success",
    );
  } catch (error) {
    console.error("Authors directory error:", error);
    updateDirectorySummary([]);
    gridElement.innerHTML = `
      <article class="press-card press-publication-empty">
        <i class="fas fa-triangle-exclamation"></i>
        <h3>Unable to load the author directory</h3>
        <p>Please refresh the page or try again shortly.</p>
      </article>
    `;
    setDirectoryStatus(error.message || "Failed to load authors.", "error");
  }
}

function updateDirectorySummary(authors) {
  const countElement = document.getElementById("authorsDirectoryCount");
  const facultyCountElement = document.getElementById("authorsFacultyCount");
  const latestYearElement = document.getElementById("authorsLatestYear");

  if (countElement) {
    countElement.textContent = String(authors.length);
  }

  if (facultyCountElement) {
    facultyCountElement.textContent = String(countDistinctFaculties(authors));
  }

  if (latestYearElement) {
    latestYearElement.textContent = getLatestPublicationYear(authors);
  }
}

function renderAuthorCard(author) {
  const authorName = escapeHtml(author.full_name || "Babcock Author");
  const publishedBooksCountValue = Number.parseInt(author.published_books_count, 10);
  const publishedBooksCount = Number.isFinite(publishedBooksCountValue)
    ? publishedBooksCountValue
    : 0;
  const biography = escapeHtml(
    truncateText(
      author.biography ||
        "Registered contributor in the Babcock University Press network.",
      200,
    ),
  );
  const faculty = escapeHtml(author.faculty || "Babcock University");
  const department = escapeHtml(author.department || "Publishing network");
  const qualifications = escapeHtml(author.qualifications || "Author");
  const authorLabel = publishedBooksCount > 0 ? "Published author" : "Registered author";
  const latestYear = escapeHtml(getPublicationYear(author.latest_publication_date));
  const expertiseTags = getExpertiseTags(author.areas_of_expertise);
  const featuredTitles = Array.isArray(author.featured_titles)
    ? author.featured_titles
    : [];
  const avatarUrl = resolveAuthorImageUrl(author.profile_image);

  const avatarMarkup = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="${authorName}" loading="lazy" />`
    : '<i class="fas fa-feather-pointed" aria-hidden="true"></i>';

  return `
    <article class="press-card press-author-card">
      <div class="press-author-top">
        <div class="press-author-avatar">
          ${avatarMarkup}
        </div>
        <div class="press-author-copy">
          <span>${authorLabel}</span>
          <h3>${authorName}</h3>
          <p>${qualifications}</p>
        </div>
      </div>

      <div class="press-author-facts">
        <div>
          <strong>Faculty</strong>
          <span>${faculty}</span>
        </div>
        <div>
          <strong>Department</strong>
          <span>${department}</span>
        </div>
      </div>

      <p>${biography}</p>

      ${
        expertiseTags.length > 0
          ? `
            <div class="press-author-tags">
              ${expertiseTags
                .map(
                  (tag) =>
                    `<span class="press-author-tag">${escapeHtml(tag)}</span>`,
                )
                .join("")}
            </div>
          `
          : ""
      }

      <ul class="press-author-title-list">
        ${
          featuredTitles.length > 0
            ? featuredTitles
                .map(
                  (title) => `
                    <li>
                      <i class="fas fa-book-open"></i>
                      <span>${escapeHtml(title)}</span>
                    </li>
                  `,
                )
                .join("")
            : `
              <li>
                <i class="fas fa-book-open"></i>
                <span>Published title information will appear here once this author releases a book.</span>
              </li>
            `
        }
      </ul>

      <div class="press-metric-strip">
        <div>
          <strong>${escapeHtml(String(publishedBooksCount))}</strong>
          <span>Published titles</span>
        </div>
        <div>
          <strong>${latestYear}</strong>
          <span>Latest publication year</span>
        </div>
      </div>
    </article>
  `;
}

function setDirectoryStatus(message, state) {
  const statusElement = document.getElementById("authorsDirectoryStatus");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function countDistinctFaculties(authors) {
  return new Set(
    authors
      .map((author) => (author.faculty || "").trim().toLowerCase())
      .filter(Boolean),
  ).size;
}

function getLatestPublicationYear(authors) {
  const years = authors
    .map((author) => Number.parseInt(getPublicationYear(author.latest_publication_date), 10))
    .filter((year) => Number.isFinite(year));

  if (years.length === 0) return "--";

  return String(Math.max(...years));
}

function getPublicationYear(value) {
  if (!value) return "--";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "--";

  return String(parsedDate.getFullYear());
}

function getExpertiseTags(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);
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

function resolveAuthorImageUrl(path) {
  return isRenderableImagePath(path) ? resolveAssetUrl(path) : "";
}

function isRenderableImagePath(path) {
  if (!path) return false;
  if (String(path).startsWith("data:image/")) return true;

  try {
    const pathname = new URL(path, window.location.origin).pathname.toLowerCase();
    return /\.(avif|gif|jpe?g|png|svg|webp)$/.test(pathname);
  } catch (error) {
    return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(String(path));
  }
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
